import { useFadeInDownOrNone } from '@/hooks/useMotion';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import {
    Pressable,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Shadows, Spacing } from '@/constants/DesignTokens';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  rightComponent?: React.ReactNode;
  onBackPress?: () => void;
  backgroundColor?: string;
  style?: any;
}

export default function AppHeader({
  title,
  subtitle,
  showBackButton = false,
  rightComponent,
  onBackPress,
  backgroundColor = Colors.background.primary,
  style
}: AppHeaderProps) {
  
  const enteringAnim = useFadeInDownOrNone(100);
  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      try {
        const canGoBack = typeof (router as any).canGoBack === 'function' && (router as any).canGoBack();
        if (canGoBack) {
          router.back();
        } else {
          router.replace('/(tabs)/home');
        }
      } catch {
        // Fallback: attempt back, then home
        try { router.back(); } catch {}
        try { router.replace('/(tabs)/home'); } catch {}
      }
    }
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={[styles.safeArea, { backgroundColor }, style]} edges={['top']}>
        <Animated.View entering={enteringAnim} style={styles.wrapper}>
          <View style={styles.headerCard}>
            <LinearGradient
              colors={['rgba(255,25,0,0.22)', 'rgba(15,15,15,0.92)']}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.8, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <BlurView intensity={55} tint="dark" style={StyleSheet.absoluteFill} />
            <LinearGradient
              colors={['rgba(0,212,255,0.35)', 'rgba(0,0,0,0)']}
              start={{ x: -0.2, y: 0.1 }}
              end={{ x: 0.8, y: 1 }}
              style={styles.accentGlow}
            />

            <View style={styles.headerContent}>
              <View style={styles.sideContainer}>
                {showBackButton ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.backButton,
                      pressed && styles.backButtonPressed
                    ]}
                    onPress={handleBackPress}
                    hitSlop={8}
                  >
                    <MaterialIcons name="arrow-back-ios-new" size={18} color="#fff" />
                  </Pressable>
                ) : (
                  <View style={styles.placeholder} />
                )}
              </View>

              <View style={styles.centerSection}>
                <Text style={styles.title} numberOfLines={1}>
                  {title}
                </Text>
                {subtitle && (
                  <Text style={styles.subtitle} numberOfLines={1}>
                    {subtitle}
                  </Text>
                )}
              </View>

              <View style={[styles.sideContainer, styles.rightAlign]}>
                {rightComponent || <View style={styles.placeholder} />}
              </View>
            </View>
          </View>
        </Animated.View>
        <View style={styles.bottomSpacer} />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    zIndex: 1000,
  },
  wrapper: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  headerCard: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(30,30,30,0.92)',
    ...Shadows.lg,
  },
  accentGlow: {
    position: 'absolute',
    top: -120,
    left: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    opacity: 0.8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md + 2,
    minHeight: 60,
  },
  sideContainer: {
    width: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  rightAlign: {
    alignItems: 'flex-end',
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonPressed: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    transform: [{ scale: 0.96 }],
  },
  placeholder: {
    width: 44,
    height: 44,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Nexa-Heavy',
    color: Colors.text.primary,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Nexa-ExtraLight',
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: 2,
  },
  bottomSpacer: {
    height: Spacing.lg,
  },
});
