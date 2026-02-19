import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../contexts/AuthContext';

export default function AuthIndexScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [isChecking, setIsChecking] = useState(true);
  const [hasAccount, setHasAccount] = useState<boolean | null>(null);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    checkAccountStatus();
  }, []);

  const checkAccountStatus = async () => {
    try {
      // Add a small delay to ensure AsyncStorage has been updated
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const onboardingStatus = await AsyncStorage.getItem('hasSeenOnboarding');
      setHasSeenOnboarding(onboardingStatus === 'true');
      
      if (onboardingStatus !== 'true') {
        router.replace('/auth/onboarding');
        return;
      }
      
      const hasAccountData = await AsyncStorage.getItem('hasAccount');
      
      if (hasAccountData === 'true') {
        router.replace('/auth/login');
        return;
      } else {
        router.replace('/auth/signup');
        return;
      }
    } catch (error) {
      router.replace('/auth/signup');
    }
  };

  const handleLogin = () => {
    AsyncStorage.setItem('hasAccount', 'true');
    router.push('/auth/login');
  };

  const handleSignup = () => {
    AsyncStorage.setItem('hasAccount', 'false');
    router.push('/auth/signup');
  };

  if (isAuthenticated) {
    // Handled by auth flow in _layout.tsx
  }

  // Show loading while checking
  if (isChecking) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#212121', '#1a1a1a']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff1900" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // If we're redirecting to onboarding, show loading
  if (hasSeenOnboarding === false) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#212121', '#1a1a1a']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff1900" />
          <Text style={styles.loadingText}>Redirecting...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#212121', '#1a1a1a']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/SkylineLOGOWHite.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.title}>Welcome to Skyline</Text>
        <Text style={styles.subtitle}>
          {hasAccount 
            ? "Welcome back! Sign in to continue tracking your flights."
            : "Let's get started! Create your account to begin tracking flights."
          }
        </Text>

        <View style={styles.buttonContainer}>
          {hasAccount ? (
            <>
              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  styles.primaryButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={handleLogin}
              >
                <Text style={styles.primaryButtonText}>Sign In</Text>
              </Pressable>
              
              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  styles.secondaryButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => {
                  AsyncStorage.setItem('hasAccount', 'false');
                  router.push('/auth/signup');
                }}
              >
                <Text style={styles.secondaryButtonText}>Create New Account</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  styles.primaryButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={handleSignup}
              >
                <Text style={styles.primaryButtonText}>Create Account</Text>
              </Pressable>
              
              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  styles.secondaryButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => {
                  AsyncStorage.setItem('hasAccount', 'true');
                  router.push('/auth/login');
                }}
              >
                <Text style={styles.secondaryButtonText}>I Already Have an Account</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#212121',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Nexa-ExtraLight',
    marginTop: 16,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logo: {
    width: 70,
    height: 70,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Nexa-Heavy',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Nexa-ExtraLight',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryButton: {
    backgroundColor: '#ff1900',
    shadowColor: '#ff1900',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Nexa-ExtraLight',
  },
  secondaryButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontFamily: 'Nexa-ExtraLight',
  },
}); 