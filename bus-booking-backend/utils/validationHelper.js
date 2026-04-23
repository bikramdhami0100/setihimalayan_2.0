/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean}
 */
export const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
    return emailRegex.test(email);
};

/**
 * Validate phone number (Nepal format: 10 digits starting with 9)
 * @param {string} phone - Phone number to validate
 * @returns {boolean}
 */
export const isValidPhone = (phone) => {
    const phoneRegex = /^[9][0-9]{9}$/;
    return phoneRegex.test(phone);
};

/**
 * Validate password strength (min 6 chars, at least one letter and one number)
 * @param {string} password - Password to validate
 * @returns {boolean}
 */
export const isStrongPassword = (password) => {
    return password.length >= 6 && /[A-Za-z]/.test(password) && /[0-9]/.test(password);
};

/**
 * Validate if a value is a positive integer
 * @param {*} value - Value to check
 * @returns {boolean}
 */
export const isPositiveInteger = (value) => {
    const num = parseInt(value);
    return !isNaN(num) && Number.isInteger(num) && num > 0;
};

/**
 * Validate date string (YYYY-MM-DD)
 * @param {string} date - Date string
 * @returns {boolean}
 */
export const isValidDate = (date) => {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(date)) return false;
    const d = new Date(date);
    return d instanceof Date && !isNaN(d);
};