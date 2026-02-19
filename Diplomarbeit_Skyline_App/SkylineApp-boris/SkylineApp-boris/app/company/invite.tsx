import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { ensureCompanyInviteCode, regenerateCompanyInviteCode } from '../../services/companyService';

export default function CompanyInviteScreen() {
  const { currentCompanyRole, currentCompanyId } = useAuth();
  const [inviteCode, setInviteCode] = useState<string>('—');
  const [loading, setLoading] = useState(false);

  const canInvite = currentCompanyRole === 'owner';

  const loadInviteCode = useCallback(async (force?: boolean) => {
    if (!currentCompanyId) return;
    try {
      setLoading(true);
      const code = force && canInvite
        ? await regenerateCompanyInviteCode(currentCompanyId)
        : await ensureCompanyInviteCode(currentCompanyId);
      setInviteCode(code);
    } catch (error) {
      if (__DEV__) console.warn('Failed to load invite code:', error);
    } finally {
      setLoading(false);
    }
  }, [currentCompanyId, canInvite]);

  useEffect(() => {
    if ((!inviteCode || inviteCode === '—') && currentCompanyId) {
      loadInviteCode();
    }
  }, [inviteCode, loadInviteCode, currentCompanyId]);

  const handleCopy = useCallback(() => {
    if (!inviteCode || inviteCode === '—') {
      Alert.alert('Invite code unavailable', 'Create or select a company first.');
      return;
    }
    const normalized = inviteCode.trim();
    if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
      navigator.clipboard?.writeText(normalized).then(() => {
        Alert.alert('Invite code copied', 'Share it with your teammates.');
      }).catch(() => {
        Alert.alert('Invite code', normalized);
      });
    } else {
      Alert.alert('Invite code', normalized);
    }
  }, [inviteCode]);

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1a0b0b', '#0f0f0f']}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.header}>
          <Text style={styles.title}>Share your company code</Text>
          <Text style={styles.subtitle}>
            Every account gets a unique invite code. Teammates can join your company from the Join screen by entering this code.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.codeCard}>
          <View style={styles.codeHeader}>
            <Text style={styles.codeLabel}>Invite code</Text>
            <Pressable style={styles.copyButton} onPress={handleCopy}>
              <MaterialIcons name="content-copy" size={16} color="#ff1900" />
              <Text style={styles.copyButtonText}>Copy</Text>
            </Pressable>
          </View>
          <Text style={styles.codeValue}>{loading ? '…' : inviteCode}</Text>
          <Text style={styles.codeHint}>
            Share this code with trusted teammates only. Anyone who redeems it joins the same company as you.
          </Text>
          <Button
            title={loading ? 'Refreshing…' : 'Regenerate code'}
            onPress={() => loadInviteCode(true)}
            disabled={loading || !canInvite || !currentCompanyId}
          />
          {!canInvite && (
            <Text style={styles.warning}>
              Only company owners can generate invite codes. Your current role is {currentCompanyRole || 'worker'}.
            </Text>
          )}
          {!currentCompanyId && (
            <Text style={styles.warning}>
              You are not assigned to a company yet. Create or join a company first.
            </Text>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(280).springify()} style={styles.infoCard}>
          <Text style={styles.sectionTitle}>How teammates join</Text>
          <View style={styles.infoRow}>
            <MaterialIcons name="person-add" size={16} color="#ff1900" />
            <Text style={styles.infoText}>
              Share your invite code with them.
            </Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons name="login" size={16} color="#ff1900" />
            <Text style={styles.infoText}>
              They open Company → Join and paste the code.
            </Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons name="verified" size={16} color="#ff1900" />
            <Text style={styles.infoText}>
              Once accepted, they appear instantly in your team list.
            </Text>
          </View>
        </Animated.View>

        <Pressable
          style={styles.backButton}
          onPress={() => {
            const canGoBack = typeof (router as any).canGoBack === 'function' && (router as any).canGoBack();
            if (canGoBack) router.back(); else router.replace('/(tabs)/home');
          }}
        >
          <Text style={styles.backButtonText}>Back to dashboard</Text>
        </Pressable>
      </ScrollView>
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
  codeCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(18,18,18,0.9)',
    gap: 16,
  },
  codeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  codeValue: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 6,
  },
  codeHint: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    lineHeight: 18,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,25,0,0.15)',
  },
  copyButtonText: {
    color: '#ff1900',
    fontSize: 12,
    fontWeight: '600',
  },
  infoCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(18,18,18,0.9)',
    gap: 12,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    flex: 1,
  },
  warning: {
    color: '#ff8a65',
    fontSize: 12,
    lineHeight: 16,
  },
  backButton: {
    alignSelf: 'center',
    marginTop: 8,
  },
  backButtonText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});
