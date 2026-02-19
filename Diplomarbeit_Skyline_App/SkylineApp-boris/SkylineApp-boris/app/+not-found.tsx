import { Link, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BorderRadius, Colors, Spacing, Typography } from '@/constants/DesignTokens';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <LinearGradient
        colors={['#1a1a1a', '#121212']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.container}>
        <Text style={styles.title}>This screen does not exist.</Text>
        <Link href="/" asChild>
          <Pressable style={({ pressed }) => [styles.link, pressed && styles.linkPressed]}>
            <LinearGradient
              colors={['#FF1900', '#CC1400']}
              style={styles.linkGradient}
            >
              <Text style={styles.linkText}>Go to home screen</Text>
            </LinearGradient>
          </Pressable>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing['2xl'],
  },
  title: {
    fontFamily: Typography.fontFamily.display,
    fontSize: Typography.fontSize['2xl'],
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  link: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  linkPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  linkGradient: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing['2xl'],
    borderRadius: BorderRadius.xl,
  },
  linkText: {
    fontFamily: Typography.fontFamily.regular,
    fontSize: Typography.fontSize.base,
    color: Colors.primary.contrast,
  },
});
