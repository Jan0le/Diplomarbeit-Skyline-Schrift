import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

// Use legacy API to avoid deprecation warnings for readAsStringAsync
import * as FileSystem from 'expo-file-system/legacy';
import ScreenWrapper from '../components/ScreenWrapper';
import { useToast } from '../components/ToastProvider';
import { useAuth } from '../contexts/AuthContext';
import { getAirportByCode as getAirportByCodeApi } from '../services/airportApiService';
import { autocompleteAirports, ensureAirportByCode, ensureAirportForSelection } from '../services/airports';
import { runOcrSpace } from '../services/ocr';
import { parseBCBP } from '../Skyline ticket ausleser/bcbp';
import { useAppStore } from '../store';
import { Airport } from '../types';

export default function AddFlightImportScreen() {
  const { addFlight } = useAppStore();
  const { showToast } = useToast();
  const { currentCompanyId, memberships } = useAuth();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [parsedText, setParsedText] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanLocked, setScanLocked] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [candidate, setCandidate] = useState<{
    flightNumber?: string;
    from?: Partial<Airport>;
    to?: Partial<Airport>;
    date?: string; // ISO
    departureTime?: string;
    arrivalTime?: string;
  } | null>(null);
  const [form, setForm] = useState({
    flightNumber: '',
    fromIata: '',
    toIata: '',
    date: null as Date | null,
    departureTime: null as Date | null,
    arrivalTime: null as Date | null,
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDepPicker, setShowDepPicker] = useState(false);
  const [showArrPicker, setShowArrPicker] = useState(false);
  
  // Airport selection modal state
  const [showAirportModal, setShowAirportModal] = useState(false);
  const [airportSelectionType, setAirportSelectionType] = useState<'from' | 'to'>('from');
  const [airportQuery, setAirportQuery] = useState('');
  const [airportResults, setAirportResults] = useState<Airport[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFromAirport, setSelectedFromAirport] = useState<Airport | null>(null);
  const [selectedToAirport, setSelectedToAirport] = useState<Airport | null>(null);
  const searchDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const formatDate = (d: Date | null) => (d ? d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' }) : 'Select date');
  const formatTime = (d: Date | null) => (d ? d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false }) : 'Select time');
  const [errors, setErrors] = useState<{ [k: string]: boolean }>({});

  const pad2 = (n: number) => String(n).padStart(2, '0');

  const buildLocalTimestamp = (date: Date, time: Date): string => {
    const d = new Date(date);
    d.setHours(time.getHours(), time.getMinutes(), 0, 0);
    const yyyy = d.getFullYear();
    const mo = pad2(d.getMonth() + 1);
    const da = pad2(d.getDate());
    const h = pad2(d.getHours());
    const m = pad2(d.getMinutes());
    return `${yyyy}-${mo}-${da}T${h}:${m}:00`;
  };

  const minutesBetweenTimes = (dep: Date, arr: Date): number => {
    const depM = dep.getHours() * 60 + dep.getMinutes();
    const arrM = arr.getHours() * 60 + arr.getMinutes();
    let diff = arrM - depM;
    if (diff < 0) diff += 24 * 60;
    return diff;
  };

  const formatDurationFromMinutes = (mins: number): string => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };
  
  // Company flight state
  const hasCompanyMembership = memberships && memberships.length > 0;
  const [isCompanyFlight, setIsCompanyFlight] = useState<boolean>(false);

  useEffect(() => {
    if (!candidate) return;
    const iso = candidate.date;
    const parsedDate = iso ? new Date(iso) : null;
    const parseTime = (t?: string | null) => {
      if (!t) return null;
      const [h, m] = t.split(':').map(n => parseInt(n, 10));
      if (isNaN(h) || isNaN(m)) return null;
      const d = new Date();
      d.setHours(h, m, 0, 0);
      return d;
    };
    setForm({
      flightNumber: candidate.flightNumber || '',
      fromIata: candidate.from?.iata || '',
      toIata: candidate.to?.iata || '',
      date: parsedDate,
      departureTime: parseTime(candidate.departureTime || null),
      arrivalTime: parseTime(candidate.arrivalTime || null),
    });
    setErrors({});
    
    // Auto-open airport selector for "from" airport if code was extracted (for OCR)
    if (candidate.from?.iata && !selectedFromAirport) {
      setTimeout(() => {
        setAirportSelectionType('from');
        setAirportQuery(candidate.from!.iata || '');
        setShowAirportModal(true);
        searchAirports(candidate.from!.iata || '');
      }, 500);
    }
  }, [candidate]);

  // Haversine: Distanz in km zwischen zwei Flughäfen
  const calculateFlightDistance = (from: Airport, to: Airport): number => {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6371; // km
    const dLat = toRad(to.latitude - from.latitude);
    const dLon = toRad(to.longitude - from.longitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(from.latitude)) * Math.cos(toRad(to.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  const startBarcodeScan = async () => {
    try {
      if (!permission?.granted) {
        const res = await requestPermission();
        if (!res.granted) {
          Alert.alert('Permission Required', 'Camera access is needed to scan boarding passes.', [{ text: 'OK' }]);
          return;
        }
      }
      setSelectedImage(null);
      setParsedText(null);
      setCandidate(null);
      setScanLocked(false);
      setIsScanning(true);
    } catch (e) {
      Alert.alert('Camera Error', 'Unable to open camera.');
    }
  };

  const handleBarCodeScanned = async (result: { data: string; type?: string }) => {
    if (scanLocked) return;
    setScanLocked(true);
    setIsScanning(false);

    try {
      const raw = (result?.data ?? '').toString();
      let parsed = parseBCBP(raw);
      if (!parsed && raw) {
        const idx = raw.indexOf('M1');
        if (idx >= 0) {
          const candidate = raw.slice(idx);
          if (candidate.length >= 58) parsed = parseBCBP(candidate);
        }
      }

      if (!parsed) {
        Alert.alert('Scan failed', 'No valid boarding pass found. Try again.');
        setScanLocked(false);
        return;
      }

      const toISODateOnly = (d: string) => {
        // d expected as YYYY-MM-DD
        return new Date(`${d}T00:00:00Z`).toISOString();
      };

      // Extract airport codes from QR scan
      const fromIata = parsed.flight.departure.airport;
      const toIata = parsed.flight.arrival.airport;

      const candidateData = {
        flightNumber: parsed.flight.number || '',
        from: fromIata ? { iata: fromIata } : undefined,
        to: toIata ? { iata: toIata } : undefined,
        date: parsed.flight.date ? toISODateOnly(parsed.flight.date) : undefined,
        departureTime: undefined as string | undefined,
        arrivalTime: undefined as string | undefined,
      };

      setCandidate(candidateData);
      // Set form data with extracted codes
      setForm(s => ({
        ...s,
        flightNumber: candidateData.flightNumber || s.flightNumber,
        fromIata: candidateData.from?.iata || s.fromIata,
        toIata: candidateData.to?.iata || s.toIata,
        date: candidateData.date ? new Date(candidateData.date) : s.date,
        // leave departure/arrival times for manual entry
      }));
      
      // Auto-open airport selector for "from" airport with pre-filled code
      if (fromIata) {
        setAirportSelectionType('from');
        setAirportQuery(fromIata);
        setShowAirportModal(true);
        // Auto-search immediately
        searchAirports(fromIata);
      }
      
      setScanLocked(false);
    } catch (e) {
      setScanLocked(false);
      Alert.alert('Scan error', 'An unexpected error occurred while processing the barcode.');
    }
  };

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Camera access is needed to scan boarding passes.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const takePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.6, // reduce size for OCR API limits
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      processDocument(result.assets[0].uri);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.6, // reduce size for OCR API limits
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      processDocument(result.assets[0].uri);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        processDocument(result.assets[0].uri);
      }
    } catch (error) {
      if (__DEV__) console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const processDocument = async (uri: string) => {
    setIsProcessing(true);
    try {
      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' as any });
      // Determine MIME from file extension
      const lower = uri.toLowerCase();
      const isPdf = lower.endsWith('.pdf') || lower.startsWith('file://') && lower.includes('.pdf');
      const isPng = lower.endsWith('.png');
      const mime = isPdf ? 'application/pdf' : (isPng ? 'image/png' : 'image/jpg');
      const apiKey = process.env.EXPO_PUBLIC_OCR_SPACE_API_KEY || undefined;
      const textResult = await runOcrSpace(`data:${mime};base64,${base64}`, apiKey);
      if (!textResult.ok) {
        throw new Error(textResult.error);
      }
      setParsedText(textResult.text);
      const extracted = extractFlightData(textResult.text);
      setCandidate(extracted);
    } catch (error) {
      if (__DEV__) console.error('OCR error:', error);
      Alert.alert('OCR Failed', error instanceof Error ? error.message : 'Could not extract text. Try a clearer photo or use manual input.');
      setCandidate(null);
    } finally {
      setIsProcessing(false);
    }
  };

  // Airport search function
  const searchAirports = (q: string) => {
    setAirportQuery(q);
    
    // Clear previous timeout
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    
    // If query is empty or too short, clear results
    if (!q.trim() || q.trim().length < 2) {
      setIsSearching(false);
      setAirportResults([]);
      return;
    }
    
    setIsSearching(true);
    
    // Debounced request (600ms) to avoid multi-calls while typing
    searchDebounceRef.current = setTimeout(() => {
      autocompleteAirports(q, 25)
        .then(results => {
          setAirportResults(results || []);
          setIsSearching(false);
        })
        .catch(e => {
          if (__DEV__) console.error('Airport search failed:', e);
          setAirportResults([]);
          setIsSearching(false);
        });
    }, 600);
  };

  // Select airport from modal
  const selectAirport = (airport: Airport) => {
    if (airportSelectionType === 'from') {
      setSelectedFromAirport(airport);
      setForm(s => ({ ...s, fromIata: airport.iata || '' }));
      
      // Auto-calculate distance if destination airport is already selected
      if (selectedToAirport) {
        const distanceKm = calculateFlightDistance(airport, selectedToAirport);
        // Distance will be calculated again when saving, but we can show it in preview if needed
      }
    } else {
      setSelectedToAirport(airport);
      setForm(s => ({ ...s, toIata: airport.iata || '' }));
      
      // Auto-calculate distance if departure airport is already selected
      if (selectedFromAirport) {
        const distanceKm = calculateFlightDistance(selectedFromAirport, airport);
        // Distance will be calculated again when saving, but we can show it in preview if needed
      }
    }
    
    // Close modal and if "from" was selected, auto-open "to" selector
    closeAirportModal();
    
    if (airportSelectionType === 'from' && candidate?.to?.iata) {
      // Auto-open "to" airport selector
      setTimeout(() => {
        setAirportSelectionType('to');
        setAirportQuery(candidate.to!.iata || '');
        setShowAirportModal(true);
        searchAirports(candidate.to!.iata || '');
      }, 300);
    }
  };

  const closeAirportModal = () => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }
    setAirportQuery('');
    setIsSearching(false);
    setShowAirportModal(false);
  };

  // Simple text parsing for common patterns
  const extractFlightData = (text: string) => {
    const upper = text.replace(/\s+/g, ' ').toUpperCase();

    // 1) Flight number
    const flightMatch = upper.match(/\b([A-Z]{2,3})\s?-?\s?(\d{2,4}[A-Z]?)\b/);
    const flightNumber = flightMatch ? `${flightMatch[1]}${flightMatch[2]}` : undefined;

    // 2) Route (IATA)
    let fromIata: string | undefined;
    let toIata: string | undefined;
    const routeMatch = upper.match(/\b([A-Z]{3})\b\s*(?:-|→|TO|>|–)\s*\b([A-Z]{3})\b/);
    if (routeMatch) {
      fromIata = routeMatch[1];
      toIata = routeMatch[2];
    } else {
      fromIata = upper.match(/\bDEP\s*[:\-]?\s*([A-Z]{3})\b/)?.[1];
      toIata = upper.match(/\bARR\s*[:\-]?\s*([A-Z]{3})\b/)?.[1];
      if (!fromIata || !toIata) {
        const allCodes = upper.match(/\b[A-Z]{3}\b/g) || [];
        if (allCodes.length >= 2) {
          fromIata = allCodes[0];
          toIata = allCodes.find(c => c !== fromIata);
        }
      }
    }

    // 3) Date parsing (DD/MM/YYYY, YYYY-MM-DD, 03 OCT 2025, OCT 3 2025)
    const monthMap: Record<string, number> = {
      JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
      JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
    };
    let iso: string | undefined;
    const dmy = upper.match(/\b(\d{1,2})[\.\/-](\d{1,2})[\.\/-](\d{2,4})\b/);
    const ymd = upper.match(/\b(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})\b/);
    const dMonY = upper.match(/\b(\d{1,2})\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(\d{2,4})\b/);
    const monDY = upper.match(/\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(\d{1,2}),?\s+(\d{2,4})\b/);
    if (dmy) {
      const d = parseInt(dmy[1], 10), m = parseInt(dmy[2], 10) - 1, y = parseInt(dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3], 10);
      iso = new Date(Date.UTC(y, m, d)).toISOString();
    } else if (ymd) {
      const y = parseInt(ymd[1], 10), m = parseInt(ymd[2], 10) - 1, d = parseInt(ymd[3], 10);
      iso = new Date(Date.UTC(y, m, d)).toISOString();
    } else if (dMonY) {
      const d = parseInt(dMonY[1], 10), m = monthMap[dMonY[2]], y = parseInt(dMonY[3].length === 2 ? `20${dMonY[3]}` : dMonY[3], 10);
      if (m !== undefined) iso = new Date(Date.UTC(y, m, d)).toISOString();
    } else if (monDY) {
      const m = monthMap[monDY[1]], d = parseInt(monDY[2], 10), y = parseInt(monDY[3].length === 2 ? `20${monDY[3]}` : monDY[3], 10);
      if (m !== undefined) iso = new Date(Date.UTC(y, m, d)).toISOString();
    }

    // 4) Times (HH:MM or HHMM)
    const timeWithColon = (upper.match(/\b(\d{1,2}:\d{2})\b/g) || []) as string[];
    const timeCompact = (upper.match(/\b(\d{4})\b/g) || []) as string[];
    let depTime = upper.match(/DEP\s*[:\-]?\s*(\d{1,2}:\d{2})/)?.[1] || upper.match(/STD\s*[:\-]?\s*(\d{1,2}:\d{2})/)?.[1];
    let arrTime = upper.match(/ARR\s*[:\-]?\s*(\d{1,2}:\d{2})/)?.[1] || upper.match(/STA\s*[:\-]?\s*(\d{1,2}:\d{2})/)?.[1];
    if (!depTime && timeWithColon.length > 0) depTime = timeWithColon[0];
    if (!arrTime && timeWithColon.length > 1) arrTime = timeWithColon[1];
    const toHHMM = (t: string) => `${t.slice(0, 2)}:${t.slice(2)}`;
    if (!depTime && timeCompact.length > 0 && /^\d{4}$/.test(timeCompact[0])) depTime = toHHMM(timeCompact[0]);
    if (!arrTime && timeCompact.length > 1 && /^\d{4}$/.test(timeCompact[1])) arrTime = toHHMM(timeCompact[1]);

    return {
      flightNumber,
      from: fromIata ? { iata: fromIata } : undefined,
      to: toIata ? { iata: toIata } : undefined,
      date: iso,
      departureTime: depTime,
      arrivalTime: arrTime,
    };
  };

  const addToMyFlights = async () => {
    // Validate required fields
    const newErrors: { [k: string]: boolean } = {};
    if (!selectedFromAirport && !form.fromIata) newErrors.fromIata = true;
    if (!selectedToAirport && !form.toIata) newErrors.toIata = true;
    if (!form.date) newErrors.date = true;
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      Alert.alert('Missing details', 'Please select airports and fill in the date.');
      return;
    }
    
    // Use selected airports if available, otherwise try to fetch from API
    let fromAirport: Airport | null = selectedFromAirport;
    let toAirport: Airport | null = selectedToAirport;
    
    // If airports not selected, try to get from API by code
    if (!fromAirport && form.fromIata) {
      const persistedAirport = await ensureAirportByCode(form.fromIata);
      if (persistedAirport) {
        fromAirport = persistedAirport;
      } else {
        // Fallback to direct API call if ensureAirportByCode fails
        const apiAirport = await getAirportByCodeApi(form.fromIata);
        if (apiAirport) {
          // Persist the API airport
          fromAirport = await ensureAirportForSelection(apiAirport);
        }
      }
    }
    
    if (!toAirport && form.toIata) {
      const persistedAirport = await ensureAirportByCode(form.toIata);
      if (persistedAirport) {
        toAirport = persistedAirport;
      } else {
        // Fallback to direct API call if ensureAirportByCode fails
        const apiAirport = await getAirportByCodeApi(form.toIata);
        if (apiAirport) {
          // Persist the API airport
          toAirport = await ensureAirportForSelection(apiAirport);
        }
      }
    }
    
    // If airports were selected from autocomplete, ensure they're persisted
    if (fromAirport && selectedFromAirport) {
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
        fromAirport = await ensureAirportForSelection(fromApiFormat);
      } catch (error) {
        if (__DEV__) console.error('Error persisting from airport:', error);
        // Continue with original airport if persistence fails
      }
    }
    
    if (toAirport && selectedToAirport) {
      try {
        // Convert UI airport format to API format and persist
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
        toAirport = await ensureAirportForSelection(toApiFormat);
      } catch (error) {
        if (__DEV__) console.error('Error persisting to airport:', error);
        // Continue with original airport if persistence fails
      }
    }
    
    if (!fromAirport || !toAirport) {
      Alert.alert('Error', 'Please select valid airports from the search results.');
      return;
    }
    
    const toISODateOnly = (d: Date) => {
      const y = d.getFullYear();
      const m = d.getMonth();
      const day = d.getDate();
      return new Date(Date.UTC(y, m, day)).toISOString();
    };

    try {
      setIsSaving(true);

      const distanceKm = calculateFlightDistance(fromAirport, toAirport);
      const formattedDistance = `${distanceKm.toLocaleString()} km`;

      let departureAt: string | undefined;
      let arrivalAt: string | undefined;
      let duration: string | undefined;
      if (form.date && form.departureTime && form.arrivalTime) {
        departureAt = buildLocalTimestamp(form.date, form.departureTime);
        const durationMins = minutesBetweenTimes(form.departureTime, form.arrivalTime);
        const depDateObj = new Date(departureAt);
        const arrDateObj = new Date(depDateObj.getTime() + durationMins * 60 * 1000);
        const yyyy = arrDateObj.getFullYear();
        const mo = pad2(arrDateObj.getMonth() + 1);
        const da = pad2(arrDateObj.getDate());
        const h = pad2(arrDateObj.getHours());
        const m = pad2(arrDateObj.getMinutes());
        arrivalAt = `${yyyy}-${mo}-${da}T${h}:${m}:00`;
        duration = formatDurationFromMinutes(durationMins);
      }

      const flightPayload = {
        flightNumber: form.flightNumber || undefined,
        from: fromAirport,
        to: toAirport,
        date: toISODateOnly(form.date!),
        departureAt,
        arrivalAt,
        duration,
        distance: formattedDistance,
        companyId: isCompanyFlight && currentCompanyId ? currentCompanyId : undefined,
      };

      router.replace('/(tabs)/map');
      showToast('success', 'Saving', 'Flight is saving in background.');

      setTimeout(async () => {
        try {
          await addFlight(flightPayload);
          showToast('success', 'Flight Added!', 'Saved to database successfully.');
        } catch (e: any) {
          if (__DEV__) console.error('Add flight error', e);
          const raw = typeof e === 'object' ? JSON.stringify(e) : String(e);
          if ((e && e.code === '42501') || /row-level security/i.test(raw)) {
            Alert.alert(
              'Airport permissions issue',
              'Airports table is protected. Please try again later or contact an admin to enable insert/select policies.'
            );
          } else {
            Alert.alert('Error', e instanceof Error ? e.message : 'Failed to add the flight.');
          }
        }
      }, 0);
    } catch (e: any) {
      if (__DEV__) console.error('Add flight preparation error', e);
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to prepare flight data.');
      setIsSaving(false);
    }
  };

  const renderImportOptions = () => (
    <ScrollView 
      style={styles.scrollContainer}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.header}>
        <View style={styles.iconContainer}>
          <MaterialIcons name="document-scanner" size={48} color="#ff1900" />
        </View>
        <Text style={styles.title}>Import Flight Document</Text>
        <Text style={styles.subtitle}>
          Scan or upload your boarding pass, ticket, or confirmation email
        </Text>
      </Animated.View>

      <View style={styles.optionsContainer}>
        {/* Camera Option */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Pressable
            style={({ pressed }) => [
              styles.optionCard,
              pressed && styles.optionCardPressed
            ]}
            onPress={startBarcodeScan}
          >
            <LinearGradient
              colors={['rgba(30,30,30,0.98)', 'rgba(20,20,20,0.95)']}
              style={styles.optionGradient}
            >
              <View style={styles.optionIcon}>
                <MaterialIcons name="camera-alt" size={32} color="#ff1900" />
              </View>
              <Text style={styles.optionTitle}>Scan Boarding Pass</Text>
              <Text style={styles.optionDescription}>
                Use your camera to scan the boarding pass barcode
              </Text>
              <View style={styles.optionButton}>
                <Text style={styles.optionButtonText}>Open Scanner</Text>
                <MaterialIcons name="camera-alt" size={18} color="#fff" />
              </View>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {/* Gallery Option */}
        <Animated.View entering={FadeInDown.delay(250).springify()}>
          <Pressable
            style={({ pressed }) => [
              styles.optionCard,
              pressed && styles.optionCardPressed
            ]}
            onPress={pickImage}
          >
            <LinearGradient
              colors={['rgba(30,30,30,0.98)', 'rgba(20,20,20,0.95)']}
              style={styles.optionGradient}
            >
              <View style={styles.optionIcon}>
                <MaterialIcons name="photo-library" size={32} color="#ff1900" />
              </View>
              <Text style={styles.optionTitle}>Choose from Gallery</Text>
              <Text style={styles.optionDescription}>
                Select an existing photo from your device
              </Text>
              <View style={styles.optionButton}>
                <Text style={styles.optionButtonText}>Browse Photos</Text>
                <MaterialIcons name="photo" size={18} color="#fff" />
              </View>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {/* Document Option */}
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <Pressable
            style={({ pressed }) => [
              styles.optionCard,
              pressed && styles.optionCardPressed
            ]}
            onPress={pickDocument}
          >
            <LinearGradient
              colors={['rgba(30,30,30,0.98)', 'rgba(20,20,20,0.95)']}
              style={styles.optionGradient}
            >
              <View style={styles.optionIcon}>
                <MaterialIcons name="insert-drive-file" size={32} color="#ff1900" />
              </View>
              <Text style={styles.optionTitle}>Upload Document</Text>
              <Text style={styles.optionDescription}>
                Import PDF confirmation or email screenshot
              </Text>
              <View style={styles.optionButton}>
                <Text style={styles.optionButtonText}>Choose File</Text>
                <MaterialIcons name="upload-file" size={18} color="#fff" />
              </View>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>

      {/* Info Section */}
      <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.infoSection}>
        <View style={styles.infoCard}>
          <MaterialIcons name="info-outline" size={24} color="#ff1900" />
          <View style={styles.infoText}>
            <Text style={styles.infoTitle}>Supported Documents</Text>
            <Text style={styles.infoDescription}>
              • Boarding passes{'\n'}
              • E-tickets{'\n'}
              • Confirmation emails{'\n'}
              • PDF documents
            </Text>
          </View>
        </View>
      </Animated.View>
    </ScrollView>
  );

  const renderProcessing = () => (
    <View style={styles.processingContainer}>
      <Animated.View entering={FadeInDown.springify()} style={styles.processingContent}>
        <View style={styles.processingIcon}>
          <MaterialIcons name="auto-fix-high" size={48} color="#ff1900" />
        </View>
        <Text style={styles.processingTitle}>Processing Document</Text>
        <Text style={styles.processingDescription}>
          Analyzing your document and extracting flight information...
        </Text>
        
        {selectedImage && (
          <View style={styles.imagePreview}>
            <Image source={{ uri: selectedImage! }} style={styles.previewImage} />
          </View>
        )}
      </Animated.View>
    </View>
  );

  const renderPreview = () => (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={[styles.container, { gap: 16 }]}> 
      <Text style={styles.title}>Review Extracted Data</Text>
      {selectedImage && (
        <View style={styles.imagePreview}>
          <Image source={{ uri: selectedImage! }} style={styles.previewImage} />
        </View>
      )}
      {/* Raw OCR text hidden for cleaner UI */}
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

      <View style={styles.infoCard}>
        <MaterialIcons name="fact-check" size={20} color="#ff1900" />
        <View style={[styles.infoText, { gap: 8 }]}>
          <Text style={styles.infoTitle}>Edit details</Text>

          <View>
            <Text style={styles.inputLabel}>Flight number</Text>
            <TextInput
              placeholder="e.g. OS87"
              placeholderTextColor={'rgba(255,255,255,0.4)'}
              value={form.flightNumber}
              onChangeText={(t) => setForm(s => ({ ...s, flightNumber: t.trim().toUpperCase() }))}
              style={[styles.input, errors.flightNumber && styles.inputError]}
              autoCapitalize="characters"
            />
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>From</Text>
              <Pressable
                onPress={() => {
                  setAirportSelectionType('from');
                  setAirportQuery(selectedFromAirport?.iata || form.fromIata || '');
                  setShowAirportModal(true);
                  if (selectedFromAirport?.iata || form.fromIata) {
                    searchAirports(selectedFromAirport?.iata || form.fromIata || '');
                  }
                }}
              >
                <View style={[styles.input, errors.fromIata && styles.inputError, { justifyContent: 'center', flexDirection: 'row', alignItems: 'center' }]}>
                  <Text style={{ color: selectedFromAirport ? '#fff' : 'rgba(255,255,255,0.4)', flex: 1 }}>
                    {selectedFromAirport 
                      ? `${selectedFromAirport.iata || selectedFromAirport.icao || ''} - ${selectedFromAirport.name || selectedFromAirport.city || ''}`
                      : form.fromIata || 'Select departure airport'}
                  </Text>
                  <MaterialIcons name="flight-takeoff" size={20} color="#ff1900" />
                </View>
              </Pressable>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>To</Text>
              <Pressable
                onPress={() => {
                  setAirportSelectionType('to');
                  setAirportQuery(selectedToAirport?.iata || form.toIata || '');
                  setShowAirportModal(true);
                  if (selectedToAirport?.iata || form.toIata) {
                    searchAirports(selectedToAirport?.iata || form.toIata || '');
                  }
                }}
              >
                <View style={[styles.input, errors.toIata && styles.inputError, { justifyContent: 'center', flexDirection: 'row', alignItems: 'center' }]}>
                  <Text style={{ color: selectedToAirport ? '#fff' : 'rgba(255,255,255,0.4)', flex: 1 }}>
                    {selectedToAirport 
                      ? `${selectedToAirport.iata || selectedToAirport.icao || ''} - ${selectedToAirport.name || selectedToAirport.city || ''}`
                      : form.toIata || 'Select arrival airport'}
                  </Text>
                  <MaterialIcons name="flight-land" size={20} color="#ff1900" />
                </View>
              </Pressable>
            </View>
          </View>

          <View style={{ gap: 12 }}>
            <View>
              <Text style={styles.inputLabel}>Date</Text>
              <Pressable onPress={() => setShowDatePicker(true)}>
                <View style={[styles.input, errors.date && styles.inputError, { justifyContent: 'center' }]}>
                  <Text style={{ color: '#fff' }}>{formatDate(form.date)}</Text>
                </View>
              </Pressable>
              {showDatePicker && (
                <DateTimePicker
                  value={form.date || new Date()}
                  mode="date"
                  display="default"
                  is24Hour={true}
                  onChange={(_, d) => {
                    setShowDatePicker(false);
                    if (d) setForm(s => ({ ...s, date: d }));
                  }}
                />
              )}
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Departure</Text>
              <Pressable onPress={() => setShowDepPicker(true)}>
                <View style={[styles.input, { justifyContent: 'center' }]}>
                  <Text style={{ color: '#fff' }}>{formatTime(form.departureTime)}</Text>
                </View>
              </Pressable>
              {showDepPicker && (
                <DateTimePicker
                  value={form.departureTime || new Date()}
                  mode="time"
                  display="default"
                  is24Hour={true}
                  onChange={(_, d) => {
                    setShowDepPicker(false);
                    if (d) setForm(s => ({ ...s, departureTime: d }));
                  }}
                />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Arrival</Text>
              <Pressable onPress={() => setShowArrPicker(true)}>
                <View style={[styles.input, { justifyContent: 'center' }]}>
                  <Text style={{ color: '#fff' }}>{formatTime(form.arrivalTime)}</Text>
                </View>
              </Pressable>
              {showArrPicker && (
                <DateTimePicker
                  value={form.arrivalTime || new Date()}
                  mode="time"
                  display="default"
                  is24Hour={true}
                  onChange={(_, d) => {
                    setShowArrPicker(false);
                    if (d) setForm(s => ({ ...s, arrivalTime: d }));
                  }}
                />
              )}
            </View>
          </View>
        </View>
      </View>

      <Pressable style={[styles.confirmButton, isSaving && { opacity: 0.6 }]} onPress={() => { if (!isSaving) addToMyFlights(); }} disabled={isSaving}>
        <LinearGradient colors={['#ff3b00', '#ff1900']} style={styles.confirmButtonGradient}>
          <Text style={styles.confirmText}>{isSaving ? 'Saving…' : 'Add to My Flights'}</Text>
          <MaterialIcons name={isSaving ? 'hourglass-top' : 'add-task'} size={18} color="#fff" />
        </LinearGradient>
      </Pressable>
    </ScrollView>
  );

  return (
    <ScreenWrapper 
      title="Import Document" 
      showBackButton={true}
      headerRightComponent={
        <Pressable
          style={styles.manualButton}
          onPress={() => router.replace('/add-flight-manual')}
        >
          <MaterialIcons name="edit" size={20} color="#fff" />
        </Pressable>
      }
    >
      {isScanning && (
        <View style={{ flex: 1 }}>
          <CameraView
            style={StyleSheet.absoluteFillObject as any}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ['pdf417', 'aztec', 'qr', 'code128', 'datamatrix'] as any,
            }}
            onBarcodeScanned={handleBarCodeScanned as any}
          />
          <View style={{ position: 'absolute', bottom: 24, left: 20, right: 20 }}>
            <Pressable onPress={() => setIsScanning(false)}>
              <View style={[styles.optionButton, { backgroundColor: '#333' }]}>
                <Text style={styles.optionButtonText}>Cancel</Text>
                <MaterialIcons name="close" size={18} color="#fff" />
              </View>
            </Pressable>
          </View>
        </View>
      )}
      {!isScanning && (isProcessing ? renderProcessing() : candidate ? renderPreview() : renderImportOptions())}
      
      {/* Airport Selection Modal */}
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
                <View style={{ padding: 60, alignItems: 'center' }}>
                  <MaterialIcons name="flight" size={48} color="#ff1900" />
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 20 }}>Searching airports...</Text>
                </View>
              ) : airportResults.length > 0 ? (
                <View>
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
                <View style={{ padding: 60, alignItems: 'center' }}>
                  <MaterialIcons name="search-off" size={40} color="#ff1900" />
                  <Text style={{ color: '#fff', textAlign: 'center', fontSize: 20, fontWeight: '800', marginTop: 20 }}>
                    No airports found
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', fontSize: 15, marginTop: 8 }}>
                    No airports match &quot;{airportQuery}&quot;. Try searching by IATA code (VIE, JFK) or city name.
                  </Text>
                </View>
              ) : (
                <View style={{ padding: 60, alignItems: 'center' }}>
                  <MaterialIcons name="search" size={40} color="#ff1900" />
                  <Text style={{ color: '#fff', textAlign: 'center', fontSize: 20, fontWeight: '800', marginTop: 20 }}>
                    Start typing to search airports
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', fontSize: 15, marginTop: 8 }}>
                    Enter at least 2 characters (name or IATA/ICAO code). Results will appear here.
                  </Text>
                </View>
              )}
            </ScrollView>
          </LinearGradient>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,25,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Nexa-Heavy',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Nexa-ExtraLight',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 24,
  },
  optionsContainer: {
    gap: 16,
    marginBottom: 30,
  },
  optionCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  optionCardPressed: {
    transform: [{ scale: 0.98 }],
  },
  optionGradient: {
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  optionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,25,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  optionTitle: {
    fontSize: 18,
    fontFamily: 'Nexa-Heavy',
    color: '#fff',
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 14,
    fontFamily: 'Nexa-ExtraLight',
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
    marginBottom: 20,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ff1900',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  optionButtonText: {
    fontSize: 14,
    fontFamily: 'Nexa-Heavy',
    color: '#fff',
  },
  infoSection: {
    marginTop: 30,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,25,0,0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,25,0,0.2)',
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontFamily: 'Nexa-Heavy',
    color: '#fff',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 12,
    fontFamily: 'Nexa-ExtraLight',
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 16,
  },
  manualButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  processingContent: {
    alignItems: 'center',
    maxWidth: 300,
  },
  processingIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,25,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  processingTitle: {
    fontSize: 24,
    fontFamily: 'Nexa-Heavy',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  processingDescription: {
    fontSize: 16,
    fontFamily: 'Nexa-ExtraLight',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  imagePreview: {
    width: 200,
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#ff1900',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  confirmButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  confirmButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  confirmText: {
    color: '#fff',
    fontFamily: 'Nexa-Heavy',
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: 'Nexa-ExtraLight',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    color: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputError: {
    borderColor: '#ff1900',
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
    fontFamily: 'Nexa-Heavy',
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
    fontFamily: 'Nexa-Heavy',
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
    fontFamily: 'Nexa-Heavy',
    color: '#fff',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  airportItemLocation: {
    fontSize: 14,
    fontFamily: 'Nexa-ExtraLight',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.2,
  },

  // Company Checkbox Styles
  companyCheckboxContainer: {
    marginBottom: 16,
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
    fontFamily: 'Nexa-Heavy',
    color: '#fff',
    marginBottom: 4,
  },
  checkboxSubtext: {
    fontSize: 12,
    fontFamily: 'Nexa-ExtraLight',
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 16,
  },
});
