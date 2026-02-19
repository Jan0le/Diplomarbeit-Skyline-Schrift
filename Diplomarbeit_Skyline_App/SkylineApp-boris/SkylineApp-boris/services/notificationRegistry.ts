import { supabase } from './db';
import type { PostgrestSingleResponse } from '@supabase/supabase-js';

export type NotificationRecord = {
  id: string;
  user_id: string;
  fire_at: string;
  kind: string;
  payload: Record<string, any>;
  status: 'pending' | 'scheduled_local' | 'sent' | 'cancelled' | 'failed';
  local_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

const table = 'notifications';

async function assertOk<T>(res: PostgrestSingleResponse<T>): Promise<T> {
  if (res.error) throw res.error;
  return res.data as T;
}

export async function registerNotification(
  userId: string,
  fireAt: string,
  kind: string,
  payload: Record<string, any>,
  localId?: string | null
): Promise<NotificationRecord | null> {
  try {
    const { data, error } = await supabase
      .from(table)
      .insert({
        user_id: userId,
        fire_at: fireAt,
        kind,
        payload,
        status: 'scheduled_local',
        local_id: localId ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as NotificationRecord;
  } catch (e) {
    if (__DEV__) console.warn('registerNotification failed', e);
    return null;
  }
}

export async function updateNotificationLocalId(id: string, localId: string | null): Promise<void> {
  try {
    await supabase.from(table).update({ local_id: localId, status: 'scheduled_local' }).eq('id', id);
  } catch (e) {
    if (__DEV__) console.warn('updateNotificationLocalId failed', e);
  }
}

export async function markNotificationStatus(id: string, status: NotificationRecord['status']): Promise<void> {
  try {
    await supabase.from(table).update({ status }).eq('id', id);
  } catch (e) {
    if (__DEV__) console.warn('markNotificationStatus failed', e);
  }
}

export async function fetchPendingNotifications(userId: string, nowISO?: string): Promise<NotificationRecord[]> {
  try {
    const now = nowISO ?? new Date().toISOString();
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('user_id', userId)
      .in('status', ['pending', 'scheduled_local'])
      .is('local_id', null)
      .gt('fire_at', now);
    if (error) throw error;
    return (data || []) as NotificationRecord[];
  } catch (e) {
    if (__DEV__) console.warn('fetchPendingNotifications failed', e);
    return [];
  }
}

export async function cleanupPastNotifications(userId: string): Promise<void> {
  try {
    const now = new Date().toISOString();
    await supabase
      .from(table)
      .update({ status: 'sent' })
      .eq('user_id', userId)
      .lt('fire_at', now)
      .eq('status', 'pending');
  } catch (e) {
    if (__DEV__) console.warn('cleanupPastNotifications failed', e);
  }
}

export async function cancelNotificationsByFlight(userId: string, flightId: string): Promise<void> {
  try {
    await supabase
      .from(table)
      .update({ status: 'cancelled' })
      .eq('user_id', userId)
      .contains('payload', { data: { flightId } });
  } catch (e) {
    if (__DEV__) console.warn('cancelNotificationsByFlight failed', e);
  }
}


