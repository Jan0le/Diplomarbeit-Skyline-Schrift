import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import ValidatedInput from '@/components/ValidatedInput';
import { useToast } from '@/components/ToastProvider';
import ScreenWrapper from '../components/ScreenWrapper';
import { useAuth } from '../contexts/AuthContext';
import {
  BorderRadius,
  Colors,
  Shadows,
  Spacing,
  Typography,
} from '../constants/DesignTokens';
import { supabase } from '../services/db';
import ImageUploadService from '../services/imageUploadService';
import { SupabaseService } from '../services/supabase';

export default function EditProfileScreen() {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const isMountedRef = useRef(true);
  const [userData, setUserData] = useState<{ name: string; email: string; profileImage?: string } | null>(null);
  const [editedName, setEditedName] = useState('');
  const [editedEmail, setEditedEmail] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const [emailError, setEmailError] = useState<string | undefined>(undefined);

  const initials = useMemo(() => {
    const parts = editedName.trim().split(' ');
    if (!parts.length) return 'U';
    const letters = parts.map(part => part[0]?.toUpperCase()).filter(Boolean);
    return letters.slice(0, 2).join('');
  }, [editedName]);

  useEffect(() => {
    loadUserData();
  }, [user]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadUserData = async () => {
    try {
      if (user) {
        setUserData({
          name: user.name,
          email: user.email,
          profileImage: user.profileImage
        });
        setEditedName(user.name);
        setEditedEmail(user.email);
        setProfileImage(user.profileImage || null);
      }
    } catch (error) {
      if (__DEV__) console.error('Error loading user data:', error);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled) {
        setProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleSave = useCallback(() => {
    if (isLoading) return;

    setIsLoading(true);
    const trimmedName = editedName.trim();
    const trimmedEmail = editedEmail.trim();

    if (!trimmedName) {
      setNameError('Name cannot be empty');
      setIsLoading(false);
      return;
    } else {
      setNameError(undefined);
    }

    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setEmailError('Please enter a valid email address');
      setIsLoading(false);
      return;
    } else {
      setEmailError(undefined);
    }

    // Snapshot values so background save isn't affected by re-renders
    const snapshot = {
      userId: user?.id || '',
      previousImageUrl: user?.profileImage,
      newImageUri: profileImage,
      name: trimmedName,
      email: trimmedEmail,
    };

    // Navigate immediately back to Profile tab
    router.replace('/(tabs)/profile');

    // Save in background (mirrors flight save pattern)
    setTimeout(async () => {
      try {
        let finalImageUrl = snapshot.previousImageUrl; // Keep existing by default

        // Upload new image if changed
        if (snapshot.newImageUri && snapshot.newImageUri !== snapshot.previousImageUrl) {
          const uploadService = ImageUploadService.getInstance();
          const isCurrentImageFromSupabase = uploadService.isSupabaseImageUrl(snapshot.previousImageUrl || '');
          finalImageUrl = await uploadService.updateProfileImage(
            snapshot.newImageUri,
            snapshot.userId,
            isCurrentImageFromSupabase ? snapshot.previousImageUrl : undefined
          );
        }

        // Update profile in Supabase
        const supabaseService = SupabaseService.getInstance();
        await supabaseService.updateProfile({
          name: snapshot.name,
          email: snapshot.email,
          profileImage: finalImageUrl,
        });

        // Update AuthContext immediately so Profile UI updates
        updateUser({
          name: snapshot.name,
          email: snapshot.email,
          profileImage: finalImageUrl,
        });

        // Optional: reload from DB to ensure everything is fully synced
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();

          if (profile) {
            updateUser({
              name: profile.full_name || snapshot.name,
              email: snapshot.email,
              profileImage: profile.avatar_url || finalImageUrl,
            });
          }
        }

        try {
          showToast('success', 'Saved', 'Profile updated successfully.', 2500);
        } catch {}
      } catch (error: any) {
        try {
          showToast('error', 'Save Failed', error?.message || 'Failed to update profile. Please try again.');
        } catch {}
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    }, 0);
  }, [editedEmail, editedName, isLoading, profileImage, showToast, updateUser, user?.id, user?.profileImage]);

  return (
    <ScreenWrapper title="Edit Profile" showBackButton>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          entering={FadeInDown.delay(120).springify()}
          style={styles.heroCardWrapper}
        >
          <View style={styles.heroCard}>
            <LinearGradient
              colors={['rgba(255,25,0,0.38)', 'rgba(30,0,0,0.65)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
            <LinearGradient
              colors={['rgba(255,25,0,0.55)', 'rgba(0,0,0,0)']}
              start={{ x: -0.4, y: 0.2 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroGlow}
            />
            <View style={styles.heroContent}>
              <Pressable onPress={pickImage} style={styles.avatarContainer}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.avatarImage} />
                ) : (
                  <LinearGradient
                    colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.02)']}
                    style={styles.avatarPlaceholder}
                  >
                    <Text style={styles.avatarInitials}>{initials}</Text>
                  </LinearGradient>
                )}
                <View style={styles.avatarBadge}>
                  <MaterialIcons name="edit" size={16} color="#fff" />
                </View>
              </Pressable>

              <View style={styles.heroText}>
                <Text style={styles.heroTitle}>{editedName || 'Your Name'}</Text>
                <Text style={styles.heroSubtitle}>
                  {editedEmail || 'Add your email address'}
                </Text>
                <Pressable onPress={pickImage} style={styles.heroLink}>
                  <Text style={styles.heroLinkText}>Update profile photo</Text>
                  <MaterialIcons name="arrow-forward-ios" size={12} color="#ff3b00" />
                </Pressable>
              </View>
            </View>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(220).springify()}
          style={styles.formCard}
        >
          <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFill} />
          <LinearGradient
            colors={['rgba(255,255,255,0.04)', 'rgba(0,0,0,0.4)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.formHeader}>
            <View>
              <Text style={styles.formTitle}>Account Details</Text>
              <Text style={styles.formSubtitle}>
                Keep your personal information up to date
              </Text>
            </View>
            <MaterialIcons name="shield-moon" size={22} color="rgba(255,255,255,0.65)" />
          </View>

          <ValidatedInput
            label="Full name"
            value={editedName}
            onChangeText={setEditedName}
            placeholder="Enter your full name"
            autoCapitalize="words"
            error={nameError}
          />

          <ValidatedInput
            label="Email address"
            value={editedEmail}
            onChangeText={setEditedEmail}
            placeholder="your.email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={emailError}
          />
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(300).springify()}
          style={styles.ctaSection}
        >
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
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <MaterialIcons name="check-circle" size={20} color="#fff" />
                  <Text style={styles.primaryButtonText}>Save changes</Text>
                </>
              )}
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
        </Animated.View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing['3xl'],
    paddingTop: Spacing.lg,
    gap: Spacing['2xl'],
  },
  heroCardWrapper: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  heroCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    top: -80,
    left: -60,
    borderRadius: 120,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    gap: Spacing.lg,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarInitials: {
    fontSize: 36,
    fontFamily: Typography.fontFamily.display,
    color: Colors.text.primary,
    letterSpacing: 1.2,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ff1900',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.4)',
  },
  heroText: {
    flex: 1,
    gap: Spacing.xs,
  },
  heroTitle: {
    fontSize: 20,
    fontFamily: Typography.fontFamily.display,
    color: Colors.text.primary,
    letterSpacing: -0.2,
  },
  heroSubtitle: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.secondary,
  },
  heroLink: {
    marginTop: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  heroLinkText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: '#ff3b00',
    letterSpacing: 0.3,
  },
  formCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    overflow: 'hidden',
    gap: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    ...Shadows.md,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  formTitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.display,
    color: Colors.text.primary,
  },
  formSubtitle: {
    marginTop: 4,
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.secondary,
  },
  ctaSection: {
    gap: Spacing.md,
  },
  primaryButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  primaryButtonText: {
    fontFamily: Typography.fontFamily.display,
    color: Colors.text.primary,
    letterSpacing: 0.3,
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  secondaryButton: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  secondaryButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  secondaryButtonText: {
    fontFamily: Typography.fontFamily.regular,
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.2,
  },
});