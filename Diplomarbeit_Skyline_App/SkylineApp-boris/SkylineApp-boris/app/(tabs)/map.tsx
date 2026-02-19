import { MaterialIcons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  DeviceEventEmitter,
  Dimensions,
  Easing,
  Platform,
  Pressable,
  Animated as RNAnimated,
  StyleSheet,
  Text,
  View
} from 'react-native';
import MapView, { AnimatedRegion, Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Animated, {
  Extrapolate,
  FadeInDown,
  interpolate,
  Easing as ReanimatedEasing,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import FlightAdditionFlow from '../../components/FlightAdditionFlow';
import { useAuth } from '../../contexts/AuthContext';
import { airportsInBBox } from '../../services/airports';
import { useAppStore, useFlights } from '../../store';
import { Flight } from '../../types';

// Dark map style configuration for Apple Maps
const darkMapStyle = [
  {
    elementType: 'geometry',
    stylers: [
      {
        color: '#212121',
      },
    ],
  },
  {
    elementType: 'labels.icon',
    stylers: [
      {
        visibility: 'off',
      },
    ],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [
      {
        color: '#757575',
      },
    ],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [
      {
        color: '#212121',
      },
    ],
  },
  {
    featureType: 'administrative',
    elementType: 'geometry',
    stylers: [
      {
        color: '#757575',
      },
    ],
  },
  {
    featureType: 'administrative.country',
    elementType: 'labels.text.fill',
    stylers: [
      {
        color: '#9e9e9e',
      },
    ],
  },
  {
    featureType: 'administrative.land_parcel',
    stylers: [
      {
        visibility: 'off',
      },
    ],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [
      {
        color: '#bdbdbd',
      },
    ],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [
      {
        color: '#757575',
      },
    ],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [
      {
        color: '#181818',
      },
    ],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [
      {
        color: '#616161',
      },
    ],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.stroke',
    stylers: [
      {
        color: '#1b1b1b',
      },
    ],
  },
  {
    featureType: 'road',
    elementType: 'geometry.fill',
    stylers: [
      {
        color: '#2c2c2c',
      },
    ],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [
      {
        color: '#8a8a8a',
      },
    ],
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry',
    stylers: [
      {
        color: '#373737',
      },
    ],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [
      {
        color: '#3c3c3c',
      },
    ],
  },
  {
    featureType: 'road.highway.controlled_access',
    elementType: 'geometry',
    stylers: [
      {
        color: '#4e4e4e',
      },
    ],
  },
  {
    featureType: 'road.local',
    elementType: 'labels.text.fill',
    stylers: [
      {
        color: '#616161',
      },
    ],
  },
  {
    featureType: 'transit',
    elementType: 'labels.text.fill',
    stylers: [
      {
        color: '#757575',
      },
    ],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [
      {
        color: '#000000',
      },
    ],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [
      {
        color: '#3d3d3d',
      },
    ],
  },
];

// Remove redundant search functionality - using flight list search instead

const INITIAL_REGION = {
  latitude: 48.2082,
  longitude: 16.3738,
  latitudeDelta: 10,
  longitudeDelta: 10,
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function MapScreen() {
  const DEBUG_LOGS = false;
  const ENABLE_MAP_ANIMATION = true;
  const { user } = useAuth();
  const flights = useFlights();
  const loadFlightsFromStore = useAppStore(state => state.loadFlights);
  
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPathModal, setShowPathModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingAirports, setIsFetchingAirports] = useState(false);
  const [airports, setAirports] = useState<Array<{ id: number; icao: string | null; iata: string | null; name: string; latitude: number; longitude: number }>>([]);
  const [showAirports, setShowAirports] = useState(false);
  const [pathPoints, setPathPoints] = useState<{ latitude: number; longitude: number }[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLanding, setIsLanding] = useState(false);
  const [showRouteOverlay, setShowRouteOverlay] = useState(false);
  const [isLiveInAir, setIsLiveInAir] = useState(false);
  const [livePlanes, setLivePlanes] = useState<Array<{ flightId: string; flightNumber?: string; latitude: number; longitude: number; bearing: number }>>([]);
  const [liveRoutes, setLiveRoutes] = useState<Array<{ flightId: string; past: { latitude: number; longitude: number }[]; future: { latitude: number; longitude: number }[] }>>([]);
  const [focusedFlightId, setFocusedFlightId] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false); // Hidden by default

  // Track current map region for smooth follow mode
  const currentRegionRef = useRef<any>(null);

  // Pulse animation for live planes
  const livePulse = useRef(new RNAnimated.Value(0)).current;
  React.useEffect(() => {
    try {
      const loop = RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(livePulse, { toValue: 1, duration: 1200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          RNAnimated.timing(livePulse, { toValue: 0, duration: 1200, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } catch {
      return;
    }
  }, [livePulse]);
  
  // Animation values for stats card (macOS-style minimize effect)
  const statsProgress = useSharedValue(0); // 0 = hidden, 1 = visible (starts hidden)

  const mapRef = useRef<MapView>(null);
  const planeMarkerRef = useRef<any>(null);
  const animTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const liveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const insets = useSafeAreaInsets();
  const rafIdRef = useRef<number | null>(null);
  const lastTsRef = useRef<number>(0);
  const lastCamUpdateRef = useRef<number>(0);
  const fetchAirportsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const landingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoDeselectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Use AnimatedRegion for smooth 60fps plane movement
  const planeCoordinate = useRef(new AnimatedRegion({
    latitude: 0,
    longitude: 0,
    latitudeDelta: 0,
    longitudeDelta: 0,
  })).current;
  
  // Use Animated.Value for smooth rotation without re-renders
  const planeRotation = useRef(new RNAnimated.Value(0)).current;

  // Calculate bearing (direction angle) between two points
  const calculateBearing = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const toDeg = (rad: number) => (rad * 180) / Math.PI;
    
    const dLon = toRad(lon2 - lon1);
    const y = Math.sin(dLon) * Math.cos(toRad(lat2));
    const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
              Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
    
    let bearing = toDeg(Math.atan2(y, x));
    bearing = (bearing + 360) % 360; // Normalize to 0-360
    
    return bearing;
  };

  // Calculate distance between two points in kilometers using Haversine formula
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6371; // Earth's radius in kilometers
    
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
  };

  // Generate great-circle (geodesic) path between two coordinates
  const generateGreatCircle = (
    start: { latitude: number; longitude: number },
    end: { latitude: number; longitude: number },
    points: number = 96
  ) => {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const toDeg = (rad: number) => (rad * 180) / Math.PI;
    const lat1 = toRad(start.latitude);
    const lon1 = toRad(start.longitude);
    const lat2 = toRad(end.latitude);
    const lon2 = toRad(end.longitude);

    const d = Math.acos(
      Math.sin(lat1) * Math.sin(lat2) +
        Math.cos(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1)
    );
    if (!isFinite(d) || d === 0) return [start, end];

    const route: { latitude: number; longitude: number }[] = [];
    for (let i = 0; i <= points; i++) {
      const f = i / points;
      const A = Math.sin((1 - f) * d) / Math.sin(d);
      const B = Math.sin(f * d) / Math.sin(d);
      const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
      const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
      const z = A * Math.sin(lat1) + B * Math.sin(lat2);
      const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
      const lon = Math.atan2(y, x);
      route.push({ latitude: toDeg(lat), longitude: toDeg(lon) });
    }
    return route;
  };

  const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

  // Parse duration strings like: "2.5 hours", "2 hours", "2h 30m", "02:30", "150m"
  const parseDurationMinutes = (duration?: string): number | null => {
    if (!duration) return null;
    const s = String(duration).trim().toLowerCase();

    // HH:MM
    const hhmm = s.match(/\b(\d{1,2}):(\d{2})\b/);
    if (hhmm) {
      const h = parseInt(hhmm[1], 10);
      const m = parseInt(hhmm[2], 10);
      if (!isNaN(h) && !isNaN(m)) return h * 60 + m;
    }

    // Xh Ym / Xh / Ym
    const hMatch = s.match(/(\d+(?:\.\d+)?)\s*h/);
    const mMatch = s.match(/(\d+(?:\.\d+)?)\s*m/);
    if (hMatch || mMatch) {
      const h = hMatch ? parseFloat(hMatch[1]) : 0;
      const m = mMatch ? parseFloat(mMatch[1]) : 0;
      const total = Math.round(h * 60 + m);
      return total > 0 ? total : null;
    }

    // "X hours" / "X hour"
    const hours = s.match(/(\d+(?:\.\d+)?)\s*hour/);
    if (hours) {
      const h = parseFloat(hours[1]);
      if (!isNaN(h) && h > 0) return Math.round(h * 60);
    }

    // "X minutes"
    const mins = s.match(/(\d+(?:\.\d+)?)\s*min/);
    if (mins) {
      const m = parseFloat(mins[1]);
      if (!isNaN(m) && m > 0) return Math.round(m);
    }

    return null;
  };

  // Great-circle interpolation for a single point (cheap, no precomputed route needed)
  const interpolateGreatCirclePoint = (
    start: { latitude: number; longitude: number },
    end: { latitude: number; longitude: number },
    f: number
  ) => {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const toDeg = (rad: number) => (rad * 180) / Math.PI;
    const lat1 = toRad(start.latitude);
    const lon1 = toRad(start.longitude);
    const lat2 = toRad(end.latitude);
    const lon2 = toRad(end.longitude);

    const d = Math.acos(
      Math.sin(lat1) * Math.sin(lat2) +
        Math.cos(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1)
    );
    if (!isFinite(d) || d === 0) return { latitude: start.latitude, longitude: start.longitude };

    const t = clamp01(f);
    const A = Math.sin((1 - t) * d) / Math.sin(d);
    const B = Math.sin(t * d) / Math.sin(d);
    const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
    const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);
    const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
    const lon = Math.atan2(y, x);

    return { latitude: toDeg(lat), longitude: toDeg(lon) };
  };

  // No assumptions: live progress only works if real timestamps exist on the flight.
  const getLiveProgress = (flight: Flight): { inAir: boolean; progress: number } => {
    const start = flight?.departureAt ? new Date(flight.departureAt) : null;
    const end = flight?.arrivalAt ? new Date(flight.arrivalAt) : null;
    if (!start || !end) {
      return { inAir: false, progress: 0 };
    }
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { inAir: false, progress: 0 };
    }
    if (end.getTime() <= start.getTime()) {
      return { inAir: false, progress: 0 };
    }

    const now = new Date();
    if (now < start || now > end) return { inAir: false, progress: now > end ? 1 : 0 };
    const p = (now.getTime() - start.getTime()) / (end.getTime() - start.getTime());
    return { inAir: true, progress: clamp01(p) };
  };

  const isFlightInProgress = (flight: Flight): boolean => {
    const start = flight?.departureAt ? new Date(flight.departureAt) : null;
    const end = flight?.arrivalAt ? new Date(flight.arrivalAt) : null;
    if (!start || !end) return false;
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;
    if (end.getTime() <= start.getTime()) return false;
    const now = new Date();
    return now >= start && now <= end;
  };

  const formatTimeHHMM = (iso?: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toTimeString().slice(0, 5);
  };

  const getFlightStartMs = (flight: Flight): number | null => {
    const preferred = flight?.departureAt ? new Date(flight.departureAt).getTime() : NaN;
    if (Number.isFinite(preferred)) return preferred;
    const fallback = new Date(flight.date).getTime();
    return Number.isFinite(fallback) ? fallback : null;
  };

  const formatMinutes = (mins: number) => {
    const m = Math.max(0, Math.round(mins));
    const h = Math.floor(m / 60);
    const mm = m % 60;
    if (h <= 0) return `${mm}m`;
    return `${h}h ${mm}m`;
  };

  const splitRouteByProgress = (
    route: { latitude: number; longitude: number }[],
    progress01: number
  ): { past: { latitude: number; longitude: number }[]; future: { latitude: number; longitude: number }[] } => {
    if (!route || route.length < 2) return { past: route || [], future: route || [] };
    const p = clamp01(progress01);
    const idx = Math.max(0, Math.min(route.length - 1, Math.floor(p * (route.length - 1))));
    const past = route.slice(0, idx + 1);
    const future = route.slice(idx);
    return { past, future };
  };

  const clearFocus = () => {
    try {
      setFocusedFlightId(null);
      setSelectedFlight(null);
      setPathPoints([]);
      setIsAnimating(false);
      setIsLanding(false);
      setShowRouteOverlay(false);
      setIsLiveInAir(false);
      if (liveTimerRef.current) {
        clearInterval(liveTimerRef.current);
        liveTimerRef.current = null;
      }
      bottomSheetRef.current?.close();
      mapRef.current?.animateToRegion(INITIAL_REGION, 900);
    } catch {}
  };

  const focusOnFlightPlane = (flight: Flight) => {
    try {
      if (!flight?.id) return;
      setFocusedFlightId(flight.id);

      // Ensure flight is selected (without toggling off)
      if (!selectedFlight || selectedFlight.id !== flight.id) {
        handleFlightSelect(flight);
      }

      // Compute current plane position and zoom there
      if (flight.from?.latitude && flight.from?.longitude && flight.to?.latitude && flight.to?.longitude) {
        const { inAir, progress } = getLiveProgress(flight);
        if (inAir) {
          const pt = interpolateGreatCirclePoint(
            { latitude: flight.from.latitude, longitude: flight.from.longitude },
            { latitude: flight.to.latitude, longitude: flight.to.longitude },
            progress
          );
          mapRef.current?.animateToRegion(
            {
              latitude: pt.latitude,
              longitude: pt.longitude,
              latitudeDelta: 0.8,
              longitudeDelta: 0.8,
            },
            700
          );
        }
      }

      // Show bottom card
      bottomSheetRef.current?.snapToIndex(0);
    } catch {}
  };

  const getPointAlongRoute = (route: { latitude: number; longitude: number }[], progress01: number) => {
    if (!route || route.length === 0) return null;
    if (route.length === 1) return route[0];
    const p = clamp01(progress01);
    const idx = p * (route.length - 1);
    const i0 = Math.floor(idx);
    const i1 = Math.min(route.length - 1, i0 + 1);
    const f = idx - i0;
    const a = route[i0];
    const b = route[i1];
    return {
      latitude: a.latitude + (b.latitude - a.latitude) * f,
      longitude: a.longitude + (b.longitude - a.longitude) * f,
      _bearingFrom: a,
      _bearingTo: b,
    } as any;
  };

  // Global live planes (no selection required) - only run when screen is focused
  const isScreenFocusedRef = useRef(true);
  
  // Smart loading: only load if store is empty, avoiding lag from repeated loads
  // Combined with focus tracking to avoid duplicate useFocusEffect hooks
  useFocusEffect(
    useCallback(() => {
      isScreenFocusedRef.current = true;
      
      // Only load if no flights in store (e.g., first time or after logout)
      if (user?.id && flights.length === 0) {
        setIsLoading(true);
        loadFlightsFromStore().finally(() => setIsLoading(false));
      } else {
        // Flights already loaded, no loading screen needed
        setIsLoading(false);
      }
      
      // Cleanup function when screen loses focus
      return () => {
        isScreenFocusedRef.current = false;
        
        // Cancel any running animations
        if (animTimerRef.current) {
          clearInterval(animTimerRef.current);
          animTimerRef.current = null;
        }
        if (rafIdRef.current) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
        if (fetchAirportsTimerRef.current) {
          clearTimeout(fetchAirportsTimerRef.current);
          fetchAirportsTimerRef.current = null;
        }
        if (landingTimerRef.current) {
          clearTimeout(landingTimerRef.current);
          landingTimerRef.current = null;
        }
        if (autoDeselectTimerRef.current) {
          clearTimeout(autoDeselectTimerRef.current);
          autoDeselectTimerRef.current = null;
        }
        if (liveTimerRef.current) {
          clearInterval(liveTimerRef.current);
          liveTimerRef.current = null;
        }
        setLivePlanes([]);
        setIsAnimating(false);
      };
    }, [user?.id, flights.length, loadFlightsFromStore])
  );

  React.useEffect(() => {
    // Don't run interval if screen is not focused
    if (!isScreenFocusedRef.current) {
      setLivePlanes([]);
      setLiveRoutes([]);
      return;
    }

    const update = () => {
      // Early exit if screen lost focus
      if (!isScreenFocusedRef.current) return;
      
      try {
        const nowPlanes: Array<{ flightId: string; flightNumber?: string; latitude: number; longitude: number; bearing: number }> = [];
        const nowRoutes: Array<{ flightId: string; past: { latitude: number; longitude: number }[]; future: { latitude: number; longitude: number }[] }> = [];
        let focusedPoint: { latitude: number; longitude: number } | null = null;
        
        // Early exit if no flights
        if (flights.length === 0) {
          setLivePlanes([]);
          setLiveRoutes([]);
          return;
        }
        
        for (const f of flights) {
          if (!f?.from?.latitude || !f?.from?.longitude || !f?.to?.latitude || !f?.to?.longitude) continue;
          const { inAir, progress } = getLiveProgress(f);
          if (!inAir) continue;

          const pt = interpolateGreatCirclePoint(
            { latitude: f.from.latitude, longitude: f.from.longitude },
            { latitude: f.to.latitude, longitude: f.to.longitude },
            progress
          );

          // Bearing: from current point towards destination for correct orientation
          const bearing = calculateBearing(
            pt.latitude,
            pt.longitude,
            f.to.latitude,
            f.to.longitude
          );

          // Avoid duplicate marker when the same flight is selected and already shows its own live marker
          if (selectedFlight?.id && selectedFlight.id === f.id && (isAnimating || isLanding || isLiveInAir)) continue;

          nowPlanes.push({ flightId: f.id, flightNumber: f.flightNumber, latitude: pt.latitude, longitude: pt.longitude, bearing });

          // Build a route (small point count for perf) and split into past/future
          const route = generateGreatCircle(
            { latitude: f.from.latitude, longitude: f.from.longitude },
            { latitude: f.to.latitude, longitude: f.to.longitude },
            80
          );
          const split = splitRouteByProgress(route, progress);
          nowRoutes.push({ flightId: f.id, past: split.past, future: split.future });

          if (focusedFlightId && f.id === focusedFlightId) {
            focusedPoint = { latitude: pt.latitude, longitude: pt.longitude };
          }
        }
        
        // Only update state if screen is still focused
        if (isScreenFocusedRef.current) {
        setLivePlanes(nowPlanes);
        setLiveRoutes(nowRoutes);
        }

        // Follow focused plane (keep camera centered)
        if (focusedPoint && mapRef.current && isScreenFocusedRef.current) {
          const r = currentRegionRef.current;
          const latDelta = typeof r?.latitudeDelta === 'number' ? r.latitudeDelta : 0.8;
          const lonDelta = typeof r?.longitudeDelta === 'number' ? r.longitudeDelta : 0.8;

          // Only recenter if plane drifted outside ~25% of current viewport (smoother follow)
          const driftLat = Math.abs((r?.latitude ?? focusedPoint.latitude) - focusedPoint.latitude);
          const driftLon = Math.abs((r?.longitude ?? focusedPoint.longitude) - focusedPoint.longitude);
          const shouldRecenter = driftLat > latDelta * 0.25 || driftLon > lonDelta * 0.25;

          if (shouldRecenter) {
            mapRef.current.animateToRegion(
              {
                latitude: focusedPoint.latitude,
                longitude: focusedPoint.longitude,
                latitudeDelta: Math.max(0.45, latDelta),
                longitudeDelta: Math.max(0.45, lonDelta),
              },
              650
            );
          }
        }
      } catch {}
    };

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [flights, selectedFlight?.id, isAnimating, isLanding, isLiveInAir, focusedFlightId]);

  const regionToBbox = (region: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number }) => {
    const minLat = region.latitude - region.latitudeDelta / 2;
    const maxLat = region.latitude + region.latitudeDelta / 2;
    const minLon = region.longitude - region.longitudeDelta / 2;
    const maxLon = region.longitude + region.longitudeDelta / 2;
    return { minLat, maxLat, minLon, maxLon };
  };

  const fetchAirportsForRegion = async (region: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number }) => {
    try {
      setIsFetchingAirports(true);
      const { minLat, maxLat, minLon, maxLon } = regionToBbox(region);
      const data = await airportsInBBox(minLon, minLat, maxLon, maxLat, 600);
      setAirports(data || []);
    } catch (e) {
      // Error handled silently to avoid performance impact
    } finally {
      setIsFetchingAirports(false);
    }
  };

  const handleFlightSelect = useCallback((flight: Flight) => {
    // Cancel any existing animations first to prevent stacking
    if (animTimerRef.current) {
      clearInterval(animTimerRef.current);
      animTimerRef.current = null;
    }
    if (liveTimerRef.current) {
      clearInterval(liveTimerRef.current);
      liveTimerRef.current = null;
    }
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (landingTimerRef.current) {
      clearTimeout(landingTimerRef.current);
      landingTimerRef.current = null;
    }
    if (autoDeselectTimerRef.current) {
      clearTimeout(autoDeselectTimerRef.current);
      autoDeselectTimerRef.current = null;
    }
    setIsAnimating(false);
    setIsLanding(false);
    setShowRouteOverlay(false);
    setIsLiveInAir(false);
    
    // Toggle flight selection - if same flight is selected, deselect it
    if (selectedFlight && selectedFlight.id === flight.id) {
      setSelectedFlight(null);
      setPathPoints([]);
      // Reset map to initial region
    if (mapRef.current) {
        setTimeout(() => {
          mapRef.current?.animateToRegion(INITIAL_REGION, 1000);
        }, 100);
      }
    } else {
      // Select new flight
      setSelectedFlight(flight);

      // Prepare route points for live-position / animation usage (do NOT auto-animate here)
      if (flight.from?.latitude && flight.from?.longitude && flight.to?.latitude && flight.to?.longitude) {
        const route = generateGreatCircle(
          { latitude: flight.from.latitude, longitude: flight.from.longitude },
          { latitude: flight.to.latitude, longitude: flight.to.longitude },
          150
        );
        setPathPoints(route);

        // Live in-air positioning (time-based)
        const updateLive = () => {
          try {
            const { inAir, progress } = getLiveProgress(flight);
            setIsLiveInAir(inAir);
            if (!inAir) return;
            const pt: any = getPointAlongRoute(route, progress);
            if (!pt) return;
            // @ts-ignore
            planeCoordinate.setValue({
              latitude: pt.latitude,
              longitude: pt.longitude,
              latitudeDelta: 0,
              longitudeDelta: 0,
            });
            if (pt._bearingFrom && pt._bearingTo) {
              const bearing = calculateBearing(
                pt._bearingFrom.latitude,
                pt._bearingFrom.longitude,
                pt._bearingTo.latitude,
                pt._bearingTo.longitude
              );
              planeRotation.setValue(bearing);
            }
          } catch {}
        };

        updateLive();
        liveTimerRef.current = setInterval(updateLive, 1000);
      } else {
        setPathPoints([]);
      }
      
      // Fit camera to show both departure and arrival airports
      if (mapRef.current && flight.from?.latitude && flight.from?.longitude && flight.to?.latitude && flight.to?.longitude) {
        setTimeout(() => {
          // Ensure both airports are visible with proper padding
          mapRef.current?.fitToCoordinates(
            [
              { latitude: flight.from.latitude, longitude: flight.from.longitude },
              { latitude: flight.to.latitude, longitude: flight.to.longitude }
            ],
            {
              edgePadding: { top: 200, right: 150, bottom: 400, left: 150 },
              animated: true,
            }
          );
        }, 150);
      } else if (mapRef.current && flight.to?.latitude && flight.to?.longitude) {
        // Fallback: if only arrival has coordinates, center on it
        setTimeout(() => {
          mapRef.current?.animateToRegion({
            latitude: flight.to.latitude,
            longitude: flight.to.longitude,
            latitudeDelta: 2,
            longitudeDelta: 2,
          }, 1000);
        }, 150);
      }
      
      // Do not auto-run preview animation on select; "Show Flight Path" triggers it.
    }
  }, [selectedFlight]);

  // Global animation pause/resume hooks (used by airport search modal)
  React.useEffect(() => {
    const pauseSub = DeviceEventEmitter.addListener('pause-animations', () => {
      try {
        if (animTimerRef.current) { clearInterval(animTimerRef.current); animTimerRef.current = null; }
        if (rafIdRef.current) { cancelAnimationFrame(rafIdRef.current); rafIdRef.current = null; }
        if (landingTimerRef.current) { clearTimeout(landingTimerRef.current); landingTimerRef.current = null; }
        if (autoDeselectTimerRef.current) { clearTimeout(autoDeselectTimerRef.current); autoDeselectTimerRef.current = null; }
        setIsAnimating(false);
        setIsLanding(false);
      } catch {}
    });
    const resumeSub = DeviceEventEmitter.addListener('resume-animations', () => {
      // no-op: animations start again when user selects a flight
    });
    return () => {
      pauseSub.remove();
      resumeSub.remove();
    };
  }, []);
  
  const startFlightAnimation = (
    route: { latitude: number; longitude: number }[],
    durationMsOverride?: number
  ) => {
      // Calculate total distance to determine animation duration
      const totalDistance = calculateDistance(
        route[0].latitude,
        route[0].longitude,
        route[route.length - 1].latitude,
        route[route.length - 1].longitude
      );
      
      // Duration based on distance: 2s for short flights (<1000km), up to 5s for long flights (>5000km)
      const durationMs = typeof durationMsOverride === 'number'
        ? durationMsOverride
        : Math.min(5000, Math.max(2000, totalDistance * 0.8));
      
      // Calculate initial bearing for the first segment
      const initialBearing = calculateBearing(
        route[0].latitude,
        route[0].longitude,
        route[1].latitude,
        route[1].longitude
      );
      
      // Set initial rotation immediately
      planeRotation.setValue(initialBearing);
      
      // Animate through each segment of the path
      let currentSegment = 0;
      let currentRotation = initialBearing; // Track current rotation to avoid wrapping issues
      
      const animateSegment = () => {
        if (currentSegment >= route.length - 1) {
          return;
        }
        
        const p0 = route[currentSegment];
        const p1 = route[currentSegment + 1];
        
        // Calculate bearing for this segment
        let bearing = calculateBearing(p0.latitude, p0.longitude, p1.latitude, p1.longitude);
        
        // Fix rotation wrapping: find shortest rotation path
        // If we need to rotate more than 180°, go the other way
        let rotationDiff = bearing - currentRotation;
        if (rotationDiff > 180) {
          bearing -= 360;
        } else if (rotationDiff < -180) {
          bearing += 360;
        }
        currentRotation = bearing;
        
        // Calculate time for this segment (proportional to total duration)
        const segmentDuration = durationMs / route.length;
        
        // Animate rotation smoothly to follow the path direction
        RNAnimated.timing(planeRotation, {
          toValue: bearing,
          duration: Math.max(100, segmentDuration / 2),
          easing: Easing.linear,
          useNativeDriver: true,
        }).start();
        
        // Animate position smoothly to next point
        // @ts-ignore
        planeCoordinate.timing({
          latitude: p1.latitude,
          longitude: p1.longitude,
          latitudeDelta: 0,
          longitudeDelta: 0,
          duration: segmentDuration,
          // @ts-ignore easing supported on native animation
          easing: Easing.linear,
        }).start(() => {
          currentSegment++;
          if (currentSegment < route.length - 1) {
            animateSegment(); // Continue to next segment
          } else {
            // Animation completed - start landing sequence
            setIsLanding(true);
            setIsAnimating(false);
            
            // Landing animation duration
            landingTimerRef.current = setTimeout(() => {
              setIsLanding(false);
              // Auto-deselect flight after landing
              autoDeselectTimerRef.current = setTimeout(() => {
                setSelectedFlight(null);
                setPathPoints([]);
                // Reset map to initial region
                if (mapRef.current) {
                  mapRef.current.animateToRegion(INITIAL_REGION, 1000);
                }
              }, 1500); // Wait 1.5s after landing to auto-deselect
            }, 1000); // Landing animation duration
          }
        });
      };
      
      animateSegment();
  };

  const startShowPathPreview = (flight: Flight) => {
    try {
      // Ensure flight is selected and route is prepared
      handleFlightSelect(flight);

      // We need route points (either already in state or recompute)
      const route = generateGreatCircle(
        { latitude: flight.from.latitude, longitude: flight.from.longitude },
        { latitude: flight.to.latitude, longitude: flight.to.longitude },
        150
      );
      setPathPoints(route);
      setShowRouteOverlay(true);
      setIsLiveInAir(false);

      // Initialize plane at start position then animate
      setTimeout(() => {
        setIsAnimating(true);
        // @ts-ignore
        planeCoordinate.setValue({
          latitude: route[0].latitude,
          longitude: route[0].longitude,
          latitudeDelta: 0,
          longitudeDelta: 0,
        });

        // Preview duration: scale by planned flight duration but keep it "demo-fast"
        const mins = parseDurationMinutes(flight.duration) ?? 180;
        const previewMs = Math.max(2500, Math.min(12000, mins * 35)); // 3h -> 6.3s
        startFlightAnimation(route, previewMs);
      }, 100);
    } catch (e) {
      // Error handled silently to avoid performance impact
    }
  };

  const handleShowFlightsList = useCallback(() => {
    bottomSheetRef.current?.expand();
  }, []);

  const handleDeleteFlight = useCallback(async (flightId: string) => {
    try {
      const deleteFlight = useAppStore.getState().deleteFlight;
      await deleteFlight(flightId);
      if (selectedFlight?.id === flightId) {
        setSelectedFlight(null);
      }
    } catch (e) {
      // Error handled silently to avoid performance impact
    }
  }, [selectedFlight]);

  const handleEditFlight = useCallback((flight: Flight) => {
    router.push({ pathname: '/add-flight-manual', params: { id: flight.id } });
  }, [router]);

  // Handle stats card toggle with macOS-style minimize animation
  const handleToggleStats = () => {
    const newValue = !showStats;
    setShowStats(newValue);
    
    // Animate the stats card
    statsProgress.value = withTiming(newValue ? 1 : 0, {
      duration: 400,
      easing: ReanimatedEasing.bezier(0.4, 0.0, 0.2, 1), // Smooth easing similar to macOS
    });
  };

  // Animated style for stats card - macOS minimize effect
  // Card animates from top center position
  
  const statsCardAnimatedStyle = useAnimatedStyle(() => {
    // Scale: small when hidden, full size when visible (macOS minimize effect)
    const scale = interpolate(
      statsProgress.value,
      [0, 1],
      [0.2, 1], // Scale from 20% to 100%
      Extrapolate.CLAMP
    );
    
    // Opacity: fade in/out smoothly
    const opacity = interpolate(
      statsProgress.value,
      [0, 0.2, 1],
      [0, 0.5, 1], // Fade in smoothly
      Extrapolate.CLAMP
    );
    
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  // Flight addition now handled by FlightAdditionFlow component

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#4CAF50';
      case 'upcoming': return '#2196F3';
      case 'in_progress': return '#FF9800';
      case 'cancelled': return '#f44336';
      default: return '#9E9E9E';
    }
  };

  const filteredFlights = useMemo(() => 
    flights.filter(flight =>
      (flight.id?.toLowerCase()?.includes(searchQuery.toLowerCase())) ||
      (flight.from?.name?.toLowerCase()?.includes(searchQuery.toLowerCase())) ||
      (flight.to?.name?.toLowerCase()?.includes(searchQuery.toLowerCase()))
    ), [flights, searchQuery]
  );

  const displayFlights = useMemo(() => {
    const nowMs = Date.now();
    return [...filteredFlights].sort((a, b) => {
      const aInProgress = isFlightInProgress(a);
      const bInProgress = isFlightInProgress(b);
      const aStart = getFlightStartMs(a);
      const bStart = getFlightStartMs(b);
      const aUpcoming = !aInProgress && a.status !== 'cancelled' && aStart !== null && aStart >= nowMs;
      const bUpcoming = !bInProgress && b.status !== 'cancelled' && bStart !== null && bStart >= nowMs;

      const aRank = aInProgress ? 0 : (aUpcoming ? 1 : 2);
      const bRank = bInProgress ? 0 : (bUpcoming ? 1 : 2);
      if (aRank !== bRank) return aRank - bRank;

      if (aRank === 0 || aRank === 1) {
        return (aStart ?? Number.MAX_SAFE_INTEGER) - (bStart ?? Number.MAX_SAFE_INTEGER);
      }
      return (bStart ?? 0) - (aStart ?? 0);
    });
  }, [filteredFlights]);

  const renderFlightItem = useCallback(({ item }: { item: Flight }) => {
    const inProgress = isFlightInProgress(item);
    const statusKey = inProgress ? 'in_progress' : (item.status || 'upcoming');
    const statusLabel = inProgress ? 'ACTIVE FLIGHT' : (item.status || 'upcoming').toUpperCase();
    const live = getLiveProgress(item);
    const progressPct = inProgress ? Math.round(live.progress * 100) : 0;
    const dep = item.departureAt ? new Date(item.departureAt) : null;
    const arr = item.arrivalAt ? new Date(item.arrivalAt) : null;
    const elapsedMin = inProgress && dep && !isNaN(dep.getTime()) ? (Date.now() - dep.getTime()) / 60000 : 0;
    const remainingMin = inProgress && arr && !isNaN(arr.getTime()) ? (arr.getTime() - Date.now()) / 60000 : 0;

    return (
    <View>
          <Pressable
        style={styles.flightCard}
        onPress={() => {
          handleFlightSelect(item);
          setTimeout(() => {
            bottomSheetRef.current?.close();
          }, 500);
        }}
      >
        <LinearGradient
          colors={['rgba(30,30,30,0.98)', 'rgba(20,20,20,0.95)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.flightCardGradient,
            selectedFlight?.id === item.id && styles.selectedFlightCard
          ]}
        >
            <View>
          {/* Flight Header */}
          <View style={styles.flightHeader}>
            <View style={styles.flightNumberContainer}>
              <Text style={styles.flightNumberLabel}>Flight</Text>
              <Text style={styles.flightNumber}>
                {item.flightNumber || '—'}
              </Text>
            </View>
            <View style={styles.headerActions}>
              {item.companyId && (
                <View style={styles.companyBadge}>
                  <Text style={styles.companyBadgeText}>
                    {item.companyName ? `Company • ${item.companyName}` : 'Company Flight'}
                  </Text>
                </View>
              )}
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(statusKey) }]}>
                <Text style={styles.statusText}>{statusLabel}</Text>
              </View>
              <View style={styles.actionButtons}>
                <Pressable 
                  style={styles.actionButton}
                  onPress={() => handleEditFlight(item)}
                >
                  <MaterialIcons name="edit" size={16} color="#ff1900" />
                </Pressable>
                <Pressable 
                  style={styles.actionButton}
                  onPress={() => handleDeleteFlight(item.id)}
                >
                  <MaterialIcons name="delete" size={16} color="#ff4444" />
                </Pressable>
              </View>
            </View>
          </View>
          
          {/* Route Section */}
          <View style={styles.routeSection}>
            {/* Departure Airport */}
            <View style={styles.airportInfo}>
              <View style={styles.airportLabelContainer}>
                <MaterialIcons name="flight-takeoff" size={14} color="#ff1900" />
                <Text style={styles.airportLabel}>From</Text>
              </View>
              <Text style={styles.airportCode}>
                {(item?.from?.iata || item?.from?.icao || item?.from?.name || item?.from?.city || '—').toString().toUpperCase()}
              </Text>
              <Text style={styles.airportCity} numberOfLines={1} ellipsizeMode="tail">
                {item?.from?.city || item?.from?.name || '—'}
              </Text>
              <Text style={styles.airportName} numberOfLines={1} ellipsizeMode="tail">
                {item?.from?.name || item?.from?.city || '—'}
              </Text>
            </View>
            
            <View style={styles.flightPathContainer}>
              <View style={styles.flightPathLine} />
              <View style={styles.flightIconContainer}>
                <MaterialIcons name="flight" size={16} color="#ff1900" />
              </View>
              <View style={styles.flightPathLine} />
            </View>
            
            {/* Arrival Airport */}
            <View style={styles.airportInfo}>
              <View style={styles.airportLabelContainer}>
                <MaterialIcons name="flight-land" size={14} color="#ff1900" />
                <Text style={styles.airportLabel}>To</Text>
              </View>
              <Text style={styles.airportCode}>
                {(item?.to?.iata || item?.to?.icao || item?.to?.name || item?.to?.city || '—').toString().toUpperCase()}
              </Text>
              <Text style={styles.airportCity} numberOfLines={1} ellipsizeMode="tail">
                {item?.to?.city || item?.to?.name || '—'}
              </Text>
              <Text style={styles.airportName} numberOfLines={1} ellipsizeMode="tail">
                {item?.to?.name || item?.to?.city || '—'}
              </Text>
            </View>
          </View>
          
          {/* Flight Details */}
          <View style={styles.flightDetails}>
            <View style={styles.detailItem}>
              <MaterialIcons name="schedule" size={20} color="#ff1900" />
              <View style={styles.detailText}>
                <Text style={styles.detailLabel}>Duration</Text>
                <Text style={styles.detailValue}>{item.duration || '—'}</Text>
              </View>
            </View>
            <View style={styles.detailItem}>
              <MaterialIcons name="straighten" size={20} color="#ff1900" />
              <View style={styles.detailText}>
                <Text style={styles.detailLabel}>Distance</Text>
                <Text style={styles.detailValue}>{item.distance || '—'}</Text>
              </View>
            </View>
            <View style={styles.detailItem}>
              <MaterialIcons name="calendar-today" size={20} color="#ff1900" />
              <View style={styles.detailText}>
                <Text style={styles.detailLabel}>Date</Text>
                <Text style={styles.detailValue}>
                  {item.date ? new Date(item.date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  }) : '—'}
                </Text>
              </View>
            </View>
          </View>

          {/* Live progress (only when in progress) */}
          {inProgress && (
            <View style={styles.liveProgressRow}>
              <View style={styles.liveProgressHeader}>
                <View style={styles.liveChip}>
                  <Text style={styles.liveChipText}>LIVE</Text>
                </View>
                <Text style={styles.liveMetaText}>
                  {progressPct}% • ETA {formatTimeHHMM(item.arrivalAt)} • {formatMinutes(elapsedMin)} elapsed • {formatMinutes(remainingMin)} left
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.max(3, Math.min(100, progressPct))}%` }]} />
              </View>
            </View>
          )}

          {/* Show Flight Path Button */}
          {item.from?.latitude && item.to?.latitude && (
            <Pressable
              style={styles.showPathButton}
              onPress={(e) => {
                try { (e as any)?.stopPropagation?.(); } catch {}
                startShowPathPreview(item);
                bottomSheetRef.current?.close();
                setShowPathModal(false);
              }}
            >
              <Text style={styles.showPathText}>Show Flight Path</Text>
            </Pressable>
          )}
            </View>
        </LinearGradient>
      </Pressable>
    </View>
    );
  }, [selectedFlight, handleFlightSelect, handleEditFlight, handleDeleteFlight]);

  const bottomSheetFlights = useMemo(() => {
    if (focusedFlightId) {
      return displayFlights.filter((f) => f.id === focusedFlightId);
    }
    return displayFlights;
  }, [displayFlights, focusedFlightId]);

  const keyExtractor = useCallback(
    (item: Flight) => item.id ?? `${item.flightNumber || 'flight'}-${item.date}`,
    []
  );

  const renderEmptyFlights = useCallback(() => (
    <View style={styles.emptyState}>
      <MaterialIcons name="flight" size={48} color="rgba(255,255,255,0.3)" />
      <Text style={styles.emptyStateTitle}>No flights found</Text>
      <Text style={styles.emptyStateText}>
        Add your first flight to see it on the map
      </Text>
    </View>
  ), []);

  // Search result rendering removed - using FlightAdditionFlow instead

  // Show loading screen while map initializes
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <MaterialIcons name="flight" size={48} color="#ff1900" />
          <Text style={{ fontSize: 16, fontFamily: 'Nexa-ExtraLight', color: 'rgba(255,255,255,0.7)', marginTop: 16 }}>Loading Map...</Text>
        </View>
      </View>
    );
  }

  return (
      <View style={styles.container}>
        {/* Top legend + follow banner */}
        <View style={styles.liveOverlayTop} pointerEvents="box-none">
          {livePlanes.length > 0 && (
            <View style={styles.legendRow} pointerEvents="none">
              <View style={styles.legendPill}>
                <Text style={styles.legendPillTitle}>LIVE</Text>
                <Text style={styles.legendPillText}>Green = done • White dashed = remaining</Text>
              </View>
            </View>
          )}
          {focusedFlightId && (
            <View style={styles.followBanner}>
              <View style={{ flex: 1 }}>
                <Text style={styles.followTitle}>
                  Following {displayFlights.find((f) => f.id === focusedFlightId)?.flightNumber || 'flight'}
                </Text>
                <Text style={styles.followSubtitle}>Tap X to unfocus and zoom out</Text>
              </View>
              <Pressable onPress={clearFocus} style={styles.followCloseBtn} hitSlop={10}>
                <MaterialIcons name="close" size={18} color="#fff" />
              </Pressable>
            </View>
          )}
        </View>

        <MapView
          ref={(r) => { (mapRef as any).current = r; (global as any).__SKYLINE_MAP_REF = mapRef; }}
          style={styles.map}
          initialRegion={INITIAL_REGION}
          showsUserLocation={false}
          showsMyLocationButton={false}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          mapType={Platform.OS === 'ios' ? 'mutedStandard' : 'standard'}
          customMapStyle={Platform.OS === 'android' ? darkMapStyle : undefined}
          loadingEnabled={true}
          loadingIndicatorColor="#ff1900"
          loadingBackgroundColor="#000"
          onRegionChangeComplete={(region) => {
            try {
              (global as any).__SKYLINE_REGION = region;
              currentRegionRef.current = region;
              const fn = (global as any).__SKYLINE_COMPUTE_SCREEN_POINTS; if (typeof fn === 'function') fn();
              // Debounced fetch airports in viewport
              if (showAirports) {
                if (fetchAirportsTimerRef.current) clearTimeout(fetchAirportsTimerRef.current);
                fetchAirportsTimerRef.current = setTimeout(() => {
                  fetchAirportsForRegion(region);
                }, 300);
              }
            } catch {}
          }}
        >
        {/* Airport markers for current viewport */}
          {showAirports && airports.map(ap => (
            <Marker
              key={`ap-${ap.id}`}
              coordinate={{ latitude: ap.latitude, longitude: ap.longitude }}
              title={ap.iata || ap.icao || ap.name}
              description={ap.name}
            >
              <View style={styles.markerContainer}>
                <MaterialIcons name="local-airport" size={14} color="#ff1900" />
              </View>
            </Marker>
          ))}

        {/* Live route: past = green solid, future = white dashed */}
        {ENABLE_MAP_ANIMATION && liveRoutes.map((r) => (
          <React.Fragment key={`route-${r.flightId}`}>
            {r.future.length > 1 && (
              <>
                {/* Underlay for contrast */}
                <Polyline
                  coordinates={r.future}
                  geodesic
                  strokeColor="rgba(0,0,0,0.35)"
                  strokeWidth={8}
                  lineCap="round"
                  lineJoin="round"
                />
                <Polyline
                  coordinates={r.future}
                  geodesic
                  strokeColor="rgba(230,240,255,0.95)"
                  strokeWidth={3.5}
                  lineDashPattern={[10, 10]}
                  lineCap="round"
                  lineJoin="round"
                />
              </>
            )}
            {r.past.length > 1 && (
              <Polyline
                coordinates={r.past}
                geodesic
                strokeColor="rgba(76,175,80,0.95)"
                strokeWidth={4}
                lineCap="round"
                lineJoin="round"
              />
            )}
          </React.Fragment>
        ))}

        {/* Global live planes (auto-visible for in-air flights) */}
        {ENABLE_MAP_ANIMATION && livePlanes.map((p) => (
          <Marker
            key={`live-${p.flightId}`}
            coordinate={{ latitude: p.latitude, longitude: p.longitude }}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
            flat={true}
            onPress={() => {
              const f = flights.find((x) => x.id === p.flightId);
              if (f) focusOnFlightPlane(f);
            }}
          >
            <View style={styles.livePlaneBubble}>
              <RNAnimated.View
                style={[
                  styles.livePlaneRing,
                  {
                    opacity: livePulse.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.55] }),
                    transform: [{ scale: livePulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.55] }) }],
                  },
                ]}
              />
              {!!p.flightNumber && (
                <View style={styles.livePlaneTag}>
                  <Text style={styles.livePlaneTagText} numberOfLines={1}>
                    {p.flightNumber}
                  </Text>
                </View>
              )}
              <View style={{ transform: [{ rotate: `${p.bearing}deg` }] }}>
                <MaterialIcons name="flight" size={26} color="#4FC3F7" />
              </View>
            </View>
          </Marker>
        ))}

        {/* Show airport markers only for selected flight */}
          {selectedFlight && (
          <React.Fragment>
            {/* Departure Marker */}
              <Marker
                coordinate={{
                latitude: selectedFlight.from.latitude,
                longitude: selectedFlight.from.longitude,
              }}
              title={(selectedFlight.from.name || selectedFlight.from.city || selectedFlight.from.iata || 'Departure').toString()}
              description={(selectedFlight.from.iata ? `${selectedFlight.from.iata}` : selectedFlight.from.icao ? `${selectedFlight.from.icao}` : 'Departure').toString()}
            >
              <View style={[styles.markerContainer, styles.selectedMarkerContainer]}>
                <MaterialIcons name="flight-takeoff" size={16} color="#fff" />
              </View>
              </Marker>

            {/* Arrival Marker with landing animation */}
                <Marker
                  coordinate={{
                latitude: selectedFlight.to.latitude,
                longitude: selectedFlight.to.longitude,
                  }}
              title={(selectedFlight.to.name || selectedFlight.to.city || selectedFlight.to.iata || 'Arrival').toString()}
              description={(selectedFlight.to.iata ? `${selectedFlight.to.iata}` : selectedFlight.to.icao ? `${selectedFlight.to.icao}` : (isLanding ? 'Landing...' : 'Arrival')).toString()}
                >
              <View style={[
                styles.markerContainer, 
                styles.selectedMarkerContainer,
                isLanding && { backgroundColor: '#4CAF50', borderColor: '#4CAF50' }
              ]}>
                <MaterialIcons 
                  name="flight-land"
                  size={16} 
                  color={isLanding ? "#fff" : "#fff"} 
                />
              </View>
                </Marker>
          </React.Fragment>
        )}

        {/* Show geodesic (great-circle) flight path */}
        {ENABLE_MAP_ANIMATION && selectedFlight && pathPoints.length > 0 && (showRouteOverlay || isAnimating || isLanding) && (
          <>
            {/* Glow effect layer (only when landing) */}
            {isLanding && (
              <Polyline
                coordinates={pathPoints}
                geodesic
                strokeColor="rgba(76, 175, 80, 0.3)"
                strokeWidth={12}
                lineCap="round"
                lineJoin="round"
              />
            )}
            {/* Main path line */}
            <Polyline
              coordinates={pathPoints}
              geodesic
              strokeColor={isLanding ? "#4CAF50" : "#888888"}
              strokeWidth={isLanding ? 4 : 3}
              lineCap="round"
              lineJoin="round"
            />
          </>
        )}

        {/* Selected live flight route split (when in progress and not in preview animation) */}
        {ENABLE_MAP_ANIMATION && selectedFlight && pathPoints.length > 1 && isFlightInProgress(selectedFlight) && !showRouteOverlay && !isAnimating && !isLanding && (
          (() => {
            const { inAir, progress } = getLiveProgress(selectedFlight);
            if (!inAir) return null;
            const split = splitRouteByProgress(pathPoints, progress);
            return (
              <>
                {split.future.length > 1 && (
                  <>
                    <Polyline
                      coordinates={split.future}
                      geodesic
                      strokeColor="rgba(0,0,0,0.35)"
                      strokeWidth={8}
                      lineCap="round"
                      lineJoin="round"
                    />
                    <Polyline
                      coordinates={split.future}
                      geodesic
                      strokeColor="rgba(230,240,255,0.95)"
                      strokeWidth={3.5}
                      lineDashPattern={[10, 10]}
                      lineCap="round"
                      lineJoin="round"
                    />
                  </>
                )}
                {split.past.length > 1 && (
                  <Polyline
                    coordinates={split.past}
                    geodesic
                    strokeColor="rgba(76,175,80,0.95)"
                    strokeWidth={4}
                    lineCap="round"
                    lineJoin="round"
                  />
                )}
              </>
            );
          })()
        )}

        {/* Plane marker: preview animation OR live in-air position */}
        {ENABLE_MAP_ANIMATION && selectedFlight && (isAnimating || isLanding || isLiveInAir) && (
          <Marker.Animated
            ref={planeMarkerRef}
            // @ts-ignore - AnimatedRegion typing issue with react-native-maps
            coordinate={planeCoordinate}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
            flat={true}
            onPress={() => {
              if (selectedFlight) focusOnFlightPlane(selectedFlight);
            }}
          >
            <RNAnimated.View style={{ 
              transform: [
                { 
                  rotate: planeRotation.interpolate({
                    inputRange: [0, 360],
                    outputRange: ['0deg', '360deg']
                  })
                }
              ],
            }}>
              <View style={styles.livePlaneBubble}>
                <RNAnimated.View
                  style={[
                    styles.livePlaneRing,
                    {
                      opacity: livePulse.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.55] }),
                      transform: [{ scale: livePulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.55] }) }],
                    },
                  ]}
                />
                {!!selectedFlight?.flightNumber && (
                  <View style={styles.livePlaneTag}>
                    <Text style={styles.livePlaneTagText} numberOfLines={1}>
                      {selectedFlight.flightNumber}
                    </Text>
                  </View>
                )}
                <MaterialIcons 
                  name="flight" 
                  size={26} 
                  color={isLanding ? "#4CAF50" : isLiveInAir ? "#4FC3F7" : "#ff1900"} 
                />
              </View>
            </RNAnimated.View>
          </Marker.Animated>
        )}
        </MapView>

             {/* Floating Action Buttons - Lazy load after map renders */}
       {!isLoading && (
         <Animated.View 
           entering={FadeInDown.delay(300).springify()}
           style={[
             styles.floatingButtonsContainer,
             {
               // Dynamic bottom positioning to avoid tab bar
               // Tab bar height (~72px) + safe area + extra margin (40px)
               bottom: Math.max(120, insets.bottom + 112),
             }
           ]}
         >
         {/* Stats Toggle Button - Only show when flights exist */}
         {flights.length > 0 && (
           <Pressable
             style={styles.statsToggleFloatingButton}
             onPress={handleToggleStats}
           >
             <LinearGradient
               colors={showStats 
                 ? ['rgba(59,130,246,0.95)', 'rgba(37,99,235,0.85)'] 
                 : ['rgba(59,130,246,0.6)', 'rgba(37,99,235,0.5)']
               }
               style={styles.floatingButtonGradient}
             >
               <MaterialIcons 
                 name={showStats ? "visibility" : "visibility-off"} 
                 size={28} 
                 color="#fff" 
               />
               <Text style={styles.floatingButtonLabel}>Stats</Text>
             </LinearGradient>
           </Pressable>
         )}

         {/* List Button */}
           <Pressable
           style={styles.listFloatingButton}
           onPress={handleShowFlightsList}
         >
           <LinearGradient
             colors={['rgba(255,25,0,0.9)', 'rgba(255,25,0,0.8)']}
             style={styles.floatingButtonGradient}
           >
             <MaterialIcons name="list" size={28} color="#fff" />
             <Text style={styles.floatingButtonLabel}>List</Text>
           </LinearGradient>
           </Pressable>

         {/* Add Flight Button */}
           <Pressable
           style={styles.addFloatingButton}
           onPress={() => setShowAddModal(true)}
         >
           <LinearGradient
             colors={['#ff3b00', '#ff1900']}
             style={styles.floatingButtonGradient}
           >
             <MaterialIcons name="add" size={28} color="#fff" />
             <Text style={styles.floatingButtonLabel}>Add</Text>
           </LinearGradient>
           </Pressable>
         </Animated.View>
       )}

      

             {/* Flight Stats Card - Always rendered but animated (macOS minimize effect) */}
       {!isLoading && flights.length > 0 && (
         <Animated.View 
           style={[
             styles.statsCardContainer,
             {
               top: Math.max(60, insets.top + 20),
               left: '50%', // Center horizontally
               marginLeft: -(SCREEN_WIDTH - 80) / 2, // Offset by half width to center
             },
             statsCardAnimatedStyle,
           ]}
         >
          <LinearGradient
            colors={['rgba(30,30,30,0.95)', 'rgba(20,20,20,0.95)']}
            style={styles.statsCard}
          >
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <MaterialIcons name="flight" size={14} color="#ff1900" />
                <Text style={styles.statValue}>{flights.length}</Text>
                <Text style={styles.statLabel}>{flights.length === 1 ? 'Flight' : 'Flights'}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <MaterialIcons name="straighten" size={14} color="#ff1900" />
                <Text style={styles.statValue}>
                  {flights.reduce((total, flight) => {
                    const dist = flight.distance?.replace(/[^\d,]/g, '').replace(/,/g, '') || '0';
                    return total + parseInt(dist) || 0;
                  }, 0).toLocaleString()} km
                </Text>
                <Text style={styles.statLabel}>Distance</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      )}

      {/* Bottom Sheet for Flight List - Lazy load */}
      {!isLoading && (
        <BottomSheet
          ref={bottomSheetRef}
          index={-1}
        snapPoints={['25%', '50%', '90%']}
          enablePanDownToClose
          backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.bottomSheetIndicator}
        >
          <View style={styles.bottomSheetHeader}>
            <Text style={styles.flightCount}>
              {focusedFlightId
                ? `Flight in focus`
                : `${displayFlights.length} ${displayFlights.length !== 1 ? 'flights' : 'flight'} found`}
            </Text>
            {focusedFlightId && (
              <Pressable onPress={clearFocus} style={styles.focusCloseBtn} hitSlop={10}>
                <MaterialIcons name="close" size={18} color="#fff" />
              </Pressable>
            )}
            </View>

          <BottomSheetFlatList
            data={bottomSheetFlights}
            keyExtractor={keyExtractor}
            renderItem={renderFlightItem}
            contentContainerStyle={[styles.bottomSheetContent, { paddingBottom: (insets?.bottom || 0) + 140 }]}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews
            initialNumToRender={5}
            maxToRenderPerBatch={5}
            updateCellsBatchingPeriod={60}
            windowSize={5}
            ListEmptyComponent={renderEmptyFlights}
        />
        </BottomSheet>
      )}

      {/* Flight Addition Flow */}
      <FlightAdditionFlow
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
      {/* Removed separate Flight Path modal - we now draw directly on map */}
                    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 6,
    borderWidth: 2,
    borderColor: '#ff1900',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedMarkerContainer: {
    backgroundColor: '#ff1900',
    borderColor: '#fff',
    borderWidth: 2,
  },

  // Live plane marker
  livePlaneBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(33,150,243,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(79,195,247,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#4FC3F7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  livePlaneRing: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(79,195,247,0.25)',
  },
  livePlaneTag: {
    position: 'absolute',
    top: -18,
    paddingHorizontal: 8,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 120,
  },
  livePlaneTagText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  landingMarker: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
    borderWidth: 3,
    transform: [{ scale: 1.2 }],
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 10,
  },

  // Search Bar
  searchContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 1000,
  },

  focusCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Top overlay
  liveOverlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2000,
    paddingTop: 54,
    paddingHorizontal: 16,
    gap: 10,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  legendPill: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: '100%',
  },
  legendPillTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 2,
  },
  legendPillText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '700',
  },
  followBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(20,20,20,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  followTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  followSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  followCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Live progress card section
  liveProgressRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  liveProgressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  liveChip: {
    paddingHorizontal: 10,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,152,0,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,152,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveChipText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  liveMetaText: {
    flex: 1,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontWeight: '700',
  },
  progressTrack: {
    height: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: '#4CAF50',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Nexa-ExtraLight',
    color: '#fff',
    marginLeft: 12,
  },

  // Floating Buttons
  floatingButtonsContainer: {
    position: 'absolute',
    right: 20,
    alignItems: 'center',
    gap: 20,
    // bottom is now dynamically set in the component
  },
     statsToggleFloatingButton: {
     borderRadius: 34,
     elevation: 12,
     shadowColor: '#3b82f6',
     shadowOffset: { width: 0, height: 6 },
     shadowOpacity: 0.5,
     shadowRadius: 12,
   },
   listFloatingButton: {
     borderRadius: 34,
     elevation: 12,
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 6 },
     shadowOpacity: 0.4,
     shadowRadius: 12,
   },
   addFloatingButton: {
     borderRadius: 34,
     elevation: 12,
     shadowColor: '#ff1900',
     shadowOffset: { width: 0, height: 6 },
     shadowOpacity: 0.5,
     shadowRadius: 12,
   },
  floatingButtonGradient: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  floatingButtonLabel: {
    fontSize: 10,
    fontFamily: 'Nexa-Heavy',
    color: '#fff',
    marginTop: 4,
    letterSpacing: 0.5,
  },

  // Bottom Sheet
  bottomSheetBackground: {
    backgroundColor: '#0a0a0a',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,25,0,0.2)',
  },
  bottomSheetIndicator: {
    backgroundColor: '#ff1900',
    width: 48,
    height: 5,
  },
  bottomSheetHeader: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  bottomSheetTitle: {
    fontSize: 26,
    fontFamily: 'Nexa-Heavy',
    color: '#fff',
    marginBottom: 4,
  },
  flightCount: {
    fontSize: 15,
    fontFamily: 'Nexa-ExtraLight',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.3,
  },
     bottomSheetContent: {
     paddingHorizontal: 20,
     paddingTop: 12,
     paddingBottom: 20,
     gap: 12,
   },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontFamily: 'Nexa-Heavy',
    color: '#fff',
    marginTop: 20,
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  emptyStateText: {
    fontSize: 15,
    fontFamily: 'Nexa-ExtraLight',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Flight Cards
     flightCard: {
     marginHorizontal: 0,
     marginVertical: 0,
     borderRadius: 16,
     overflow: 'hidden',
     elevation: 4,
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 4 },
     shadowOpacity: 0.08,
     shadowRadius: 8,
   },
     flightCardGradient: {
     padding: 16,
     borderRadius: 16,
     borderWidth: 1,
     borderColor: 'rgba(255,255,255,0.06)',
   },
  selectedFlightCard: {
    borderColor: 'rgba(255,25,0,0.5)',
    borderWidth: 1.5,
  },
  flightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  flightNumberContainer: {
    flex: 1,
    flexShrink: 0,
    minWidth: 140,
  },
  flightNumberLabel: {
    fontSize: 11,
    fontFamily: 'Nexa-ExtraLight',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  flightNumber: {
    fontSize: 20,
    fontFamily: 'Nexa-Heavy',
    color: '#fff',
    letterSpacing: 0.8,
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  companyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 25, 0, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 25, 0, 0.5)',
  },
  companyBadgeText: {
    fontSize: 10,
    fontFamily: 'Nexa-Heavy',
    color: '#ff5340',
    letterSpacing: 0.6,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Nexa-Heavy',
    color: '#fff',
    letterSpacing: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  routeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  airportInfo: {
    flex: 1,
    alignItems: 'center',
  },
  airportLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
    backgroundColor: 'rgba(255,25,0,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  airportLabel: {
    fontSize: 9,
    fontFamily: 'Nexa-Heavy',
    color: '#ff1900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  airportCode: {
    fontSize: 28,
    fontFamily: 'Nexa-Heavy',
    color: '#fff',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  airportCity: {
    fontSize: 15,
    fontFamily: 'Nexa-Heavy',
    color: '#ff1900',
    marginBottom: 4,
    textAlign: 'center',
  },
  airportName: {
    fontSize: 11,
    fontFamily: 'Nexa-ExtraLight',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  flightPathContainer: {
    width: 110,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 0,
    gap: 10,
  },
  flightPathLine: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    flex: 1,
    minWidth: 10,
  },
  flightIconContainer: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    padding: 8,
    borderWidth: 1.5,
    borderColor: '#ff1900',
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pathCode: {
    color: '#ff1900',
    fontFamily: 'Nexa-Heavy',
    fontSize: 12,
    width: 40,
  },
  pathCodeLeft: {
    textAlign: 'left',
    marginRight: 8,
  },
  pathCodeRight: {
    textAlign: 'right',
    marginLeft: 8,
  },
  flightDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  detailItem: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  detailText: {
    marginTop: 6,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 9,
    fontFamily: 'Nexa-ExtraLight',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  detailValue: {
    fontSize: 13,
    fontFamily: 'Nexa-Heavy',
    color: '#fff',
  },
  showPathButton: {
    marginTop: 20,
    backgroundColor: 'rgba(255,25,0,0.15)',
    borderColor: '#ff1900',
    borderWidth: 2,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  showPathText: {
    color: '#ff1900',
    fontFamily: 'Nexa-Heavy',
    fontSize: 14,
    letterSpacing: 0.5,
  },

  // Distance Tracker
  // (Removed legacy distance tracker styles; they were unused and caused a duplicate style key)

  // Stats Card
  statsCardContainer: {
    position: 'absolute',
    width: SCREEN_WIDTH - 80, // Full width minus margins
    zIndex: 1000,
    // Centered horizontally via inline styles
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
  statItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 16,
  },
  statValue: {
    fontSize: 14,
    fontFamily: 'Nexa-Heavy',
    color: '#fff',
    marginTop: 4,
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  statLabel: {
    fontSize: 9,
    fontFamily: 'Nexa-ExtraLight',
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Stats Toggle Button
  statsToggleContainer: {
    position: 'absolute',
    zIndex: 1001,
    // right and top set via inline styles to stick to edge
  },
  statsToggleButton: {
    borderRadius: 24,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  statsToggleButtonPressed: {
    transform: [{ scale: 0.95 }],
  },
  statsToggleGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },

}); 