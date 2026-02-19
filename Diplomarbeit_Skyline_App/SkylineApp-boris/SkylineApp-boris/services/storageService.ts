import AsyncStorage from '@react-native-async-storage/async-storage';

interface StorageKeys {
  EMAIL_ACCOUNTS: string;
  CALENDAR_ACCOUNTS: string;
  SYNC_SETTINGS: string;
  FLIGHT_DATA: string;
  USER_PREFERENCES: string;
}

const STORAGE_KEYS: StorageKeys = {
  EMAIL_ACCOUNTS: 'skyline_email_accounts',
  CALENDAR_ACCOUNTS: 'skyline_calendar_accounts',
  SYNC_SETTINGS: 'skyline_sync_settings',
  FLIGHT_DATA: 'skyline_flight_data',
  USER_PREFERENCES: 'skyline_user_preferences'
};

class StorageService {
  private static instance: StorageService;

  private constructor() {}

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  // Generic storage methods
  async setItem<T>(key: string, value: T): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
      throw error;
    }
  }

  async getItem<T>(key: string): Promise<T | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      return null;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      throw error;
    }
  }

  // Email accounts storage
  async saveEmailAccounts(accounts: any[]): Promise<void> {
    await this.setItem(STORAGE_KEYS.EMAIL_ACCOUNTS, accounts);
  }

  async getEmailAccounts(): Promise<any[]> {
    const accounts = await this.getItem<any[]>(STORAGE_KEYS.EMAIL_ACCOUNTS);
    return accounts || [];
  }

  async removeEmailAccount(accountId: string): Promise<void> {
    const accounts = await this.getEmailAccounts();
    const filteredAccounts = accounts.filter(acc => acc.id !== accountId);
    await this.saveEmailAccounts(filteredAccounts);
  }

  // Calendar accounts storage
  async saveCalendarAccounts(accounts: any[]): Promise<void> {
    await this.setItem(STORAGE_KEYS.CALENDAR_ACCOUNTS, accounts);
  }

  async getCalendarAccounts(): Promise<any[]> {
    const accounts = await this.getItem<any[]>(STORAGE_KEYS.CALENDAR_ACCOUNTS);
    return accounts || [];
  }

  async removeCalendarAccount(accountId: string): Promise<void> {
    const accounts = await this.getCalendarAccounts();
    const filteredAccounts = accounts.filter(acc => acc.id !== accountId);
    await this.saveCalendarAccounts(filteredAccounts);
  }

  // Sync settings storage
  async saveSyncSettings(settings: any): Promise<void> {
    await this.setItem(STORAGE_KEYS.SYNC_SETTINGS, settings);
  }

  async getSyncSettings(): Promise<any> {
    const settings = await this.getItem(STORAGE_KEYS.SYNC_SETTINGS);
    return settings || {
      autoSync: true,
      syncInterval: 30,
      syncOnAppOpen: true,
      syncOnBackground: false,
      includeFlightEvents: true,
      createFlightEvents: true
    };
  }

  // Flight data storage
  async saveFlightData(flights: any[]): Promise<void> {
    await this.setItem(STORAGE_KEYS.FLIGHT_DATA, flights);
  }

  async getFlightData(): Promise<any[]> {
    const flights = await this.getItem<any[]>(STORAGE_KEYS.FLIGHT_DATA);
    return flights || [];
  }

  // User preferences storage
  async saveUserPreferences(preferences: any): Promise<void> {
    await this.setItem(STORAGE_KEYS.USER_PREFERENCES, preferences);
  }

  async getUserPreferences(): Promise<any> {
    const preferences = await this.getItem(STORAGE_KEYS.USER_PREFERENCES);
    return preferences || {
      theme: 'dark',
      language: 'en',
      notifications: true,
      autoSync: true
    };
  }

  // Utility methods
  async getAllKeys(): Promise<string[]> {
    try {
      return [...(await AsyncStorage.getAllKeys())];
    } catch (error) {
      return [];
    }
  }

  async getStorageSize(): Promise<number> {
    try {
      const keys = await this.getAllKeys();
      let totalSize = 0;
      
      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length;
        }
      }
      
      return totalSize;
    } catch (error) {
      return 0;
    }
  }
}

export default StorageService;
