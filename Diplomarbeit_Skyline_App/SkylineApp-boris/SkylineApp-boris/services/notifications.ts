// Lightweight wrapper around expo-notifications with graceful fallback.
// Avoid hard dependency to keep build working when module isn't installed.
import { Platform } from 'react-native';

const parseHHMM = (hhmm: string): { h: number; m: number } | null => {
  const match = String(hhmm || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  return { h, m };
};

const isInQuietHours = (d: Date, startHHMM: string, endHHMM: string): boolean => {
  const start = parseHHMM(startHHMM);
  const end = parseHHMM(endHHMM);
  if (!start || !end) return false;
  const mins = d.getHours() * 60 + d.getMinutes();
  const startM = start.h * 60 + start.m;
  const endM = end.h * 60 + end.m;
  if (startM === endM) return false;
  // Overnight window (e.g. 22:00 -> 07:00)
  if (startM > endM) return mins >= startM || mins < endM;
  return mins >= startM && mins < endM;
};

const bumpOutOfQuietHours = (when: Date, startHHMM: string, endHHMM: string): Date => {
  if (!isInQuietHours(when, startHHMM, endHHMM)) return when;
  const end = parseHHMM(endHHMM);
  if (!end) return when;

  const bumped = new Date(when);
  bumped.setSeconds(0, 0);
  bumped.setHours(end.h, end.m, 0, 0);

  // If quiet window is overnight and we are in the evening part (after start), bump to next day end time.
  const start = parseHHMM(startHHMM);
  if (start) {
    const mins = when.getHours() * 60 + when.getMinutes();
    const startM = start.h * 60 + start.m;
    const endM = end.h * 60 + end.m;
    if (startM > endM && mins >= startM) {
      bumped.setDate(bumped.getDate() + 1);
      bumped.setHours(end.h, end.m, 0, 0);
    }
  }
  return bumped;
};

type NotificationsModule = {
  requestPermissionsAsync?: () => Promise<any>;
  getPermissionsAsync?: () => Promise<any>;
  setNotificationChannelAsync?: (channelId: string, input: any) => Promise<any>;
  scheduleNotificationAsync?: (input: any) => Promise<any>;
  cancelScheduledNotificationAsync?: (id: string) => Promise<any>;
  AndroidImportance?: { DEFAULT?: number; HIGH?: number; MAX?: number };
  AndroidNotificationPriority?: { DEFAULT?: string | number; HIGH?: string | number; MAX?: string | number };
  SchedulableTriggerInputTypes?: { DATE?: string };
};

export type LocalReminderOptions = {
  channelId?: string;
  channelName?: string;
  importance?: number;
};

export type NotificationInitResult = {
  available: boolean;
  granted: boolean;
  status: 'granted' | 'denied' | 'undetermined' | 'unavailable';
  canAskAgain: boolean;
};

const loadNotificationsModule = async (): Promise<NotificationsModule | null> => {
  if (Platform.OS === 'web') return null;
  try {
    return (await import('expo-notifications')) as any;
  } catch {
    return null;
  }
};

const resolveScheduleTime = async (whenISO?: string): Promise<Date | null> => {
  if (!whenISO) return null;
  let when = new Date(whenISO);
  if (Number.isNaN(when.getTime())) return null;

  // Optional: honor app settings (FA-07)
  try {
    const SettingsService = (await import('./settingsService')).default;
    const settings = await SettingsService.getInstance().getSettings();
    if (!settings.notifications) return null;
    if (settings.quietHoursEnabled) {
      when = bumpOutOfQuietHours(when, settings.quietHoursStart, settings.quietHoursEnd);
    }
  } catch {
    // Fall back to plain scheduling if settings service is unavailable.
  }

  const now = new Date();
  if (when <= now) return null;
  return when;
};

const mapPermissionStatus = (status: any): 'granted' | 'denied' | 'undetermined' => {
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  return 'undetermined';
};

const ensurePermissionGranted = async (
  Notifications: NotificationsModule,
  requestIfNeeded: boolean
): Promise<{
  granted: boolean;
  status: 'granted' | 'denied' | 'undetermined';
  canAskAgain: boolean;
}> => {
  try {
    if (Notifications.getPermissionsAsync) {
      const current = await Notifications.getPermissionsAsync();
      const currentStatus = mapPermissionStatus(current?.status);
      const currentGranted = !!(current?.granted || currentStatus === 'granted');
      const canAskAgain = current?.canAskAgain !== false;
      if (currentGranted) {
        return { granted: true, status: 'granted', canAskAgain };
      }
      if (!requestIfNeeded || !canAskAgain) {
        return { granted: false, status: currentStatus, canAskAgain };
      }
    }

    if (requestIfNeeded && Notifications.requestPermissionsAsync) {
      const requested = await Notifications.requestPermissionsAsync();
      const requestedStatus = mapPermissionStatus(requested?.status);
      return {
        granted: !!(requested?.granted || requestedStatus === 'granted'),
        status: requestedStatus,
        canAskAgain: requested?.canAskAgain !== false,
      };
    }

    return { granted: true, status: 'granted', canAskAgain: true };
  } catch {
    return { granted: false, status: 'undetermined', canAskAgain: false };
  }
};

const ensureReminderChannel = async (
  Notifications: NotificationsModule,
  options?: LocalReminderOptions
): Promise<void> => {
  if (!Notifications.setNotificationChannelAsync) return;
  try {
    const channelId = options?.channelId || 'reminders';
    const channelName = options?.channelName || 'Reminders';
    const importance =
      options?.importance ??
      Notifications.AndroidImportance?.HIGH ??
      Notifications.AndroidImportance?.DEFAULT ??
      3;
    await Notifications.setNotificationChannelAsync(channelId, {
      name: channelName,
      importance,
    });
  } catch {}
};

export const initializeNotifications = async (
  options?: { requestPermission?: boolean }
): Promise<NotificationInitResult> => {
  const Notifications = await loadNotificationsModule();
  if (!Notifications) {
    return {
      available: false,
      granted: false,
      status: 'unavailable',
      canAskAgain: false,
    };
  }

  const permission = await ensurePermissionGranted(Notifications, options?.requestPermission !== false);
  await Promise.allSettled([
    ensureReminderChannel(Notifications, { channelId: 'reminders', channelName: 'Reminders' }),
    ensureReminderChannel(Notifications, { channelId: 'note-reminders', channelName: 'Note Reminders' }),
    ensureReminderChannel(Notifications, { channelId: 'checklist-reminders', channelName: 'Checklist Reminders' }),
  ]);

  return {
    available: true,
    granted: permission.granted,
    status: permission.status,
    canAskAgain: permission.canAskAgain,
  };
};

const scheduleNotificationInternal = async (
  title: string,
  body: string,
  whenISO?: string,
  data?: Record<string, any>,
  options?: LocalReminderOptions
): Promise<string | null> => {
  const when = await resolveScheduleTime(whenISO);
  if (!when) return null;

  const Notifications = await loadNotificationsModule();
  if (!Notifications?.scheduleNotificationAsync) return null;

  const initialized = await initializeNotifications({ requestPermission: true });
  if (!initialized.granted) return null;

  await ensureReminderChannel(Notifications, options);
  const channelId = options?.channelId || 'reminders';
  const content = {
    title,
    body,
    data: data || {},
    channelId,
    sound: 'default',
    priority:
      Notifications.AndroidNotificationPriority?.HIGH ??
      Notifications.AndroidNotificationPriority?.DEFAULT,
  } as any;

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content,
      trigger: when,
    });
    return typeof id === 'string' ? id : null;
  } catch (dateTriggerError) {
    // Some runtimes require explicit DATE trigger object instead of Date.
    try {
      const explicitDateType = Notifications.SchedulableTriggerInputTypes?.DATE ?? 'date';
      const id = await Notifications.scheduleNotificationAsync({
        content,
        trigger: { type: explicitDateType, date: when },
      });
      return typeof id === 'string' ? id : null;
    } catch (explicitTriggerError) {
      if (__DEV__) {
        if (__DEV__) console.warn('[notifications] scheduling failed', { dateTriggerError, explicitTriggerError });
      }
      return null;
    }
  }
};

export async function scheduleLocalReminder(
  title: string,
  body: string,
  whenISO?: string,
  data?: Record<string, any>,
  options?: LocalReminderOptions
): Promise<boolean> {
  try {
    const id = await scheduleNotificationInternal(title, body, whenISO, data, options);
    return !!id;
  } catch (e) {
    if (__DEV__) console.warn('[notifications] scheduleLocalReminder failed:', e);
    return false;
  }
}

export async function scheduleLocalNotificationId(
  title: string,
  body: string,
  whenISO?: string,
  data?: Record<string, any>,
  options?: LocalReminderOptions
): Promise<string | null> {
  try {
    return await scheduleNotificationInternal(title, body, whenISO, data, options);
  } catch (e) {
    if (__DEV__) console.warn('[notifications] scheduleLocalNotificationId failed:', e);
    return null;
  }
}

export async function cancelLocalNotification(id: string): Promise<void> {
  try {
    const Notifications = await loadNotificationsModule();
    if (Notifications?.cancelScheduledNotificationAsync) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }
  } catch (e) {
    if (__DEV__) console.warn('[notifications] cancelLocalNotification failed:', e);
  }
}


