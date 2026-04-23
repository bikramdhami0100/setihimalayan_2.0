// User roles
export const USER_ROLES = {
    PASSENGER: 'passenger',
    ADMIN: 'admin',
    SUPER_ADMIN: 'super_admin'
};

// User statuses
export const USER_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    SUSPENDED: 'suspended'
};

// Booking statuses
export const BOOKING_STATUS = {
    PENDING_PAYMENT: 'pending_payment',
    PAYMENT_PROCESSING: 'payment_processing',
    CONFIRMED: 'confirmed',
    CANCELLED: 'cancelled',
    EXPIRED: 'expired',
    REFUNDED: 'refunded'
};

// Schedule statuses
export const SCHEDULE_STATUS = {
    SCHEDULED: 'scheduled',
    CANCELLED: 'cancelled',
    COMPLETED: 'completed',
    DELAYED: 'delayed'
};

// Bus types
export const BUS_TYPES = {
    STANDARD: 'Standard',
    LUXURY: 'Luxury',
    SLEEPER: 'Sleeper',
    MINI: 'Mini'
};

// Bus statuses
export const BUS_STATUS = {
    ACTIVE: 'active',
    MAINTENANCE: 'maintenance',
    RETIRED: 'retired'
};

// Payment gateways
export const PAYMENT_GATEWAY = {
    ESEWA: 'esewa',
    KHALTI: 'khalti',
    CONNECTIPS: 'connectips'
};

// Payment transaction statuses
export const PAYMENT_STATUS = {
    INITIATED: 'initiated',
    PENDING_VERIFICATION: 'pending_verification',
    SUCCESS: 'success',
    FAILED: 'failed',
    REFUNDED: 'refunded',
    CANCELLED: 'cancelled'
};

// API response messages
export const RESPONSE_MESSAGES = {
    // Auth
    LOGIN_SUCCESS: 'Login successful',
    LOGOUT_SUCCESS: 'Logout successful',
    REGISTER_SUCCESS: 'User registered successfully',
    INVALID_CREDENTIALS: 'Invalid email or password',
    ACCOUNT_INACTIVE: 'Account is inactive',
    TOKEN_EXPIRED: 'Token expired',
    TOKEN_INVALID: 'Invalid token',
    
    // Booking
    BOOKING_INITIATED: 'Booking initiated successfully',
    BOOKING_CONFIRMED: 'Booking confirmed successfully',
    BOOKING_CANCELLED: 'Booking cancelled successfully',
    BOOKING_NOT_FOUND: 'Booking not found',
    SEATS_UNAVAILABLE: 'Selected seats are not available',
    
    // Payment
    PAYMENT_INITIATED: 'Payment initiated',
    PAYMENT_SUCCESS: 'Payment successful',
    PAYMENT_FAILED: 'Payment failed',
    
    // CRUD
    CREATED: (entity) => `${entity} created successfully`,
    UPDATED: (entity) => `${entity} updated successfully`,
    DELETED: (entity) => `${entity} deleted successfully`,
    NOT_FOUND: (entity) => `${entity} not found`,
    
    // Validation
    VALIDATION_ERROR: 'Validation error',
    
    // Server
    INTERNAL_ERROR: 'Internal server error'
};

// Seat lock duration in minutes (fallback)
export const DEFAULT_SEAT_LOCK_MINUTES = 5;

// Pagination defaults
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 100;

// Date formats
export const DATE_FORMATS = {
    DATE: 'YYYY-MM-DD',
    DATETIME: 'YYYY-MM-DD HH:mm:ss',
    DISPLAY_DATE: 'DD MMM YYYY',
    DISPLAY_DATETIME: 'DD MMM YYYY, hh:mm A'
};