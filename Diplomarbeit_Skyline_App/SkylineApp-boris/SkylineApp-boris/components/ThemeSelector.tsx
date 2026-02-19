/**
 * 🎨 THEME SELECTOR COMPONENT
 * Beautiful theme selection component
 */

import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import ThemeService, { ThemeColors, ThemeMode } from '../services/themeService';

interface ThemeOption {
  id: ThemeMode;
  label: string;
  description: string;
  icon: string;
  preview: string[];
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'light',
    label: 'Light',
    description: 'Clean and bright interface',
    icon: 'light-mode',
    preview: ['#ffffff', '#f8f9fa', '#e9ecef'],
  },
  {
    id: 'dark',
    label: 'Dark',
    description: 'Easy on the eyes',
    icon: 'dark-mode',
    preview: ['#000000', '#1a1a1a', '#2a2a2a'],
  },
  {
    id: 'system',
    label: 'System',
    description: 'Follows device setting',
    icon: 'settings-brightness',
    preview: ['#ff1900', '#ff3b00', '#cc1400'],
  },
];

interface ThemeSelectorProps {
  onThemeChange?: (theme: ThemeMode) => void;
}

export default function ThemeSelector({ onThemeChange }: ThemeSelectorProps) {
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>('system');
  const [themeColors, setThemeColors] = useState<ThemeColors>(ThemeService.getInstance().getCurrentTheme());
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const themeService = ThemeService.getInstance();
    setCurrentTheme(themeService.getCurrentThemeMode());
    setThemeColors(themeService.getCurrentTheme());

    // Listen for theme changes
    const unsubscribe = themeService.addThemeListener((colors) => {
      setThemeColors(colors);
    });

    return unsubscribe;
  }, []);

  const handleThemeSelect = async (theme: ThemeMode) => {
    try {
      const themeService = ThemeService.getInstance();
      await themeService.setTheme(theme);
      setCurrentTheme(theme);
      setIsVisible(false);
      onThemeChange?.(theme);
    } catch (error) {
      if (__DEV__) console.error('Error setting theme:', error);
    }
  };

  const currentOption = THEME_OPTIONS.find(option => option.id === currentTheme);

  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed }) => [
          styles.selectorButton,
          pressed && styles.selectorPressed,
          { backgroundColor: themeColors.surface, borderColor: themeColors.border }
        ]}
        onPress={() => setIsVisible(!isVisible)}
      >
        <View style={styles.selectorContent}>
          <View style={styles.themePreview}>
            {currentOption?.preview.map((color, index) => (
              <View
                key={index}
                style={[
                  styles.previewColor,
                  { backgroundColor: color },
                  index === 0 && styles.firstPreview,
                  index === currentOption.preview.length - 1 && styles.lastPreview,
                ]}
              />
            ))}
          </View>
          
          <View style={styles.selectorInfo}>
            <Text style={[styles.selectorLabel, { color: themeColors.text }]}>
              {currentOption?.label}
            </Text>
            <Text style={[styles.selectorDescription, { color: themeColors.textSecondary }]}>
              {currentOption?.description}
            </Text>
          </View>

          <MaterialIcons
            name={isVisible ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
            size={24}
            color={themeColors.textSecondary}
          />
        </View>
      </Pressable>

      {isVisible && (
        <Animated.View
          entering={FadeInDown.springify().damping(15)}
          style={[
            styles.optionsContainer,
            { backgroundColor: themeColors.surface, borderColor: themeColors.border }
          ]}
        >
          {THEME_OPTIONS.map((option, index) => (
            <Animated.View
              key={option.id}
              entering={FadeInDown.delay(index * 100).springify()}
            >
              <Pressable
                style={({ pressed }) => [
                  styles.optionButton,
                  pressed && styles.optionPressed,
                  currentTheme === option.id && styles.selectedOption,
                  { borderBottomColor: themeColors.borderLight }
                ]}
                onPress={() => handleThemeSelect(option.id)}
              >
                <View style={styles.optionContent}>
                  <View style={styles.themePreview}>
                    {option.preview.map((color, colorIndex) => (
                      <View
                        key={colorIndex}
                        style={[
                          styles.previewColor,
                          { backgroundColor: color },
                          colorIndex === 0 && styles.firstPreview,
                          colorIndex === option.preview.length - 1 && styles.lastPreview,
                        ]}
                      />
                    ))}
                  </View>

                  <View style={styles.optionInfo}>
                    <Text style={[styles.optionLabel, { color: themeColors.text }]}>
                      {option.label}
                    </Text>
                    <Text style={[styles.optionDescription, { color: themeColors.textSecondary }]}>
                      {option.description}
                    </Text>
                  </View>

                  {currentTheme === option.id && (
                    <MaterialIcons
                      name="check-circle"
                      size={20}
                      color={themeColors.primary}
                    />
                  )}
                </View>
              </Pressable>
            </Animated.View>
          ))}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  
  // Selector Button
  selectorButton: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  selectorPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectorInfo: {
    flex: 1,
    marginLeft: 12,
  },
  selectorLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  selectorDescription: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Options Container
  optionsContainer: {
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  optionButton: {
    padding: 16,
    borderBottomWidth: 1,
  },
  optionPressed: {
    opacity: 0.7,
  },
  selectedOption: {
    backgroundColor: 'rgba(255, 25, 0, 0.05)',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Theme Preview
  themePreview: {
    flexDirection: 'row',
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  previewColor: {
    flex: 1,
  },
  firstPreview: {
    borderTopLeftRadius: 15,
    borderBottomLeftRadius: 15,
  },
  lastPreview: {
    borderTopRightRadius: 15,
    borderBottomRightRadius: 15,
  },
});
