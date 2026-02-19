/**
 * 🎯 SKYLINE FLIGHT TRACKER - UNIFIED TYPE DEFINITIONS
 * Einheitliche Datenmodelle für saubere Datenbank-Integration
 */

// =============================================
// CORE ENTITIES
// =============================================

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Airport {
  id: string | number;
  name: string;
  iata: string | null;
  icao?: string | null;
  city: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
}

export type EmailProvider = 'gmail' | 'outlook' | 'yahoo' | 'imap';

export type AccountType = 'company' | 'worker';

export interface User {
  id: string;
  name: string;
  email: string;
  profileImage?: string;
  accountType?: AccountType;
  companyMemberships?: CompanyMember[];
  preferences: {
    theme: 'light' | 'dark';
    language: string;
    notifications: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Flight {
  id: string;
  userId: string;
  flightNumber?: string; // "OS87", "BA15", etc.
  airline?: string; // "Austrian Airlines", "British Airways", etc.
  from: Airport;
  to: Airport;
  date: string; // ISO date string
  // Local datetimes (no timezone) for reliable schedule + map positioning
  // Format: "YYYY-MM-DDTHH:mm:ss" (stored as Postgres TIMESTAMP WITHOUT TIME ZONE)
  departureAt?: string;
  arrivalAt?: string;
  duration?: string; // "2.5 hours"
  distance?: string; // "1234 km"
  distanceKm?: number; // numeric km for stats
  status: 'upcoming' | 'completed' | 'cancelled';
  confirmationCode?: string; // Booking confirmation code
  bookingReference?: string; // PNR/Booking reference
  seat?: string; // Seat number
  gate?: string; // Gate number
  terminal?: string; // Terminal
  images?: string[]; // Image URLs
  notes?: string;
  companyId?: string; // Company ID if this is a company flight (NULL for user flights)
  companyName?: string; // Optional display name for company flights
  createdAt: Date;
  updatedAt: Date;
}

// =============================================
// NOTES & CHECKLISTS
// =============================================

export type Purpose = 'business' | 'private';

export interface Note {
  id: string;
  profileId: string;
  flightId: string;
  purpose: Purpose;
  title: string;
  content: string;
  reminderAt?: string; // ISO timestamp
  createdAt: Date;
  updatedAt: Date;
}

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
  orderIndex: number;
}

export interface Checklist {
  id: string;
  profileId: string;
  flightId: string;
  purpose: Purpose;
  title: string;
  items: ChecklistItem[];
  reminderAt?: string; // ISO timestamp
  createdAt: Date;
  updatedAt: Date;
}

export interface NoteTemplate {
  id: string;
  profileId?: string | null;
  purpose: Purpose;
  title: string;
  content: string;
  isDefault?: boolean;
}

export interface ChecklistTemplateItem {
  text: string;
  orderIndex: number;
}

export interface ChecklistTemplate {
  id: string;
  profileId?: string | null;
  purpose: Purpose;
  title: string;
  items: ChecklistTemplateItem[];
}

// =============================================
// COMPANIES & MEMBERSHIPS (Business Travel)
// =============================================

export type CompanyRole = 'owner' | 'worker';

export interface Company {
  id: string;
  name: string;
  ownerProfileId?: string;
  createdAt: string; // ISO timestamp
  inviteCode?: string;
}

export interface CompanyMember {
  companyId: string;
  userId: string;
  role: CompanyRole;
  createdAt: string; // ISO timestamp
  company?: Pick<Company, 'id' | 'name' | 'inviteCode'>;
  user?: {
    fullName?: string | null;
    email?: string | null;
  };
}

// =============================================
// ANALYTICS & STATS
// =============================================

export interface UserStats {
  tripsTaken: number;
  countriesVisited: number;
  totalDistance: number; // in kilometers
  photosTaken: number;
  favoriteDestination?: string;
  averageTripDuration: number; // in hours
}

// =============================================
// ACHIEVEMENTS
// =============================================

export type AchievementId =
  | 'first-flight'
  | 'explorer-5-countries'
  | 'frequent-flyer-10'
  | 'distance-10k'
  | 'distance-50k'
  | 'red-eye-completed';

export interface Achievement {
  id: AchievementId;
  title: string;
  description: string;
  icon: string; // MaterialIcons name
}

export interface FlightFilters {
  status?: Flight['status'];
  dateFrom?: string;
  dateTo?: string;
  country?: string;
  limit?: number;
  offset?: number;
}

// =============================================
// API & EXTERNAL DATA
// =============================================

export interface FlightSchedule {
  flight_date: string;
  flight_status: string;
  departure: {
    airport: string;
    timezone: string;
    iata: string;
    icao: string;
    terminal: string;
    gate: string;
    delay: number;
    scheduled: string;
    estimated: string;
    actual: string;
    estimated_runway: string;
    actual_runway: string;
  };
  arrival: {
    airport: string;
    timezone: string;
    iata: string;
    icao: string;
    terminal: string;
    gate: string;
    baggage: string;
    delay: number;
    scheduled: string;
    estimated: string;
    actual: string;
    estimated_runway: string;
    actual_runway: string;
  };
  airline: {
    name: string;
    iata: string;
    icao: string;
  };
  flight: {
    number: string;
    iata: string;
    icao: string;
    codeshared: any;
  };
  aircraft: {
    registration: string;
    iata: string;
    icao: string;
    icao24: string;
  };
  live: {
    updated: string;
    latitude: number;
    longitude: number;
    altitude: number;
    direction: number;
    speed_horizontal: number;
    speed_vertical: number;
    is_ground: boolean;
  };
}

// =============================================
// FLIGHT DOCUMENTS
// =============================================

export type DocumentType = 'boarding_pass' | 'booking_confirmation' | 'receipt' | 'other';
export type FileType = 'pdf' | 'image' | 'other';

export interface FlightDocument {
  id: string;
  flightId: string;
  profileId: string;
  fileName: string;
  fileType: FileType;
  mimeType: string;
  fileSize: number;
  storagePath: string;
  storageBucket: string;
  publicUrl?: string;
  signedUrl?: string;
  signedUrlExpiresAt?: Date;
  documentType: DocumentType;
  isCached?: boolean;
  cachePath?: string;
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================
// UI & NAVIGATION
// =============================================

export interface Destination {
  id: string;
  name: string;
  country: string;
  image: string;
  description: string;
  tags: string[];
  coordinates: Coordinates;
}

export interface BoardingPassData {
  flightNumber: string;
  airline: string;
  from: {
    code: string;
    city: string;
    time: string;
  };
  to: {
    code: string;
    city: string;
    time: string;
  };
  passenger: {
    name: string;
    seat: string;
  };
  gate: string;
  terminal: string;
  date: string;
  boardingTime: string;
  class: string;
}

// =============================================
// FORM & INPUT TYPES
// =============================================

export interface CreateFlightData {
  companyId?: string; // Optional company ID for company flights
  from: Airport;
  to: Airport;
  date: string;
  departureAt?: string;
  arrivalAt?: string;
  flightNumber?: string;
  airline?: string;
  confirmationCode?: string;
  bookingReference?: string;
  seat?: string;
  gate?: string;
  terminal?: string;
  status?: 'upcoming' | 'completed' | 'cancelled';
  notes?: string;
  images?: string[];
  duration?: string;
  distance?: string;
  distanceKm?: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

// =============================================
// API RESPONSE TYPES
// =============================================

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// =============================================
// DATABASE OPERATIONS
// =============================================

export interface DatabaseService {
  // User Management
  createUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>;
  getUser(id: string): Promise<User | null>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  deleteUser(id: string): Promise<void>;

  // Flight Management
  createFlight(flight: Omit<Flight, 'id' | 'createdAt' | 'updatedAt'>): Promise<Flight>;
  getFlights(userId: string, filters?: FlightFilters): Promise<Flight[]>;
  getFlight(id: string): Promise<Flight | null>;
  updateFlight(id: string, updates: Partial<Flight>): Promise<Flight>;
  deleteFlight(id: string): Promise<void>;

  // Analytics
  getUserStats(userId: string): Promise<UserStats>;
  
  // Airports
  searchAirports(query: string, limit?: number): Promise<Airport[]>;
  getAirport(iata: string): Promise<Airport | null>;

  // Notes
  getNotes(flightId: string): Promise<Note[]>;
  createNote(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'profileId'>): Promise<Note>;
  updateNote(id: string, updates: Partial<Note>): Promise<Note>;
  deleteNote(id: string): Promise<void>;

  // Checklists
  getChecklists(flightId: string): Promise<Checklist[]>;
  createChecklist(
    data: Omit<Checklist, 'id' | 'items' | 'createdAt' | 'updatedAt' | 'profileId'>,
    items: Array<Omit<ChecklistItem, 'id'>>
  ): Promise<Checklist>;
  updateChecklist(
    id: string,
    updates: Partial<Omit<Checklist, 'id' | 'items' | 'createdAt' | 'updatedAt' | 'profileId'>>,
    items?: Array<Partial<ChecklistItem> & { id?: string }>
  ): Promise<Checklist>;
  toggleChecklistItem(checklistId: string, itemId: string, checked: boolean): Promise<void>;
  deleteChecklist(id: string): Promise<void>;

  // Templates
  getNoteTemplates(purpose: Purpose): Promise<NoteTemplate[]>;
  getChecklistTemplates(purpose: Purpose): Promise<ChecklistTemplate[]>;
  saveNoteTemplate(template: Omit<NoteTemplate, 'id'>): Promise<NoteTemplate>;
  saveChecklistTemplate(template: Omit<ChecklistTemplate, 'id'>): Promise<ChecklistTemplate>;
}

// =============================================
// STATE MANAGEMENT
// =============================================

export interface AppState {
  // Authentication
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Flights
  flights: Flight[];
  selectedFlight: Flight | null;
  flightStats: UserStats;

  // UI State
  error: string | null;
  theme: 'light' | 'dark';

  // Notes & Checklists
  notesByFlight?: Record<string, Note[]>;
  checklistsByFlight?: Record<string, Checklist[]>;
  checklistsLoadingByFlight?: Record<string, boolean>;
  checklistsLoadedByFlight?: Record<string, boolean>;
  templates?: { note: NoteTemplate[]; checklist: ChecklistTemplate[] };
}

export interface AppActions {
  // Authentication
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  initAuth: () => Promise<void>;

  // Flights
  addFlight: (flight: CreateFlightData) => Promise<void>;
  updateFlight: (id: string, updates: Partial<Flight>) => Promise<void>;
  deleteFlight: (id: string) => Promise<void>;
  loadFlights: () => Promise<void>;
  selectFlight: (flight: Flight | null) => void;
  recalculateFlightDistances: () => Promise<number | undefined>;

  // Achievements
  checkAndUnlockAchievements: () => Promise<Array<{ id: AchievementId; title: string }>>;

  // UI
  setError: (error: string | null) => void;
  setTheme: (theme: 'light' | 'dark') => void;

  // Internal helpers
  updateStats: () => void;

  // Notes
  loadNotesForFlight: (flightId: string) => Promise<void>;
  addNote: (flightId: string, data: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'profileId' | 'flightId'>) => Promise<Note>;
  updateNoteAction: (noteId: string, updates: Partial<Note>) => Promise<Note>;
  deleteNoteAction: (noteId: string) => Promise<void>;

  // Checklists
  loadChecklistsForFlight: (flightId: string) => Promise<void>;
  addChecklist: (
    flightId: string,
    data: Omit<Checklist, 'id' | 'items' | 'createdAt' | 'updatedAt' | 'profileId' | 'flightId'>,
    items: Array<Omit<ChecklistItem, 'id'>>
  ) => Promise<Checklist>;
  updateChecklistAction: (
    checklistId: string,
    updates: Partial<Omit<Checklist, 'id' | 'items' | 'createdAt' | 'updatedAt' | 'profileId'>>,
    items?: Array<Partial<ChecklistItem> & { id?: string }>,
    flightIdHint?: string
  ) => Promise<Checklist>;
  toggleChecklistItemAction: (checklistId: string, itemId: string, checked: boolean) => Promise<void>;
  deleteChecklistAction: (checklistId: string, flightIdHint?: string) => Promise<void>;

  // Templates
  loadTemplatesByPurpose: (purpose: Purpose) => Promise<void>;
}

// =============================================
// UTILITY TYPES
// =============================================

export type Nullable<T> = T | null;
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// =============================================
// CONSTANTS
// =============================================

export const FLIGHT_STATUSES = ['upcoming', 'completed', 'cancelled'] as const;
export const THEMES = ['light', 'dark'] as const;
export const LANGUAGES = ['en', 'de', 'fr', 'es'] as const;
