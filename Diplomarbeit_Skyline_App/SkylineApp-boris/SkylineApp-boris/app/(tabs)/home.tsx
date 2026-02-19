import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Dimensions, Image, InteractionManager, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useAppStore, useFlights, useFlightStats } from '../../store';
import { Flight } from '../../types';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const [nextFlight, setNextFlight] = useState<Flight | null>(null);
  const insets = useSafeAreaInsets();
  
  // Store hooks
  const { user, currentCompanyRole, currentCompanyId, memberships } = useAuth();
  const flights = useFlights();
  const stats = useFlightStats(); 
  const loadFlights = useAppStore(state => state.loadFlights);
  const updateStats = useAppStore(state => state.updateStats);
  
  // Calculate bottom padding for floating tab bar:
  // - Container paddingVertical: 12px top + 12px bottom = 24px
  // - Indicator/icon area: 48px height (indicator) + 12px (icon padding) = 60px effective
  // - Tab icon paddingVertical: 12px top + 12px bottom = 24px (extends beyond container padding)
  // - Actual tab bar total height: ~84px (12 top + 48 indicator + 12 icon bottom + 12 container bottom)
  // - Bottom offset: 20px (space from safe area)
  // - Safe area bottom inset
  // - Extra breathing room: 40px (to ensure nothing is covered)
  const tabBarHeight = 12 + 48 + 12 + 12; // container top + indicator + icon bottom padding + container bottom
  const bottomOffset = 20; // tab bar bottom offset from safe area
  const bottomPadding = tabBarHeight + bottomOffset + insets.bottom + 40;
  
  // Calculate total distance directly from flights (like profile.tsx)
  const totalDistance = useMemo(() => {
    const userFlights = flights || [];
    return userFlights.reduce((sum, f) => {
      // Try distanceKm first (if it's a number)
      if (typeof f.distanceKm === 'number') {
        return sum + f.distanceKm;
      }
      // Otherwise parse from distance string
      if (!f.distance) return sum;
      // Remove ALL non-digit characters (commas, dots, spaces, 'km', etc.) and extract number
      const match = String(f.distance).replace(/[^\d]/g, '').match(/(\d+)/);
      const num = match ? parseInt(match[1], 10) : 0;
      return sum + (isNaN(num) ? 0 : num);
    }, 0);
  }, [flights]);
  
  const activeMembership = useMemo(() => {
    if (currentCompanyId) {
      return memberships.find(m => m.companyId === currentCompanyId) || null;
    }
    return memberships[0] || null;
  }, [memberships, currentCompanyId]);

  const showCompanyShortcut = !!activeMembership;
  const isOwner = currentCompanyRole === 'owner';
  const companyButtonTitle = activeMembership?.company?.name || 'Company workspace';
  const companyRoleLabel = currentCompanyRole
    ? currentCompanyRole.charAt(0).toUpperCase() + currentCompanyRole.slice(1)
    : undefined;

  const getFlightStartMs = useCallback((flight: Flight): number | null => {
    const preferred = flight.departureAt ? new Date(flight.departureAt).getTime() : NaN;
    if (Number.isFinite(preferred)) return preferred;
    const fallback = new Date(flight.date).getTime();
    return Number.isFinite(fallback) ? fallback : null;
  }, []);

  const getFlightEndMs = useCallback((flight: Flight): number | null => {
    const preferred = flight.arrivalAt ? new Date(flight.arrivalAt).getTime() : NaN;
    if (Number.isFinite(preferred)) return preferred;
    return getFlightStartMs(flight);
  }, [getFlightStartMs]);

  const isActiveFlight = useCallback((flight: Flight): boolean => {
    const startMs = getFlightStartMs(flight);
    const endMs = getFlightEndMs(flight);
    if (startMs === null || endMs === null) return false;
    if (endMs < startMs) return false;
    const nowMs = Date.now();
    return nowMs >= startMs && nowMs <= endMs;
  }, [getFlightEndMs, getFlightStartMs]);

  // User logging removed for performance

  // Load flights ONLY if store is empty (e.g., first time or after logout)
  // This prevents reloading on every focus while ensuring data is available
  useFocusEffect(
    useCallback(() => {
      let isCancelled = false;
      const task = InteractionManager.runAfterInteractions(() => {
        if (!isCancelled && user?.id && flights.length === 0) {
          loadFlights();
        }
      });

      return () => {
        isCancelled = true;
        if (typeof (task as any)?.cancel === 'function') {
          (task as any).cancel();
        }
      };
    }, [user?.id, flights.length, loadFlights])
  );

  // Update stats when flights change
  useEffect(() => {
    if (flights.length > 0) {
      let isCancelled = false;
      const task = InteractionManager.runAfterInteractions(() => {
        if (!isCancelled) {
          updateStats();
        }
      });
      return () => {
        isCancelled = true;
        if (typeof (task as any)?.cancel === 'function') {
          (task as any).cancel();
        }
      };
    }
    return undefined;
  }, [flights, updateStats]);

  // Compute featured flight: active flight first, otherwise next upcoming flight.
  useEffect(() => {
    let isCancelled = false;
    const task = InteractionManager.runAfterInteractions(() => {
      if (isCancelled) return;
      const candidates = (flights || []).filter((f) => f.status !== 'cancelled');
      const nowMs = Date.now();

      const activeFlights = candidates
        .filter((f) => isActiveFlight(f))
        .sort((a, b) => {
          const aEnd = getFlightEndMs(a) ?? Number.MAX_SAFE_INTEGER;
          const bEnd = getFlightEndMs(b) ?? Number.MAX_SAFE_INTEGER;
          return aEnd - bEnd;
        });

      if (activeFlights.length > 0) {
        setNextFlight(activeFlights[0]);
        return;
      }

      const upcomingFlights = candidates
        .map((f) => ({ flight: f, startMs: getFlightStartMs(f) }))
        .filter((x) => x.startMs !== null && (x.startMs as number) >= nowMs)
        .sort((a, b) => (a.startMs as number) - (b.startMs as number));

      setNextFlight(upcomingFlights[0]?.flight || null);
    });

    return () => {
      isCancelled = true;
      if (typeof (task as any)?.cancel === 'function') {
        (task as any).cancel();
      }
    };
  }, [flights, getFlightStartMs, getFlightEndMs, isActiveFlight]);



  const nextFlightIsActive = nextFlight ? isActiveFlight(nextFlight) : false;

  return (
    <SafeAreaView style={styles.container}>
      {/* Gradient Background */}
      <LinearGradient
        colors={['rgba(255,25,0,0.05)', '#121212']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.8 }}
      />
      
      <ScrollView 
        style={styles.scrollContainer} 
        contentContainerStyle={{ paddingBottom: bottomPadding }}
        showsVerticalScrollIndicator={false}
      >
        {/* Modern Header */}
        <Animated.View 
          entering={FadeInDown.delay(100).springify()}
          style={styles.modernHeader}
        >
          <LinearGradient
            colors={['rgba(255,25,0,0.1)', 'rgba(255,25,0,0.05)', 'transparent']}
            style={styles.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Background Elements */}
            <View style={styles.headerBackground}>
              {/* Profile Picture or Circle in top right */}
              <Animated.View 
                entering={FadeInDown.delay(200).springify()}
                style={[styles.floatingElement, styles.element1]}
              >
                {user?.profileImage ? (
                  <Image 
                    source={{ uri: user.profileImage }} 
                    style={styles.floatingProfileImage}
                  />
                ) : (
                  <LinearGradient
                    colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.08)']}
                    style={styles.floatingProfilePlaceholder}
                  >
                    <Text style={styles.floatingProfileText}>
                      {user?.name?.charAt(0)?.toUpperCase() || 'E'}
                    </Text>
                  </LinearGradient>
                )}
              </Animated.View>
              <Animated.View 
                entering={FadeInDown.delay(300).springify()}
                style={[styles.floatingElement, styles.element2]}
              />
              <Animated.View 
                entering={FadeInDown.delay(400).springify()}
                style={[styles.floatingElement, styles.element3]}
              />
            </View>

            {/* Main Content */}
            <View style={styles.headerContent}>
              <View style={styles.welcomeSection}>
                <Animated.View 
                  entering={FadeInDown.delay(200).springify()}
                  style={styles.greetingContainer}
                >
                  <View style={styles.greetingRow}>
                    <MaterialIcons name="flight-takeoff" size={24} color="#ff1900" />
                    <Text style={styles.greetingText}>
                      {new Date().getHours() < 12 ? 'Good Morning' : 
                       new Date().getHours() < 17 ? 'Good Afternoon' : 'Good Evening'}
                    </Text>
                  </View>
                  <Text style={styles.userName}>{user?.name || 'Explorer'}</Text>
                </Animated.View>

                <Animated.View 
                  entering={FadeInDown.delay(300).springify()}
                  style={styles.subtitleContainer}
                >
                  <Text style={styles.subtitleText}>What skyline&apos;s next?</Text>
                  <View style={styles.subtitleAccent} />
                </Animated.View>
              </View>

              {/* Quick Stats */}
              <Animated.View 
                entering={FadeInDown.delay(400).springify()}
                style={styles.quickStats}
              >
                <View style={styles.statItem}>
                  <MaterialIcons name="public" size={16} color="#43e97b" />
                  <Text style={styles.statNumber}>{stats.countriesVisited}</Text>
                  <Text style={styles.statLabel}>Countries</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <MaterialIcons name="flight" size={16} color="#845ec2" />
                  <Text style={styles.statNumber}>{stats.tripsTaken}</Text>
                  <Text style={styles.statLabel}>Trips</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <MaterialIcons name="straighten" size={16} color="#ff6b6b" />
                  <Text style={styles.statNumber}>{totalDistance.toLocaleString()}</Text>
                  <Text style={styles.statLabel}>KM</Text>
                </View>
              </Animated.View>
            </View>
          </LinearGradient>
        </Animated.View>

        {!showCompanyShortcut && (
          <Animated.View entering={FadeInDown.delay(420).springify()} style={styles.joinCardWrapper}>
            <Pressable onPress={() => router.push('/company/join')} style={styles.joinCard} accessibilityLabel="Join a company" accessibilityRole="button" accessibilityHint="Enter invite code to collaborate">
              <LinearGradient
                colors={['rgba(255,25,0,0.18)', 'rgba(255,25,0,0.05)']}
                style={styles.joinCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.joinIcon}>
                  <MaterialIcons name="group-add" size={18} color="#ff1900" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.joinTitle}>Join a company</Text>
                  <Text style={styles.joinSubtitle} numberOfLines={1}>Enter invite code to collaborate</Text>
                </View>
                <MaterialIcons name="arrow-forward-ios" size={14} color="#ff1900" />
              </LinearGradient>
            </Pressable>
          </Animated.View>
        )}

        {showCompanyShortcut && (
          <Animated.View entering={FadeInDown.delay(430).springify()} style={styles.companyShortcutWrapper}>
            <Pressable onPress={() => router.push('/company')} style={styles.companyShortcut} accessibilityLabel={companyButtonTitle} accessibilityRole="button" accessibilityHint="Opens company workspace">
              <LinearGradient
                colors={['rgba(255,25,0,0.16)', 'rgba(255,25,0,0.05)']}
                style={styles.companyShortcutGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.companyShortcutIcon}>
                  <MaterialIcons name="business-center" size={18} color="#ff1900" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.companyShortcutTitle} numberOfLines={1}>{companyButtonTitle}</Text>
                  <Text style={styles.companyShortcutSubtitle} numberOfLines={1}>
                    {companyRoleLabel ? `Role: ${companyRoleLabel}` : 'Company dashboard'}
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={18} color="#ff1900" />
              </LinearGradient>
            </Pressable>
          </Animated.View>
        )}

        {/* Next Flight card removed; only mini header info remains */}

        {/* Upcoming Flights */}
        <Animated.View 
          entering={FadeInDown.delay(500).springify()}
          style={styles.upcomingFlightsSection}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Flights</Text>
            <Pressable 
              style={styles.viewAllButton}
              onPress={() => router.push('/flight-calendar')}
              accessibilityLabel="View calendar"
              accessibilityRole="button"
              accessibilityHint="Opens the flight calendar"
            >
              <LinearGradient
                colors={['rgba(255,25,0,0.2)', 'rgba(255,25,0,0.1)']}
                style={styles.viewAllGradient}
              >
                <MaterialIcons name="calendar-today" size={16} color="#ff1900" />
                <Text style={styles.viewAllText}>View Calendar</Text>
              </LinearGradient>
            </Pressable>
          </View>

          {/* Flight Cards */}
          <View style={styles.flightsList}>
            {nextFlight ? (
              <Animated.View entering={FadeInDown.delay(600).springify()}>
                <Pressable
                  style={styles.flightCard}
                  onPress={() => router.push(`/trip-details?id=${nextFlight.id}`)}
                  accessibilityLabel={`Flight ${nextFlight.from?.iata || ''} to ${nextFlight.to?.iata || ''}, ${nextFlight.flightNumber}`}
                  accessibilityRole="button"
                  accessibilityHint="Opens trip details"
                >
                <View style={styles.flightHeader}>
                  <Text style={styles.flightDate}>
                    {new Date(nextFlight.date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </Text>
                  <View style={[styles.statusBadge, nextFlightIsActive && styles.statusBadgeActive]}>
                    <Text style={styles.statusText}>
                      {nextFlightIsActive ? 'Active Flight' : 'Next Flight'}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.flightRoute}>
                  <View style={styles.airportSection}>
                    <Text style={styles.airportCode}>{(nextFlight.from.iata || nextFlight.from.icao || nextFlight.from.name || nextFlight.from.city || '—').toString().toUpperCase()}</Text>
                    <Text style={styles.airportCity}>{nextFlight.from.city || nextFlight.from.name || '—'}</Text>
                  </View>
                  
                  <View style={styles.routeConnector}>
                    <View style={styles.flightLine} />
                    <MaterialIcons name="flight" size={16} color="#ff1900" />
                    <View style={styles.flightLine} />
                  </View>
                  
                  <View style={styles.airportSection}>
                    <Text style={styles.airportCode}>{(nextFlight.to.iata || nextFlight.to.icao || nextFlight.to.name || nextFlight.to.city || '—').toString().toUpperCase()}</Text>
                    <Text style={styles.airportCity}>{nextFlight.to.city || nextFlight.to.name || '—'}</Text>
                  </View>
                </View>
                
                <View style={styles.flightDetails}>
                  <Text style={styles.flightNumber}>{nextFlight.flightNumber}</Text>
                  <Text style={styles.departureTime}>
                    {nextFlight.duration || new Date(nextFlight.date).toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </Text>
                </View>
                </Pressable>
              </Animated.View>
            ) : (
              <Animated.View
                entering={FadeInDown.delay(600).springify()}
                style={styles.noFlightsCard}
              >
                <MaterialIcons name="flight-takeoff" size={32} color="rgba(255,255,255,0.5)" />
                <Text style={styles.noFlightsText}>No upcoming flights</Text>
                <Text style={styles.noFlightsSubtext}>Add a flight to see it here</Text>
              </Animated.View>
            )}
          </View>

          {/* Additional Info Cards */}
          {nextFlight && (() => {
            const isActive = isActiveFlight(nextFlight);

            // Calculate days until flight
            const flightDate = new Date(nextFlight.date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            flightDate.setHours(0, 0, 0, 0);
            const daysUntil = Math.ceil((flightDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            
            // Calculate flight distance
            const flightDistance = nextFlight.distanceKm 
              ? `${nextFlight.distanceKm.toLocaleString()} km`
              : nextFlight.distance || '—';
            
            return (
              <View style={styles.additionalCards}>
                <Animated.View
                  entering={FadeInDown.delay(700).springify()}
                  style={[styles.infoCard, styles.infoCardFull]}
                >
                  <MaterialIcons name="event" size={16} color="#ff6b6b" />
                  <Text style={styles.infoCardTitle}>
                    {isActive
                      ? 'Active Flight'
                      : daysUntil === 0
                        ? 'Today'
                        : daysUntil === 1
                          ? 'Tomorrow'
                          : `${daysUntil} Days`}
                  </Text>
                  <Text style={styles.infoCardSubtitle} numberOfLines={1}>
                    {isActive ? 'Currently in progress' : (daysUntil === 0 ? 'Flight today!' : 'Until departure')}
                  </Text>
                </Animated.View>
                
                {flightDistance !== '—' && (
                  <Animated.View
                    entering={FadeInDown.delay(720).springify()}
                    style={[styles.infoCard, styles.infoCardFull]}
                  >
                    <MaterialIcons name="straighten" size={16} color="#43e97b" />
                    <Text style={styles.infoCardTitle}>Distance</Text>
                    <Text style={styles.infoCardSubtitle} numberOfLines={1}>{flightDistance}</Text>
                  </Animated.View>
                )}
              </View>
            );
          })()}
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View 
          entering={FadeInDown.delay(700).springify()}
          style={styles.quickActionsSection}
        >
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <Pressable 
              style={styles.actionCard}
              onPress={() => router.push('/add-flight-manual')}
              accessibilityLabel="Add flight manually"
              accessibilityRole="button"
              accessibilityHint="Opens form to add a new flight"
            >
              <LinearGradient
                colors={['#ff1900', '#ff3b00']}
                style={styles.actionGradient}
              >
                <MaterialIcons name="add" size={24} color="#fff" />
              </LinearGradient>
              <Text style={styles.actionTitle}>Add Flight</Text>
              <Text style={styles.actionSubtitle}>Manual entry</Text>
            </Pressable>

            <Pressable 
              style={styles.actionCard}
              onPress={() => router.push('/add-flight-import')}
              accessibilityLabel="Scan ticket"
              accessibilityRole="button"
              accessibilityHint="Import flight from photo or document"
            >
              <LinearGradient
                colors={['#43e97b', '#38d9a9']}
                style={styles.actionGradient}
              >
                <MaterialIcons name="photo-camera" size={24} color="#fff" />
              </LinearGradient>
              <Text style={styles.actionTitle}>Scan Ticket</Text>
              <Text style={styles.actionSubtitle}>OCR import</Text>
            </Pressable>

            <Pressable 
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/map')}
              accessibilityLabel="View map"
              accessibilityRole="button"
              accessibilityHint="Opens the map with your flight routes"
            >
              <LinearGradient
                colors={['#845ec2', '#a55eea']}
                style={styles.actionGradient}
              >
                <MaterialIcons name="map" size={24} color="#fff" />
              </LinearGradient>
              <Text style={styles.actionTitle}>View Map</Text>
              <Text style={styles.actionSubtitle}>Your routes</Text>
            </Pressable>
          </View>
        </Animated.View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContainer: {
    flex: 1,
  },
  
  // Modern Header
  modernHeader: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#ff1900',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  headerGradient: {
    padding: 20,
    minHeight: 180,
    position: 'relative',
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  floatingElement: {
    position: 'absolute',
    borderRadius: 50,
    overflow: 'hidden',
  },
  element1: {
    width: 60,
    height: 60,
    top: 16,
    right: 16,
  },
  floatingProfileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  floatingProfilePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  floatingProfileText: {
    fontSize: 24,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.9)',
  },
  element2: {
    width: 50,
    height: 50,
    bottom: 20,
    left: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  element3: {
    width: 40,
    height: 40,
    top: 50,
    left: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  headerContent: {
    flex: 1,
    zIndex: 1,
  },
  welcomeSection: {
    marginBottom: 16,
  },
  greetingContainer: {
    marginBottom: 8,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  greetingText: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
  },
  userName: {
    fontSize: 28,
    fontFamily: 'Nexa-Heavy',
    color: '#fff',
    letterSpacing: -0.8,
  },
  subtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subtitleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ff1900',
    fontStyle: 'italic',
  },
  subtitleAccent: {
    flex: 1,
    height: 2,
    backgroundColor: '#ff1900',
    borderRadius: 1,
    opacity: 0.6,
  },
  quickStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 12,
  },

  // Enhanced Search
  // Upcoming Flights
  upcomingFlightsSection: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Nexa-Heavy',
  },
  seeAllText: {
    color: '#ff1900',
    fontSize: 13,
    fontWeight: '500',
  },
  viewAllButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#ff1900',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  viewAllGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,25,0,0.3)',
  },
  viewAllText: {
    color: '#ff1900',
    fontSize: 13,
    fontWeight: '600',
  },
  flightsList: {
    marginBottom: 8,
  },
  flightCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  flightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  flightDate: {
    color: '#ff1900',
    fontSize: 13,
    fontWeight: '600',
  },
  statusBadge: {
    backgroundColor: '#43e97b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusBadgeActive: {
    backgroundColor: '#ff9800',
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  flightRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  airportSection: {
    flex: 1,
    alignItems: 'center',
  },
  airportCode: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 3,
  },
  airportCity: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '500',
  },
  routeConnector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  flightLine: {
    width: 35,
    height: 2,
    backgroundColor: '#ff1900',
  },
  flightDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  flightNumber: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  departureTime: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '500',
  },
  noFlightsCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  noFlightsText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  noFlightsSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
  additionalCards: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  infoCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    minHeight: 60,
    justifyContent: 'center',
  },
  infoCardFull: {
    flex: 1,
  },
  infoCardTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 2,
    textAlign: 'center',
  },
  infoCardSubtitle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 10,
    textAlign: 'center',
  },

  // Quick Actions
  quickActionsSection: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    paddingTop: 4,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  actionCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  actionGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  actionTitle: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Nexa-Heavy',
    marginBottom: 3,
    textAlign: 'center',
  },
  actionSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontFamily: 'Nexa-ExtraLight',
    textAlign: 'center',
  },
  // Company shortcut - Compact design
  companyShortcutWrapper: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  companyShortcut: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  companyShortcutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  companyShortcutIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,25,0,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyShortcutTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  companyShortcutSubtitle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    marginTop: 1,
  },
  companyShortcutInfo: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    marginTop: 4,
  },
  joinCardWrapper: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  joinCard: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  joinCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  joinIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,25,0,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  joinSubtitle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    marginTop: 1,
    lineHeight: 14,
  },

  // Stats Card
  statsCardContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  statsCard: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,25,0,0.2)',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
});