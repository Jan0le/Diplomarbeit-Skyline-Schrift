import { supabase } from './db';
import { scheduleLocalReminder } from './notifications';
import type { CalendarEventRow } from './calendarService';

export interface ReminderRow {
  id: string;
  event_id: string;
  remind_at: string;
  status: 'pending' | 'sent' | 'dismissed';
  created_at: string;
}

export async function ensureDefaultRemindersForEvents(events: CalendarEventRow[], minutesBefore = 60): Promise<void> {
  const eventsWithStart = events.filter(e => !!e.starts_at);
  if (eventsWithStart.length === 0) return;

  const eventIds = eventsWithStart.map(e => e.id);
  const { data: existing, error } = await supabase
    .from('reminders')
    .select('event_id')
    .in('event_id', eventIds);
  if (error) return;

  const existingSet = new Set((existing || []).map(r => r.event_id));
  const toInsert = eventsWithStart
    .filter(e => !existingSet.has(e.id))
    .map(e => ({
      event_id: e.id,
      remind_at: new Date(new Date(e.starts_at as string).getTime() - minutesBefore * 60 * 1000).toISOString(),
      status: 'pending' as const,
    }));

  if (toInsert.length === 0) return;
  await supabase.from('reminders').insert(toInsert);
}

export async function schedulePendingReminders(): Promise<number> {
  const nowISO = new Date().toISOString();
  const { data, error } = await supabase
    .from('reminders')
    .select('id, event_id, remind_at, status, events:title=events(title)')
    .eq('status', 'pending')
    .gt('remind_at', nowISO);
  if (error || !data) return 0;

  let count = 0;
  for (const r of data as any[]) {
    const title = r.title?.title ?? 'Reminder';
    const ok = await scheduleLocalReminder(title, '', r.remind_at);
    if (ok) {
      await supabase.from('reminders').update({ status: 'sent' }).eq('id', r.id);
      count++;
    }
  }
  return count;
}


