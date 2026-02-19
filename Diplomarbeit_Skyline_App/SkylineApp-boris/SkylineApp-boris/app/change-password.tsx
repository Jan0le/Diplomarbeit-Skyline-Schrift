import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import ValidatedInput from '@/components/ValidatedInput';
import { useToast } from '@/components/ToastProvider';
import { BorderRadius, Colors, Spacing, Typography } from '../constants/DesignTokens';
import ScreenWrapper from '../components/ScreenWrapper';
import { supabase } from '../services/db';
import { validatePassword } from '../utils/validation';

export default function ChangePasswordScreen() {
  const { showToast } = useToast();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorNew, setErrorNew] = useState<string | undefined>();
  const [errorConfirm, setErrorConfirm] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    let valid = true;
    const validationResult = validatePassword(newPassword);
    if (!validationResult.isValid) {
      setErrorNew(validationResult.errors.password || 'Invalid password');
      valid = false;
    } else {
      setErrorNew(undefined);
    }
    if (confirmPassword !== newPassword) {
      setErrorConfirm('Passwords do not match');
      valid = false;
    } else {
      setErrorConfirm(undefined);
    }
    return valid;
  };

  const handleSave = async () => {
    if (isLoading) return;
    if (!validate()) return;
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        throw error;
      }
      try {
        showToast('success', 'Password updated', 'Your password has been changed successfully.', 2500);
      } catch {}
      router.back();
    } catch (error: any) {
      if (__DEV__) console.error('Change password failed:', error);
      Alert.alert('Error', error?.message || 'Failed to change password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenWrapper title="Change Password" showBackButton keyboardAvoiding>
      <View style={styles.content}>
        <Text style={styles.description}>
          Set a new password for your Skyline account. Make sure it is at least 8 characters long.
        </Text>

        <ValidatedInput
          label="New password"
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="Enter new password"
          secureTextEntry
          required
          icon="lock"
          error={errorNew}
        />

        <ValidatedInput
          label="Confirm password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Re-enter new password"
          secureTextEntry
          required
          icon="lock"
          error={errorConfirm}
        />

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
              isLoading && styles.buttonDisabled,
            ]}
            onPress={handleSave}
            disabled={isLoading}
          >
            <LinearGradient
              colors={
                isLoading
                  ? ['rgba(200,200,200,0.4)', 'rgba(140,140,140,0.4)']
                  : ['#ff2a10', '#ff5915']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryButtonGradient}
            >
              <MaterialIcons name="check-circle" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>
                {isLoading ? 'Saving...' : 'Save password'}
              </Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => router.back()}
          >
            <View style={styles.secondaryButtonInner}>
              <MaterialIcons name="close" size={18} color="rgba(255,255,255,0.7)" />
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </View>
          </Pressable>
        </View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing['2xl'],
    gap: Spacing.lg,
  },
  description: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  actions: {
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  primaryButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.component.buttonPadding,
    gap: 8,
  },
  primaryButtonText: {
    fontFamily: Typography.fontFamily.display,
    color: Colors.text.primary,
    letterSpacing: 0.3,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  secondaryButton: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border.secondary,
    backgroundColor: Colors.background.secondary,
  },
  secondaryButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.component.buttonPadding,
    gap: 8,
  },
  secondaryButtonText: {
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.secondary,
  },
});

