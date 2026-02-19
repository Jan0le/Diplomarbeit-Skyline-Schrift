/**
 * 🏪 SKYLINE FLIGHT TRACKER - GLOBAL STATE MANAGEMENT
 * Zustand-basierter Store für React Native App
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { supabase } from '../services/db';
import {
    AchievementId,
    AppActions,
    AppState,
    AccountType,
    CreateFlightData,
    Flight,
    LoginCredentials,
    RegisterData,
    User,
    UserStats,
    Note,
    Checklist,
    ChecklistItem,
    Purpose,
    NoteTemplate,
    ChecklistTemplate,
} from '../types';

// Kombinierter State + Actions Type
type AppStore = AppState & AppActions;

// Initial State
const initialState: AppState = {
  // Authentication
  user: null,
  isAuthenticated: false,
  isLoading: false,

  // Flights
  flights: [],
  selectedFlight: null,
  flightStats: {
    tripsTaken: 0,
    countriesVisited: 0,
    totalDistance: 0,
    photosTaken: 0,
    favoriteDestination: '',
    averageTripDuration: 0,
  },

  // UI State
  error: null,
  theme: 'dark',
  
  // Notes & Checklists
  notesByFlight: {},
  checklistsByFlight: {},
  checklistsLoadingByFlight: {},
  checklistsLoadedByFlight: {},
  templates: { note: [], checklist: [] },
};

// Helper function to sync user from Supabase session
const syncUserFromSupabase = async (set: any) => {
  try {
    const { data } = await supabase.auth.getSession();
    const sessionUser = data.session?.user;
    
    if (sessionUser) {
      // Load profile from database
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionUser.id)
        .single();
      
      const accountType = (profile?.account_type as AccountType) || 'worker';
      const user: User = {
        id: sessionUser.id,
        name: profile?.full_name || sessionUser.user_metadata?.name || sessionUser.email?.split('@')[0] || 'User',
        email: sessionUser.email || '',
        accountType,
        preferences: {
          theme: 'dark',
          language: 'en',
          notifications: true,
        },
        createdAt: new Date(sessionUser.created_at || Date.now()),
        updatedAt: new Date(),
      };

      set({
        user,
        isAuthenticated: true,
      });
      
      return user;
    } else {
      set({
        user: null,
        isAuthenticated: false,
      });
      return null;
    }
  } catch (error) {
    console.error('Error syncing user from Supabase:', error);
    return null;
  }
};

// =============================================
// MAIN STORE
// =============================================

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // =============================================
      // AUTHENTICATION ACTIONS
      // =============================================
      
      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null });
        
        try {
          const { supabaseService } = await import('../services/supabase');
          const result = await supabaseService.signIn(credentials.email, credentials.password);
          
          if (result.user) {
            // Load profile from database
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', result.user.id)
              .single();
            
            const accountType = (profile?.account_type as AccountType) || 'worker';
            const user: User = {
              id: result.user.id,
              name: profile?.full_name || result.user.email?.split('@')[0] || 'User',
              email: result.user.email || '',
              accountType,
              preferences: {
                theme: 'dark',
                language: 'en',
                notifications: true,
              },
              createdAt: new Date(result.user.created_at || Date.now()),
              updatedAt: new Date(),
            };

            set({
              user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });

            await AsyncStorage.setItem('isLoggedIn', 'true');
            await AsyncStorage.setItem('user', JSON.stringify(user));
          }

        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Login failed',
          });
          throw error;
        }
      },

      register: async (data: RegisterData) => {
        set({ isLoading: true, error: null });
        
        try {
          const { supabaseService } = await import('../services/supabase');
          const result = await supabaseService.signUp(data.email, data.password, { name: data.name });
          
          if (result.user) {
            // Wait for profile to be created by trigger
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const user: User = {
              id: result.user.id,
              name: data.name,
              email: result.user.email || data.email,
              accountType: 'worker',
              preferences: {
                theme: 'dark',
                language: 'en',
                notifications: true,
              },
              createdAt: new Date(result.user.created_at || Date.now()),
              updatedAt: new Date(),
            };

            set({
              user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });

            await AsyncStorage.setItem('isLoggedIn', 'true');
            await AsyncStorage.setItem('user', JSON.stringify(user));
          }

        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Registration failed',
          });
          throw error;
        }
      },

      logout: async () => {
        try {
          const { supabaseService } = await import('../services/supabase');
          await supabaseService.signOut();
        } catch (error) {
          console.error('Error signing out from Supabase:', error);
        }
        
        set({
          user: null,
          isAuthenticated: false,
          flights: [],
          selectedFlight: null,
          flightStats: initialState.flightStats,
          error: null,
        });

        AsyncStorage.multiRemove(['isLoggedIn', 'user', 'flights']);
      },

      // Sync user from Supabase session (called on app start)
      initAuth: async () => {
        await syncUserFromSupabase(set);
        
        // Listen to auth state changes
        supabase.auth.onAuthStateChange(async (_event: string, session: any) => {
          const sUser = session?.user;
          if (sUser) {
            // Load profile from database
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', sUser.id)
              .single();
            
            const user: User = {
              id: sUser.id,
              name: profile?.full_name || sUser.user_metadata?.name || sUser.email?.split('@')[0] || 'User',
              email: sUser.email || '',
              preferences: {
                theme: 'dark',
                language: 'en',
                notifications: true,
              },
              createdAt: new Date(sUser.created_at || Date.now()),
              updatedAt: new Date(),
            };

            set({
              user,
              isAuthenticated: true,
            });
            
            // Load flights for the user
            get().loadFlights();
          } else {
            set({
              user: null,
              isAuthenticated: false,
              flights: [],
            });
          }
        });
      },

      updateProfile: async (updates: Partial<User>) => {
        const currentUser = get().user;
        if (!currentUser) return;

        const updatedUser = {
          ...currentUser,
          ...updates,
          updatedAt: new Date(),
        };

        set({ user: updatedUser });
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      },

      // =============================================
      // FLIGHT ACTIONS
      // =============================================

      addFlight: async (flightData: CreateFlightData) => {
        const { user } = get();
        if (!user) throw new Error('User not authenticated');

        set({ isLoading: true, error: null });

        try {
          // Import and use SupabaseService
          const { supabaseService } = await import('../services/supabase');
          const { computeDurationMinutesFromTimestamps, formatDistanceKm, haversineDistanceKm } = await import('../utils/flightMetrics');

          // Compute distance/duration if missing (FA-05)
          let distanceKm: number | undefined = typeof (flightData as any).distanceKm === 'number' ? (flightData as any).distanceKm : undefined;
          let distanceStr: string | undefined = flightData.distance;
          if (!distanceStr && flightData.from?.latitude != null && flightData.to?.latitude != null) {
            distanceKm = haversineDistanceKm(flightData.from, flightData.to);
            distanceStr = formatDistanceKm(distanceKm);
          }

          let durationStr: string | undefined = flightData.duration;
          if (!durationStr && flightData.departureAt && flightData.arrivalAt) {
            const mins = computeDurationMinutesFromTimestamps(flightData.departureAt, flightData.arrivalAt);
            if (mins > 0) {
              const h = Math.floor(mins / 60);
              const m = mins % 60;
              durationStr = h > 0 && m > 0 ? `${h}h ${m}m` : h > 0 ? `${h}h` : `${m}m`;
            }
          }
          
          const newFlight = await supabaseService.createFlight({
            userId: user.id,
            from: flightData.from,
            to: flightData.to,
            date: flightData.date,
            departureAt: flightData.departureAt,
            arrivalAt: flightData.arrivalAt,
            flightNumber: flightData.flightNumber || '',
            airline: flightData.airline || '',
            confirmationCode: flightData.confirmationCode,
            bookingReference: flightData.bookingReference,
            seat: flightData.seat,
            gate: flightData.gate,
            terminal: flightData.terminal,
            status: (() => {
              const now = new Date();
              const d = flightData.departureAt ? new Date(flightData.departureAt) : null;
              if (d && !isNaN(d.getTime())) return d > now ? 'upcoming' : 'completed';
              return new Date(flightData.date) > now ? 'upcoming' : 'completed';
            })(),
            notes: flightData.notes,
            images: flightData.images,
            duration: durationStr,
            distance: distanceStr,
            distanceKm,
            companyId: flightData.companyId
          });

          // Update local state
          set((state) => ({
            flights: [...state.flights, newFlight],
            isLoading: false,
          }));
          
          // Update stats
          get().updateStats();

          // Post-create nudge notification (opens Trip Details + tutorial)
          try {
            const SettingsService = (await import('../services/settingsService')).default;
            const s = await SettingsService.getInstance().getSettings();
            if (s.notifications && s.reminderTips) {
              const { scheduleLocalReminder } = await import('../services/notifications');
              const when = new Date(Date.now() + 15_000).toISOString();
              await scheduleLocalReminder(
                'Flight added ✈️',
                'Open Trip Details to add gate, seat, terminal and upload documents.',
                when,
                { url: `/trip-details?id=${newFlight.id}&tutorial=1` }
              );
            }
          } catch {}

          // Auto flight reminders (boarding/check-in/docs/receipt) – end-product behavior
          try {
            const { scheduleAutoRemindersForFlight } = await import('../services/flightAutoReminderService');
            await scheduleAutoRemindersForFlight(user.id, newFlight);
          } catch {}

        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to add flight',
          });
          throw error; // Re-throw to be handled by UI
        }
      },

      updateFlight: async (id: string, updates: Partial<Flight>) => {
        set({ isLoading: true, error: null });

        try {
          // Import and use SupabaseService
          const { supabaseService } = await import('../services/supabase');
          
          const updatedFlight = await supabaseService.updateFlight(id, updates);
          const { getEffectiveFlightStatus } = await import('../utils/flightMetrics');
          const normalizedFlight = { ...updatedFlight, status: getEffectiveFlightStatus(updatedFlight) };

          // Update local state
          set((state) => ({
            flights: state.flights.map(flight =>
              flight.id === id ? normalizedFlight : flight
            ),
            isLoading: false,
          }));
          
          get().updateStats();

          // Re-schedule auto reminders if relevant fields changed
          try {
            const user = get().user;
            if (user) {
              const { scheduleAutoRemindersForFlight, cancelAutoRemindersForFlight } = await import('../services/flightAutoReminderService');
              if (normalizedFlight.status === 'cancelled' || normalizedFlight.status === 'completed') {
                await cancelAutoRemindersForFlight(user.id, normalizedFlight.id);
              } else {
                await scheduleAutoRemindersForFlight(user.id, normalizedFlight);
              }
            }
          } catch {}
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to update flight',
          });
          throw error;
        }
      },

      deleteFlight: async (id: string) => {
        set({ isLoading: true, error: null });

        try {
          // Import and use SupabaseService
          const { supabaseService } = await import('../services/supabase');
          
          await supabaseService.deleteFlight(id);

          // Cancel any scheduled reminders for this flight
          try {
            const user = get().user;
            if (user) {
              const { cancelAutoRemindersForFlight } = await import('../services/flightAutoReminderService');
              await cancelAutoRemindersForFlight(user.id, id);
            }
          } catch {}

          // Update local state
          set((state) => ({
            flights: state.flights.filter(flight => flight.id !== id),
            selectedFlight: state.selectedFlight?.id === id ? null : state.selectedFlight,
            isLoading: false,
          }));
          
          get().updateStats();
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to delete flight',
          });
          throw error;
        }
      },

      loadFlights: async () => {
        const { user } = get();
        if (!user) {
          set({ flights: [], isLoading: false });
          return;
        }

        set({ isLoading: true });

        try {
          // Import and use SupabaseService
          const { supabaseService } = await import('../services/supabase');
          
          let flights = await supabaseService.getFlights(user.id);
          const { getEffectiveFlightStatus } = await import('../utils/flightMetrics');
          flights = flights.map((f) => ({
            ...f,
            status: getEffectiveFlightStatus(f),
          }));
          set({ flights, isLoading: false });
          // Pull stats from server (RPC) for consistency
          try {
            const { supabaseService } = await import('../services/supabase');
            const user = get().user;
            if (user) {
              const s = await supabaseService.getUserStats(user.id);
              // Ensure UI matches the list currently loaded
              const merged = { ...s, tripsTaken: flights.length };
              set({ flightStats: merged });
            }
          } catch (e) {
            if (__DEV__) console.warn('Falling back to client-side stats:', e);
            get().updateStats();
          }
        } catch (error) {
          console.error('Failed to load flights:', error);
          set({ 
            flights: [], 
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to load flights'
          });
        }
      },

      selectFlight: (flight: Flight | null) => {
        set({ selectedFlight: flight });
      },

      // Recalculate and update distances for flights missing distance data
      recalculateFlightDistances: async () => {
        const { user, flights } = get();
        if (!user) return;

        try {
          const { supabaseService } = await import('../services/supabase');
          const { formatDistanceKm, haversineDistanceKm } = await import('../utils/flightMetrics');
          let updatedCount = 0;

          for (const flight of flights) {
            // Skip if already has distance
            if (flight.distance && typeof flight.distanceKm === 'number') continue;

            // Skip if missing coordinates
            if (!flight.from?.latitude || !flight.from?.longitude || 
                !flight.to?.latitude || !flight.to?.longitude) {
              continue;
            }

            // Calculate distance
            const distanceKm = haversineDistanceKm(flight.from, flight.to);
            const formattedDistance = formatDistanceKm(distanceKm);

            // Update in Supabase
            await supabaseService.updateFlight(flight.id, {
              distance: formattedDistance,
              distanceKm,
            });

            updatedCount++;
          }
          
          // Reload flights to get updated data
          await get().loadFlights();
          
          return updatedCount;
        } catch (error) {
          if (__DEV__) console.error('Error recalculating distances:', error);
          throw error;
        }
      },

      // =============================================
      // UI ACTIONS
      // =============================================

      setError: (error: string | null) => {
        set({ error });
      },

      setTheme: (theme: 'light' | 'dark') => {
        set({ theme });
        
        // Update user preferences if logged in
        const { user, updateProfile } = get();
        if (user) {
          updateProfile({
            preferences: {
              ...user.preferences,
              theme,
            },
          });
        }
      },

      // =============================================
      // INTERNAL HELPERS
      // =============================================

      updateStats: () => {
        const { flights, flightStats } = get();

        // Performance: Skip if flights haven't changed (compare by length)
        // This prevents unnecessary stat recalculations on every render
        if (flightStats.tripsTaken === flights.length && flights.length > 0) {
          return; // Stats are already up-to-date
        }
        
        const tripsTaken = flights.length; // Count all flights, not just completed ones
        
        const countries = new Set(
          flights.flatMap(f => [
            f.from.country,
            f.to.country,
          ].filter(Boolean))
        );
        
        const totalDistance = flights.reduce((sum, flight) => {
          if (typeof flight.distanceKm === 'number') return sum + flight.distanceKm;
          if (!flight.distance) return sum;
          const distanceMatch = flight.distance.replace(/[^\d]/g, '').match(/(\d+)/);
          const parsed = distanceMatch ? parseInt(distanceMatch[1], 10) : 0;
          return sum + parsed;
        }, 0);

        const durations = flights
          .map(f => f.duration ? parseFloat(f.duration) : 0)
          .filter(d => d > 0);
        
        const averageTripDuration = durations.length > 0
          ? durations.reduce((a, b) => a + b, 0) / durations.length
          : 0;

        // Find most frequent destination
        const destinationCounts: Record<string, number> = {};
        flights.forEach(f => {
          const destination = f.to.city;
          if (!destination) return;
          destinationCounts[destination] = (destinationCounts[destination] || 0) + 1;
        });
        
        const favoriteDestination = Object.entries(destinationCounts)
          .sort((a, b) => b[1] - a[1])[0]?.[0] || '';

        const newStats: UserStats = {
          tripsTaken,
          countriesVisited: countries.size,
          totalDistance,
          photosTaken: flights.reduce((sum, f) => sum + (f.images?.length || 0), 0),
          favoriteDestination,
          averageTripDuration: Math.round(averageTripDuration * 10) / 10,
        };

        set({ flightStats: newStats });
      },

      // =============================================
      // NOTES
      // =============================================

      loadNotesForFlight: async (flightId: string) => {
        try {
          const { supabaseService } = await import('../services/supabase');
          const notes = await supabaseService.getNotes(flightId);
          set((state: any) => ({
            notesByFlight: { ...(state.notesByFlight || {}), [flightId]: notes },
          }));
        } catch (e) {
          if (__DEV__) console.error('loadNotesForFlight error:', e);
        }
      },

      addNote: async (flightId: string, data: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'profileId' | 'flightId'>) => {
        const { supabaseService } = await import('../services/supabase');
        const note = await supabaseService.createNote({ ...data, flightId });
        set((state: any) => {
          const list: Note[] = (state.notesByFlight?.[flightId] || []).concat(note);
          return { notesByFlight: { ...(state.notesByFlight || {}), [flightId]: list } };
        });
        try {
          const { scheduleOrUpdateNoteReminder } = await import('../services/noteChecklistReminderService');
          await scheduleOrUpdateNoteReminder(note);
        } catch {}
        return note;
      },

      updateNoteAction: async (noteId: string, updates: Partial<Note>) => {
        const { supabaseService } = await import('../services/supabase');
        const updated = await supabaseService.updateNote(noteId, updates);
        set((state: any) => {
          const flightId = updated.flightId;
          const list: Note[] = (state.notesByFlight?.[flightId] || []).map((n: Note) => n.id === noteId ? updated : n);
          return { notesByFlight: { ...(state.notesByFlight || {}), [flightId]: list } };
        });
        try {
          const { scheduleOrUpdateNoteReminder } = await import('../services/noteChecklistReminderService');
          await scheduleOrUpdateNoteReminder(updated);
        } catch {}
        return updated;
      },

      deleteNoteAction: async (noteId: string) => {
        const { supabaseService } = await import('../services/supabase');
        // Need to find flightId from current state
        const { notesByFlight } = get() as any;
        let flightId: string | null = null;
        if (notesByFlight) {
          for (const [fid, list] of Object.entries(notesByFlight)) {
            if ((list as Note[]).some(n => n.id === noteId)) { flightId = fid; break; }
          }
        }
        await supabaseService.deleteNote(noteId);
        try {
          const { cancelNoteReminder } = await import('../services/noteChecklistReminderService');
          await cancelNoteReminder(noteId);
        } catch {}
        if (flightId) {
          set((state: any) => {
            const list: Note[] = (state.notesByFlight?.[flightId!] || []).filter((n: Note) => n.id !== noteId);
            return { notesByFlight: { ...(state.notesByFlight || {}), [flightId!]: list } };
          });
        }
      },

      // =============================================
      // CHECKLISTS
      // =============================================

      loadChecklistsForFlight: async (flightId: string) => {
        if (!flightId) return;
        const currentlyLoading = (get() as any).checklistsLoadingByFlight?.[flightId];
        if (currentlyLoading) return;

        set((state: any) => ({
          checklistsLoadingByFlight: { ...(state.checklistsLoadingByFlight || {}), [flightId]: true },
        }));

        try {
          const { supabaseService } = await import('../services/supabase');
          const lists = await supabaseService.getChecklists(flightId);
          set((state: any) => ({
            checklistsByFlight: { ...(state.checklistsByFlight || {}), [flightId]: lists },
            checklistsLoadingByFlight: { ...(state.checklistsLoadingByFlight || {}), [flightId]: false },
            checklistsLoadedByFlight: { ...(state.checklistsLoadedByFlight || {}), [flightId]: true },
          }));
        } catch (e) {
          if (__DEV__) console.error('loadChecklistsForFlight error:', e);
          set((state: any) => ({
            checklistsByFlight: {
              ...(state.checklistsByFlight || {}),
              [flightId]: state.checklistsByFlight?.[flightId] || [],
            },
            checklistsLoadingByFlight: { ...(state.checklistsLoadingByFlight || {}), [flightId]: false },
            checklistsLoadedByFlight: { ...(state.checklistsLoadedByFlight || {}), [flightId]: true },
          }));
        }
      },

      addChecklist: async (
        flightId: string,
        data: Omit<Checklist, 'id' | 'items' | 'createdAt' | 'updatedAt' | 'profileId' | 'flightId'>,
        items: Array<Omit<ChecklistItem, 'id'>>
      ) => {
        // Validate input
        if (!data.title || !data.title.trim()) {
          throw new Error('Checklist title is required');
        }
        
        const { supabaseService } = await import('../services/supabase');
        const created = await supabaseService.createChecklist({ ...data, flightId }, items);
        set((state: any) => ({
          checklistsByFlight: {
            ...(state.checklistsByFlight || {}),
            [flightId]: (() => {
              const list = ((state.checklistsByFlight?.[flightId] || []) as Checklist[]);
              const idx = list.findIndex((c) => c.id === created.id);
              if (idx >= 0) {
                const next = [...list];
                next[idx] = created;
                return next;
              }
              return list.concat(created);
            })(),
          },
          checklistsLoadingByFlight: { ...(state.checklistsLoadingByFlight || {}), [flightId]: false },
          checklistsLoadedByFlight: { ...(state.checklistsLoadedByFlight || {}), [flightId]: true },
        }));
        try {
          const { scheduleOrUpdateChecklistReminder } = await import('../services/noteChecklistReminderService');
          await scheduleOrUpdateChecklistReminder(created);
        } catch {}
        return created;
      },

      updateChecklistAction: async (
        checklistId: string,
        updates: Partial<Omit<Checklist, 'id' | 'items' | 'createdAt' | 'updatedAt' | 'profileId'>>,
        items?: Array<Partial<ChecklistItem> & { id?: string }>,
        flightIdHint?: string
      ) => {
        const { supabaseService } = await import('../services/supabase');
        const { checklistsByFlight } = get() as any;
        let flightId: string | null = flightIdHint || null;
        if (checklistsByFlight) {
          for (const [fid, list] of Object.entries(checklistsByFlight)) {
            if ((list as Checklist[]).some(c => c.id === checklistId)) { flightId = fid; break; }
          }
        }
        const updated = await supabaseService.updateChecklist(checklistId, updates, items);
        if (!flightId && updated.flightId) {
          flightId = updated.flightId;
        }
        // Fast local upsert to avoid expensive full list refetch on every save.
        set((state: any) => {
          const nextByFlight: Record<string, Checklist[]> = { ...(state.checklistsByFlight || {}) };
          if (flightId) {
            const list = (nextByFlight[flightId] || []) as Checklist[];
            const idx = list.findIndex((c) => c.id === checklistId);
            nextByFlight[flightId] = idx >= 0
              ? list.map((c) => (c.id === checklistId ? updated : c))
              : list.concat(updated);
            return {
              checklistsByFlight: nextByFlight,
              checklistsLoadingByFlight: { ...(state.checklistsLoadingByFlight || {}), [flightId]: false },
              checklistsLoadedByFlight: { ...(state.checklistsLoadedByFlight || {}), [flightId]: true },
            };
          }

          // Fallback: update wherever this checklist currently exists.
          for (const [fid, list] of Object.entries(nextByFlight)) {
            const typed = list as Checklist[];
            if (typed.some((c) => c.id === checklistId)) {
              nextByFlight[fid] = typed.map((c) => (c.id === checklistId ? updated : c));
            }
          }
          return { checklistsByFlight: nextByFlight };
        });
        try {
          const { scheduleOrUpdateChecklistReminder } = await import('../services/noteChecklistReminderService');
          await scheduleOrUpdateChecklistReminder(updated);
        } catch {}
        return updated;
      },

      toggleChecklistItemAction: async (checklistId: string, itemId: string, checked: boolean) => {
        const { supabaseService } = await import('../services/supabase');
        await supabaseService.toggleChecklistItem(checklistId, itemId, checked);
        const { checklistsByFlight } = get() as any;
        if (!checklistsByFlight) return;
        let flightId: string | null = null;
        for (const [fid, list] of Object.entries(checklistsByFlight)) {
          if ((list as Checklist[]).some(c => c.id === checklistId)) { flightId = fid; break; }
        }
        if (!flightId) return;
        set((state: any) => {
          const list: Checklist[] = (state.checklistsByFlight?.[flightId!] || []).map((c: Checklist) => {
            if (c.id !== checklistId) return c;
            const items = c.items.map(it => it.id === itemId ? { ...it, checked } : it);
            return { ...c, items };
          });
          return { checklistsByFlight: { ...(state.checklistsByFlight || {}), [flightId!]: list } };
        });
      },

      deleteChecklistAction: async (checklistId: string, flightIdHint?: string) => {
        const { supabaseService } = await import('../services/supabase');
        const { checklistsByFlight } = get() as any;
        let flightId: string | null = flightIdHint || null;
        for (const [fid, list] of Object.entries(checklistsByFlight || {})) {
          if ((list as Checklist[]).some(c => c.id === checklistId)) { 
            flightId = fid; 
            break; 
          }
        }
        
        // Delete from database
        await supabaseService.deleteChecklist(checklistId);
        try {
          const { cancelChecklistReminder } = await import('../services/noteChecklistReminderService');
          await cancelChecklistReminder(checklistId);
        } catch {}

        // Fast local removal without network refetch.
        set((state: any) => {
          const nextByFlight: Record<string, Checklist[]> = { ...(state.checklistsByFlight || {}) };
          if (flightId && nextByFlight[flightId]) {
            nextByFlight[flightId] = (nextByFlight[flightId] || []).filter((c) => c.id !== checklistId);
            return {
              checklistsByFlight: nextByFlight,
              checklistsLoadingByFlight: { ...(state.checklistsLoadingByFlight || {}), [flightId]: false },
              checklistsLoadedByFlight: { ...(state.checklistsLoadedByFlight || {}), [flightId]: true },
            };
          }
          for (const [fid, list] of Object.entries(nextByFlight)) {
            nextByFlight[fid] = (list as Checklist[]).filter((c) => c.id !== checklistId);
          }
          return { checklistsByFlight: nextByFlight };
        });
      },

      // =============================================
      // TEMPLATES
      // =============================================

      loadTemplatesByPurpose: async (purpose: Purpose) => {
        const { supabaseService } = await import('../services/supabase');
        const [note, checklist] = await Promise.all([
          supabaseService.getNoteTemplates(purpose),
          supabaseService.getChecklistTemplates(purpose),
        ]);
        set((state: any) => ({
          templates: {
            note,
            checklist,
          },
        }));
      },

      // Check and unlock achievements based on current stats
      checkAndUnlockAchievements: async () => {
        const { user, flightStats, flights } = get();
        if (!user) return [] as { id: AchievementId; title: string }[];

        // Define simple catalog (should match DB seed)
        const catalog: Record<AchievementId, { title: string; predicate: () => boolean }> = {
          'first-flight': {
            title: 'First Flight',
            predicate: () => flights.filter(f => f.status === 'completed').length >= 1,
          },
          'frequent-flyer-10': {
            title: 'Frequent Flyer',
            predicate: () => flights.filter(f => f.status === 'completed').length >= 10,
          },
          'explorer-5-countries': {
            title: 'Explorer',
            predicate: () => {
              const countries = new Set(
                flights.flatMap(f => [f.from.country, f.to.country].filter(Boolean))
              );
              return countries.size >= 5;
            },
          },
          'distance-10k': {
            title: '10,000 KM',
            predicate: () => flightStats.totalDistance >= 10000,
          },
          'distance-50k': {
            title: '50,000 KM',
            predicate: () => flightStats.totalDistance >= 50000,
          },
          // Placeholder not yet implemented (needs times):
          'red-eye-completed': {
            title: 'Red-Eye Runner',
            predicate: () => false,
          },
        };

        const desired: AchievementId[] = (Object.keys(catalog) as AchievementId[])
          .filter(id => catalog[id].predicate());

        try {
          const { data: existing, error } = await supabase
            .from('user_achievements')
            .select('achievement_id')
            .eq('profile_id', user.id);
          if (error) throw error;

          const owned = new Set((existing || []).map(r => r.achievement_id as AchievementId));
          const toInsert = desired.filter(id => !owned.has(id));
          if (toInsert.length === 0) return [];

          // Insert new unlocks
          const rows = toInsert.map(id => ({ profile_id: user.id, achievement_id: id }));
          const { error: insErr } = await supabase.from('user_achievements').insert(rows);
          if (insErr) throw insErr;

          return toInsert.map(id => ({ id, title: catalog[id].title }));
        } catch (e) {
          if (__DEV__) console.error('checkAndUnlockAchievements error:', e);
          return [];
        }
      },
    }),
    {
      name: 'skyline-app-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist essential data
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        flights: state.flights,
        theme: state.theme,
      }),
    }
  )
);

// =============================================
// SELECTORS (for performance)
// =============================================

export const useUser = () => useAppStore((state) => state.user);
export const useIsAuthenticated = () => useAppStore((state) => state.isAuthenticated);
export const useFlights = () => useAppStore((state) => state.flights);
export const useSelectedFlight = () => useAppStore((state) => state.selectedFlight);
export const useFlightStats = () => useAppStore((state) => state.flightStats);
export const useTheme = () => useAppStore((state) => state.theme);
export const useError = () => useAppStore((state) => state.error);
export const useIsLoading = () => useAppStore((state) => state.isLoading);

// =============================================
// ACTIONS (for cleaner imports) - Using individual selectors to prevent infinite loops
// =============================================

// Individual action selectors to prevent object recreation
export const useLogin = () => useAppStore((state) => state.login);
export const useRegister = () => useAppStore((state) => state.register);
export const useLogout = () => useAppStore((state) => state.logout);
export const useUpdateProfile = () => useAppStore((state) => state.updateProfile);

export const useAddFlight = () => useAppStore((state) => state.addFlight);
export const useUpdateFlight = () => useAppStore((state) => state.updateFlight);
export const useDeleteFlight = () => useAppStore((state) => state.deleteFlight);
export const useLoadFlights = () => useAppStore((state) => state.loadFlights);
export const useSelectFlight = () => useAppStore((state) => state.selectFlight);
export const useRecalculateFlightDistances = () => useAppStore((state) => state.recalculateFlightDistances);
export const useCheckAndUnlockAchievements = () => useAppStore((state: any) => state.checkAndUnlockAchievements);

export const useSetError = () => useAppStore((state) => state.setError);
export const useSetTheme = () => useAppStore((state) => state.setTheme);

// Legacy grouped selectors (use individual ones above for better performance)
export const useAuthActions = () => ({
  login: useLogin(),
  register: useRegister(), 
  logout: useLogout(),
  updateProfile: useUpdateProfile(),
});

export const useFlightActions = () => ({
  addFlight: useAddFlight(),
  updateFlight: useUpdateFlight(),
  deleteFlight: useDeleteFlight(),
  loadFlights: useLoadFlights(),
  selectFlight: useSelectFlight(),
});

export const useUIActions = () => ({
  setError: useSetError(),
  setTheme: useSetTheme(),
});
