/**
 * Generate a random string of specified length
 * @param {number} length - Length of string (default 8)
 * @returns {string}
 */
export const generateRandomString = (length = 8) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

/**
 * Generate a booking reference (e.g., BK-ABC123)
 * @returns {string}
 */
export const generateBookingReference = () => {
    const random = generateRandomString(6).toUpperCase();
    return `BK-${random}`;
};

/**
 * Truncate a string to max length
 * @param {string} str - Input string
 * @param {number} maxLength - Maximum length
 * @param {string} suffix - Suffix to add (default '...')
 * @returns {string}
 */
export const truncate = (str, maxLength = 50, suffix = '...') => {
    if (!str) return '';
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - suffix.length) + suffix;
};

/**
 * Capitalize first letter of each word
 * @param {string} str - Input string
 * @returns {string}
 */
export const capitalizeWords = (str) => {
    if (!str) return '';
    return str.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
};

/**
 * Slugify a string (for URLs)
 * @param {string} str - Input string
 * @returns {string}
 */
export const slugify = (str) => {
    if (!str) return '';
    return str
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
};