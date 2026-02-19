import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BorderRadius, Colors, Spacing, Typography } from '../../constants/DesignTokens';

type SettingRowProps = {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  subtitle: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  variant?: 'default' | 'logout';
  accessibilityLabel?: string;
};

export function SettingRow({
  icon,
  title,
  subtitle,
  onPress,
  rightElement,
  variant = 'default',
  accessibilityLabel,
}: SettingRowProps) {
  const isLogout = variant === 'logout';
  const content = (
    <LinearGradient
      colors={
        isLogout
          ? ['rgba(255,25,0,0.15)', 'rgba(24,24,24,0.9)']
          : ['rgba(30,30,30,0.98)', 'rgba(20,20,20,0.95)']
      }
      style={styles.gradient}
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: isLogout ? 'rgba(255,25,0,0.2)' : 'rgba(255,25,0,0.1)' },
        ]}
      >
        <MaterialIcons
          name={icon}
          size={20}
          color={Colors.primary.main}
        />
      </View>
      <View style={styles.info}>
        <Text style={[styles.title, isLogout && styles.logoutTitle]}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      {rightElement ?? (
        <MaterialIcons
          name={isLogout ? 'logout' : 'chevron-right'}
          size={20}
          color={isLogout ? Colors.primary.main : Colors.text.tertiary}
        />
      )}
    </LinearGradient>
  );

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [styles.pressable, pressed && styles.pressed, isLogout && styles.logoutPressable]}
        onPress={onPress}
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityRole="button"
        accessibilityHint={subtitle}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={styles.wrapper}>{content}</View>;
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  pressable: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.9,
  },
  logoutPressable: {
    borderWidth: 1,
    borderColor: 'rgba(255,25,0,0.3)',
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  info: {
    flex: 1,
  },
  title: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
    marginBottom: 2,
  },
  logoutTitle: {
    color: Colors.primary.main,
    fontFamily: Typography.fontFamily.display,
  },
  subtitle: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
});
