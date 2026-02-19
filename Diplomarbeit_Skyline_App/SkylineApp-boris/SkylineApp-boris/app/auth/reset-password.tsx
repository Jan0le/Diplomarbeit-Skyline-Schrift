import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '../../services/db';
import { validatePassword } from '../../utils/validation';

type RouteParams = {
  access_token?: string | string[];
  refresh_token?: string | string[];
  code?: string | string[];
  token_hash?: string | string[];
  type?: string | string[];
};

const getFirstParam = (value?: string | string[]): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

const getParamFromUrl = (url: string | null, key: string): string | undefined => {
  if (!url) return undefined;

  const queryStart = url.indexOf('?');
  const hashStart = url.indexOf('#');
  const queryPart = queryStart >= 0 ? url.slice(queryStart + 1, hashStart >= 0 ? hashStart : undefined) : '';
  const hashPart = hashStart >= 0 ? url.slice(hashStart + 1) : '';

  const queryParams = new URLSearchParams(queryPart);
  const hashParams = new URLSearchParams(hashPart);
  return queryParams.get(key) ?? hashParams.get(key) ?? undefined;
};

export default function ResetPasswordScreen() {
  const router = useRouter();
  const currentUrl = Linking.useURL();
  const params = useLocalSearchParams<RouteParams>();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorNew, setErrorNew] = useState<string | undefined>();
  const [errorConfirm, setErrorConfirm] = useState<string | undefined>();
  const [sessionResolving, setSessionResolving] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;

    const setupRecoverySession = async () => {
      setSessionResolving(true);
      setSessionError(null);

      try {
        const { data: existingSessionData } = await supabase.auth.getSession();
        if (existingSessionData.session) {
          if (!active) return;
          setSessionReady(true);
          return;
        }

        const accessToken =
          getFirstParam(params.access_token) ?? getParamFromUrl(currentUrl, 'access_token');
        const refreshToken =
          getFirstParam(params.refresh_token) ?? getParamFromUrl(currentUrl, 'refresh_token');
        const code = getFirstParam(params.code) ?? getParamFromUrl(currentUrl, 'code');
        const tokenHash = getFirstParam(params.token_hash) ?? getParamFromUrl(currentUrl, 'token_hash');
        const type = getFirstParam(params.type) ?? getParamFromUrl(currentUrl, 'type');

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
          if (!active) return;
          setSessionReady(true);
          return;
        }

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          if (!active) return;
          setSessionReady(true);
          return;
        }

        if (type === 'recovery' && tokenHash) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          });
          if (error) throw error;
          if (!active) return;
          setSessionReady(true);
          return;
        }

        throw new Error('Invalid or expired password reset link. Please request a new one.');
      } catch (error: any) {
        if (!active) return;
        setSessionError(error?.message || 'Could not validate recovery link. Please request a new one.');
      } finally {
        if (!active) return;
        setSessionResolving(false);
      }
    };

    void setupRecoverySession();

    return () => {
      active = false;
    };
  }, [currentUrl, params.access_token, params.refresh_token, params.code, params.token_hash, params.type]);

  const validateForm = () => {
    let valid = true;
    const passwordValidation = validatePassword(newPassword);
    const passwordError = passwordValidation.errors.password;

    if (passwordError) {
      setErrorNew(passwordError);
      valid = false;
    } else {
      setErrorNew(undefined);
    }

    if (!confirmPassword) {
      setErrorConfirm('Please confirm your new password');
      valid = false;
    } else if (confirmPassword !== newPassword) {
      setErrorConfirm('Passwords do not match');
      valid = false;
    } else {
      setErrorConfirm(undefined);
    }

    return valid;
  };

  const handleSave = async () => {
    if (isSaving || !sessionReady) return;
    if (!validateForm()) return;

    try {
      setIsSaving(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        throw error;
      }

      await supabase.auth.signOut().catch(() => {});
      Alert.alert('Password updated', 'Your password has been changed. Please log in with your new password.');
      router.replace('/auth/login');
    } catch (error: any) {
      Alert.alert('Update failed', error?.message || 'Could not update password. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#212121', '#1a1a1a']} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <MaterialIcons name="vpn-key" size={30} color="#ff1900" />
            </View>
            <Text style={styles.title}>Set New Password</Text>
            <Text style={styles.subtitle}>
              Create a new password for your account. Use at least 8 characters with uppercase, lowercase, and a
              number.
            </Text>
          </View>

          {sessionResolving ? (
            <View style={styles.statusCard}>
              <ActivityIndicator color="#ff1900" />
              <Text style={styles.statusText}>Validating recovery link...</Text>
            </View>
          ) : sessionError ? (
            <View style={styles.errorCard}>
              <MaterialIcons name="error-outline" size={24} color="#ff6b6b" />
              <Text style={styles.errorTitle}>Link unavailable</Text>
              <Text style={styles.errorText}>{sessionError}</Text>
              <Pressable
                style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
                onPress={() => router.replace('/auth/forgot-password')}
              >
                <LinearGradient colors={['#ff3b00', '#ff1900']} style={styles.buttonGradient}>
                  <Text style={styles.buttonText}>Request New Link</Text>
                </LinearGradient>
              </Pressable>
            </View>
          ) : (
            <View style={styles.form}>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="lock" size={20} color="rgba(255, 255, 255, 0.5)" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="New Password"
                  placeholderTextColor="rgba(255, 255, 255, 0.3)"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
              {!!errorNew && <Text style={styles.inputError}>{errorNew}</Text>}

              <View style={[styles.inputWrapper, styles.inputSpacing]}>
                <MaterialIcons name="lock-outline" size={20} color="rgba(255, 255, 255, 0.5)" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  placeholderTextColor="rgba(255, 255, 255, 0.3)"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
              {!!errorConfirm && <Text style={styles.inputError}>{errorConfirm}</Text>}

              <Pressable
                style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
                onPress={handleSave}
                disabled={isSaving}
              >
                <LinearGradient colors={['#ff3b00', '#ff1900']} style={styles.buttonGradient}>
                  {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save Password</Text>}
                </LinearGradient>
              </Pressable>
            </View>
          )}

          <Pressable style={styles.backLink} onPress={() => router.replace('/auth/login')}>
            <MaterialIcons name="arrow-back" size={16} color="#ff1900" />
            <Text style={styles.backLinkText}>Back to Login</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#212121',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 25, 0, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Nexa-Heavy',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Nexa-ExtraLight',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    marginBottom: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
  },
  inputSpacing: {
    marginTop: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Nexa-ExtraLight',
  },
  inputError: {
    color: '#ff6b6b',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 6,
    fontFamily: 'Nexa-ExtraLight',
  },
  button: {
    borderRadius: 24,
    overflow: 'hidden',
    marginTop: 20,
    backgroundColor: '#ff1900',
    shadowColor: '#ff1900',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
  },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
    borderRadius: 24,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Nexa-ExtraLight',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Nexa-ExtraLight',
  },
  errorCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.4)',
    backgroundColor: 'rgba(255, 107, 107, 0.08)',
    padding: 16,
    gap: 8,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Nexa-Heavy',
  },
  errorText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Nexa-ExtraLight',
  },
  backLink: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  backLinkText: {
    color: '#ff1900',
    fontSize: 14,
    fontFamily: 'Nexa-ExtraLight',
  },
});
