import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Checklist, Note } from '../types';

type ReminderStore = {
  notes: Record<string, string>;
  checklists: Record<string, string>;
};

const STORE_KEY = 'note_checklist_reminder_ids_v1';

const emptyStore = (): ReminderStore => ({ notes: {}, checklists: {} });

async function loadStore(): Promise<ReminderStore> {
  try {
    const raw = await AsyncStorage.getItem(STORE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return emptyStore();
    return {
      notes: parsed.notes && typeof parsed.notes === 'object' ? parsed.notes : {},
      checklists: parsed.checklists && typeof parsed.checklists === 'object' ? parsed.checklists : {},
    };
  } catch {
    return emptyStore();
  }
}

async function saveStore(store: ReminderStore): Promise<void> {
  try {
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {}
}

async function shouldScheduleNoteChecklistReminders(): Promise<boolean> {
  try {
    const SettingsService = (await import('./settingsService')).default;
    const settings = await SettingsService.getInstance().getSettings();
    return !!(settings.notifications && settings.reminderNotesChecklists);
  } catch {
    return false;
  }
}

function buildNoteMessage(note: Note): string {
  const title = String(note.title || '').trim();
  return title ? `Don't forget: ${title}` : 'Open Skyline to review your note.';
}

function buildChecklistMessage(checklist: Checklist): string {
  const title = String(checklist.title || '').trim();
  return title ? `Checklist due: ${title}` : 'Open Skyline to review your checklist.';
}

export async function scheduleOrUpdateNoteReminder(note: Note): Promise<void> {
  const { scheduleLocalNotificationId, cancelLocalNotification } = await import('./notifications');
  const store = await loadStore();
  const previousId = store.notes[note.id];

  if (!note.reminderAt || !(await shouldScheduleNoteChecklistReminders())) {
    if (previousId) {
      await cancelLocalNotification(previousId);
      delete store.notes[note.id];
      await saveStore(store);
    }
    return;
  }

  const nextId = await scheduleLocalNotificationId(
    'Skyline: Note Reminder',
    buildNoteMessage(note),
    note.reminderAt,
    { url: `/trip-details?id=${note.flightId}&tab=notes`, kind: 'note', entityId: note.id },
    { channelId: 'note-reminders', channelName: 'Note Reminders' }
  );

  if (previousId && previousId !== nextId) {
    await cancelLocalNotification(previousId);
    delete store.notes[note.id];
  }

  if (!nextId) {
    await saveStore(store);
    return;
  }

  store.notes[note.id] = nextId;
  await saveStore(store);
}

export async function cancelNoteReminder(noteId: string): Promise<void> {
  if (!noteId) return;
  const { cancelLocalNotification } = await import('./notifications');
  const store = await loadStore();
  const existingId = store.notes[noteId];
  if (!existingId) return;
  await cancelLocalNotification(existingId);
  delete store.notes[noteId];
  await saveStore(store);
}

export async function scheduleOrUpdateChecklistReminder(checklist: Checklist): Promise<void> {
  const { scheduleLocalNotificationId, cancelLocalNotification } = await import('./notifications');
  const store = await loadStore();
  const previousId = store.checklists[checklist.id];

  if (!checklist.reminderAt || !(await shouldScheduleNoteChecklistReminders())) {
    if (previousId) {
      await cancelLocalNotification(previousId);
      delete store.checklists[checklist.id];
      await saveStore(store);
    }
    return;
  }

  const nextId = await scheduleLocalNotificationId(
    'Skyline: Checklist Reminder',
    buildChecklistMessage(checklist),
    checklist.reminderAt,
    { url: `/trip-details?id=${checklist.flightId}&tab=checklists`, kind: 'checklist', entityId: checklist.id },
    { channelId: 'checklist-reminders', channelName: 'Checklist Reminders' }
  );

  if (previousId && previousId !== nextId) {
    await cancelLocalNotification(previousId);
    delete store.checklists[checklist.id];
  }

  if (!nextId) {
    await saveStore(store);
    return;
  }

  store.checklists[checklist.id] = nextId;
  await saveStore(store);
}

export async function cancelChecklistReminder(checklistId: string): Promise<void> {
  if (!checklistId) return;
  const { cancelLocalNotification } = await import('./notifications');
  const store = await loadStore();
  const existingId = store.checklists[checklistId];
  if (!existingId) return;
  await cancelLocalNotification(existingId);
  delete store.checklists[checklistId];
  await saveStore(store);
}

