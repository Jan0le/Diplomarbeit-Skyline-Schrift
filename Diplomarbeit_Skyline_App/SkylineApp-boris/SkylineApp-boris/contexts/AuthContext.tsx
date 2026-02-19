import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { ensureCompanySelection, setCurrentCompanyId } from '../services/companyService';
import { supabase } from '../services/db';
import { supabaseService } from '../services/supabase';
import type { AccountType, CompanyMember, CompanyRole } from '../types';

interface User {
  id: string;
  name: string;
  email: string;
  profileImage?: string;
  accountType?: AccountType;
  createdAt?: Date;
  updatedAt?: Date;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  // Company context
  currentCompanyId: string | null;
  currentCompanyRole: CompanyRole | null;
  memberships: CompanyMember[];
  refreshMemberships: () => Promise<void>;
  switchCompany: (companyId: string) => Promise<void>;
  accountType: AccountType;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentCompanyId, setCompanyId] = useState<string | null>(null);
  const [currentCompanyRole, setCompanyRole] = useState<CompanyRole | null>(null);
  const [memberships, setMemberships] = useState<CompanyMember[]>([]);
  const [accountType, setAccountType] = useState<AccountType>('worker');


  // Load user session on app start
  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      
      const sessionUser = data.session?.user;
      
      if (sessionUser) {
        // Load full profile from database to get the correct name
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', sessionUser.id)
          .single();
        
        if (!error && profile) {
          const resolvedAccountType: AccountType = (profile.account_type as AccountType) || 'worker';
          const u: User = {
            id: sessionUser.id,
            name: profile.full_name || sessionUser.email?.split('@')[0] || 'User',
            email: sessionUser.email || '',
            profileImage: profile.avatar_url || sessionUser.user_metadata?.avatar_url,
            createdAt: profile.created_at ? new Date(profile.created_at) : new Date(sessionUser.created_at),
            updatedAt: profile.updated_at ? new Date(profile.updated_at) : new Date(),
            accountType: resolvedAccountType,
          };
          setUser(u);
          setAccountType(resolvedAccountType);
        } else {
          // Fallback to metadata if profile doesn't exist yet
          const nameFromMetadata = sessionUser.user_metadata?.name;
          const nameFromEmail = sessionUser.email?.split('@')[0];
          const finalName = nameFromMetadata || nameFromEmail || 'User';
          
          const u: User = {
            id: sessionUser.id,
            name: finalName,
            email: sessionUser.email || '',
            profileImage: sessionUser.user_metadata?.avatar_url,
            createdAt: new Date(sessionUser.created_at),
            updatedAt: new Date(),
            accountType: 'worker',
          };
          setUser(u);
          setAccountType('worker');
        }
        // Company selection (safe if tables not present yet)
        try {
          const { companyId, role, memberships } = await ensureCompanySelection(sessionUser.id);
          setCompanyId(companyId);
          setCompanyRole(role);
          setMemberships(memberships);
        } catch (e) {
          // Error handled silently
        }
      } else {
        setUser(null);
        setCompanyId(null);
        setCompanyRole(null);
        setMemberships([]);
        setAccountType('worker');
      }
      
      // Listen to auth state changes
      supabase.auth.onAuthStateChange(async (_event, session) => {
        const sUser = session?.user;
        if (sUser) {
          // Load profile from database
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', sUser.id)
            .single();
          
          if (!error && profile) {
          const resolvedAccountType: AccountType = (profile.account_type as AccountType) || 'worker';
          const u2: User = {
            id: sUser.id,
            name: profile.full_name || sUser.email?.split('@')[0] || 'User',
            email: sUser.email || '',
            profileImage: profile.avatar_url || sUser.user_metadata?.avatar_url,
            accountType: resolvedAccountType,
          };
          setUser(u2);
          setAccountType(resolvedAccountType);
          } else {
            // Fallback
            const nameFromMetadata = sUser.user_metadata?.name;
            const nameFromEmail = sUser.email?.split('@')[0];
            const finalName = nameFromMetadata || nameFromEmail || 'User';
            
            const u2: User = {
              id: sUser.id,
              name: finalName,
              email: sUser.email || '',
              profileImage: sUser.user_metadata?.avatar_url,
            accountType: 'worker',
            };
            setUser(u2);
          setAccountType('worker');
          }
          // Refresh company context on auth change
          try {
            const { companyId, role, memberships } = await ensureCompanySelection(sUser.id);
            setCompanyId(companyId);
            setCompanyRole(role);
            setMemberships(memberships);
          } catch {}
        } else {
          setUser(null);
          setCompanyId(null);
          setCompanyRole(null);
          setMemberships([]);
          setAccountType('worker');
        }
      });
    } catch (error) {
      // Error handled silently
    } finally {
      setIsLoading(false);
    }
  };

  const refreshMemberships = async () => {
    if (!user) return;
    try {
      const { companyId, role, memberships } = await ensureCompanySelection(user.id);
      setCompanyId(companyId);
      setCompanyRole(role);
      setMemberships(memberships);
    } catch (e) {
      // Error handled silently
    }
  };

  const switchCompany = async (companyId: string) => {
    await setCurrentCompanyId(companyId);
    setCompanyId(companyId);
    // Update role from memberships if known
    const role = memberships.find(m => m.companyId === companyId)?.role || null;
    setCompanyRole(role);
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      // Use the Supabase service for consistent error handling
      const result = await supabaseService.signIn(email, password);
      
      if (result.user) {
        // Mark that user has an account after successful login
        await AsyncStorage.setItem('hasAccount', 'true');
        
        // Load full profile from database
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', result.user.id)
          .single();
        
        if (!error && profile) {
          const resolvedAccountType: AccountType = (profile.account_type as AccountType) || 'worker';
          const newUser: User = {
            id: result.user.id,
            name: profile.full_name || result.user.email?.split('@')[0] || 'User',
            email: result.user.email || '',
            profileImage: profile.avatar_url || result.user.user_metadata?.avatar_url,
            accountType: resolvedAccountType,
          };
          setUser(newUser);
          setAccountType(resolvedAccountType);
        } else {
          // Fallback
          const nameFromMetadata = result.user.user_metadata?.name;
          const nameFromEmail = result.user.email?.split('@')[0];
          const finalName = nameFromMetadata || nameFromEmail || 'User';
          
          const newUser: User = {
            id: result.user.id,
            name: finalName,
            email: result.user.email || '',
            profileImage: result.user.user_metadata?.avatar_url,
            accountType: 'worker',
          };
          setUser(newUser);
          setAccountType('worker');
        }
      }
    } catch (error) {
      throw error; // Re-throw to be handled by the UI
    } finally {
      setIsLoading(false);
    }
  };

  const requestPasswordReset = async (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    await supabaseService.requestPasswordReset(normalizedEmail);
  };

  const signup = async (name: string, email: string, password: string) => {
    try {
      setIsLoading(true);
      
      // Check if Supabase is connected
      const { data: { session } } = await supabase.auth.getSession();
      
      // Use the Supabase service - profile creation is handled by database trigger
      const result = await supabaseService.signUp(email, password, { name });
      
      if (result.user) {
        
        // Mark that user has an account after successful signup
        await AsyncStorage.setItem('hasAccount', 'true');
        
        // Wait a moment for the trigger to create the profile AND session to be established
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Verify session is active; if not, sign in immediately (no email confirmation flow)
        const { data: { session: newSession } } = await supabase.auth.getSession();
        
        if (!newSession) {
          try {
            await supabaseService.signIn(email, password);
          } catch (signInError) {
            // Error handled silently
          }
        }
        
        // Set user immediately with basic data
        const newUser: User = {
          id: result.user.id,
          name: name,
          email: result.user.email || email,
          profileImage: result.user.user_metadata?.avatar_url,
          accountType: 'worker',
        };
        setUser(newUser);
        setAccountType('worker');
        
        // Try to load profile from database (this might fail due to RLS)
        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', result.user.id)
            .single();
          
          if (!error && profile && profile.full_name) {
            // Update user with profile data
            const updatedUser: User = {
              ...newUser,
              name: profile.full_name,
              profileImage: profile.avatar_url || newUser.profileImage,
              accountType: (profile.account_type as AccountType) || newUser.accountType,
            };
            setUser(updatedUser);
          }
        } catch (profileError) {
          // Error handled silently
        }
      }
    } catch (error) {
      // Error handled silently
      throw error; // Re-throw to be handled by the UI
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      
      // Sign out from Supabase
      await supabaseService.signOut();
      
      // Clear user state
      setUser(null);
      setAccountType('worker');
      
      // Clear all stored data including Zustand store
      await AsyncStorage.multiRemove([
        'user', 
        'flights', 
        'selectedFlight',
        'skyline-app-storage' // Zustand store key
      ]);
      
    } catch (error) {
      // Error handled silently
      // Even if there's an error, clear the local state
      setUser(null);
      setAccountType('worker');
      await AsyncStorage.multiRemove([
        'user', 
        'flights', 
        'selectedFlight',
        'skyline-app-storage'
      ]).catch(() => {});
      throw error; // Re-throw to be handled by the UI if needed
    }
  };

  const updateUser = (userData: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...userData } : null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        requestPasswordReset,
        signup,
        logout,
        updateUser,
        currentCompanyId,
        currentCompanyRole,
        memberships,
        refreshMemberships,
        switchCompany,
        accountType,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
