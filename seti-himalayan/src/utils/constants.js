import Constants from 'expo-constants';

// API Configuration
export const API_URL = Constants.expoConfig?.extra?.API_URL || 'http://localhost:5000/api';
export const SOCKET_URL = Constants.expoConfig?.extra?.SOCKET_URL || 'http://localhost:5000';

// Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  USER: 'user',
  ONBOARDING_COMPLETED: 'onboardingCompleted',
  NOTIFICATION_TOKEN: 'notificationToken',
};

// App Constants
export const APP_NAME = 'Seti Himalayan';
export const APP_TAGLINE = 'Tours & Travels';

// Booking Constants
export const SEAT_LOCK_DURATION = 5; // minutes
export const BOOKING_STATUS = {
  PENDING_PAYMENT: 'pending_payment',
  PAYMENT_PROCESSING: 'payment_processing',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
  REFUNDED: 'refunded',
};

export const BOOKING_STATUS_COLORS = {
  [BOOKING_STATUS.PENDING_PAYMENT]: '#F59E0B',
  [BOOKING_STATUS.PAYMENT_PROCESSING]: '#3B82F6',
  [BOOKING_STATUS.CONFIRMED]: '#10B981',
  [BOOKING_STATUS.CANCELLED]: '#EF4444',
  [BOOKING_STATUS.EXPIRED]: '#94A3B8',
  [BOOKING_STATUS.REFUNDED]: '#8B5CF6',
};

// Payment Gateways
export const PAYMENT_GATEWAYS = {
  ESEWA: 'esewa',
  KHALTI: 'khalti',
  CONNECTIPS: 'connectips',
};

// Pagination
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;

// Date Formats
export const DATE_FORMATS = {
  DISPLAY: 'DD MMM YYYY',
  DISPLAY_WITH_TIME: 'DD MMM YYYY, hh:mm A',
  API: 'YYYY-MM-DD',
  API_DATETIME: 'YYYY-MM-DD HH:mm:ss',
};

// Seat Status
export const SEAT_STATUS = {
  AVAILABLE: 'available',
  LOCKED: 'locked',
  BOOKED: 'booked',
  SELECTED: 'selected',
};

// User Roles
export const USER_ROLES = {
  PASSENGER: 'passenger',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
};