import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  AppState,
  InteractionManager,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import AppModal from '../components/AppModal';
import ScreenWrapper from '../components/ScreenWrapper';
import { useToast } from '../components/ToastProvider';
import ValidatedInput from '../components/ValidatedInput';
import { autocompleteAirports, getPopularAirports, ensureAirportForSelection } from '../services/airports';
import { useAppStore } from '../store';
import { Airport } from '../types';
import { validateFlightForm } from '../utils/validation';
import { useAuth } from '../contexts/AuthContext';

interface FlightFormData {
  flightNumber: string;
  airline: string;
  fromAirport: Airport | null;
  toAirport: Airport | null;
  date: Date;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  distance: string;
  notes: string;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

// Build a "local timestamp" string (no timezone) for Postgres TIMESTAMP columns
const buildLocalTimestamp = (date: Date, hhmm: string): string => {
  const [hh, mm] = hhmm.split(':').map((x) => parseInt(x, 10));
  const d = new Date(date);
  d.setHours(hh || 0, mm || 0, 0, 0);
  const yyyy = d.getFullYear();
  const mo = pad2(d.getMonth() + 1);
  const da = pad2(d.getDate());
  const h = pad2(d.getHours());
  const m = pad2(d.getMinutes());
  return `${yyyy}-${mo}-${da}T${h}:${m}:00`;
};

const minutesBetweenLocalTimes = (dep: string, arr: string): number => {
  const [dh, dm] = dep.split(':').map((x) => parseInt(x, 10));
  const [ah, am] = arr.split(':').map((x) => parseInt(x, 10));
  const depM = (dh || 0) * 60 + (dm || 0);
  const arrM = (ah || 0) * 60 + (am || 0);
  let diff = arrM - depM;
  if (diff < 0) diff += 24 * 60; // arrival next day
  return diff;
};

const formatDurationFromMinutes = (mins: number): string => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

// Results for airport search
type UiAirport = Airport;
const mapDbAirportToUi = (a: any): UiAirport => ({
  id: String(a.id),
  name: a.name || a.city || '',
  iata: a.iata || null,
  icao: a.icao || null,
  city: a.city || a.name || '',
  country: a.country || '',
  latitude: a.latitude,
  longitude: a.longitude,
});

export default function AddFlightManualScreen() {
  const params = useLocalSearchParams<{ id?: string; company?: string }>();
  const { showToast } = useToast();
  const { addFlight, updateFlight, flights } = useAppStore();
  const { currentCompanyId, memberships } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDepartureTimePicker, setShowDepartureTimePicker] = useState(false);
  const [showArrivalTimePicker, setShowArrivalTimePicker] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showAirportModal, setShowAirportModal] = useState(false);
  const [airportSelectionType, setAirportSelectionType] = useState<'from' | 'to'>('from');
  const [airportQuery, setAirportQuery] = useState('');
  const [airportResults, setAirportResults] = useState<UiAirport[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  // Force list to re-mount when results change to avoid stale UI under heavy animations
  const [resultsVersion, setResultsVersion] = useState(0);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
  const searchDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchWatchdogRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Time picker states
  const [departureTimeDate, setDepartureTimeDate] = useState(new Date());
  const [arrivalTimeDate, setArrivalTimeDate] = useState(new Date());
  const [durationHours, setDurationHours] = useState(2);
  const [durationMinutes, setDurationMinutes] = useState(0);
  // Track latest search to ignore stale results
  const searchRequestIdRef = React.useRef(0);
  
  const [formData, setFormData] = useState<FlightFormData>({
    flightNumber: '',
    airline: '',
    fromAirport: null,
    toAirport: null,
    date: new Date(),
    departureTime: '',
    arrivalTime: '',
    duration: '',
    distance: '',
    notes: '',
  });
  const [editId, setEditId] = useState<string | null>(null);
  
  // Company flight state - auto-check if coming from company dashboard
  const hasCompanyMembership = memberships && memberships.length > 0;
  const isFromCompanyDashboard = params.company === 'true';
  const [isCompanyFlight, setIsCompanyFlight] = useState<boolean>(
    isFromCompanyDashboard && hasCompanyMembership && !!currentCompanyId
  );

  // Re-fire search when app becomes active (iOS network wake edge-case)
  React.useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && showAirportModal && isSearching && airportQuery.trim().length >= 2) {
        // Re-trigger search with current query - using setTimeout to avoid stale closure
        const currentQuery = airportQuery;
        setTimeout(() => {
          // Directly inline the search logic to avoid dependency issues
          setIsSearching(true);
          autocompleteAirports(currentQuery, 25)
            .then(results => {
              const mappedResults = (results || []).map(mapDbAirportToUi);
              setAirportResults(mappedResults);
              setResultsVersion(v => v + 1);
              setIsSearching(false);
            })
            .catch(() => {
              setAirportResults([]);
              setIsSearching(false);
            });
        }, 0);
      }
    });
    return () => sub.remove();
  }, [showAirportModal, isSearching, airportQuery]);

  React.useEffect(() => {
    const id = params?.id as string | undefined;
    if (!id) return;
    setEditId(id);
    
    // Load flight from store for editing
    const flightToEdit = flights.find(f => f.id === id);
    if (flightToEdit) {
      // Parse date
      const flightDate = flightToEdit.date ? new Date(flightToEdit.date) : new Date();
      
      // Pre-fill form with existing flight data
      setFormData({
        flightNumber: flightToEdit.flightNumber || '',
        airline: flightToEdit.airline || '',
        fromAirport: flightToEdit.from || null,
        toAirport: flightToEdit.to || null,
        date: flightDate,
        departureTime: flightToEdit.departureAt ? new Date(flightToEdit.departureAt).toTimeString().slice(0, 5) : '',
        arrivalTime: flightToEdit.arrivalAt ? new Date(flightToEdit.arrivalAt).toTimeString().slice(0, 5) : '',
        duration: flightToEdit.duration || '',
        distance: flightToEdit.distance || flightToEdit.distanceKm?.toString() || '',
        notes: flightToEdit.notes || '',
      });
      
      // Parse duration if it exists to set time picker defaults
      if (flightToEdit.duration) {
        const durationMatch = flightToEdit.duration.match(/(\d+)\s*h(?:ours?)?(?:\s*(\d+)\s*m(?:in(?:utes?)?)?)?/i);
        if (durationMatch) {
          setDurationHours(parseInt(durationMatch[1], 10) || 2);
          setDurationMinutes(parseInt(durationMatch[2], 10) || 0);
        }
      }
      
      // Set default time picker dates to flight date
      setDepartureTimeDate(new Date(flightDate));
      setArrivalTimeDate(new Date(flightDate));
      if (flightToEdit.departureAt) setDepartureTimeDate(new Date(flightToEdit.departureAt));
      if (flightToEdit.arrivalAt) setArrivalTimeDate(new Date(flightToEdit.arrivalAt));
    }
  }, [params?.id, flights]);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      if (searchWatchdogRef.current) clearTimeout(searchWatchdogRef.current);
    };
  }, []);

  const steps = [
    { title: 'Flight Info', icon: 'flight' },
    { title: 'Route', icon: 'map' },
    { title: 'Schedule', icon: 'schedule' },
    { title: 'Details', icon: 'info' },
    { title: 'Review', icon: 'check-circle' },
  ];

  const updateFormData = (field: keyof FlightFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const openAirportSelector = async (type: 'from' | 'to') => {
    setAirportSelectionType(type);
    setShowAirportModal(true);
    // Pause heavy animations elsewhere while searching
    try { (require('react-native').DeviceEventEmitter as any).emit('pause-animations'); } catch {}
    setAirportQuery('');
    
    // Load popular airports immediately when modal opens
    setIsSearching(true);
    try {
      const popular = getPopularAirports(25).map(mapDbAirportToUi);
      setAirportResults(popular);
      setResultsVersion(v => v + 1);
      setIsSearching(false);
    } catch (e) {
      if (__DEV__) console.warn('Failed to load popular airports:', e);
    setAirportResults([]);
    setIsSearching(false);
    }
    
    // ✅ FIX: Wake up iOS network IMMEDIATELY when modal opens
    // This prevents the "stuck on searching" bug
    try {
      await Promise.race([
        fetch('https://www.google.com/generate_204', { method: 'HEAD', cache: 'no-store' }),
        new Promise(resolve => setTimeout(resolve, 500))
      ]);
    } catch (e) {
      if (__DEV__) console.warn('Network wake failed (not critical):', e);
    }
  };

  const selectAirport = (airport: Airport) => {
    if (airportSelectionType === 'from') {
      updateFormData('fromAirport', airport);
      
      // Auto-calculate distance if destination airport is already selected
      if (formData.toAirport) {
        const distanceKm = calculateFlightDistance(airport, formData.toAirport);
        updateFormData('distance', `${distanceKm.toLocaleString()} km`);
      }
    } else {
      updateFormData('toAirport', airport);
      
      // Auto-calculate distance if departure airport is already selected
      if (formData.fromAirport) {
        const distanceKm = calculateFlightDistance(formData.fromAirport, airport);
        updateFormData('distance', `${distanceKm.toLocaleString()} km`);
      }
    }
    
    closeAirportModal();
  };

  const closeAirportModal = () => {
    // Clear search timeout and reset search state
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }
    if (searchWatchdogRef.current) {
      clearTimeout(searchWatchdogRef.current);
      searchWatchdogRef.current = null;
    }
    setAirportQuery('');
    setIsSearching(false);
    setShowAirportModal(false);
    // Allow animations to resume after modal closes
    try { (require('react-native').DeviceEventEmitter as any).emit('resume-animations'); } catch {}
  };

  const searchAirports = (q: string) => {
    setAirportQuery(q);
    
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    
    if (!q.trim() || q.trim().length < 2) {
      setIsSearching(false);
      setAirportResults([]);
      return;
    }
    
    setIsSearching(true);
    // Clear previous watchdog (avoid multiple fallbacks)
    if (searchWatchdogRef.current) {
      clearTimeout(searchWatchdogRef.current);
    }
    // Watchdog aligned with API timeout (2.5s)
    const watchdog = setTimeout(() => {
      setIsSearching(false);
      try {
        const popular = getPopularAirports(25).map(mapDbAirportToUi);
        setAirportResults(popular);
      } catch {}
    }, 3000);
    searchWatchdogRef.current = watchdog;

    // Debounced request (600ms) to avoid multi-calls while typing
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    const requestId = ++searchRequestIdRef.current;
    const currentQuery = q;
    searchDebounceRef.current = setTimeout(() => {
      autocompleteAirports(currentQuery, 25)
        .then(results => {
          const mappedResults = (results || []).map(mapDbAirportToUi);
          if (requestId === searchRequestIdRef.current) {
            clearTimeout(watchdog);
            if (searchWatchdogRef.current) searchWatchdogRef.current = null;
            requestAnimationFrame(() => {
              setAirportResults(mappedResults);
              setResultsVersion(v => v + 1);
              setIsSearching(false);
            });
          }
        })
        .catch(e => {
          if (__DEV__) console.error('Airport search failed:', e);
          if (requestId === searchRequestIdRef.current) {
            clearTimeout(watchdog);
            if (searchWatchdogRef.current) searchWatchdogRef.current = null;
            requestAnimationFrame(() => {
              setAirportResults([]);
              setResultsVersion(v => v + 1);
              setIsSearching(false);
            });
          }
        });
    }, 600);
  };

  const nextStep = () => {
    InteractionManager.runAfterInteractions(() => {
      if (currentStep === 3 && formData.distance && !formData.distance.includes('km')) {
        const cleaned = formData.distance.replace(/[^\d.,]/g, '');
        if (cleaned) {
          const formatted = `${cleaned} km`;
          setFormData(prev => ({ ...prev, distance: formatted }));
        }
      }
      
      const isValid = validateCurrentStep();
      if (isValid && currentStep < steps.length - 1) {
        setCurrentStep(prev => prev + 1);
      }
    });
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Pure validation for render-time checks (no state updates)
  const validateStepPure = (stepIndex: number): { valid: boolean; errors: { [key: string]: string } } => {
    const errors: { [key: string]: string } = {};
    switch (stepIndex) {
      case 0: {
        if (!formData.flightNumber.trim()) {
          errors.flightNumber = 'Flight number is required';
        }
        if (!formData.airline.trim()) {
          errors.airline = 'Airline is required';
        } else if (formData.airline.trim().length < 2) {
          errors.airline = 'Airline name too short';
        }
        break;
      }
      case 1: {
        if (!formData.fromAirport || !formData.fromAirport.id) {
          errors.fromAirport = 'Departure airport is required';
        }
        if (!formData.toAirport || !formData.toAirport.id) {
          errors.toAirport = 'Arrival airport is required';
        }
        // Allow same airport (e.g., helicopter tours, training flights, sightseeing)
        break;
      }
      case 2: {
        if (!formData.departureTime.trim()) {
          errors.departureTime = 'Departure time is required';
        } else if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(formData.departureTime.trim())) {
          errors.departureTime = 'Invalid time format (use HH:MM)';
        }
        if (!formData.arrivalTime.trim()) {
          errors.arrivalTime = 'Arrival time is required';
        } else if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(formData.arrivalTime.trim())) {
          errors.arrivalTime = 'Invalid time format (use HH:MM)';
        }
        break;
      }
      case 3: {
        if (formData.duration.trim() && !/^([0-9]{1,2}h\s?)?([0-9]{1,2}m)?$/i.test(formData.duration.trim())) {
          errors.duration = 'Invalid duration format (e.g., 2h 30m, 45m)';
        }
        // Distance validation - very lenient, just check if it contains numbers
        if (formData.distance.trim()) {
          const distanceValue = formData.distance.trim();
          // Just check if there are any numbers - format will be auto-fixed
          if (!/\d/.test(distanceValue)) {
            errors.distance = 'Please enter a distance (e.g., 1234)';
          }
        }
        if (formData.notes.length > 500) {
          errors.notes = 'Notes cannot exceed 500 characters';
        }
        break;
      }
      case 4: {
        return { valid: true, errors };
      }
    }
    return { valid: Object.keys(errors).length === 0, errors };
  };

  // Validation with state update for navigation actions
  const validateCurrentStep = (): boolean => {
    const { valid, errors } = validateStepPure(currentStep);
    // Only update errors if validation failed to avoid clearing them unnecessarily
    if (!valid) {
      setValidationErrors(errors);
    } else {
      setValidationErrors({});
    }
    return valid;
  };

  // Calculate distance between two airports using Haversine formula
  const calculateFlightDistance = (from: Airport, to: Airport): number => {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6371; // Earth's radius in kilometers
    
    const dLat = toRad(to.latitude - from.latitude);
    const dLon = toRad(to.longitude - from.longitude);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(from.latitude)) * Math.cos(toRad(to.latitude)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return Math.round(distance);
  };

  const saveFlight = () => {
    if (isLoading) return;
    setIsLoading(true);

    let formattedDistance = formData.distance;
    if (formData.distance && !formData.distance.includes('km')) {
      const cleaned = formData.distance.replace(/[^\d.,]/g, '');
      if (cleaned) {
        formattedDistance = `${cleaned} km`;
        setFormData(prev => ({ ...prev, distance: formattedDistance }));
      }
    }
    
    if (!formattedDistance && formData.fromAirport && formData.toAirport) {
      const distanceKm = calculateFlightDistance(formData.fromAirport, formData.toAirport);
      formattedDistance = `${distanceKm.toLocaleString()} km`;
    }
    
    const validationData = {
      ...formData,
      distance: formattedDistance
    };
    
    const validationResult = validateFlightForm(validationData);
    
    if (!validationResult.isValid) {
      setValidationErrors(validationResult.errors);
      const firstError = Object.values(validationResult.errors)[0];
      showToast('error', 'Validation Error', firstError);
      setIsLoading(false);
      return;
    }
  
    setValidationErrors({});
      
    // Capture all data needed for background save
      const calculatedDistance = formattedDistance;
    const flightIdToEdit = editId;
    const isCompany = isCompanyFlight && currentCompanyId ? currentCompanyId : undefined;
      
    // Prepare flight data (synchronously, before navigation)
        const departureAt = buildLocalTimestamp(formData.date, formData.departureTime);
        const durationMins = minutesBetweenLocalTimes(formData.departureTime, formData.arrivalTime);
        const depDateObj = new Date(departureAt);
        const arrDateObj = new Date(depDateObj.getTime() + durationMins * 60 * 1000);
        const yyyy = arrDateObj.getFullYear();
        const mo = pad2(arrDateObj.getMonth() + 1);
        const da = pad2(arrDateObj.getDate());
        const h = pad2(arrDateObj.getHours());
        const m = pad2(arrDateObj.getMinutes());
        const arrivalAt = `${yyyy}-${mo}-${da}T${h}:${m}:00`;
        const computedDuration = formatDurationFromMinutes(durationMins);
        const durationToSave = computedDuration || (formData.duration || undefined);

    // Background save function - runs after navigation
    const saveInBackground = async () => {
      try {
        // Ensure airports are persisted in database before saving flight
        let fromAirport = formData.fromAirport!;
        let toAirport = formData.toAirport!;
        
        try {
          // Convert UI airport format to API format and persist
          const fromApiFormat = {
            id: typeof fromAirport.id === 'string' ? fromAirport.id : String(fromAirport.id),
            iata: fromAirport.iata || null,
            icao: fromAirport.icao || null,
            name: fromAirport.name || 'Unknown Airport',
            city: fromAirport.city || null,
            country: fromAirport.country || null,
            latitude: fromAirport.latitude || 0,
            longitude: fromAirport.longitude || 0,
          };
          const toApiFormat = {
            id: typeof toAirport.id === 'string' ? toAirport.id : String(toAirport.id),
            iata: toAirport.iata || null,
            icao: toAirport.icao || null,
            name: toAirport.name || 'Unknown Airport',
            city: toAirport.city || null,
            country: toAirport.country || null,
            latitude: toAirport.latitude || 0,
            longitude: toAirport.longitude || 0,
          };
          
          fromAirport = await ensureAirportForSelection(fromApiFormat);
          toAirport = await ensureAirportForSelection(toApiFormat);
        } catch (airportError) {
          // Continue with original airports if persistence fails
        }
        
        if (flightIdToEdit) {
          await updateFlight(flightIdToEdit, {
            flightNumber: formData.flightNumber.trim().toUpperCase(),
            airline: formData.airline || undefined,
            from: fromAirport,
            to: toAirport,
            date: formData.date.toISOString(),
            departureAt,
            arrivalAt,
            duration: durationToSave,
            distance: calculatedDistance || undefined,
            notes: formData.notes || undefined,
          });
          showToast('success', 'Flight Updated!', 'Saved to database successfully.');
        } else {
          const flightDataToSave = {
            flightNumber: formData.flightNumber.trim().toUpperCase(),
            airline: formData.airline || undefined,
            from: fromAirport,
            to: toAirport,
            date: formData.date.toISOString(),
            departureAt,
            arrivalAt,
            duration: durationToSave,
            distance: calculatedDistance || undefined,
            notes: formData.notes || undefined,
            companyId: isCompany,
          };
          
          await addFlight(flightDataToSave);
          showToast('success', 'Flight Added!', 'Saved to database successfully.');
        }
      } catch (error) {
        if (__DEV__) console.error('Error saving flight:', error);
        showToast('error', 'Save Failed', error instanceof Error ? error.message : 'Failed to save flight. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    router.replace('/(tabs)/home');
    
    // Start background save after navigation (next tick)
    setTimeout(saveInBackground, 0);
  };

  const renderStepIndicator = () => (
    <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.stepIndicator}>
      <LinearGradient
        colors={['rgba(30,30,30,0.98)', 'rgba(20,20,20,0.95)']}
        style={styles.stepIndicatorGradient}
      >
        {steps.map((step, index) => (
          <View key={index} style={styles.stepItem}>
            <View style={[
              styles.stepCircle,
              index <= currentStep && styles.stepCircleActive,
              index === currentStep && styles.stepCircleCurrent
            ]}>
              <MaterialIcons
                name={step.icon as any}
                size={16}
                color={index <= currentStep ? '#fff' : 'rgba(255,255,255,0.3)'}
              />
            </View>
            <Text style={[
              styles.stepText,
              index <= currentStep && styles.stepTextActive
            ]}>
              {step.title}
            </Text>
            {index < steps.length - 1 && (
              <View style={[
                styles.stepConnector,
                index < currentStep && styles.stepConnectorActive
              ]} />
            )}
          </View>
        ))}
      </LinearGradient>
    </Animated.View>
  );

  const renderFlightInfoStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Flight Information</Text>
      <Text style={styles.stepDescription}>
        Enter your flight number and airline details
      </Text>

      {/* Company Flight Checkbox - only show if user is in a company */}
      {hasCompanyMembership && (
        <View style={styles.companyCheckboxContainer}>
          <Pressable
            style={styles.companyCheckbox}
            onPress={() => setIsCompanyFlight(!isCompanyFlight)}
          >
            <View style={[
              styles.checkbox,
              isCompanyFlight && styles.checkboxChecked
            ]}>
              {isCompanyFlight && (
                <MaterialIcons name="check" size={16} color="#fff" />
              )}
            </View>
            <View style={styles.checkboxLabelContainer}>
              <Text style={styles.checkboxLabel}>For Company</Text>
              <Text style={styles.checkboxSubtext}>
                This flight will be visible to all company members
              </Text>
            </View>
          </Pressable>
        </View>
      )}

      <ValidatedInput
        label="Flight Number"
        value={formData.flightNumber}
        onChangeText={(text) => updateFormData('flightNumber', text.toUpperCase())}
        placeholder="e.g., AA1234, LH456"
        autoCapitalize="characters"
        icon="flight"
        required
        error={validationErrors.flightNumber}
      />

      <ValidatedInput
        label="Airline"
        value={formData.airline}
        onChangeText={(text) => updateFormData('airline', text)}
        placeholder="e.g., American Airlines, Lufthansa"
        icon="business"
        required
        error={validationErrors.airline}
      />
    </View>
  );

  const renderRouteStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Flight Route</Text>
      <Text style={styles.stepDescription}>
        Select your departure and arrival airports
      </Text>

      <View style={styles.routeContainer}>
        <Pressable
          style={styles.airportSelector}
          onPress={() => openAirportSelector('from')}
        >
          <LinearGradient
            colors={['rgba(30,30,30,0.98)', 'rgba(20,20,20,0.95)']}
            style={styles.airportSelectorGradient}
          >
            <MaterialIcons name="flight-takeoff" size={24} color="#ff1900" />
            <View style={styles.airportInfo}>
              <Text style={styles.airportLabel}>From</Text>
              <Text style={styles.airportValue}>
                {formData.fromAirport ? `${formData.fromAirport.iata || formData.fromAirport.icao} - ${formData.fromAirport.city || formData.fromAirport.name}` : 'Select departure airport'}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="rgba(255,255,255,0.5)" />
          </LinearGradient>
        </Pressable>

        <View style={styles.routeArrow}>
          <MaterialIcons name="flight" size={20} color="#ff1900" />
        </View>

        <Pressable
          style={styles.airportSelector}
          onPress={() => openAirportSelector('to')}
        >
          <LinearGradient
            colors={['rgba(30,30,30,0.98)', 'rgba(20,20,20,0.95)']}
            style={styles.airportSelectorGradient}
          >
            <MaterialIcons name="flight-land" size={24} color="#ff1900" />
            <View style={styles.airportInfo}>
              <Text style={styles.airportLabel}>To</Text>
              <Text style={styles.airportValue}>
                {formData.toAirport ? `${formData.toAirport.iata || formData.toAirport.icao} - ${formData.toAirport.city || formData.toAirport.name}` : 'Select arrival airport'}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="rgba(255,255,255,0.5)" />
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  // Calculate duration between two times
  const calculateDuration = (departureTime: string, arrivalTime: string): string => {
    if (!departureTime || !arrivalTime) return '';
    
    try {
      // Parse times (format: HH:MM)
      const [depHour, depMin] = departureTime.split(':').map(Number);
      const [arrHour, arrMin] = arrivalTime.split(':').map(Number);
      
      // Convert to minutes since midnight
      let depMinutes = depHour * 60 + depMin;
      let arrMinutes = arrHour * 60 + arrMin;
      
      // If arrival is earlier than departure, assume next day
      if (arrMinutes < depMinutes) {
        arrMinutes += 24 * 60;
      }
      
      const durationMinutes = arrMinutes - depMinutes;
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      
      if (minutes === 0) {
        return `${hours}h`;
      }
      return `${hours}h ${minutes}m`;
    } catch (error) {
      return '';
    }
  };

  const handleDepartureTimeChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setDepartureTimeDate(selectedDate);
      const timeStr = formatTime(selectedDate);
      updateFormData('departureTime', timeStr);
      
      // Auto-calculate duration if arrival time exists
      if (formData.arrivalTime) {
        const duration = calculateDuration(timeStr, formData.arrivalTime);
        if (duration) {
          updateFormData('duration', duration);
        }
      }
    }
  };

  const handleArrivalTimeChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setArrivalTimeDate(selectedDate);
      const timeStr = formatTime(selectedDate);
      updateFormData('arrivalTime', timeStr);
      
      // Auto-calculate duration if departure time exists
      if (formData.departureTime) {
        const duration = calculateDuration(formData.departureTime, timeStr);
        if (duration) {
          updateFormData('duration', duration);
        }
      }
    }
  };

  const renderScheduleStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Flight Schedule</Text>
      <Text style={styles.stepDescription}>
        When does your flight depart and arrive?
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Flight Date *</Text>
        <Pressable
          style={styles.dateSelector}
          onPress={() => setShowDatePicker(true)}
        >
          <MaterialIcons name="calendar-today" size={20} color="#ff1900" />
          <Text style={styles.dateText}>
            {formData.date.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </Text>
        </Pressable>
      </View>

      <View style={styles.timeContainer}>
        {/* Departure Time Picker */}
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.inputLabel}>Departure Time *</Text>
          <Pressable
            style={styles.timeSelector}
            onPress={() => setShowDepartureTimePicker(true)}
          >
            <MaterialIcons name="schedule" size={20} color="#ff1900" />
            <Text style={styles.timeText}>
              {formData.departureTime || 'Select time'}
            </Text>
            <MaterialIcons name="chevron-right" size={20} color="rgba(255,255,255,0.4)" />
          </Pressable>
        </View>

        {/* Arrival Time Picker */}
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.inputLabel}>Arrival Time *</Text>
          <Pressable
            style={styles.timeSelector}
            onPress={() => setShowArrivalTimePicker(true)}
          >
            <MaterialIcons name="flight-land" size={20} color="#ff1900" />
            <Text style={styles.timeText}>
              {formData.arrivalTime || 'Select time'}
            </Text>
            <MaterialIcons name="chevron-right" size={20} color="rgba(255,255,255,0.4)" />
          </Pressable>
        </View>
      </View>

      {/* Date Picker Modal */}
      <AppModal
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        title="Select Flight Date"
        subtitle=""
        presentationStyle="pageSheet"
        keyboardAvoiding={false}
      >
        <View style={{ padding: 20 }}>
          <DateTimePicker
            value={formData.date}
            mode="date"
            display="spinner"
            onChange={(event, selectedDate) => {
              if (selectedDate) {
                updateFormData('date', selectedDate);
              }
            }}
          />
          <Pressable
            style={{
              marginTop: 16,
              backgroundColor: '#ff1900',
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: 'center',
            }}
            onPress={() => setShowDatePicker(false)}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>Done</Text>
          </Pressable>
        </View>
      </AppModal>

      {/* Departure Time Picker Modal */}
      <AppModal
        visible={showDepartureTimePicker}
        onClose={() => setShowDepartureTimePicker(false)}
        title="Departure Time"
        subtitle="When does your flight take off?"
        presentationStyle="pageSheet"
        keyboardAvoiding={false}
      >
        <View style={{ padding: 20 }}>
          <DateTimePicker
            value={departureTimeDate}
            mode="time"
            display="spinner"
            onChange={handleDepartureTimeChange}
          />
          <Pressable
            style={{
              marginTop: 16,
              backgroundColor: '#ff1900',
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: 'center',
            }}
            onPress={() => setShowDepartureTimePicker(false)}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>Done</Text>
          </Pressable>
        </View>
      </AppModal>

      {/* Arrival Time Picker Modal */}
      <AppModal
        visible={showArrivalTimePicker}
        onClose={() => setShowArrivalTimePicker(false)}
        title="Arrival Time"
        subtitle="When does your flight land?"
        presentationStyle="pageSheet"
        keyboardAvoiding={false}
      >
        <View style={{ padding: 20 }}>
          <DateTimePicker
            value={arrivalTimeDate}
            mode="time"
            display="spinner"
            onChange={handleArrivalTimeChange}
          />
          <Pressable
            style={{
              marginTop: 16,
              backgroundColor: '#ff1900',
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: 'center',
            }}
            onPress={() => setShowArrivalTimePicker(false)}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>Done</Text>
          </Pressable>
        </View>
      </AppModal>
    </View>
  );

  const renderDetailsStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Additional Details</Text>
      <Text style={styles.stepDescription}>
        Optional information to enrich your flight record
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Duration</Text>
        <Pressable
          style={styles.timeSelector}
          onPress={() => setShowDurationPicker(true)}
        >
          <MaterialIcons name="schedule" size={20} color="#ff1900" />
          <Text style={styles.timeText}>
            {formData.duration || 'e.g., 2h 30m'}
          </Text>
          <MaterialIcons name="chevron-right" size={20} color="rgba(255,255,255,0.4)" />
        </Pressable>
      </View>

      {/* Duration Picker Modal - Custom wheel picker */}
      <AppModal
        visible={showDurationPicker}
        onClose={() => setShowDurationPicker(false)}
        title="Flight Duration"
        subtitle="How long is the flight?"
        presentationStyle="pageSheet"
        keyboardAvoiding={false}
      >
        <View style={{ padding: 20 }}>
          <View style={styles.durationPickerContainer}>
            <View style={styles.durationColumn}>
              <Text style={styles.durationLabel}>Hours</Text>
              <ScrollView style={styles.durationScroll} contentContainerStyle={styles.durationScrollContent}>
                {Array.from({ length: 24 }, (_, i) => (
                  <Pressable
                    key={i}
                    style={[styles.durationOption, durationHours === i && styles.durationOptionSelected]}
                    onPress={() => {
                      setDurationHours(i);
                      updateFormData('duration', `${i}h ${durationMinutes}m`);
                    }}
                  >
                    <Text style={[styles.durationOptionText, durationHours === i && styles.durationOptionTextSelected]}>
                      {i}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            <View style={styles.durationColumn}>
              <Text style={styles.durationLabel}>Minutes</Text>
              <ScrollView style={styles.durationScroll} contentContainerStyle={styles.durationScrollContent}>
                {[0, 15, 30, 45].map((min) => (
                  <Pressable
                    key={min}
                    style={[styles.durationOption, durationMinutes === min && styles.durationOptionSelected]}
                    onPress={() => {
                      setDurationMinutes(min);
                      updateFormData('duration', `${durationHours}h ${min}m`);
                    }}
                  >
                    <Text style={[styles.durationOptionText, durationMinutes === min && styles.durationOptionTextSelected]}>
                      {min}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
          <Pressable
            style={{
              marginTop: 16,
              backgroundColor: '#ff1900',
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: 'center',
            }}
            onPress={() => setShowDurationPicker(false)}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>Done</Text>
          </Pressable>
        </View>
      </AppModal>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Distance (Optional)</Text>
        <TextInput
          style={styles.textInput}
          value={formData.distance}
          onChangeText={(text) => {
            // Auto-format: accept numbers with comma/dot, auto-add " km"
            let cleaned = text.replace(/[^\d.,]/g, ''); // Keep only numbers, comma, dot
            if (cleaned && !text.endsWith(' km') && !text.endsWith('km')) {
              // Auto-add " km" if user is typing numbers
              updateFormData('distance', cleaned);
            } else {
              updateFormData('distance', text);
            }
          }}
          onBlur={() => {
            // When user leaves field, ensure " km" is added
            if (formData.distance && !formData.distance.includes('km')) {
              const cleaned = formData.distance.replace(/[^\d.,]/g, '');
              if (cleaned) {
                updateFormData('distance', `${cleaned} km`);
              }
            }
          }}
          placeholder="e.g., 1234 or 1,234"
          placeholderTextColor="rgba(255,255,255,0.5)"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Notes</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          value={formData.notes}
          onChangeText={(text) => updateFormData('notes', text)}
          placeholder="Add any notes about your flight..."
          placeholderTextColor="rgba(255,255,255,0.5)"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>
    </View>
  );

  const renderReviewStep = () => {
    const fromCode = (formData.fromAirport?.iata || formData.fromAirport?.icao || formData.fromAirport?.name || formData.fromAirport?.city || '—').toString().toUpperCase();
    const toCode = (formData.toAirport?.iata || formData.toAirport?.icao || formData.toAirport?.name || formData.toAirport?.city || '—').toString().toUpperCase();
    const fromCity = formData.fromAirport?.city || formData.fromAirport?.name || '—';
    const toCity = formData.toAirport?.city || formData.toAirport?.name || '—';
    const fromName = formData.fromAirport?.name || formData.fromAirport?.city || '—';
    const toName = formData.toAirport?.name || formData.toAirport?.city || '—';
    
    return (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Review Flight</Text>
      <Text style={styles.stepDescription}>
        Please review your flight details before saving
      </Text>

      <View style={styles.reviewCard}>
        <LinearGradient
          colors={['rgba(30,30,30,0.98)', 'rgba(20,20,20,0.95)']}
          style={styles.reviewCardGradient}
        >
          {/* Flight Header */}
          <View style={styles.reviewFlightHeader}>
            <View style={styles.reviewFlightNumberContainer}>
              <Text style={styles.reviewFlightNumberLabel}>Flight</Text>
              <Text style={styles.reviewFlightNumber}>
                {formData.flightNumber || '—'}
              </Text>
            </View>
            {formData.airline && (
              <View style={styles.reviewStatusBadge}>
                <Text style={styles.reviewStatusText}>{formData.airline.toUpperCase()}</Text>
              </View>
            )}
          </View>
          
          {/* Route Section */}
          <View style={styles.reviewRouteSection}>
            {/* Departure Airport */}
            <View style={styles.reviewAirportInfo}>
              <View style={styles.reviewAirportLabelContainer}>
                <MaterialIcons name="flight-takeoff" size={14} color="#ff1900" />
                <Text style={styles.reviewAirportLabel}>From</Text>
              </View>
              <Text style={styles.reviewAirportCode}>{fromCode}</Text>
              <Text style={styles.reviewAirportCity} numberOfLines={1} ellipsizeMode="tail">
                {fromCity}
              </Text>
              <Text style={styles.reviewAirportName} numberOfLines={1} ellipsizeMode="tail">
                {fromName}
              </Text>
            </View>
            
            <View style={styles.reviewFlightPathContainer}>
              <View style={styles.reviewFlightPathLine} />
              <View style={styles.reviewFlightIconContainer}>
                <MaterialIcons name="flight" size={16} color="#ff1900" />
              </View>
              <View style={styles.reviewFlightPathLine} />
            </View>
            
            {/* Arrival Airport */}
            <View style={styles.reviewAirportInfo}>
              <View style={styles.reviewAirportLabelContainer}>
                <MaterialIcons name="flight-land" size={14} color="#ff1900" />
                <Text style={styles.reviewAirportLabel}>To</Text>
              </View>
              <Text style={styles.reviewAirportCode}>{toCode}</Text>
              <Text style={styles.reviewAirportCity} numberOfLines={1} ellipsizeMode="tail">
                {toCity}
              </Text>
              <Text style={styles.reviewAirportName} numberOfLines={1} ellipsizeMode="tail">
                {toName}
              </Text>
            </View>
          </View>
          
          {/* Flight Details */}
          <View style={styles.reviewFlightDetails}>
            {formData.duration && (
              <View style={styles.reviewDetailItem}>
                <MaterialIcons name="schedule" size={20} color="#ff1900" />
                <View style={styles.reviewDetailText}>
                  <Text style={styles.reviewDetailLabel}>Duration</Text>
                  <Text style={styles.reviewDetailValue}>{formData.duration}</Text>
                </View>
              </View>
            )}
            {formData.distance && (
              <View style={styles.reviewDetailItem}>
                <MaterialIcons name="straighten" size={20} color="#ff1900" />
                <View style={styles.reviewDetailText}>
                  <Text style={styles.reviewDetailLabel}>Distance</Text>
                  <Text style={styles.reviewDetailValue}>{formData.distance}</Text>
                </View>
              </View>
            )}
            <View style={styles.reviewDetailItem}>
              <MaterialIcons name="calendar-today" size={20} color="#ff1900" />
              <View style={styles.reviewDetailText}>
                <Text style={styles.reviewDetailLabel}>Date</Text>
                <Text style={styles.reviewDetailValue}>
                  {formData.date ? formData.date.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  }) : '—'}
                </Text>
              </View>
            </View>
            {(formData.departureTime || formData.arrivalTime) && (
              <View style={styles.reviewDetailItem}>
                <MaterialIcons name="access-time" size={20} color="#ff1900" />
                <View style={styles.reviewDetailText}>
                  <Text style={styles.reviewDetailLabel}>Time</Text>
                  <Text style={styles.reviewDetailValue}>
                    {formData.departureTime || '—'} - {formData.arrivalTime || '—'}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </LinearGradient>
      </View>
    </View>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: return renderFlightInfoStep();
      case 1: return renderRouteStep();
      case 2: return renderScheduleStep();
      case 3: return renderDetailsStep();
      case 4: return renderReviewStep();
      default: return null;
    }
  };

  const renderNavigationButtons = () => {
    // Use current formData to validate - React will re-render when formData changes
    const { valid: isValidStep } = validateStepPure(currentStep);
    return (
    <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.navigationContainer}>
      <LinearGradient
        colors={['rgba(30,30,30,0.98)', 'rgba(20,20,20,0.95)']}
        style={styles.navigationGradient}
      >
        <View style={styles.navigationButtons}>
          {currentStep > 0 && (
            <Pressable style={styles.backButton} onPress={prevStep}>
              <MaterialIcons name="arrow-back" size={20} color="rgba(255,255,255,0.7)" />
              <Text style={styles.backButtonText}>Back</Text>
            </Pressable>
          )}

          <View style={styles.spacer} />

          {currentStep < steps.length - 1 ? (
            <Pressable
              style={[styles.nextButton, !isValidStep && styles.nextButtonDisabled]}
              onPress={nextStep}
              disabled={!isValidStep}
            >
              <LinearGradient
                colors={isValidStep ? ['#ff1900', '#ff3b00'] : ['rgba(100,100,100,0.5)', 'rgba(80,80,80,0.5)']}
                style={styles.nextButtonGradient}
              >
                <Text style={styles.nextButtonText}>Next</Text>
                <MaterialIcons name="arrow-forward" size={20} color="#fff" />
              </LinearGradient>
            </Pressable>
          ) : (
            <Pressable
              style={styles.saveButton}
              onPress={saveFlight}
              disabled={isLoading}
            >
              <LinearGradient
                colors={['#4CAF50', '#45a049']}
                style={styles.saveButtonGradient}
              >
                {isLoading ? (
                  <Text style={styles.saveButtonText}>Saving...</Text>
                ) : (
                  <>
                    <MaterialIcons name="check" size={20} color="#fff" />
                    <Text style={styles.saveButtonText}>Save Flight</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          )}
        </View>
      </LinearGradient>
    </Animated.View>
  );
  };

  const renderAirportModal = () => (
    <Modal
      visible={showAirportModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={closeAirportModal}
    >
      <View style={styles.modalContainer}>
        <LinearGradient
          colors={['#000', '#1a1a1a']}
          style={styles.modalGradient}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Select {airportSelectionType === 'from' ? 'Departure' : 'Arrival'} Airport
            </Text>
            <Pressable
              style={styles.modalCloseButton}
              onPress={closeAirportModal}
            >
              <MaterialIcons name="close" size={24} color="#fff" />
            </Pressable>
          </View>

          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: 'rgba(255,25,0,0.08)', borderRadius: 16,
              borderWidth: 2, borderColor: 'rgba(255,25,0,0.2)', paddingHorizontal: 18, paddingVertical: 14,
              elevation: 4,
              shadowColor: '#ff1900',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 8,
            }}>
              <MaterialIcons name="search" size={24} color="#ff1900" />
              <TextInput
                placeholder="Search by name or code (VIE, JFK...)"
                placeholderTextColor="rgba(255,255,255,0.5)"
                style={{ flex: 1, color: '#fff', marginLeft: 12, fontSize: 16, fontWeight: '600' }}
                autoCapitalize="characters"
                onChangeText={searchAirports}
                value={airportQuery}
                autoFocus
              />
              {airportQuery.length > 0 && (
                <Pressable onPress={() => {setAirportQuery(''); searchAirports('');}}>
                  <MaterialIcons name="close" size={20} color="rgba(255,255,255,0.6)" />
                </Pressable>
              )}
            </View>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {isSearching ? (
              // While searching: show spinner only
              <View style={{ padding: 60, alignItems: 'center' }}>
                <MaterialIcons name="flight" size={48} color="#ff1900" />
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 20 }}>Searching airports...</Text>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 8, textAlign: 'center' }}>
                  Finding the best matches for &quot;{airportQuery}&quot;
                </Text>
              </View>
            ) : airportResults.length > 0 ? (
              // Have results: show them
              <View key={resultsVersion}>
                {airportResults.map((airport) => (
                  <Pressable
                    key={airport.id}
                    style={styles.airportItem}
                    onPress={() => selectAirport(airport)}
                  >
                    <LinearGradient
                      colors={['rgba(30,30,30,0.98)', 'rgba(20,20,20,0.95)']}
                      style={styles.airportItemGradient}
                    >
                      <View style={styles.airportItemInfo}>
                        <Text style={styles.airportItemCode}>{airport.iata || airport.icao || '—'}</Text>
                        <View style={styles.airportItemDetails}>
                          <Text style={styles.airportItemName}>{airport.name}</Text>
                          <Text style={styles.airportItemLocation}>
                            {airport.city}{airport.country ? `, ${airport.country}` : ''}
                          </Text>
                        </View>
                      </View>
                      <MaterialIcons name="chevron-right" size={20} color="rgba(255,255,255,0.5)" />
                    </LinearGradient>
                  </Pressable>
                ))}
              </View>
            ) : airportQuery.trim().length > 0 ? (
              // Searched but no results: show empty state
              <View style={{ padding: 60, alignItems: 'center' }}>
                <View style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: 'rgba(255,25,0,0.1)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 20,
                }}>
                  <MaterialIcons name="search-off" size={40} color="#ff1900" />
                </View>
                <Text style={{ color: '#fff', textAlign: 'center', fontSize: 20, fontWeight: '800', marginBottom: 12 }}>
                  No airports found
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', fontSize: 15, lineHeight: 22, paddingHorizontal: 20 }}>
                  No airports match &quot;{airportQuery}&quot;. Try searching by IATA code (VIE, JFK) or city name.
                </Text>
              </View>
            ) : (
              // No query: show informational empty state
              <View style={{ padding: 60, alignItems: 'center' }}>
                <View style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: 'rgba(255,25,0,0.1)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 20,
                }}>
                  <MaterialIcons name="search" size={40} color="#ff1900" />
                </View>
                <Text style={{ color: '#fff', textAlign: 'center', fontSize: 20, fontWeight: '800', marginBottom: 12 }}>
                  Start typing to search airports
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', fontSize: 15, lineHeight: 22, paddingHorizontal: 20 }}>
                  Enter at least 3 characters (name or IATA/ICAO code). Results will appear here.
                </Text>
              </View>
            )}
          </ScrollView>
        </LinearGradient>
      </View>
    </Modal>
  );

  return (
    <ScreenWrapper title={editId ? "Edit Flight" : "Add Flight"} showBackButton={true}>
      {renderStepIndicator()}
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          {renderStepContent()}
        </Animated.View>
      </ScrollView>

      {renderNavigationButtons()}
      
      {/* Airport Selection Modal */}
      {renderAirportModal()}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  // Step Indicator
  stepIndicator: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  stepIndicatorGradient: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepCircleActive: {
    backgroundColor: '#ff1900',
  },
  stepCircleCurrent: {
    backgroundColor: '#ff1900',
    transform: [{ scale: 1.1 }],
  },
  stepText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
    textAlign: 'center',
  },
  stepTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  stepConnector: {
    position: 'absolute',
    top: 16,
    left: '60%',
    right: '-40%',
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  stepConnectorActive: {
    backgroundColor: '#ff1900',
  },

  // Content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  stepContent: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 22,
    marginBottom: 32,
  },

  // Form Inputs
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },

  // Route Step
  routeContainer: {
    alignItems: 'center',
  },
  airportSelector: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginVertical: 8,
  },
  airportSelectorGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
  },
  airportInfo: {
    flex: 1,
    marginLeft: 16,
  },
  airportLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
    marginBottom: 4,
  },
  airportValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  routeArrow: {
    marginVertical: 16,
    padding: 8,
  },

  // Schedule Step
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  dateText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    marginLeft: 12,
  },
  timeContainer: {
    flexDirection: 'row',
  },
  timeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  timeText: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    marginLeft: 12,
  },
  
  // Duration Picker
  durationPickerContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  durationColumn: {
    flex: 1,
  },
  durationLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  durationScroll: {
    maxHeight: 200,
  },
  durationScrollContent: {
    paddingVertical: 8,
  },
  durationOption: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  durationOptionSelected: {
    backgroundColor: '#ff1900',
    borderColor: '#ff1900',
  },
  durationOptionText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  durationOptionTextSelected: {
    color: '#fff',
    fontWeight: '800',
  },

  // Review Step
  reviewCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  reviewCardGradient: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  reviewFlightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  reviewFlightNumberContainer: {
    flex: 1,
  },
  reviewFlightNumberLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  reviewFlightNumber: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.8,
  },
  reviewStatusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,25,0,0.2)',
  },
  reviewStatusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },
  reviewRouteSection: {
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
  reviewAirportInfo: {
    flex: 1,
    alignItems: 'center',
  },
  reviewAirportLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
    backgroundColor: 'rgba(255,25,0,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  reviewAirportLabel: {
    fontSize: 9,
    color: '#ff1900',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  reviewAirportCode: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  reviewAirportCity: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ff1900',
    marginBottom: 4,
    textAlign: 'center',
  },
  reviewAirportName: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    fontWeight: '500',
  },
  reviewFlightPathContainer: {
    width: 110,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 0,
    gap: 10,
  },
  reviewFlightPathLine: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    flex: 1,
    minWidth: 10,
  },
  reviewFlightIconContainer: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    padding: 8,
    borderWidth: 1.5,
    borderColor: '#ff1900',
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewFlightDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  reviewDetailItem: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  reviewDetailText: {
    marginTop: 6,
    alignItems: 'center',
  },
  reviewDetailLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  reviewDetailValue: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '700',
  },

  // Navigation
  navigationContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  navigationGradient: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  navigationButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  spacer: {
    flex: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  backButtonText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  nextButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  saveButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Airport Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  modalGradient: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 64,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(255,25,0,0.15)',
    backgroundColor: 'rgba(255,25,0,0.03)',
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
  },
  modalCloseButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,25,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,25,0,0.3)',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  airportItem: {
    marginBottom: 14,
    borderRadius: 20,
    overflow: 'hidden',
  },
  airportItemGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  airportItemInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  airportItemCode: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ff1900',
    marginRight: 20,
    minWidth: 60,
    letterSpacing: 1.2,
  },
  airportItemDetails: {
    flex: 1,
  },
  airportItemName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  airportItemLocation: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
  },

  // Company Checkbox Styles
  companyCheckboxContainer: {
    marginBottom: 20,
    marginTop: 8,
  },
  companyCheckbox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#ff1900',
    borderColor: '#ff1900',
  },
  checkboxLabelContainer: {
    flex: 1,
  },
  checkboxLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  checkboxSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 16,
  },
});
