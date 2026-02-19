import { supabase } from './db';

export type EventSourceType = 'flight' | 'checklist' | 'note';

export interface CalendarEventRow {
  id: string;
  user_id: string;
  trip_id: string | null;
  source_type: EventSourceType;
  source_id: string;
  title: string;
  starts_at: string | null;
  ends_at: string | null;
  status: 'pending' | 'delivered' | 'seen';
  created_at: string;
}

export async function getUserEvents(userId: string): Promise<CalendarEventRow[]> {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .order('starts_at', { ascending: true });
    if (error) throw error;
    return data as CalendarEventRow[];
  } catch (e: any) {
    // If table doesn't exist or RLS denies, return empty quietly
    if (e?.code === 'PGRST205') {
      return [];
    }
    if (typeof e?.message === 'string' && e.message.includes('relation')) {
      return [];
    }
    return [];
  }
}

export async function bulkForward(
  tripId: string,
  checklistIds: string[] = [],
  noteIds: string[] = [],
  target: 'all_assigned' | 'user_ids' = 'all_assigned',
  userIds?: string[]
): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('bulk_forward', {
      p_trip_id: tripId,
      p_checklist_ids: checklistIds,
      p_note_ids: noteIds,
      p_target: target,
      p_user_ids: userIds ?? null,
    });
    if (error) throw error;
    return (data as number) || 0;
    } catch (e) {
      return 0;
    }
}


