import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import ScreenWrapper from '../../components/ScreenWrapper';
// ThemeSelector removed: app is dark-only
import SettingsService, { AppSettings } from '../../services/settingsService';

interface ToggleSettingItem {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  value: boolean;
  onToggle: (value: boolean) => void;
  type: 'toggle';
}

interface ActionSettingItem {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  type: 'action';
}

interface CustomSettingItem {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  type: 'custom';
  component: React.ReactNode;
}

type SettingItem = ToggleSettingItem | ActionSettingItem | CustomSettingItem;

export default function SettingsScreen() {
  const hasAnimatedRef = useRef(false);
  const getEntering = useCallback(
    (delay = 0) => (hasAnimatedRef.current ? undefined : FadeInDown.delay(delay).springify()),
    []
  );
  const [settings, setSettings] = useState<AppSettings>({
    notifications: true,
    reminderBoarding: true,
    reminderCheckIn: true,
    reminderMissingDocs: true,
    reminderReceipt: true,
    reminderNotesChecklists: true,
    reminderTips: true,
    autoRefresh: false,
    locationServices: true,
    dataSync: true,
    largeFont: false,
    reduceAnimations: false,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
    language: 'en',
    theme: 'dark' as const,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [editingQuietHours, setEditingQuietHours] = useState(false);
  const [qhStart, setQhStart] = useState('22:00');
  const [qhEnd, setQhEnd] = useState('07:00');
  

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    // Only animate on first mount
    hasAnimatedRef.current = true;
  }, []);

  const loadSettings = async () => {
    try {
      const settingsService = SettingsService.getInstance();
      const currentSettings = await settingsService.getSettings();
      setSettings(currentSettings);
    } catch (error) {
      if (__DEV__) console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const ensureNotificationPermission = async (): Promise<boolean> => {
    const { initializeNotifications } = await import('../../services/notifications');
    const result = await initializeNotifications({ requestPermission: true });
    if (result.available && result.granted) {
      return true;
    }

    const canOpenSettings = result.status === 'denied' || !result.canAskAgain;
    Alert.alert(
      'Notification permission needed',
      canOpenSettings
        ? 'Notifications are blocked for Skyline. Please allow them in system settings.'
        : 'Please allow notifications so reminders can be delivered.',
      canOpenSettings
        ? [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        : [{ text: 'OK', style: 'default' }]
    );
    return false;
  };

  const updateSetting = async <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    try {
      const reminderKeys: (keyof AppSettings)[] = [
        'reminderBoarding',
        'reminderCheckIn',
        'reminderMissingDocs',
        'reminderReceipt',
        'reminderNotesChecklists',
        'reminderTips',
      ];

      if (key === 'notifications' && value === true) {
        const ok = await ensureNotificationPermission();
        if (!ok) {
          // Keep toggle/state off if permission is not granted.
          const settingsService = SettingsService.getInstance();
          await settingsService.updateSetting('notifications', false);
          setSettings(prev => ({ ...prev, notifications: false }));
          return;
        }
      }

      if (reminderKeys.includes(key) && value === true && !settings.notifications) {
        const ok = await ensureNotificationPermission();
        if (!ok) return;
        const settingsService = SettingsService.getInstance();
        await settingsService.updateSetting('notifications', true);
        setSettings(prev => ({ ...prev, notifications: true }));
      }

      const settingsService = SettingsService.getInstance();
      await settingsService.updateSetting(key, value);
      setSettings(prev => ({ ...prev, [key]: value }));
    } catch (error) {
      if (__DEV__) console.error('Error updating setting:', error);
      Alert.alert('Error', 'Failed to update setting. Please try again.');
    }
  };

  const isValidHHMM = (value: string) => {
    const m = String(value || '').trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return false;
    const h = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    return Number.isFinite(h) && Number.isFinite(mm) && h >= 0 && h <= 23 && mm >= 0 && mm <= 59;
  };

  const openQuietHoursEditor = () => {
    setQhStart(settings.quietHoursStart);
    setQhEnd(settings.quietHoursEnd);
    setEditingQuietHours(true);
  };

  const saveQuietHours = () => {
    if (!isValidHHMM(qhStart) || !isValidHHMM(qhEnd)) {
      Alert.alert('Invalid time', 'Please use HH:MM (e.g. 22:00).');
      return;
    }

    // Close immediately and persist in background to keep UI snappy.
    setSettings((prev) => ({ ...prev, quietHoursStart: qhStart, quietHoursEnd: qhEnd }));
    setEditingQuietHours(false);

    setTimeout(() => {
      void (async () => {
        await updateSetting('quietHoursStart', qhStart as any);
        await updateSetting('quietHoursEnd', qhEnd as any);
      })();
    }, 0);
  };

  const sendTestNotification = async () => {
    try {
      if (Platform.OS === 'web') {
        Alert.alert('Not supported on web', 'Local notifications are available only on Android/iOS app builds.');
        return;
      }

      if (!settings.notifications) {
        Alert.alert('Notifications disabled', 'Enable "Push Notifications" in Settings first.');
        return;
      }

      const permissionOk = await ensureNotificationPermission();
      if (!permissionOk) return;

      const when = new Date(Date.now() + 10_000).toISOString();
      const { scheduleLocalReminder } = await import('../../services/notifications');
      const ok = await scheduleLocalReminder(
        'Skyline Test Notification',
        'If you see this on your phone, notifications work.',
        when,
        { url: '/(tabs)/settings' }
      );
      if (ok) {
        Alert.alert('Scheduled', 'Test notification will fire in ~10 seconds.');
      } else {
        let permissionStatus: string | undefined;
        try {
          const Notifications: any = await import('expo-notifications');
          if (Notifications.getPermissionsAsync) {
            const permission = await Notifications.getPermissionsAsync();
            permissionStatus = permission?.status;
          }
        } catch {}

        if (permissionStatus && permissionStatus !== 'granted') {
          Alert.alert('Permission required', 'Allow notifications for Skyline in system settings and try again.');
        } else {
          Alert.alert(
            'Not scheduled',
            'The notification was not scheduled. Check system permissions and ensure the scheduled time is in the future.'
          );
        }
      }
    } catch (e: any) {
      if (__DEV__) console.error('Test notification failed:', e);
      Alert.alert('Error', e?.message || 'Failed to schedule test notification.');
    }
  };

  const handleAbout = () => {
    Alert.alert(
      'About Skyline App',
      'Skyline App\nVersion 1.0.1\n\nDeveloped for enhanced flight tracking experience with modern design and intuitive user interface.',
      [{ text: 'OK', style: 'default' }]
    );
  };

  const handleSupport = () => {
    Alert.alert(
      'Support & Help',
      'Need assistance? We\'re here to help!\n\n📧 Email: support@skyline-app.com\n🌐 Website: skyline-app.com\n📱 In-app feedback: Use the feedback option below',
      [
        { text: 'Send Feedback', onPress: () => handleFeedback() },
        { text: 'OK', style: 'default' }
      ]
    );
  };

  const handleTerms = () => {
    Linking.openURL('https://skylinepromotion.great-site.net');
  };

  const handleFeedback = () => {
    Alert.alert(
      'Send Feedback',
      'Your feedback helps us improve Skyline. What would you like to share?',
      [
        { text: 'Report Bug', onPress: () => Alert.alert('Bug Report', 'Bug reporting feature coming soon!') },
        { text: 'Suggest Feature', onPress: () => Alert.alert('Feature Request', 'Feature request system coming soon!') },
        { text: 'General Feedback', onPress: () => Alert.alert('Feedback', 'General feedback form coming soon!') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handlePrivacy = () => {
    try {
      router.push('/privacy-policy');
    } catch {
    Linking.openURL('https://skylinepromotion.great-site.net');
    }
  };

  const handleDataManagement = () => {
    Alert.alert(
      'Data Management',
      'Manage your app data and storage preferences.',
      [
        { text: 'Clear Cache', onPress: () => Alert.alert('Cache', 'Cache cleared successfully!') },
        { text: 'Export Data', onPress: () => Alert.alert('Export', 'Data export feature coming soon!') },
        { text: 'Reset Settings', style: 'destructive', onPress: () => confirmResetSettings() },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const confirmResetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'This will reset all settings to default values. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: handleResetSettings }
      ]
    );
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all associated data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: handleDeleteAccount }
      ]
    );
  };

  const handleDeleteAccount = async () => {
    try {
      const { supabaseService } = await import('../../services/supabase');
      const user = await supabaseService.getCurrentUser();
      if (!user) {
        Alert.alert('Not signed in');
        return;
      }

      // Call an RPC to delete user data server-side to respect RLS
      const { supabase } = await import('../../services/db');
      const { error } = await supabase.rpc('delete_user_account', { p_user_id: user.id });
      if (error) throw error;

      await supabaseService.signOut();
      Alert.alert('Account deleted', 'Your account and data have been deleted.');
      router.replace('/');
    } catch (error: any) {
      if (__DEV__) console.error('Delete account failed:', error);
      Alert.alert('Error', error.message || 'Failed to delete account.');
    }
  };

  const handleResetSettings = async () => {
    try {
      const settingsService = SettingsService.getInstance();
      await settingsService.resetSettings();
      await loadSettings();
      Alert.alert('Success', 'Settings have been reset to default values.');
    } catch (error) {
      if (__DEV__) console.error('Error resetting settings:', error);
      Alert.alert('Error', 'Failed to reset settings. Please try again.');
    }
  };

  const settingsData: Array<{
    id: string;
    title: string;
    icon: string;
    items: SettingItem[];
  }> = [
    {
      id: 'account',
      title: 'Account',
      icon: 'person',
      items: []
    },
    {
      id: 'general',
      title: 'General',
      icon: 'settings',
      items: [
        {
          id: 'notifications',
          icon: 'notifications',
          title: 'Push Notifications',
          subtitle: 'Receive flight updates',
          value: settings.notifications,
          onToggle: (value) => updateSetting('notifications', value),
          type: 'toggle'
        },
        {
          id: 'quiet_hours',
          icon: 'bedtime',
          title: 'Quiet hours',
          subtitle: `Silence reminders at night (${settings.quietHoursStart}–${settings.quietHoursEnd})`,
          value: settings.quietHoursEnabled,
          onToggle: (value) => updateSetting('quietHoursEnabled', value),
          type: 'toggle'
        }
      ]
    },
    {
      id: 'reminders',
      title: 'Reminders',
      icon: 'notifications-active',
      items: [
        {
          id: 'reminder_boarding',
          icon: 'flight-takeoff',
          title: 'Boarding reminders',
          subtitle: 'Get reminded before boarding',
          value: settings.reminderBoarding,
          onToggle: (value) => updateSetting('reminderBoarding', value),
          type: 'toggle'
        },
        {
          id: 'reminder_checkin',
          icon: 'event-available',
          title: 'Check-in reminders',
          subtitle: 'Get reminded when check-in is available',
          value: settings.reminderCheckIn,
          onToggle: (value) => updateSetting('reminderCheckIn', value),
          type: 'toggle'
        },
        {
          id: 'reminder_missing_docs',
          icon: 'description',
          title: 'Missing documents',
          subtitle: 'Warn me when boarding pass/receipt is missing',
          value: settings.reminderMissingDocs,
          onToggle: (value) => updateSetting('reminderMissingDocs', value),
          type: 'toggle'
        },
        {
          id: 'reminder_receipt',
          icon: 'receipt-long',
          title: 'Receipt reminders',
          subtitle: 'Remind me after the flight to add receipts',
          value: settings.reminderReceipt,
          onToggle: (value) => updateSetting('reminderReceipt', value),
          type: 'toggle'
        },
        {
          id: 'reminder_notes_checklists',
          icon: 'checklist',
          title: 'Notes & checklists reminders',
          subtitle: 'Reminders you set manually in notes/checklists',
          value: settings.reminderNotesChecklists,
          onToggle: (value) => updateSetting('reminderNotesChecklists', value),
          type: 'toggle'
        },
        {
          id: 'reminder_tips',
          icon: 'tips-and-updates',
          title: 'Tips & tutorial notifications',
          subtitle: 'Small hints after adding flights (recommended)',
          value: settings.reminderTips,
          onToggle: (value) => updateSetting('reminderTips', value),
          type: 'toggle'
        },
        {
          id: 'edit_quiet_hours',
          icon: 'schedule',
          title: 'Edit quiet hours times',
          subtitle: `Currently ${settings.quietHoursStart}–${settings.quietHoursEnd}`,
          onPress: openQuietHoursEditor,
          type: 'action'
        },
        {
          id: 'test_notification',
          icon: 'notification-add',
          title: 'Send test notification',
          subtitle: 'Schedules a test notification in 10 seconds',
          onPress: sendTestNotification,
          type: 'action'
        }
      ]
    },
    {
      id: 'support',
      title: 'Support',
      icon: 'help',
      items: [
        {
          id: 'privacy',
          icon: 'privacy-tip',
          title: 'Privacy Policy',
          subtitle: 'Read our privacy practices',
          onPress: handlePrivacy,
          type: 'action'
        },
        {
          id: 'terms',
          icon: 'gavel',
          title: 'Terms of Service',
          subtitle: 'Read our terms',
          onPress: handleTerms,
          type: 'action'
        },
        {
          id: 'delete-account',
          icon: 'delete-forever',
          title: 'Delete Account',
          subtitle: 'Permanently delete your account',
          onPress: confirmDeleteAccount,
          type: 'action'
        }
      ]
    }
  ];

  if (isLoading) {
    return (
      <ScreenWrapper title="Settings" showBackButton={true}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper title="Settings" showBackButton={true}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* General Section */}
        <Animated.View entering={getEntering(300)} style={styles.section}>
          <Text style={styles.sectionTitle}>General</Text>
          <View style={styles.settingsList}>
            {settingsData.find(s => s.id === 'general')?.items.map((item, itemIndex) => (
              <Animated.View
                key={item.id}
                entering={getEntering(350 + itemIndex * 50)}
                style={styles.settingCard}
              >
                <LinearGradient
                  colors={['rgba(30,30,30,0.98)', 'rgba(20,20,20,0.95)']}
                  style={styles.settingGradient}
                >
                  <View style={[
                    styles.settingIcon,
                    { backgroundColor: 'rgba(255,25,0,0.1)' }
                  ]}>
                    <MaterialIcons name={(item as any).icon as any} size={20} color="#ff1900" />
                  </View>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>{(item as any).title}</Text>
                    <Text style={styles.settingDescription}>{(item as any).subtitle}</Text>
                  </View>
                  <Switch
                    value={(item as any).value}
                    onValueChange={(item as any).onToggle}
                    trackColor={{ false: 'rgba(255,255,255,0.15)', true: 'rgba(255,25,0,0.5)' }}
                    thumbColor={(item as any).value ? '#ff1900' : 'rgba(255,255,255,0.9)'}
                    ios_backgroundColor="rgba(255,255,255,0.15)"
                  />
                </LinearGradient>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* Reminders Section */}
        <Animated.View entering={getEntering(360)} style={styles.section}>
          <Text style={styles.sectionTitle}>Reminders</Text>
          <View style={styles.settingsList}>
            {settingsData.find(s => s.id === 'reminders')?.items.map((item, itemIndex) => {
              const isToggle = (item as any).type === 'toggle';
              return (
                <Animated.View
                  key={item.id}
                  entering={getEntering(390 + itemIndex * 40)}
                  style={styles.settingCard}
                >
                  <Pressable
                    disabled={isToggle}
                    style={({ pressed }) => [
                      styles.settingPressable,
                      pressed && !isToggle && styles.settingPressed
                    ]}
                    onPress={(item as any).onPress}
                  >
                    <LinearGradient
                      colors={['rgba(30,30,30,0.98)', 'rgba(20,20,20,0.95)']}
                      style={styles.settingGradient}
                    >
                      <View style={[styles.settingIcon, { backgroundColor: 'rgba(255,25,0,0.1)' }]}>
                        <MaterialIcons name={(item as any).icon as any} size={20} color="#ff1900" />
                      </View>
                      <View style={styles.settingInfo}>
                        <Text style={styles.settingLabel}>{(item as any).title}</Text>
                        <Text style={styles.settingDescription}>{(item as any).subtitle}</Text>
                      </View>
                      {isToggle ? (
                        <Switch
                          value={(item as any).value}
                          onValueChange={(item as any).onToggle}
                          trackColor={{ false: 'rgba(255,255,255,0.15)', true: 'rgba(255,25,0,0.5)' }}
                          thumbColor={(item as any).value ? '#ff1900' : 'rgba(255,255,255,0.9)'}
                          ios_backgroundColor="rgba(255,255,255,0.15)"
                        />
                      ) : (
                        <MaterialIcons name="chevron-right" size={20} color="rgba(255,255,255,0.5)" />
                      )}
                    </LinearGradient>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        </Animated.View>

        {/* Support Section */}
        <Animated.View entering={getEntering(400)} style={styles.section}>
          <Text style={styles.sectionTitle}>Support & Legal</Text>
          <View style={styles.settingsList}>
            {settingsData.find(s => s.id === 'support')?.items.map((item, itemIndex) => {
              const isDelete = item.id === 'delete-account';
              return (
                <Animated.View
                  key={item.id}
                  entering={getEntering(450 + itemIndex * 50)}
                  style={[styles.settingCard, isDelete && styles.deleteCard]}
                >
                  <Pressable
                    style={({ pressed }) => [
                      styles.settingPressable,
                      pressed && styles.settingPressed
                    ]}
                    onPress={(item as any).onPress}
                  >
                    <LinearGradient
                      colors={isDelete 
                        ? ['rgba(255,25,0,0.15)', 'rgba(24,24,24,0.9)']
                        : ['rgba(30,30,30,0.98)', 'rgba(20,20,20,0.95)']
                      }
                      style={styles.settingGradient}
                    >
                      <View style={[
                        styles.settingIcon,
                        { backgroundColor: isDelete ? 'rgba(255,25,0,0.2)' : 'rgba(255,25,0,0.1)' }
                      ]}>
                        <MaterialIcons 
                          name={(item as any).icon as any} 
                          size={20} 
                          color={isDelete ? '#ff1900' : '#ff1900'} 
                        />
                      </View>
                      <View style={styles.settingInfo}>
                        <Text style={[
                          styles.settingLabel,
                          isDelete && styles.deleteLabel
                        ]}>
                          {(item as any).title}
                        </Text>
                        <Text style={styles.settingDescription}>{(item as any).subtitle}</Text>
                      </View>
                      <MaterialIcons 
                        name="chevron-right" 
                        size={20} 
                        color={isDelete ? '#ff1900' : 'rgba(255,255,255,0.5)'} 
                      />
                    </LinearGradient>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        </Animated.View>

        {/* App Version Footer */}
        <Animated.View 
          entering={getEntering(600)}
          style={styles.footer}
        >
          <Text style={styles.footerText}>Skyline App</Text>
          <Text style={styles.footerVersion}>version 1.0.1</Text>
          <Text style={styles.footerCopyright}>© 2026 Skyline App</Text>
        </Animated.View>
      </ScrollView>

      {/* Quiet hours editor modal (simple, no native deps) */}
      {editingQuietHours && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Quiet hours</Text>
            <Text style={styles.modalHint}>Enter times as HH:MM (24h), e.g. 22:00.</Text>
            <View style={styles.modalRow}>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>Start</Text>
                <TextInput
                  value={qhStart}
                  onChangeText={setQhStart}
                  style={styles.modalInput}
                  placeholder="22:00"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                />
              </View>
              <View style={styles.modalField}>
                <Text style={styles.modalLabel}>End</Text>
                <TextInput
                  value={qhEnd}
                  onChangeText={setQhEnd}
                  style={styles.modalInput}
                  placeholder="07:00"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                />
              </View>
            </View>
            <View style={styles.modalActions}>
              <Pressable onPress={() => setEditingQuietHours(false)} style={styles.modalBtnSecondary}>
                <Text style={styles.modalBtnTextSecondary}>Cancel</Text>
              </Pressable>
              <Pressable onPress={saveQuietHours} style={styles.modalBtnPrimary}>
                <Text style={styles.modalBtnTextPrimary}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Nexa-ExtraLight',
    color: 'rgba(255,255,255,0.7)',
  },

  // ScrollView
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 40,
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Nexa-Heavy',
    fontWeight: 'normal', // Ensure fontFamily takes precedence
    color: '#fff',
    marginHorizontal: 20,
    marginBottom: 12,
  },

  // Settings List
  settingsList: {
    paddingHorizontal: 20,
    gap: 8,
  },
  settingCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  deleteCard: {
    borderWidth: 1,
    borderColor: 'rgba(255,25,0,0.3)',
    borderRadius: 16,
  },
  settingPressable: {
    borderRadius: 16,
  },
  settingPressed: {
    transform: [{ scale: 0.98 }],
  },
  settingGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontFamily: 'Nexa-Heavy',
    fontWeight: 'normal', // Ensure fontFamily takes precedence
    color: '#fff',
    marginBottom: 2,
  },
  deleteLabel: {
    color: '#ff1900',
  },
  settingDescription: {
    fontSize: 11,
    fontFamily: 'Nexa-ExtraLight',
    color: 'rgba(255,255,255,0.6)',
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    marginTop: 8,
  },
  footerText: {
    fontSize: 16,
    fontFamily: 'Nexa-ExtraLight',
    color: '#fff',
    marginBottom: 4,
  },
  footerVersion: {
    fontSize: 13,
    fontFamily: 'Nexa-ExtraLight',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 6,
  },
  footerCopyright: {
    fontSize: 11,
    fontFamily: 'Nexa-ExtraLight',
    color: 'rgba(255,255,255,0.5)',
  },

  // Simple modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 18,
    padding: 16,
    backgroundColor: 'rgba(18,18,18,0.98)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  modalTitle: { color: '#fff', fontFamily: 'Nexa-Heavy', fontSize: 18, marginBottom: 6 },
  modalHint: { color: 'rgba(255,255,255,0.65)', fontFamily: 'Nexa-ExtraLight', marginBottom: 12 },
  modalRow: { flexDirection: 'row', gap: 12 },
  modalField: { flex: 1, gap: 6 },
  modalLabel: { color: 'rgba(255,255,255,0.7)', fontFamily: 'Nexa-Heavy', fontSize: 12 },
  modalInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    color: '#fff',
    fontFamily: 'Nexa-Heavy',
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 },
  modalBtnSecondary: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  modalBtnPrimary: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff1900',
  },
  modalBtnTextSecondary: { color: '#fff', fontFamily: 'Nexa-Heavy' },
  modalBtnTextPrimary: { color: '#fff', fontFamily: 'Nexa-Heavy' },
});