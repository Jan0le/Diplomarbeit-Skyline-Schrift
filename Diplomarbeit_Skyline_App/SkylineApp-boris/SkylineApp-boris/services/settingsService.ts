/**
 * ⚙️ SETTINGS SERVICE
 * Handles user preferences and app settings
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';

export interface AppSettings {
  notifications: boolean;
  // Reminder categories (user-friendly controls)
  reminderBoarding: boolean;
  reminderCheckIn: boolean;
  reminderMissingDocs: boolean;
  reminderReceipt: boolean;
  reminderNotesChecklists: boolean;
  reminderTips: boolean;
  autoRefresh: boolean;
  locationServices: boolean;
  dataSync: boolean;
  largeFont: boolean;
  reduceAnimations: boolean;
  quietHoursEnabled: boolean;
  // Default quiet hours: 22:00–07:00 (local time). Can be extended later to user-configurable times.
  quietHoursStart: string; // "HH:MM"
  quietHoursEnd: string;   // "HH:MM"
  language: string;
  theme: 'light' | 'dark' | 'system';
}

const DEFAULT_SETTINGS: AppSettings = {
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
  theme: 'system',
};

const SETTINGS_KEY = 'app_settings';

class SettingsService {
  private static instance: SettingsService;
  private settings: AppSettings = DEFAULT_SETTINGS;

  private constructor() {
    this.loadSettings();
  }

  public static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }

  private async loadSettings(): Promise<void> {
    try {
      const storedSettings = await AsyncStorage.getItem(SETTINGS_KEY);
      if (storedSettings) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(storedSettings) };
      }
      DeviceEventEmitter.emit('app_settings_changed');
    } catch (error) {
      this.settings = DEFAULT_SETTINGS;
      DeviceEventEmitter.emit('app_settings_changed');
    }
  }

  async getSettings(): Promise<AppSettings> {
    await this.loadSettings();
    return { ...this.settings };
  }

  async updateSetting<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ): Promise<void> {
    try {
      this.settings[key] = value;
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
      DeviceEventEmitter.emit('app_settings_changed');
    } catch (error) {
      throw error;
    }
  }

  async updateSettings(updates: Partial<AppSettings>): Promise<void> {
    try {
      this.settings = { ...this.settings, ...updates };
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
      DeviceEventEmitter.emit('app_settings_changed');
    } catch (error) {
      throw error;
    }
  }

  async resetSettings(): Promise<void> {
    try {
      this.settings = DEFAULT_SETTINGS;
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
      DeviceEventEmitter.emit('app_settings_changed');
    } catch (error) {
      throw error;
    }
  }

  // Helper methods for specific settings
  async toggleNotifications(): Promise<boolean> {
    const newValue = !this.settings.notifications;
    await this.updateSetting('notifications', newValue);
    return newValue;
  }


  async setLanguage(language: string): Promise<void> {
    await this.updateSetting('language', language);
  }

  async setTheme(theme: 'light' | 'dark' | 'system'): Promise<void> {
    await this.updateSetting('theme', theme);
  }
}

export default SettingsService;
