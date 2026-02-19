import SettingsService, { AppSettings } from '@/services/settingsService';
import { useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';

export function useAppSettings(): AppSettings {
  const [settings, setSettings] = useState<AppSettings>({
    notifications: true,
    reminderBoarding: true,
    reminderCheckIn: true,
    reminderMissingDocs: true,
    reminderReceipt: true,
    reminderNotesChecklists: true,
    reminderTips: true,
    autoRefresh: false,
    locationServices: true,
    dataSync: true,
    largeFont: false,
    reduceAnimations: false,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
    language: 'en',
    theme: 'dark',
  });

  useEffect(() => {
    let isMounted = true;
    const svc = SettingsService.getInstance();
    svc.getSettings().then(s => { if (isMounted) setSettings(s); });

    const sub = DeviceEventEmitter.addListener('app_settings_changed', async () => {
      const latest = await svc.getSettings();
      if (isMounted) setSettings(latest);
    });

    return () => {
      isMounted = false;
      sub.remove();
    };
  }, []);

  return settings;
}

export function useLargeFontScale(): number {
  const { largeFont } = useAppSettings();
  return largeFont ? 1.2 : 1.0;
}


