import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { joinCompanyByInviteCode } from '../../services/companyService';

export default function CompanyJoinScreen() {
  const { refreshMemberships, switchCompany } = useAuth();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    const value = token.trim();
    if (!value) {
      Alert.alert('Missing code', 'Please paste the invite code you received.');
      return;
    }

    setLoading(true);
    try {
      const result = await joinCompanyByInviteCode(value);
      await refreshMemberships();
      await switchCompany(result.companyId);
      Alert.alert('Welcome!', 'You have joined the company successfully.', [
        { text: 'Open dashboard', onPress: () => router.replace('/company') },
      ]);
      setToken('');
    } catch (error: any) {
      Alert.alert('Join failed', error.message || 'Could not join with that token.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#0f0f0f', '#160707']}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.header}>
            <Text style={styles.title}>Join a company</Text>
            <Text style={styles.subtitle}>
              Paste the invite code your teammate shared with you. Each code links directly to their company.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.formCard}>
            <Text style={styles.label}>Invite code</Text>
            <View style={styles.inputWrapper}>
              <MaterialIcons name="key" size={18} color="#ff1900" />
              <TextInput
                value={token}
                onChangeText={text => setToken(text.trim())}
                placeholder="ABCDEF12"
                placeholderTextColor="rgba(255,255,255,0.3)"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />
            </View>
            <Button
              title={loading ? 'Joining...' : 'Join company'}
              onPress={handleJoin}
              disabled={loading}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(280).springify()} style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Need help?</Text>
            <Text style={styles.infoText}>
              Ask your company owner to share their invite code from “Company → Invite”.
            </Text>
            <Text style={styles.infoText}>
              Codes can be regenerated at any time by the company owner.
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  content: {
    padding: 20,
    gap: 20,
  },
  header: {
    gap: 8,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    lineHeight: 20,
  },
  formCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(18,18,18,0.9)',
    gap: 16,
  },
  label: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
  },
  infoCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(18,18,18,0.9)',
    gap: 8,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  infoText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    lineHeight: 18,
  },
});
