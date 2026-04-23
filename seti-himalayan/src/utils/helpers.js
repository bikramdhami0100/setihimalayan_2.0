import moment from 'moment';
import { DATE_FORMATS } from './constants';

/**
 * Format date for display
 * @param {string|Date} date - Date to format
 * @param {string} format - Moment format string
 * @returns {string}
 */
export const formatDate = (date, format = DATE_FORMATS.DISPLAY_WITH_TIME) => {
  if (!date) return 'N/A';
  return moment(date).format(format);
};

/**
 * Format currency (Nepalese Rupee)
 * @param {number} amount - Amount in NPR
 * @returns {string}
 */
export const formatCurrency = (amount) => {
  return `NPR ${amount?.toLocaleString() || 0}`;
};

/**
 * Generate seat layout grid (rows x cols)
 * @param {number} totalSeats - Total number of seats
 * @param {number} cols - Number of columns (default 4)
 * @returns {Array} 2D array of seat numbers
 */
export const generateSeatGrid = (totalSeats, cols = 4) => {
  const rows = Math.ceil(totalSeats / cols);
  const grid = [];
  let seatNum = 1;
  for (let i = 0; i < rows; i++) {
    const row = [];
    for (let j = 0; j < cols; j++) {
      if (seatNum <= totalSeats) {
        row.push(seatNum.toString());
        seatNum++;
      } else {
        row.push(null);
      }
    }
    grid.push(row);
  }
  return grid;
};

/**
 * Get seat status (available, locked, booked, selected)
 * @param {string} seatNumber - Seat number
 * @param {Array} lockedSeats - Array of locked seat numbers
 * @param {Array} bookedSeats - Array of booked seat numbers
 * @param {Array} selectedSeats - Array of selected seat numbers
 * @returns {string}
 */
export const getSeatStatus = (seatNumber, lockedSeats = [], bookedSeats = [], selectedSeats = []) => {
  if (selectedSeats.includes(seatNumber)) return 'selected';
  if (bookedSeats.includes(seatNumber)) return 'booked';
  if (lockedSeats.includes(seatNumber)) return 'locked';
  return 'available';
};

/**
 * Get seat status color
 * @param {string} status - Seat status
 * @returns {string} Color code
 */
export const getSeatColor = (status) => {
  switch (status) {
    case 'available': return '#10B981';
    case 'locked': return '#F59E0B';
    case 'booked': return '#EF4444';
    case 'selected': return '#1E3A8A';
    default: return '#94A3B8';
  }
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean}
 */
export const isValidEmail = (email) => {
  const regex = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
  return regex.test(email);
};

/**
 * Validate phone number (Nepal: 10 digits starting with 9)
 * @param {string} phone - Phone number
 * @returns {boolean}
 */
export const isValidPhone = (phone) => {
  const regex = /^[9][0-9]{9}$/;
  return regex.test(phone);
};

/**
 * Truncate text
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string}
 */
export const truncateText = (text, maxLength = 50) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

/**
 * Get greeting based on time of day
 * @returns {string}
 */
export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
};

/**
 * Calculate age from date of birth
 * @param {string} dob - Date of birth (YYYY-MM-DD)
 * @returns {number}
 */
export const calculateAge = (dob) => {
  if (!dob) return null;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};