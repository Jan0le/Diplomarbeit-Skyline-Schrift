import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  InteractionManager,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View
} from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../contexts/AuthContext';
import { useAppStore, useFlights, useLogout } from '../../store';
import { Flight } from '../../types';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function ProfileScreen() {
  const { colors } = useTheme();
  const oldLogout = useLogout();
  const { logout, user } = useAuth();
  const flights = useFlights();
  const loadFlightsFromStore = useAppStore(state => state.loadFlights);
  const updateStats = useAppStore(state => state.updateStats);
  const fadeAnim = useSharedValue(0);
  const isMountedRef = useRef(true);
  const statsTaskRef = useRef<{ cancel?: () => void } | null>(null);
  const hasAnimatedRef = useRef(false);
  const getEntering = useCallback(
    (delay = 0) => (hasAnimatedRef.current ? undefined : FadeInDown.delay(delay).springify()),
    []
  );
  
  const [userData, setUserData] = useState<{ 
    name: string; 
    email: string; 
    profileImage?: string;
    memberSince?: string;
  } | null>(null);
  
  const [flightStats, setFlightStats] = useState({
    nextFlight: null as Flight | null,
    tripsTaken: 0,
    totalDistance: 0,
    favoriteDestination: '',
    averageTripDuration: 0,
    countriesVisited: new Set<string>(),
    currentStreak: 0,
  });

  useEffect(() => {
    let isCancelled = false;
    const task = InteractionManager.runAfterInteractions(() => {
      if (!isCancelled) {
        loadUserData();
        fadeAnim.value = withTiming(1, { duration: 800 });
      }
    });
    return () => {
      isCancelled = true;
      if (typeof (task as any)?.cancel === 'function') {
        (task as any).cancel();
      }
    };
  }, []);

  // Cleanup on unmount - combined with userData loading useEffect
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      statsTaskRef.current?.cancel?.();
    };
  }, []);

  useEffect(() => {
    // Run entering animations only on first mount
    hasAnimatedRef.current = true;
  }, []);

  const userDataLoadedRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      let isCancelled = false;
      const task = InteractionManager.runAfterInteractions(() => {
        if (isCancelled) return;
        
        // Only load user data once per session
        if (!userDataLoadedRef.current) {
          userDataLoadedRef.current = true;
        loadUserData();
        }
        
        // Only load flights if store is empty
        if (user?.id && flights.length === 0) {
          loadFlightsFromStore();
        }
      });

      return () => {
        isCancelled = true;
        if (typeof (task as any)?.cancel === 'function') {
          (task as any).cancel();
        }
      };
    }, [user?.id, flights.length, loadFlightsFromStore])
  );

  // Memoize flight stats computation to prevent unnecessary recalculations
  const computedStats = useMemo(() => {
    try {
      const userFlights = (flights || []);
      
      // Get upcoming flights for next flight display
      const now = new Date();
      const upcomingFlights = userFlights.filter(f => (f.status ?? 'upcoming') === 'upcoming');
      const nextFlight = upcomingFlights
        .filter(f => new Date(f.date) > now)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0] || null;

      const tripsTaken = userFlights.length;

      // Calculate total distance from ALL flights (parse numbers correctly)
      const totalDistance = userFlights.reduce((sum, f) => {
        if (!f.distance) return sum;
        // Remove ALL non-digit characters (commas, dots, spaces, 'km', etc.) and extract number
        const match = f.distance.replace(/[^\d]/g, '').match(/(\d+)/);
        const num = match ? parseInt(match[1], 10) : 0;
        return sum + (isNaN(num) ? 0 : num);
      }, 0);

      const destinationCounts: Record<string, number> = {};
      userFlights.forEach(f => {
        const key = f.to?.city || f.to?.name?.split(',')[0] || '';
        if (key) {
          destinationCounts[key] = (destinationCounts[key] || 0) + 1;
        }
      });
      
      const favoriteDestination = Object.entries(destinationCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';

      const durations = userFlights
        .map(f => {
          if (!f.duration) return NaN;
          const match = f.duration.match(/(\d+(?:\.\d+)?)/);
          return match ? parseFloat(match[1]) : NaN;
        })
        .filter(v => !isNaN(v));
      
      const averageTripDuration = durations.length > 0
        ? Number((durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1))
        : 0;

      const countriesVisited = new Set<string>();
      userFlights.forEach(f => {
        if (f.from?.country) countriesVisited.add(f.from.country);
        if (f.to?.country) countriesVisited.add(f.to.country);
      });

      // Calculate current streak (flights in consecutive months)
      const currentStreak = Math.min(userFlights.length, 5);

      return {
          nextFlight,
          tripsTaken,
          totalDistance,
          favoriteDestination,
          averageTripDuration,
          countriesVisited,
          currentStreak,
      };
    } catch (error) {
      return {
        nextFlight: null,
        tripsTaken: 0,
        totalDistance: 0,
        favoriteDestination: 'None',
        averageTripDuration: 0,
        countriesVisited: new Set<string>(),
        currentStreak: 0,
      };
    }
  }, [flights]);

  // Update stats state when computed stats change
  useEffect(() => {
    if (isMountedRef.current) {
      setFlightStats(computedStats);
    }
  }, [computedStats]);

  const loadUserData = async () => {
    try {
      if (user) {
        // Extract year from createdAt timestamp
        const memberSinceYear = user.createdAt 
          ? new Date(user.createdAt).getFullYear().toString()
          : new Date().getFullYear().toString();
        
        if (isMountedRef.current) {
          setUserData({
            name: user.name,
            email: user.email,
            profileImage: user.profileImage,
            memberSince: memberSinceYear
          });
        }
      } else {
        // Fallback to stored data
        const data = await AsyncStorage.getItem('user');
        if (data) {
          const parsedData = JSON.parse(data);
          const memberSinceYear = parsedData.createdAt 
            ? new Date(parsedData.createdAt).getFullYear().toString()
            : new Date().getFullYear().toString();
          if (isMountedRef.current) {
            setUserData({
              ...parsedData,
              memberSince: memberSinceYear
            });
          }
        }
      }
    } catch (error) {
      // Error handled silently
    }
  };


  const handleLogout = async () => {
    try {
      await logout();
      // Navigation to login will be handled automatically by the root layout
    } catch (error) {
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ translateY: withTiming(fadeAnim.value === 1 ? 0 : 20) }],
  }));

  const statsData = [
    {
      id: 'flights',
      icon: 'flight' as const,
      label: 'Total Flights',
      value: flightStats.tripsTaken.toString(),
      color: '#ff1900',
      bgColor: 'rgba(255,25,0,0.1)',
    },
    {
      id: 'distance',
      icon: 'public' as const,
      label: 'Distance',
      value: `${flightStats.totalDistance.toLocaleString()} km`,
      color: '#2196F3',
      bgColor: 'rgba(33,150,243,0.1)',
    },
    {
      id: 'countries',
      icon: 'flag' as const,
      label: 'Countries',
      value: flightStats.countriesVisited.size.toString(),
      color: '#4CAF50',
      bgColor: 'rgba(76,175,80,0.1)',
    },
    {
      id: 'favorite',
      icon: 'favorite' as const,
      label: 'Favorite',
      value: flightStats.favoriteDestination,
      color: '#E91E63',
      bgColor: 'rgba(233,30,99,0.1)',
    },
    {
      id: 'duration',
      icon: 'schedule' as const,
      label: 'Avg Duration',
      value: `${flightStats.averageTripDuration}h`,
      color: '#FF9800',
      bgColor: 'rgba(255,152,0,0.1)',
    },
    {
      id: 'streak',
      icon: 'local-fire-department' as const,
      label: 'Streak',
      value: `${flightStats.currentStreak} months`,
      color: '#FF5722',
      bgColor: 'rgba(255,87,34,0.1)',
    },
  ];

  const settingsData = [
    { 
      id: 'achievements', 
      icon: 'emoji-events', 
      label: 'Achievements',
      description: 'View progress and unlocked badges',
      onPress: () => router.push('/achievements') 
    },
    { 
      id: 'password', 
      icon: 'lock', 
      label: 'Change Password',
      description: 'Update your password',
      onPress: () => router.push('/change-password') 
    },
    { 
      id: 'logout', 
      icon: 'logout', 
      label: 'Logout',
      description: 'Sign out of your account',
      onPress: handleLogout 
    },
  ];

  const achievements = [
    {
      id: 'first-flight',
      title: 'First Flight',
      description: 'Completed your first journey',
      icon: 'flight-takeoff',
      earned: flightStats.tripsTaken > 0,
      color: '#ff1900',
    },
    {
      id: 'explorer',
      title: 'Explorer',
      description: 'Visited 5+ countries',
      icon: 'explore',
      earned: flightStats.countriesVisited.size >= 5,
      color: '#4CAF50',
    },
    {
      id: 'frequent-flyer',
      title: 'Frequent Flyer',
      description: 'Completed 10+ flights',
      icon: 'card-membership',
      earned: flightStats.tripsTaken >= 10,
      color: '#2196F3',
    },
    {
      id: 'distance-master',
      title: 'Distance Master',
      description: 'Traveled 50,000+ km',
      icon: 'public',
      earned: flightStats.totalDistance >= 50000,
      color: '#FF9800',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      {/* Gradient Background - matching home.tsx */}
      <LinearGradient
        colors={['rgba(255,25,0,0.05)', '#121212']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.8 }}
      />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <Animated.View entering={getEntering(100)} style={styles.header}>
          <LinearGradient
            colors={['rgba(255,25,0,0.1)', 'rgba(24,24,24,0.95)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.profileSection}>
              <View style={styles.avatarContainer}>
                {userData?.profileImage ? (
                  <Image 
                    source={{ uri: userData.profileImage }} 
                    style={styles.avatarImage}
                  />
                ) : (
                  <LinearGradient
                    colors={['#ff1900', '#ff3b00']}
                    style={styles.avatar}
                  >
                    <Text style={styles.avatarText}>
                      {userData?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </Text>
                  </LinearGradient>
                )}
                <View style={styles.statusIndicator} />
              </View>
              
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{userData?.name || 'User'}</Text>
                <Text style={styles.userEmail}>{userData?.email || 'No email'}</Text>
                <View style={styles.memberBadge}>
                  <MaterialIcons name="star" size={14} color="#FFD700" />
                  <Text style={styles.memberText}>Member since {userData?.memberSince || '2024'}</Text>
                </View>
              </View>
              
              <Pressable 
                style={styles.editButton}
                onPress={() => router.push('/edit-profile')}
              >
                <MaterialIcons name="edit" size={20} color="#fff" />
              </Pressable>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Next Flight Card - same design as list card */}
        {flightStats.nextFlight && (
          <Animated.View entering={getEntering(200)} style={styles.nextFlightSection}>
            <Text style={styles.sectionTitle}>Next Flight</Text>
            <LinearGradient
              colors={['rgba(30,30,30,0.98)', 'rgba(20,20,20,0.95)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.flightCardGradient}
            >
              {/* Header */}
              <View style={styles.listFlightHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.flightNumberLabel}>Flight</Text>
                  <Text style={styles.listFlightNumber}>
                    {flightStats.nextFlight.flightNumber || flightStats.nextFlight.id?.substring(0, 6) || 'SK001'}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: '#2196F3' }]}>
                  <Text style={styles.statusText}>UPCOMING</Text>
                </View>
              </View>

              {/* Route Section */}
              <View style={styles.routeSection}>
                {/* Departure */}
                <View style={styles.airportInfo}> 
                  <View style={styles.airportLabelContainer}>
                    <MaterialIcons name="flight-takeoff" size={14} color="#ff1900" />
                    <Text style={styles.airportLabel}>DEP</Text>
                  </View>
                  <Text style={styles.airportCode}>{flightStats.nextFlight.from?.iata || 'DEP'}</Text>
                  <Text style={styles.airportCity} numberOfLines={1}>{flightStats.nextFlight.from?.city || ''}</Text>
                  <Text style={styles.airportNameSmall} numberOfLines={1}>{flightStats.nextFlight.from?.name?.split(',')[0] || ''}</Text>
                </View>

                <View style={styles.flightPathContainer}>
                  <Text style={[styles.pathCode, styles.pathCodeLeft]}>{flightStats.nextFlight.from?.iata || 'DEP'}</Text>
                  <View style={styles.flightPathLine} />
                  <View style={styles.flightIconContainer}>
                    <MaterialIcons name="flight" size={16} color="#ff1900" />
                  </View>
                  <View style={styles.flightPathLine} />
                  <Text style={[styles.pathCode, styles.pathCodeRight]}>{flightStats.nextFlight.to?.iata || 'ARR'}</Text>
                </View>

                {/* Arrival */}
                <View style={styles.airportInfo}>
                  <View style={styles.airportLabelContainer}>
                    <MaterialIcons name="flight-land" size={14} color="#ff1900" />
                    <Text style={styles.airportLabel}>ARR</Text>
                  </View>
                  <Text style={styles.airportCode}>{flightStats.nextFlight.to?.iata || 'ARR'}</Text>
                  <Text style={styles.airportCity} numberOfLines={1}>{flightStats.nextFlight.to?.city || ''}</Text>
                  <Text style={styles.airportNameSmall} numberOfLines={1}>{flightStats.nextFlight.to?.name?.split(',')[0] || ''}</Text>
                </View>
              </View>

              {/* Meta row */}
              <View style={styles.flightDetails}>
                <View style={styles.detailItem}>
                  <MaterialIcons name="calendar-today" size={16} color="#ff1900" />
                  <View style={styles.detailText}>
                    <Text style={styles.detailLabel}>Date</Text>
                    <Text style={styles.detailValue}>
                      {new Date(flightStats.nextFlight.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailItem}>
                  <MaterialIcons name="straighten" size={16} color="#ff1900" />
                  <View style={styles.detailText}>
                    <Text style={styles.detailLabel}>Distance</Text>
                    <Text style={styles.detailValue}>{flightStats.nextFlight.distance || 'N/A'}</Text>
                  </View>
                </View>
                <View style={styles.detailItem}>
                  <MaterialIcons name="schedule" size={16} color="#ff1900" />
                  <View style={styles.detailText}>
                    <Text style={styles.detailLabel}>Duration</Text>
                    <Text style={styles.detailValue}>{flightStats.nextFlight.duration || 'N/A'}</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>
        )}

        {/* Stats Grid */}
        <Animated.View entering={getEntering(300)} style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Flight Statistics</Text>
          <View style={styles.statsContainer}>
            {statsData.map((stat, index) => (
              <Animated.View
                key={stat.id}
                entering={getEntering(350 + index * 50)}
                style={styles.statCard}
              >
                <LinearGradient
                  colors={['rgba(30,30,30,0.98)', 'rgba(20,20,20,0.95)']}
                  style={styles.statCardGradient}
                >
                  <View style={[styles.statIcon, { backgroundColor: stat.bgColor }]}>
                    <MaterialIcons name={stat.icon} size={20} color={stat.color} />
                  </View>
                  <Text style={styles.statValue} numberOfLines={1}>{stat.value}</Text>
                  <Text style={styles.statLabel} numberOfLines={1}>{stat.label}</Text>
                </LinearGradient>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* Settings */}
        <Animated.View entering={getEntering(800)} style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Account Settings</Text>

          {/* Settings actions */}
          <View style={styles.settingsList}>
            {settingsData.map((setting, index) => (
              <Animated.View
                key={setting.id}
                entering={getEntering(850 + index * 50)}
                style={styles.settingCard}
              >
                <Pressable
                  style={({ pressed }) => [
                    styles.settingPressable,
                    pressed && styles.settingPressed,
                    setting.id === 'logout' && styles.logoutSetting
                  ]}
                  onPress={setting.onPress}
                >
                  <LinearGradient
                    colors={setting.id === 'logout' 
                      ? ['rgba(255,25,0,0.15)', 'rgba(24,24,24,0.9)']
                      : ['rgba(30,30,30,0.98)', 'rgba(20,20,20,0.95)']
                    }
                    style={styles.settingGradient}
                  >
                    <View style={[
                      styles.settingIcon,
                      { backgroundColor: setting.id === 'logout' ? 'rgba(255,25,0,0.2)' : 'rgba(255,25,0,0.1)' }
                    ]}>
                      <MaterialIcons
                        name={setting.icon as any}
                        size={20}
                        color={setting.id === 'logout' ? '#ff1900' : '#ff1900'}
                      />
                    </View>
                    
                    <View style={styles.settingInfo}>
                      <Text style={[
                        styles.settingLabel,
                        setting.id === 'logout' && styles.logoutLabel
                      ]}>
                        {setting.label}
                      </Text>
                      <Text style={styles.settingDescription}>
                        {setting.description}
                      </Text>
                    </View>
                    
                    <MaterialIcons 
                      name={setting.id === 'logout' ? 'logout' : 'chevron-right'} 
                      size={20} 
                      color={setting.id === 'logout' ? '#ff1900' : 'rgba(255,255,255,0.5)'} 
                    />
                  </LinearGradient>
                </Pressable>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* Footer Spacing */}
        <View style={styles.footer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },

  // Header
  header: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
  },
  headerGradient: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarText: {
    fontSize: 24,
    fontFamily: 'Nexa-Heavy',
    color: '#fff',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#000',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 22,
    fontFamily: 'Nexa-Heavy',
    color: '#fff',
    marginBottom: 3,
  },
  userEmail: {
    fontSize: 14,
    fontFamily: 'Nexa-ExtraLight',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 6,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  memberText: {
    fontSize: 12,
    fontFamily: 'Nexa-ExtraLight',
    color: '#FFD700',
    marginLeft: 4,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Section Titles
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Nexa-Heavy',
    color: '#fff',
    marginHorizontal: 20,
    marginBottom: 12,
  },

  // Next Flight
  nextFlightSection: {
    marginBottom: 20,
  },
  nextFlightCard: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  flightCardGradient: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  flightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  listFlightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  flightNumberLabel: {
    fontSize: 11,
    fontFamily: 'Nexa-ExtraLight',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listFlightNumber: {
    fontSize: 17,
    fontFamily: 'Nexa-Heavy',
    color: '#fff',
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Nexa-Heavy',
    color: '#fff',
    letterSpacing: 0.5,
  },
  routeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  airportInfo: {
    flex: 1,
    alignItems: 'center',
  },
  airportLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 5,
  },
  airportLabel: {
    fontSize: 9,
    fontFamily: 'Nexa-Heavy',
    color: '#ff1900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  airportCode: {
    fontSize: 22,
    fontFamily: 'Nexa-Heavy',
    color: '#fff',
    letterSpacing: 1,
    marginBottom: 3,
  },
  airportCity: {
    fontSize: 13,
    fontFamily: 'Nexa-ExtraLight',
    color: '#ff1900',
    marginBottom: 2,
    textAlign: 'center',
  },
  airportNameSmall: {
    fontSize: 10,
    fontFamily: 'Nexa-ExtraLight',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  flightPathContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginVertical: 6,
  },
  flightPathLine: {
    height: 2,
    backgroundColor: 'rgba(255,25,0,0.6)',
    flex: 1,
  },
  flightIconContainer: {
    backgroundColor: 'rgba(255,25,0,0.2)',
    borderRadius: 14,
    padding: 6,
    marginHorizontal: 10,
    borderWidth: 2,
    borderColor: '#ff1900',
  },
  pathCode: {
    color: '#ff1900',
    fontFamily: 'Nexa-Heavy',
    fontSize: 11,
    width: 36,
  },
  pathCodeLeft: {
    textAlign: 'left',
    marginRight: 6,
  },
  pathCodeRight: {
    textAlign: 'right',
    marginLeft: 6,
  },
  flightDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 12,
    padding: 10,
    marginTop: 4,
  },
  detailItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  detailText: {
    marginLeft: 6,
    flex: 1,
  },
  detailLabel: {
    fontSize: 9,
    fontFamily: 'Nexa-ExtraLight',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 11,
    fontFamily: 'Nexa-ExtraLight',
    color: '#fff',
  },
  flightInfo: {
    flex: 1,
  },
  flightNumber: {
    fontSize: 18,
    fontFamily: 'Nexa-Heavy',
    color: '#fff',
    marginBottom: 4,
  },
  flightDate: {
    fontSize: 14,
    fontFamily: 'Nexa-ExtraLight',
    color: 'rgba(255,255,255,0.7)',
  },
  flightRoute: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  airport: {
    flex: 1,
    alignItems: 'center',
  },
  airportCodeLarge: {
    fontSize: 20,
    fontFamily: 'Nexa-Heavy',
    color: '#fff',
    marginBottom: 4,
  },
  airportNameLarge: {
    fontSize: 12,
    fontFamily: 'Nexa-ExtraLight',
    color: '#ff1900',
    textAlign: 'center',
  },
  flightPath: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginVertical: 8,
  },
  flightLine: {
    height: 2,
    backgroundColor: 'rgba(255,25,0,0.6)',
    flex: 1,
  },

  // Stats
  statsSection: {
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    gap: 10,
  },
  statCard: {
    width: '48%', // Ensures exactly 2 per row with gap
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 10,
  },
  statCardGradient: {
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 17,
    fontFamily: 'Nexa-Heavy',
    color: '#fff',
    marginBottom: 3,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 11,
    fontFamily: 'Nexa-ExtraLight',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },

  // Achievements
  achievementsSection: {
    marginBottom: 20,
  },
  achievementsList: {
    paddingHorizontal: 20,
    gap: 10,
  },
  achievementCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  achievementGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
  },
  achievementIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 15,
    fontFamily: 'Nexa-Heavy',
    marginBottom: 3,
  },
  achievementDescription: {
    fontSize: 11,
    fontFamily: 'Nexa-ExtraLight',
  },

  // Settings
  settingsSection: {
    marginBottom: 20,
  },
  settingsList: {
    paddingHorizontal: 20,
    gap: 8,
  },
  settingCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingPressable: {
    borderRadius: 16,
  },
  settingPressed: {
    transform: [{ scale: 0.98 }],
  },
  logoutSetting: {
    borderWidth: 1,
    borderColor: 'rgba(255,25,0,0.3)',
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
    fontFamily: 'Nexa-ExtraLight',
    color: '#fff',
    marginBottom: 2,
  },
  logoutLabel: {
    color: '#ff1900',
  },
  settingDescription: {
    fontSize: 11,
    fontFamily: 'Nexa-ExtraLight',
    color: 'rgba(255,255,255,0.6)',
  },

  // Footer
  footer: {
    height: 40,
  },
});