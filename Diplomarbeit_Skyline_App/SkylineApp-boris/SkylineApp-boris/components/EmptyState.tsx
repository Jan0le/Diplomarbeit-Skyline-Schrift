import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

interface EmptyStateProps {
  icon?: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: any;
}

export default function EmptyState({
  icon = 'inbox',
  title,
  message,
  actionLabel,
  onAction,
  style
}: EmptyStateProps) {
  return (
    <Animated.View entering={FadeInUp.springify()} style={[styles.container, style]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MaterialIcons name={icon as any} size={64} color="rgba(255,255,255,0.3)" />
        </View>
        
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        
        {actionLabel && onAction && (
          <Pressable style={styles.actionButton} onPress={onAction}>
            <LinearGradient
              colors={['#ff1900', '#ff3b00']}
              style={styles.actionGradient}
            >
              <MaterialIcons name="add" size={20} color="#fff" />
              <Text style={styles.actionText}>{actionLabel}</Text>
            </LinearGradient>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  content: {
    alignItems: 'center',
    maxWidth: 300,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Nexa-Heavy',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    fontFamily: 'Nexa-ExtraLight',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  actionButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  actionText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Nexa-ExtraLight',
    marginLeft: 8,
  },
});
