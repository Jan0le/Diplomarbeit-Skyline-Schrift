import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Company, CompanyMember, CompanyRole } from '../types';
import { supabase } from './db';

const STORAGE_KEY_CURRENT_COMPANY = 'skyline_current_company_id';
const INVITE_CODE_LENGTH = 8;
const INVITE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const generateInviteCode = () => {
  let code = '';
  for (let i = 0; i < INVITE_CODE_LENGTH; i += 1) {
    code += INVITE_CODE_ALPHABET.charAt(Math.floor(Math.random() * INVITE_CODE_ALPHABET.length));
  }
  return code;
};

export async function getMemberships(userId: string): Promise<CompanyMember[]> {
  try {
    const { data, error } = await supabase
      .from('company_members')
      .select(`
        company_id,
        user_id,
        role,
        created_at,
        companies(id, name, owner_profile_id, created_at, invite_code),
        profiles!company_members_user_id_fkey(full_name)
      `)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map(row => {
      // Handle companies as either object or array (Supabase can return either)
      const companyData = Array.isArray((row as any).companies) 
        ? (row as any).companies[0] 
        : (row as any).companies;
      
      // Handle profiles as either object or array
      const profileData = Array.isArray((row as any).profiles)
        ? (row as any).profiles[0]
        : (row as any).profiles;

      const result = {
        companyId: row.company_id as string,
        userId: row.user_id as string,
        role: row.role as CompanyRole,
        createdAt: row.created_at as string,
        company: companyData ? {
          id: companyData.id as string,
          name: companyData.name as string,
          ownerProfileId: companyData.owner_profile_id as string | undefined,
          createdAt: companyData.created_at as string | undefined,
          inviteCode: companyData.invite_code as string | undefined,
        } : undefined,
        user: profileData ? {
          fullName: profileData.full_name as string | undefined,
          email: undefined, // Email is in auth.users, not in profiles table
        } : undefined,
      };

      return result;
    });
  } catch (e: any) {
    // If tables aren't created yet, return empty to keep app usable
    if (typeof e?.message === 'string' && e.message.includes('relation')) {
      return [];
    }
    return [];
  }
}

export async function listCompanyMembers(companyId: string): Promise<CompanyMember[]> {
  try {
    const { data, error } = await supabase
      .from('company_members')
      .select(`
        company_id,
        user_id,
        role,
        created_at,
        profiles!company_members_user_id_fkey(full_name)
      `)
      .eq('company_id', companyId)
      .order('role', { ascending: true });

    if (error) throw error;

    return (data || []).map(row => {
      // Handle profiles as either object or array
      const profileData = Array.isArray(row.profiles)
        ? row.profiles[0]
        : row.profiles;

      return {
        companyId: row.company_id as string,
        userId: row.user_id as string,
        role: row.role as CompanyRole,
        createdAt: row.created_at as string,
        user: profileData ? {
          fullName: profileData.full_name as string | undefined,
          email: undefined, // Email is in auth.users, not in profiles table
        } : undefined,
      };
    });
  } catch (e) {
    return [];
  }
}

export async function removeCompanyMember(companyId: string, memberId: string): Promise<void> {
  const { error } = await supabase
    .from('company_members')
    .delete()
    .eq('company_id', companyId)
    .eq('user_id', memberId);

  if (error) throw error;
}

export async function getCurrentCompanyId(): Promise<string | null> {
  try {
    return (await AsyncStorage.getItem(STORAGE_KEY_CURRENT_COMPANY)) || null;
  } catch {
    return null;
  }
}

export async function setCurrentCompanyId(companyId: string | null): Promise<void> {
  if (!companyId) {
    await AsyncStorage.removeItem(STORAGE_KEY_CURRENT_COMPANY);
    return;
  }
  await AsyncStorage.setItem(STORAGE_KEY_CURRENT_COMPANY, companyId);
}

export async function ensureCompanySelection(userId: string): Promise<{ companyId: string | null; role: CompanyRole | null; memberships: CompanyMember[] }>{
  const memberships = await getMemberships(userId);
  const stored = await getCurrentCompanyId();

  // If stored company ID exists in memberships, use it
  if (stored && memberships.some(m => m.companyId === stored)) {
    const role = memberships.find(m => m.companyId === stored)?.role || null;
    return { companyId: stored, role, memberships };
  }

  // If stored company ID doesn't exist in memberships, clear it
  if (stored) {
    await setCurrentCompanyId(null);
  }

  // Pick first membership if available
  if (memberships.length > 0) {
    const first = memberships[0];
    await setCurrentCompanyId(first.companyId);
    return { companyId: first.companyId, role: first.role, memberships };
  }

  // No memberships yet
  await setCurrentCompanyId(null);
  return { companyId: null, role: null, memberships };
}

export async function createCompany(name: string, ownerProfileId?: string): Promise<Company | null> {
  try {
    const inviteCode = await generateUniqueCompanyInviteCode();
    const { data, error } = await supabase
      .from('companies')
      .insert({ name, owner_profile_id: ownerProfileId || null, invite_code: inviteCode })
      .select('id, name, created_at, owner_profile_id, invite_code')
      .single();
    if (error) throw error;
    return {
      id: data.id as string,
      name: data.name as string,
      createdAt: data.created_at as string,
      ownerProfileId: data.owner_profile_id as string | undefined,
      inviteCode: data.invite_code as string | undefined
    };
  } catch (e: any) {
    if (typeof e?.message === 'string' && e.message.includes('relation')) {
      // Table not present yet
      return null;
    }
    throw e;
  }
}

export async function createCompanyForCurrentUser(name: string): Promise<Company> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) {
    throw new Error('Not authenticated');
  }

  const inviteCode = await generateUniqueCompanyInviteCode();

  const { data: company, error: cErr } = await supabase
    .from('companies')
    .insert({ name, owner_profile_id: user.id, invite_code: inviteCode })
    .select('id, name, created_at, owner_profile_id, invite_code')
    .single();
  if (cErr) {
    throw cErr;
  }

  const { error: mErr } = await supabase
    .from('company_members')
    .insert({ company_id: company.id, user_id: user.id, role: 'owner' });

  if (mErr && !(typeof mErr.message === 'string' && mErr.message.toLowerCase().includes('duplicate'))) {
    throw mErr;
  }

  // Mark profile as company account
  await supabase
    .from('profiles')
    .update({ account_type: 'company' })
    .eq('id', user.id);

  await ensureInviteCode(user.id);

  await setCurrentCompanyId(company.id as string);

  return {
    id: company.id as string,
    name: company.name as string,
    createdAt: company.created_at as string,
    ownerProfileId: company.owner_profile_id as string | undefined,
    inviteCode: company.invite_code as string | undefined
  };
}

async function generateUniqueCompanyInviteCode(): Promise<string> {
  for (let i = 0; i < 10; i += 1) {
    const candidate = generateInviteCode();
    const { data } = await supabase
      .from('companies')
      .select('id')
      .eq('invite_code', candidate)
      .maybeSingle();
    if (!data) {
      return candidate;
    }
  }
  throw new Error('Unable to generate invite code');
}

async function generateUniqueProfileInviteCode(): Promise<string> {
  for (let i = 0; i < 10; i += 1) {
    const candidate = generateInviteCode();
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('invite_code', candidate)
      .maybeSingle();
    if (!data) {
      return candidate;
    }
  }
  throw new Error('Unable to generate profile invite code');
}

async function ensureInviteCode(profileId: string): Promise<string> {
  const { data, error } = await supabase
    .from('profiles')
    .select('invite_code')
    .eq('id', profileId)
    .maybeSingle();

  if (error) throw error;

  if (data?.invite_code) {
    return data.invite_code as string;
  }

  const newCode = await generateUniqueProfileInviteCode();
  const { data: updated, error: updateError } = await supabase
    .from('profiles')
    .update({ invite_code: newCode })
    .eq('id', profileId)
    .select('invite_code')
    .single();

  if (updateError) throw updateError;

  return updated.invite_code as string;
}

export async function ensureCompanyInviteCode(companyId: string): Promise<string> {
  const { data, error } = await supabase
    .from('companies')
    .select('invite_code')
    .eq('id', companyId)
    .maybeSingle();

  if (error) throw error;

  if (data?.invite_code) {
    return data.invite_code as string;
  }

  const newCode = await generateUniqueCompanyInviteCode();
  const { data: updated, error: updateError } = await supabase
    .from('companies')
    .update({ invite_code: newCode })
    .eq('id', companyId)
    .select('invite_code')
    .single();

  if (updateError) throw updateError;

  return updated.invite_code as string;
}

export async function regenerateCompanyInviteCode(companyId: string): Promise<string> {
  const newCode = await generateUniqueCompanyInviteCode();
  const { data, error } = await supabase
    .from('companies')
    .update({ invite_code: newCode })
    .eq('id', companyId)
    .select('invite_code')
    .single();

  if (error) throw error;

  return data.invite_code as string;
}

export async function joinCompanyByInviteCode(codeInput: string): Promise<{ companyId: string; joinedAs: CompanyRole }> {
  const code = codeInput.trim().toUpperCase();
  if (!code) {
    throw new Error('Invite code is required');
  }

  const { data: currentUserData } = await supabase.auth.getUser();
  const currentUser = currentUserData?.user;
  if (!currentUser) {
    throw new Error('Not authenticated');
  }

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id')
    .eq('invite_code', code)
    .maybeSingle();

  if (companyError || !company) {
    throw new Error('Invite code not found');
  }

  const { data: membership, error: membershipError } = await supabase
    .from('company_members')
    .select('role')
    .eq('company_id', company.id)
    .eq('user_id', currentUser.id)
    .maybeSingle();

  if (membership && membership.role) {
    // Already a member of this company
    return { companyId: company.id as string, joinedAs: membership.role as CompanyRole };
  }

  if (membershipError && !membership && !membershipError.message.toLowerCase().includes('duplicate')) {
    throw membershipError;
  }

  const { error: addMemberError } = await supabase
    .from('company_members')
    .insert({ company_id: company.id, user_id: currentUser.id, role: 'worker' })
    .select('company_id')
    .maybeSingle();

  if (addMemberError && !addMemberError.message?.toLowerCase().includes('duplicate')) {
    throw addMemberError;
  }

  await setCurrentCompanyId(company.id as string);

  return { companyId: company.id as string, joinedAs: 'worker' };
}

