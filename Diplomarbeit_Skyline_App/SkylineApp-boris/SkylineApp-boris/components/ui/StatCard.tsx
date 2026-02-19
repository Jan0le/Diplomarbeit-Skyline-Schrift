import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BorderRadius, Colors, Spacing, Typography } from '../../constants/DesignTokens';

type StatCardProps = {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
  color?: string;
  bgColor?: string;
  accessibilityLabel?: string;
};

export function StatCard({
  icon,
  label,
  value,
  color = Colors.primary.main,
  bgColor = 'rgba(255,25,0,0.1)',
  accessibilityLabel,
}: StatCardProps) {
  return (
    <View
      style={styles.card}
      accessibilityLabel={accessibilityLabel ?? `${label}: ${value}`}
      accessibilityRole="text"
    >
      <LinearGradient
        colors={['rgba(30,30,30,0.98)', 'rgba(20,20,20,0.95)']}
        style={styles.gradient}
      >
        <View style={[styles.iconContainer, { backgroundColor: bgColor }]}>
          <MaterialIcons name={icon} size={20} color={color} />
        </View>
        <Text style={styles.value} numberOfLines={1}>
          {value}
        </Text>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 100,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  gradient: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  value: {
    fontFamily: Typography.fontFamily.display,
    fontSize: Typography.fontSize.xl,
    color: Colors.text.primary,
    marginBottom: 2,
  },
  label: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
});
