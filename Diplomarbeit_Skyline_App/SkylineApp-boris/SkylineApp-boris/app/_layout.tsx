import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import ToastProvider, { useToast } from '../components/ToastProvider';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { useAppStore } from '../store';
import { Colors } from '../constants/DesignTokens';

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);
  const [loaded] = useFonts({
    'Nexa-ExtraLight': require('../assets/fonts/Nexa-ExtraLight.ttf'),
    'Nexa-Heavy': require('../assets/fonts/Nexa-Heavy.ttf'),
  });

  // Fonts loading handled silently
  const initAuth = useAppStore(state => state.initAuth);
  const updateStats = useAppStore(state => state.updateStats);
  const checkAndUnlockAchievements = useAppStore(state => (state as any).checkAndUnlockAchievements);
  const loadFlights = useAppStore(state => state.loadFlights);
  const loadNotesForFlight = useAppStore((state: any) => state.loadNotesForFlight);
  const loadChecklistsForFlight = useAppStore((state: any) => state.loadChecklistsForFlight);
  const loadTemplatesByPurpose = useAppStore((state: any) => state.loadTemplatesByPurpose);
  const { showToast } = useToast();
  const router = useRouter();
  const segments = useSegments();

  // Handle notification taps (deep links)
  useEffect(() => {
    let sub: any;
    let cancelled = false;

    const setup = async () => {
      try {
        const Notifications: any = await import('expo-notifications');

        // Ensure notifications are visible while app is in foreground.
        if (Notifications.setNotificationHandler) {
          Notifications.setNotificationHandler({
            handleNotification: async () => ({
              shouldShowBanner: true,
              shouldShowList: true,
              shouldPlaySound: true,
              shouldSetBadge: false,
            }),
          });
        }

        // If app was opened from a notification
        if (Notifications.getLastNotificationResponseAsync) {
          const resp = await Notifications.getLastNotificationResponseAsync();
          const url = resp?.notification?.request?.content?.data?.url;
          if (!cancelled && typeof url === 'string' && url.length > 0) {
            router.push(url as any);
          }
        }

        if (Notifications.addNotificationResponseReceivedListener) {
          sub = Notifications.addNotificationResponseReceivedListener((resp: any) => {
            const url = resp?.notification?.request?.content?.data?.url;
            if (typeof url === 'string' && url.length > 0) {
              router.push(url as any);
            }
          });
        }
      } catch {
        // Notifications not available; ignore
      }
    };

    setup();
    return () => {
      cancelled = true;
      try {
        sub?.remove?.();
      } catch {}
    };
  }, [router]);

  useEffect(() => {
    checkOnboardingStatus();
    // Initialize store auth on app start
    initAuth();
  }, []);

  // Handle navigation based on authentication state
  useEffect(() => {
    if (authLoading || hasSeenOnboarding === null || !loaded) return;

    const inAuthGroup = segments[0] === 'auth';
    const currentAuthScreen = segments[1] as string | undefined;
    const isPasswordRecoveryScreen = inAuthGroup && currentAuthScreen === 'reset-password';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to auth if not authenticated
      if (!hasSeenOnboarding) {
        router.replace('/auth/onboarding');
      } else {
        router.replace('/auth/signup');
      }
    } else if (isAuthenticated && inAuthGroup && !isPasswordRecoveryScreen) {
      // Redirect to main app if authenticated
      router.replace('/(tabs)/home');
    }
  }, [isAuthenticated, segments, authLoading, hasSeenOnboarding, loaded]);

  // Track if flights have been loaded to prevent multiple loads
  const flightsLoadedRef = useRef(false);
  const warmupDoneRef = useRef(false);

  // When authenticated and flights load, update stats and show achievement popups
  useEffect(() => {
    const run = async () => {
      if (!isAuthenticated) {
        flightsLoadedRef.current = false; // Reset when logged out
        warmupDoneRef.current = false;
        return;
      }
      
      // Only load flights once per authentication session
      if (!flightsLoadedRef.current) {
        flightsLoadedRef.current = true;
        await loadFlights();
        updateStats();
        const newly = await checkAndUnlockAchievements?.();
        if (newly && newly.length) {
          newly.forEach((n: any) => showToast('success', 'Achievement unlocked', n.title, 3500));
        }
      }

      if (!warmupDoneRef.current) {
        warmupDoneRef.current = true;
        void (async () => {
          try {
            // Initialize channels + permission status early, so reminders do not fail later.
            const { initializeNotifications } = await import('../services/notifications');
            const SettingsService = (await import('../services/settingsService')).default;
            const settings = await SettingsService.getInstance().getSettings();
            await initializeNotifications({ requestPermission: !!settings.notifications });
          } catch {}

          try {
            await loadTemplatesByPurpose('private');
          } catch {}

          try {
            const flights = useAppStore.getState().flights || [];
            const flightIds = flights
              .map((f: any) => f?.id)
              .filter((id: any) => typeof id === 'string' && id.length > 0)
              .slice(0, 12);

            const preloadTasks: Promise<any>[] = [];
            for (const flightId of flightIds) {
              preloadTasks.push(loadNotesForFlight(flightId));
              preloadTasks.push(loadChecklistsForFlight(flightId));
            }
            await Promise.allSettled(preloadTasks);
          } catch {}
        })();
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]); // Only depend on isAuthenticated to prevent unnecessary re-runs

  const checkOnboardingStatus = async () => {
    try {
      const seen = await AsyncStorage.getItem('hasSeenOnboarding');
      setHasSeenOnboarding(seen === 'true');
    } catch (error) {
      if (__DEV__) console.error('Error checking onboarding status:', error);
      setHasSeenOnboarding(false);
    }
  };

  // Show loading screen while checking auth and onboarding status
  if (!loaded || authLoading || hasSeenOnboarding === null) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: Colors.background.primary,
        }}
      >
        <ActivityIndicator size="large" color={Colors.primary.main} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          {/* Auth group */}
          <Stack.Screen name="auth" />
          
          {/* Main app screens */}
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="trip-details" />
          <Stack.Screen name="add-flight-manual" />
          <Stack.Screen name="add-flight-import" />
          <Stack.Screen name="edit-profile" />
          <Stack.Screen name="achievements" />
          <Stack.Screen name="destinations" />
          <Stack.Screen name="trip-photos" />
          <Stack.Screen name="flight-calendar" />
          
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="light" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ToastProvider>
        <RootLayoutNav />
      </ToastProvider>
    </AuthProvider>
  );
}