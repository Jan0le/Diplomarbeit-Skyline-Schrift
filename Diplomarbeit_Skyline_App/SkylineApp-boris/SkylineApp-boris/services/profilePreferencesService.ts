import { supabase } from './db';

export type ProfilePreferences = {
  hasSeenTripDetailsTutorial?: boolean;
  expoPushToken?: string | null;
  // room for future: reminder preferences synced to backend
};

export async function getProfilePreferences(userId: string): Promise<ProfilePreferences> {
  const { data, error } = await supabase
    .from('profiles')
    .select('preferences')
    .eq('id', userId)
    .single();
  if (error) throw error;
  const prefs = (data as any)?.preferences;
  return (prefs && typeof prefs === 'object') ? prefs : {};
}

export async function updateProfilePreferences(userId: string, patch: Partial<ProfilePreferences>): Promise<ProfilePreferences> {
  const current = await getProfilePreferences(userId);
  const next = { ...current, ...patch };
  const { data, error } = await supabase
    .from('profiles')
    .update({ preferences: next, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select('preferences')
    .single();
  if (error) throw error;
  const prefs = (data as any)?.preferences;
  return (prefs && typeof prefs === 'object') ? prefs : next;
}


