import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import ChecklistList from '../components/checklists/ChecklistList';
import DocumentList from '../components/documents/DocumentList';
import NoteList from '../components/notes/NoteList';
import ScreenWrapper from '../components/ScreenWrapper';
import TripTabs from '../components/TripTabs';
import TripUsersTab from '../components/TripUsersTab';
import TripDetailsTutorialOverlay from '../components/tutorial/TripDetailsTutorialOverlay';
import { BorderRadius, Colors, IconSizes, Shadows, Spacing, Typography } from '../constants/DesignTokens';
import { useAuth } from '../contexts/AuthContext';
import { useAppStore } from '../store';
import { Flight } from '../types';

interface TripPhoto {
  id: string;
  uri: string;
  timestamp: number;
  caption?: string;
}

type TripTab = 'overview' | 'checklists' | 'notes' | 'flights' | 'documents' | 'users';
const TRIP_TABS: TripTab[] = ['overview', 'checklists', 'notes', 'flights', 'documents', 'users'];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function TripDetails() {
  const params = useLocalSearchParams();
  const id = params.id as string;
  const tutorialParam = String((params as any).tutorial || '') === '1';
  const requestedTab = String((params as any).tab || '').toLowerCase();
  const loadFlights = useAppStore(state => state.loadFlights);
  const loadNotesForFlight = useAppStore((state: any) => state.loadNotesForFlight);
  const loadChecklistsForFlight = useAppStore((state: any) => state.loadChecklistsForFlight);
  const loadTemplatesByPurpose = useAppStore((state: any) => state.loadTemplatesByPurpose);
  const { currentCompanyRole, currentCompanyId, memberships, user } = useAuth();
  const [flight, setFlight] = useState<Flight | null>(null);
  const activeMembership = currentCompanyId
    ? memberships.find(m => m.companyId === currentCompanyId)
    : memberships[0];
  const activeCompanyName = activeMembership?.company?.name;
  const showCompanyShortcut = !!activeMembership;
  const roleLabel = currentCompanyRole
    ? currentCompanyRole.charAt(0).toUpperCase() + currentCompanyRole.slice(1)
    : undefined;
  const [photos, setPhotos] = useState<TripPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);
  // Tabs replace legacy inline notes; editor handled inside tab components
  const [activeTab, setActiveTab] = useState<TripTab>(() =>
    TRIP_TABS.includes(requestedTab as TripTab) ? (requestedTab as TripTab) : 'overview'
  );
  const [createChecklistTrigger, setCreateChecklistTrigger] = useState(0);
  const [createNoteTrigger, setCreateNoteTrigger] = useState(0);
  const isMountedRef = useRef(true);
  const tripLoadRequestRef = useRef(0);

  useEffect(() => {
    if (TRIP_TABS.includes(requestedTab as TripTab)) {
      setActiveTab(requestedTab as TripTab);
    }
  }, [requestedTab]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadTripData = useCallback(async () => {
    if (!id) {
      setFlight(null);
      setLoading(false);
      return;
    }

    const requestId = ++tripLoadRequestRef.current;
    try {
      setLoading(true);
      const stateFlights = useAppStore.getState().flights || [];
      let resolved: Flight | null = stateFlights.find(f => f.id === id) || null;

      // Only fetch the full list if the flight is not yet in local store.
      if (!resolved) {
        await loadFlights();
        const refreshedFlights = useAppStore.getState().flights || [];
        resolved = refreshedFlights.find(f => f.id === id) || null;
      }

      // Final fallback for direct owner flights.
      if (!resolved) {
        const { supabaseService } = await import('../services/supabase');
        const raw = await supabaseService.getFlight(id);
        if (raw) {
          const { getEffectiveFlightStatus } = await import('../utils/flightMetrics');
          resolved = { ...raw, status: getEffectiveFlightStatus(raw) };
        }
      }

      if (!isMountedRef.current || requestId !== tripLoadRequestRef.current) return;
      setFlight(resolved || null);
    } catch {
      if (!isMountedRef.current || requestId !== tripLoadRequestRef.current) return;
      setFlight(null);
    } finally {
      if (!isMountedRef.current || requestId !== tripLoadRequestRef.current) return;
      setLoading(false);
    }
  }, [id, loadFlights]);

  const loadPhotos = useCallback(async () => {
    try {
      const storedPhotos = await AsyncStorage.getItem(`trip_photos_${id}`);
      if (storedPhotos) {
        setPhotos(JSON.parse(storedPhotos));
      } else {
        setPhotos([]);
      }
    } catch (error) {
      if (__DEV__) console.error('Error loading photos:', error);
    }
  }, [id]);

  useEffect(() => {
    void loadTripData();
    void loadPhotos();
  }, [loadTripData, loadPhotos]);

  useEffect(() => {
    const run = async () => {
      try {
        if (!tutorialParam) return;
        if (!user?.id) return;
        const { getProfilePreferences } = await import('../services/profilePreferencesService');
        const prefs = await getProfilePreferences(user.id);
        if (!prefs?.hasSeenTripDetailsTutorial) {
          setShowTutorial(true);
        }
      } catch {
        // If DB preferences aren't available yet, still show tutorial once (device-local)
        try {
          const key = `hasSeenTripDetailsTutorial_${user?.id || 'user'}`;
          const seen = await AsyncStorage.getItem(key);
          if (seen !== 'true') setShowTutorial(true);
        } catch {}
      }
    };
    void run();
  }, [tutorialParam, user?.id]);

  useEffect(() => {
    if (activeTab !== 'checklists') return;
    loadTemplatesByPurpose('private').catch(() => {});
  }, [activeTab, loadTemplatesByPurpose]);

  // Warm current trip tab data immediately to avoid first-open delays.
  useEffect(() => {
    if (!id) return;
    void Promise.allSettled([
      loadNotesForFlight(id),
      loadChecklistsForFlight(id),
      loadTemplatesByPurpose('private'),
    ]);
  }, [id, loadChecklistsForFlight, loadNotesForFlight, loadTemplatesByPurpose]);

  const safeGoBack = useCallback(() => {
    try {
      const canGoBack = typeof (router as any).canGoBack === 'function' && (router as any).canGoBack();
      if (canGoBack) {
        router.back();
      } else {
        router.replace('/(tabs)/home');
      }
    } catch {
      try {
        router.replace('/(tabs)/home');
      } catch {}
    }
  }, []);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '—';
    try {
      const d = new Date(dateString);
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return '—';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <LinearGradient
          colors={['#000', '#1a1a1a']}
          style={styles.loadingContainer}
        >
          <Animated.View entering={FadeInUp.springify()} style={styles.loadingContent}>
            <MaterialIcons name="flight" size={48} color={Colors.primary.main} />
            <Text style={styles.loadingText}>Loading trip details...</Text>
          </Animated.View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (!flight) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <LinearGradient
          colors={['#000', '#1a1a1a']}
          style={styles.errorContainer}
        >
          <Animated.View entering={FadeInUp.springify()} style={styles.errorContent}>
            <MaterialIcons name="error-outline" size={48} color={Colors.primary.main} />
            <Text style={styles.errorTitle}>Trip Not Found</Text>
            <Text style={styles.errorText}>The requested trip could not be loaded.</Text>
          <Pressable style={styles.errorButton} onPress={safeGoBack}>
              <Text style={styles.errorButtonText}>Go Back</Text>
            </Pressable>
          </Animated.View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  const statusColor = getStatusColor(flight.status);

  return (
    <ScreenWrapper 
      title="Trip Details" 
      showBackButton={true}
    >
      {showTutorial && activeTab === 'overview' && (
        <TripDetailsTutorialOverlay
          onClose={async () => {
            setShowTutorial(false);
            try {
              if (user?.id) {
                const { updateProfilePreferences } = await import('../services/profilePreferencesService');
                await updateProfilePreferences(user.id, { hasSeenTripDetailsTutorial: true });
              }
            } catch {
              try {
                const key = `hasSeenTripDetailsTutorial_${user?.id || 'user'}`;
                await AsyncStorage.setItem(key, 'true');
              } catch {}
            }
          }}
        />
      )}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={activeTab === 'overview'}
        keyboardShouldPersistTaps="handled"
      >
        <TripTabs
          flightId={id as string}
          activeTab={activeTab}
          onActiveChange={(t) => setActiveTab(t)}
          overview={(
            <View style={styles.overviewContainer}>
              {/* Flight Route Card */}
              <Animated.View entering={FadeInDown.delay(100).springify()}>
                <View style={styles.routeCard}>
                  <LinearGradient
                    colors={[Colors.background.secondary, Colors.background.primary]}
                    style={styles.routeCardGradient}
                  >
                    {/* Status & Flight Number Header */}
                    <View style={styles.routeHeader}>
                      <View style={styles.flightIdRow}>
                        <MaterialIcons name="flight" size={IconSizes.sm} color={Colors.primary.main} />
                        <Text style={styles.flightNumberLabel}>
                          {flight.flightNumber || 'Flight'}
                        </Text>
                        {flight.airline && (
                          <Text style={styles.airlineLabel}>• {flight.airline}</Text>
                        )}
                      </View>
                      <View style={[styles.statusChip, { backgroundColor: statusColor + '22', borderColor: statusColor + '55' }]}>
                        <Text style={[styles.statusText, { color: statusColor }]}>
                          {flight.status.charAt(0).toUpperCase() + flight.status.slice(1)}
                        </Text>
                      </View>
                    </View>

                    {/* Route Visualization */}
                    <View style={styles.routeRow}>
                      <View style={styles.airportBlock}>
                        <Text style={styles.iataCode}>{flight.from?.iata || '???'}</Text>
                        <Text style={styles.cityName} numberOfLines={1}>
                          {flight.from?.city || flight.from?.name || '—'}
                        </Text>
                        <Text style={styles.timeLabel}>{formatTime(flight.departureAt)}</Text>
                      </View>

                      <View style={styles.routeConnector}>
                        <View style={styles.routeDash} />
                        <View style={styles.planeCircle}>
                          <MaterialIcons name="flight" size={IconSizes.md} color="#fff" style={{ transform: [{ rotate: '90deg' }] }} />
                        </View>
                        <View style={styles.routeDash} />
                      </View>

                      <View style={[styles.airportBlock, { alignItems: 'flex-end' }]}>
                        <Text style={styles.iataCode}>{flight.to?.iata || '???'}</Text>
                        <Text style={styles.cityName} numberOfLines={1}>
                          {flight.to?.city || flight.to?.name || '—'}
                        </Text>
                        <Text style={styles.timeLabel}>{formatTime(flight.arrivalAt)}</Text>
                      </View>
                    </View>

                    {/* Date & Duration */}
                    <View style={styles.metaStrip}>
                      <View style={styles.metaItem}>
                        <MaterialIcons name="calendar-today" size={IconSizes.xs} color={Colors.text.tertiary} />
                        <Text style={styles.metaText}>{formatDate(flight.date)}</Text>
                      </View>
                      {flight.duration && (
                        <View style={styles.metaItem}>
                          <MaterialIcons name="schedule" size={IconSizes.xs} color={Colors.text.tertiary} />
                          <Text style={styles.metaText}>{flight.duration}</Text>
                        </View>
                      )}
                      {flight.distance && (
                        <View style={styles.metaItem}>
                          <MaterialIcons name="straighten" size={IconSizes.xs} color={Colors.text.tertiary} />
                          <Text style={styles.metaText}>{flight.distance}</Text>
                        </View>
                      )}
                    </View>
                  </LinearGradient>
                </View>
              </Animated.View>

              {/* Quick Info Grid */}
              {(flight.seat || flight.gate || flight.terminal || flight.confirmationCode || flight.bookingReference) && (
                <Animated.View entering={FadeInDown.delay(200).springify()}>
                  <View style={styles.infoGrid}>
                    {flight.seat && (
                      <View style={styles.infoTile}>
                        <View style={styles.infoTileIcon}>
                          <MaterialIcons name="event-seat" size={IconSizes.lg} color={Colors.primary.main} />
                      </View>
                        <Text style={styles.infoTileLabel}>Seat</Text>
                        <Text style={styles.infoTileValue}>{flight.seat}</Text>
                      </View>
                    )}
                    {flight.gate && (
                      <View style={styles.infoTile}>
                        <View style={styles.infoTileIcon}>
                          <MaterialIcons name="door-front" size={IconSizes.lg} color={Colors.semantic.gate} />
                        </View>
                        <Text style={styles.infoTileLabel}>Gate</Text>
                        <Text style={styles.infoTileValue}>{flight.gate}</Text>
                      </View>
                    )}
                    {flight.terminal && (
                      <View style={styles.infoTile}>
                        <View style={styles.infoTileIcon}>
                          <MaterialIcons name="domain" size={IconSizes.lg} color={Colors.status.info} />
                        </View>
                        <Text style={styles.infoTileLabel}>Terminal</Text>
                        <Text style={styles.infoTileValue}>{flight.terminal}</Text>
                      </View>
                    )}
                    {(flight.confirmationCode || flight.bookingReference) && (
                      <View style={styles.infoTile}>
                        <View style={styles.infoTileIcon}>
                          <MaterialIcons name="confirmation-number" size={IconSizes.lg} color="#4CAF50" />
                        </View>
                        <Text style={styles.infoTileLabel}>Booking</Text>
                        <Text style={styles.infoTileValue} numberOfLines={1}>
                          {flight.confirmationCode || flight.bookingReference}
                        </Text>
                      </View>
                    )}
                  </View>
                </Animated.View>
              )}

              {/* Company Shortcut */}
              {showCompanyShortcut && (
                <Animated.View entering={FadeInDown.delay(300).springify()}>
                  <Pressable onPress={() => router.push('/company')} style={styles.companyCard}>
                    <LinearGradient
                      colors={['rgba(255,25,0,0.12)', 'rgba(255,25,0,0.04)']}
                      style={styles.companyCardGradient}
                    >
                      <View style={styles.companyIconWrap}>
                        <MaterialIcons name="business" size={IconSizes.lg} color={Colors.primary.main} />
                      </View>
                      <View style={styles.companyTextWrap}>
                        <Text style={styles.companyTitle}>{activeCompanyName || 'Company Space'}</Text>
                        <Text style={styles.companySubtitle}>
                          {roleLabel ? `Role: ${roleLabel}` : 'Open company dashboard'}
                        </Text>
                      </View>
                      <MaterialIcons name="chevron-right" size={IconSizes.xl} color={Colors.primary.main} />
                    </LinearGradient>
                  </Pressable>
                </Animated.View>
              )}

              {/* Photos Section */}
              <Animated.View entering={FadeInDown.delay(400).springify()}>
                <View style={styles.sectionCard}>
                  <LinearGradient
                    colors={[Colors.background.secondary, Colors.background.primary]}
                    style={styles.sectionCardGradient}
                  >
                    <View style={styles.sectionHeader}>
                      <View style={styles.sectionTitleRow}>
                        <View style={styles.sectionIconWrap}>
                          <MaterialIcons name="photo-library" size={IconSizes.md} color={Colors.primary.main} />
                    </View>
                        <Text style={styles.sectionTitle}>Travel Photos</Text>
                        <View style={styles.countBadge}>
                          <Text style={styles.countBadgeText}>{photos.length}</Text>
                        </View>
                      </View>
                      <Pressable style={styles.sectionAction} onPress={() => router.push(`/trip-photos?id=${id}`)}>
                        <MaterialIcons name="add-a-photo" size={IconSizes.md} color="#fff" />
                    </Pressable>
                  </View>

                  {photos.length > 0 ? (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.photosScroll}
                        contentContainerStyle={styles.photosScrollContent}
                      >
                      {photos.map((photo, index) => (
                          <Animated.View
                            key={photo.id}
                            entering={FadeInDown.delay(500 + index * 100).springify()}
                            style={styles.photoCard}
                          >
                            <Image source={{ uri: photo.uri }} style={styles.photoImage} resizeMode="cover" />
                          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.photoOverlay}>
                              <Text style={styles.photoDate}>
                                {new Date(photo.timestamp).toLocaleDateString()}
                              </Text>
                          </LinearGradient>
                        </Animated.View>
                      ))}
                    </ScrollView>
                  ) : (
                      <View style={styles.emptyPhotos}>
                        <MaterialIcons name="photo-camera" size={40} color="rgba(255,255,255,0.2)" />
                        <Text style={styles.emptyPhotosTitle}>No Photos Yet</Text>
                        <Text style={styles.emptyPhotosText}>Capture memories from your trip</Text>
                        <Pressable
                          style={styles.addPhotosBtn}
                          onPress={() => router.push(`/trip-photos?id=${id}`)}
                        >
                          <LinearGradient
                            colors={[Colors.primary.main, Colors.primary.light]}
                            style={styles.addPhotosBtnGradient}
                          >
                            <MaterialIcons name="add-a-photo" size={IconSizes.sm} color="#fff" />
                            <Text style={styles.addPhotosBtnText}>Add Photos</Text>
                        </LinearGradient>
                      </Pressable>
                    </View>
                  )}
                </LinearGradient>
                </View>
              </Animated.View>

              {/* Notes preview (if any) */}
              {flight.notes && (
                <Animated.View entering={FadeInDown.delay(500).springify()}>
                  <View style={styles.sectionCard}>
                    <LinearGradient
                      colors={[Colors.background.secondary, Colors.background.primary]}
                      style={styles.sectionCardGradient}
                    >
                      <View style={styles.sectionHeader}>
                        <View style={styles.sectionTitleRow}>
                          <View style={styles.sectionIconWrap}>
                            <MaterialIcons name="sticky-note-2" size={IconSizes.md} color="#FFC107" />
                          </View>
                          <Text style={styles.sectionTitle}>Quick Note</Text>
                        </View>
                      </View>
                      <Text style={styles.notePreview} numberOfLines={3}>{flight.notes}</Text>
                    </LinearGradient>
                  </View>
                </Animated.View>
              )}
            </View>
          )}
          notes={<NoteList flightId={id as string} hideFab openCreateTrigger={createNoteTrigger} />}
          checklists={<ChecklistList flightId={id as string} hideFab openCreateTrigger={createChecklistTrigger} />}
          documents={<DocumentList flightId={id as string} />}
          users={<TripUsersTab />}
        />

        {/* Footer Spacing */}
        <View style={styles.footer} />
      </ScrollView>

    {/* Global FAB anchored bottom-right for Checklists tab */}
    {(activeTab === 'checklists' || activeTab === 'notes') && (
      <Pressable
        style={styles.globalFab}
        onPress={() => {
          if (activeTab === 'checklists') {
            setCreateChecklistTrigger((n) => n + 1);
            return;
          }
          if (activeTab === 'notes') {
            setCreateNoteTrigger((n) => n + 1);
          }
        }}
      >
          <LinearGradient colors={[Colors.primary.main, Colors.primary.light]} style={styles.globalFabGradient}>
          <MaterialIcons name="add" size={IconSizes.xl} color="#fff" />
        </LinearGradient>
      </Pressable>
    )}

      {/* Note editor handled inside NoteList modal */}
    </ScreenWrapper>
  );
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return '#4CAF50';
    case 'upcoming': return '#2196F3';
    case 'cancelled': return '#f44336';
    default: return '#9E9E9E';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  
  // Loading States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.text.primary,
    fontSize: Typography.fontSize.lg,
    fontFamily: Typography.fontFamily.display,
    marginTop: Spacing.lg,
  },
  
  // Error States
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContent: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    color: Colors.text.primary,
    fontSize: Typography.fontSize['2xl'],
    fontFamily: Typography.fontFamily.display,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  errorText: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.regular,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing['2xl'],
  },
  errorButton: {
    backgroundColor: Colors.primary.main,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
  },
  errorButtonText: {
    color: '#fff',
    fontSize: Typography.fontSize.lg,
    fontFamily: Typography.fontFamily.display,
  },

  // ScrollView
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // ===== Overview Section =====
  overviewContainer: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },

  // -- Route Card --
  routeCard: {
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
    ...Shadows.md,
  },
  routeCardGradient: {
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border.primary,
    borderRadius: BorderRadius['2xl'],
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  flightIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flightNumberLabel: {
    color: Colors.text.primary,
    fontSize: Typography.fontSize.lg,
    fontFamily: Typography.fontFamily.display,
  },
  airlineLabel: {
    color: Colors.text.tertiary,
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md - 2,
    paddingVertical: Spacing.xs + 1,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: 5,
  },
  statusText: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.display,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // -- Route visualization --
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  airportBlock: {
    flex: 1,
    gap: 2,
  },
  iataCode: {
    fontSize: Typography.fontSize['4xl'],
    fontFamily: Typography.fontFamily.display,
    color: Colors.text.primary,
    letterSpacing: 2,
  },
  cityName: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  timeLabel: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.display,
    color: Colors.text.tertiary,
    marginTop: 4,
  },
  routeConnector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    flex: 1,
  },
  routeDash: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  planeCircle: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: Spacing.xs,
  },

  // -- Meta strip --
  metaStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.secondary,
  },

  // -- Info Grid --
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  infoTile: {
    flex: 1,
    minWidth: (SCREEN_WIDTH - Spacing.xl * 2 - Spacing.sm) / 2 - 1,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border.primary,
    alignItems: 'center',
    gap: 6,
  },
  infoTileIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoTileLabel: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  infoTileValue: {
    fontSize: Typography.fontSize.xl,
    fontFamily: Typography.fontFamily.display,
    color: Colors.text.primary,
  },

  // -- Company Card --
  companyCard: {
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
  },
  companyCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.component.inputPadding,
    borderRadius: BorderRadius['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(255,25,0,0.15)',
    gap: 14,
  },
  companyIconWrap: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255,25,0,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyTextWrap: {
    flex: 1,
  },
  companyTitle: {
    color: Colors.text.primary,
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.display,
  },
  companySubtitle: {
    color: Colors.text.secondary,
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    marginTop: 2,
  },

  // -- Section Card (Photos, Notes preview) --
  sectionCard: {
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
  },
  sectionCardGradient: {
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border.primary,
    borderRadius: BorderRadius['2xl'],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontFamily: Typography.fontFamily.display,
    color: Colors.text.primary,
  },
  countBadge: {
    backgroundColor: Colors.primary.main,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm - 1,
    paddingVertical: Spacing.xs - 2,
    marginLeft: 4,
  },
  countBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: Typography.fontFamily.display,
  },
  sectionAction: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // -- Photos --
  photosScroll: {
    marginHorizontal: -Spacing.lg,
  },
  photosScrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  photoCard: {
    width: SCREEN_WIDTH * 0.38,
    height: SCREEN_WIDTH * 0.38,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md - 2,
  },
  photoDate: {
    color: '#fff',
    fontSize: 11,
    fontFamily: Typography.fontFamily.display,
    textAlign: 'center',
  },
  emptyPhotos: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderStyle: 'dashed',
  },
  emptyPhotosTitle: {
    fontSize: Typography.fontSize.lg,
    fontFamily: Typography.fontFamily.display,
    color: Colors.text.primary,
    marginTop: Spacing.md,
    marginBottom: 4,
  },
  emptyPhotosText: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.tertiary,
    marginBottom: Spacing.xl,
  },
  addPhotosBtn: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  addPhotosBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md - 2,
    gap: 6,
  },
  addPhotosBtnText: {
    color: '#fff',
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.display,
  },

  // -- Note preview --
  notePreview: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.secondary,
    lineHeight: 22,
  },

  // Footer
  footer: {
    height: 20,
  },

  // Global FAB (fixed)
  globalFab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.lg,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    ...Shadows.primary,
  },
  globalFabGradient: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
