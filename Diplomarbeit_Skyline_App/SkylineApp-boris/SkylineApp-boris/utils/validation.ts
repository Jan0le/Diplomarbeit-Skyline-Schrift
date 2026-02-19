// =============================================
// VALIDATION UTILITIES
// =============================================

export interface ValidationResult {
  isValid: boolean;
  errors: { [key: string]: string };
}

export interface FlightValidationData {
  flightNumber: string;
  airline: string;
  fromAirport: any;
  toAirport: any;
  date: Date;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  distance: string;
  notes: string;
}

// =============================================
// FLIGHT VALIDATION
// =============================================

export const validateFlightForm = (data: FlightValidationData): ValidationResult => {
  const errors: { [key: string]: string } = {};

  // Flight Number validation
  if (!data.flightNumber.trim()) {
    errors.flightNumber = 'Flight number is required';
  }

  // Airline validation
  if (!data.airline.trim()) {
    errors.airline = 'Airline is required';
  } else if (data.airline.trim().length < 2) {
    errors.airline = 'Airline name too short';
  }

  // Airport validation
  if (!data.fromAirport) {
    errors.fromAirport = 'Departure airport is required';
  }
  
  if (!data.toAirport) {
    errors.toAirport = 'Arrival airport is required';
  }

  // Allow same airport (e.g., helicopter tours, training flights, sightseeing)

  // Date validation
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selectedDate = new Date(data.date);
  selectedDate.setHours(0, 0, 0, 0);
  
  if (selectedDate < today) {
    // Allow past dates but warn for very old dates
    const daysDiff = Math.floor((today.getTime() - selectedDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 365) {
      errors.date = 'Flight date is more than a year ago';
    }
  }

  // Time validation
  if (!data.departureTime.trim()) {
    errors.departureTime = 'Departure time is required';
  } else if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(data.departureTime.trim())) {
    errors.departureTime = 'Invalid time format (use HH:MM)';
  }

  if (!data.arrivalTime.trim()) {
    errors.arrivalTime = 'Arrival time is required';
  } else if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(data.arrivalTime.trim())) {
    errors.arrivalTime = 'Invalid time format (use HH:MM)';
  }

  // Duration validation (optional but if provided, should be valid)
  if (data.duration.trim() && !/^([0-9]{1,2}h\s?)?([0-9]{1,2}m)?$/i.test(data.duration.trim())) {
    errors.duration = 'Invalid duration format (e.g., 2h 30m, 45m)';
  }

  // Distance validation (optional but if provided, should be valid)
  // Accepts 1234 km, 1,234 km, 1.234 km, 1 234 km (NBSP), with km/mi units
  if (
    data.distance.trim() &&
    !/^(?:\d{1,3}(?:[ ,\.\u00A0]\d{3})*|\d+)\s?(km|mi)$/i.test(data.distance.trim())
  ) {
    errors.distance = 'Invalid distance format (e.g., 1,234 km or 1.234 km)';
  }

  // Notes validation (optional, but limit length)
  if (data.notes.length > 500) {
    errors.notes = 'Notes cannot exceed 500 characters';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// =============================================
// EMAIL VALIDATION
// =============================================

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

// =============================================
// PASSWORD VALIDATION
// =============================================

export const validatePassword = (password: string): ValidationResult => {
  const errors: { [key: string]: string } = {};

  if (password.length < 8) {
    errors.password = 'Password must be at least 8 characters long';
  } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    errors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// =============================================
// GENERAL TEXT VALIDATION
// =============================================

export const validateRequired = (value: string, fieldName: string): string | null => {
  if (!value || !value.trim()) {
    return `${fieldName} is required`;
  }
  return null;
};

export const validateMinLength = (value: string, minLength: number, fieldName: string): string | null => {
  if (value && value.trim().length < minLength) {
    return `${fieldName} must be at least ${minLength} characters`;
  }
  return null;
};

export const validateMaxLength = (value: string, maxLength: number, fieldName: string): string | null => {
  if (value && value.length > maxLength) {
    return `${fieldName} cannot exceed ${maxLength} characters`;
  }
  return null;
};
