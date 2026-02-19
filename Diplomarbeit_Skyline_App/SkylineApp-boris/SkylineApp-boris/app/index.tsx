import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '../contexts/AuthContext';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const seen = await AsyncStorage.getItem('hasSeenOnboarding');
      setHasSeenOnboarding(seen === 'true');
    } catch (error) {
      setHasSeenOnboarding(false);
    }
  };

  if (isLoading || hasSeenOnboarding === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#212121' }}>
        <ActivityIndicator size="large" color="#ff1900" />
      </View>
    );
  }

  // Redirect based on auth and onboarding status
  if (!isAuthenticated) {
    if (!hasSeenOnboarding) {
      return <Redirect href="/auth/onboarding" />;
    }
    return <Redirect href="/auth/signup" />;
  }

  // User is authenticated, go to main app
  return <Redirect href="/(tabs)/home" />;
}