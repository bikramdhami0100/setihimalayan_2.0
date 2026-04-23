import moment from 'moment';

/**
 * Format a date to MySQL datetime format
 * @param {Date|string} date - Date object or string
 * @returns {string} MySQL datetime string
 */
export const toMySQLDateTime = (date) => {
    return moment(date).format('YYYY-MM-DD HH:mm:ss');
};

/**
 * Format a date to MySQL date format
 * @param {Date|string} date - Date object or string
 * @returns {string} MySQL date string
 */
export const toMySQLDate = (date) => {
    return moment(date).format('YYYY-MM-DD');
};

/**
 * Check if a date is in the past
 * @param {Date|string} date - Date to check
 * @returns {boolean}
 */
export const isPast = (date) => {
    return moment(date).isBefore(moment());
};

/**
 * Check if a date is in the future
 * @param {Date|string} date - Date to check
 * @returns {boolean}
 */
export const isFuture = (date) => {
    return moment(date).isAfter(moment());
};

/**
 * Calculate duration between two dates in minutes
 * @param {Date|string} start - Start date
 * @param {Date|string} end - End date
 * @returns {number} Duration in minutes
 */
export const getDurationMinutes = (start, end) => {
    return moment(end).diff(moment(start), 'minutes');
};

/**
 * Add minutes to a date
 * @param {Date|string} date - Base date
 * @param {number} minutes - Minutes to add
 * @returns {Date} New date
 */
export const addMinutes = (date, minutes) => {
    return moment(date).add(minutes, 'minutes').toDate();
};

/**
 * Get current date in MySQL datetime format
 * @returns {string}
 */
export const nowMySQL = () => {
    return toMySQLDateTime(new Date());
};

/**
 * Format date for display
 * @param {Date|string} date - Date to format
 * @param {string} format - Moment format string (optional)
 * @returns {string}
 */
export const formatDate = (date, format = 'DD MMM YYYY, hh:mm A') => {
    if (!date) return 'N/A';
    return moment(date).format(format);
};