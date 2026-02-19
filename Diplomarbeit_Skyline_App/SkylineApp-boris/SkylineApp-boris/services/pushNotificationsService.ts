import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { getProfilePreferences, updateProfilePreferences } from './profilePreferencesService';

export async function registerForPushNotifications(userId: string): Promise<string | null> {
  try {
    if (!Device.isDevice) return null;

    const existing = await Notifications.getPermissionsAsync();
    let finalStatus = existing.status;

    if (existing.status !== 'granted') {
      const ask = await Notifications.requestPermissionsAsync();
      finalStatus = ask.status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'a83f213b-41e2-430f-b636-c79a34caa7a1',
    });
    const token = tokenData?.data;
    if (!token) return null;

    const prefs = await getProfilePreferences(userId);
    if (prefs.expoPushToken !== token) {
      await updateProfilePreferences(userId, { expoPushToken: token });
    }
    return token;
  } catch (e) {
    if (__DEV__) console.warn('registerForPushNotifications failed', e);
    return null;
  }
}

export async function sendExpoPushMessage(token: string, title: string, body: string, data?: Record<string, any>): Promise<boolean> {
  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: token,
        title,
        body,
        data: data || {},
        sound: 'default',
        priority: 'high',
      }),
    });
    if (!res.ok) return false;
    const json = await res.json();
    return !json?.data?.status || json?.data?.status === 'ok';
  } catch (e) {
    if (__DEV__) console.warn('sendExpoPushMessage failed', e);
    return false;
  }
}

