/**
 * 🎨 THEME SERVICE
 * Handles app theming and color schemes
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, ColorSchemeName } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  // Primary colors
  primary: string;
  primaryLight: string;
  primaryDark: string;
  
  // Background colors
  background: string;
  surface: string;
  surfaceVariant: string;
  
  // Text colors
  text: string;
  textSecondary: string;
  textDisabled: string;
  
  // Border colors
  border: string;
  borderLight: string;
  
  // Status colors
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // Overlay colors
  overlay: string;
  backdrop: string;
}

const LIGHT_THEME: ThemeColors = {
  primary: '#ff1900',
  primaryLight: '#ff3b00',
  primaryDark: '#cc1400',
  
  background: '#ffffff',
  surface: '#f8f9fa',
  surfaceVariant: '#e9ecef',
  
  text: '#212529',
  textSecondary: '#6c757d',
  textDisabled: '#adb5bd',
  
  border: '#dee2e6',
  borderLight: '#e9ecef',
  
  success: '#28a745',
  warning: '#ffc107',
  error: '#dc3545',
  info: '#17a2b8',
  
  overlay: 'rgba(0, 0, 0, 0.5)',
  backdrop: 'rgba(0, 0, 0, 0.25)',
};

const DARK_THEME: ThemeColors = {
  primary: '#ff1900',
  primaryLight: '#ff3b00',
  primaryDark: '#cc1400',
  
  background: '#000000',
  surface: '#1a1a1a',
  surfaceVariant: '#2a2a2a',
  
  text: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textDisabled: 'rgba(255, 255, 255, 0.5)',
  
  border: 'rgba(255, 255, 255, 0.1)',
  borderLight: 'rgba(255, 255, 255, 0.05)',
  
  success: '#28a745',
  warning: '#ffc107',
  error: '#dc3545',
  info: '#17a2b8',
  
  overlay: 'rgba(0, 0, 0, 0.7)',
  backdrop: 'rgba(0, 0, 0, 0.5)',
};

class ThemeService {
  private static instance: ThemeService;
  private currentTheme: ThemeMode = 'system';
  private listeners: Array<(theme: ThemeColors) => void> = [];

  private constructor() {
    this.loadTheme();
    // Listen to system theme changes
    Appearance.addChangeListener(this.handleSystemThemeChange);
  }

  public static getInstance(): ThemeService {
    if (!ThemeService.instance) {
      ThemeService.instance = new ThemeService();
    }
    return ThemeService.instance;
  }

  private async loadTheme(): Promise<void> {
    try {
      const storedTheme = await AsyncStorage.getItem('theme_mode');
      if (storedTheme && ['light', 'dark', 'system'].includes(storedTheme)) {
        this.currentTheme = storedTheme as ThemeMode;
      }
    } catch (error) {
      // Error handled silently
    }
  }

  private handleSystemThemeChange = (preferences: { colorScheme: ColorSchemeName }) => {
    if (this.currentTheme === 'system') {
      this.notifyListeners();
    }
  };

  private notifyListeners(): void {
    const theme = this.getCurrentTheme();
    this.listeners.forEach(listener => listener(theme));
  }

  getCurrentThemeMode(): ThemeMode {
    return this.currentTheme;
  }

  getCurrentTheme(): ThemeColors {
    if (this.currentTheme === 'system') {
      const systemTheme = Appearance.getColorScheme();
      return systemTheme === 'dark' ? DARK_THEME : LIGHT_THEME;
    }
    return this.currentTheme === 'dark' ? DARK_THEME : LIGHT_THEME;
  }

  async setTheme(theme: ThemeMode): Promise<void> {
    try {
      this.currentTheme = theme;
      await AsyncStorage.setItem('theme_mode', theme);
      this.notifyListeners();
    } catch (error) {
      throw error;
    }
  }

  addThemeListener(listener: (theme: ThemeColors) => void): () => void {
    this.listeners.push(listener);
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Helper methods for common theme operations
  isDarkMode(): boolean {
    const theme = this.getCurrentTheme();
    return theme === DARK_THEME;
  }

  getContrastColor(backgroundColor: string): string {
    // Simple contrast calculation - in a real app you'd use a more sophisticated algorithm
    return this.isDarkMode() ? '#ffffff' : '#000000';
  }

  getStatusBarStyle(): 'light-content' | 'dark-content' {
    return this.isDarkMode() ? 'light-content' : 'dark-content';
  }
}

export default ThemeService;
