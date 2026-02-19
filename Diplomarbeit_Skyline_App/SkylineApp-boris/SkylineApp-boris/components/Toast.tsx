import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import {
    Dimensions,
  Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  onHide?: () => void;
  visible: boolean;
}

const TOAST_CONFIG = {
  success: {
    colors: ['#4CAF50', '#45a049'] as const,
    icon: 'check-circle',
  },
  error: {
    colors: ['#ff4444', '#cc0000'] as const,
    icon: 'error',
  },
  warning: {
    colors: ['#FF9800', '#F57C00'] as const,
    icon: 'warning',
  },
  info: {
    colors: ['#2196F3', '#1976D2'] as const,
    icon: 'info',
  },
} as const;

export default function Toast({
  type,
  title,
  message,
  duration = 3000,
  onHide,
  visible,
}: ToastProps) {
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const config = TOAST_CONFIG[type];

  useEffect(() => {
    if (visible) {
      // Show animation
      translateY.value = withSpring(0, {
        damping: 15,
        stiffness: 150,
      });
      opacity.value = withTiming(1, { duration: 300 });

      // Auto hide after duration
      hideTimeoutRef.current = setTimeout(() => {
        hide();
      }, duration);
    } else {
      hide();
    }

    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [visible, duration]);

  const hide = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    translateY.value = withTiming(-100, { duration: 300 });
    opacity.value = withTiming(0, { duration: 300 }, () => {
      if (onHide) {
        runOnJS(onHide)();
      }
    });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <Pressable onPress={hide}>
      <Animated.View style={[styles.container, animatedStyle]}>
        <LinearGradient
          colors={config.colors}
          style={styles.toast}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.iconContainer}>
            <MaterialIcons
              name={config.icon as any}
              size={24}
              color="#fff"
            />
          </View>

          <View style={styles.content}>
            <Text style={styles.title}>{title}</Text>
            {message && (
              <Text style={styles.message}>{message}</Text>
            )}
          </View>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Nexa-Heavy',
    color: '#fff',
  },
  message: {
    fontSize: 14,
    fontFamily: 'Nexa-ExtraLight',
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
});
