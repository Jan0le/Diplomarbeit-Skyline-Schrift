import { fetchPendingNotifications, markNotificationStatus, updateNotificationLocalId, cleanupPastNotifications } from './notificationRegistry';
import { scheduleLocalNotificationId } from './notifications';
import SettingsService from './settingsService';

export async function reschedulePendingNotificationsForUser(userId: string): Promise<number> {
  try {
    const settings = await SettingsService.getInstance().getSettings();
    if (!settings.notifications) return 0;

    await cleanupPastNotifications(userId);
    const pending = await fetchPendingNotifications(userId);
    let scheduled = 0;

    for (const record of pending) {
      try {
        const payload = record.payload || {};
        const title = payload.title || 'Reminder';
        const body = payload.body || '';
        const data = payload.data || {};
        const localId = await scheduleLocalNotificationId(title, body, record.fire_at, data);
        if (localId) {
          await updateNotificationLocalId(record.id, localId);
          scheduled++;
        } else {
          await markNotificationStatus(record.id, 'failed');
        }
      } catch (e) {
        if (__DEV__) console.warn('reschedule single notification failed', e);
        await markNotificationStatus(record.id, 'failed');
      }
    }
    return scheduled;
  } catch (e) {
    if (__DEV__) console.warn('reschedulePendingNotificationsForUser failed', e);
    return 0;
  }
}

