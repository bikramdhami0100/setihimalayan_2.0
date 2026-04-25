import React, { createContext, useState } from 'react';
import * as bookingsApi from '../api/bookings';

export const BookingContext = createContext();

export const BookingProvider = ({ children }) => {
  const [currentBooking, setCurrentBooking] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [passengerDetails, setPassengerDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userBookings, setUserBookings] = useState([]);
  const [totalBookings, setTotalBookings] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const initiateBooking = async (scheduleId, seats, details, specialRequests = '') => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await bookingsApi.initiateBooking({
        schedule_id: scheduleId,
        selected_seats: seats,
        passenger_details: details,
        special_requests: specialRequests,
      });
      const booking = response.data.data;
      setCurrentBooking(booking);
      setSelectedSeats(seats);
      setPassengerDetails(details);
      setIsLoading(false);
      return { success: true, booking };
    } catch (err) {
      const message = err.response?.data?.message || 'Booking initiation failed';
      setError(message);
      setIsLoading(false);
      return { success: false, message };
    }
  };

  const confirmBooking = async (bookingId) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await bookingsApi.confirmBooking(bookingId);
      const confirmedBooking = response.data.data;
      setCurrentBooking(confirmedBooking);
      setIsLoading(false);
      return { success: true, booking: confirmedBooking };
    } catch (err) {
      const message = err.response?.data?.message || 'Booking confirmation failed';
      setError(message);
      setIsLoading(false);
      return { success: false, message };
    }
  };

  const fetchUserBookings = async (page = 1, limit = 10) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await bookingsApi.getUserBookings(page, limit);
      const { data, pagination } = response.data;
      setUserBookings(data);
      setTotalBookings(pagination?.total || data.length);
      setCurrentPage(page);
      setIsLoading(false);
      return { success: true, bookings: data };
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to fetch bookings';
      setError(message);
      setIsLoading(false);
      return { success: false, message };
    }
  };

  const getBookingByReference = async (reference) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await bookingsApi.getBookingByReference(reference);
      const booking = response.data.data.booking;
      setCurrentBooking(booking);
      setIsLoading(false);
      return { success: true, booking };
    } catch (err) {
      const message = err.response?.data?.message || 'Booking not found';
      setError(message);
      setIsLoading(false);
      return { success: false, message };
    }
  };

  const cancelBooking = async (reference, reason) => {
    setIsLoading(true);
    setError(null);
    try {
      await bookingsApi.cancelBooking(reference, reason);
      setIsLoading(false);
      await fetchUserBookings(currentPage);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Cancellation failed';
      setError(message);
      setIsLoading(false);
      return { success: false, message };
    }
  };

  const clearCurrentBooking = () => {
    setCurrentBooking(null);
    setSelectedSeats([]);
    setPassengerDetails(null);
  };

  const clearError = () => setError(null);
  
  // Handlers for socket events or general updates
  const addLockedSeat = (seat) => {
    setSelectedSeats((prev) => [...prev, seat]); // Not fully correct logic for external locks, but mimics previous
  };
  
  const removeLockedSeat = (seat) => {
    setSelectedSeats((prev) => prev.filter(s => s !== seat));
  };

  return (
    <BookingContext.Provider
      value={{
        currentBooking,
        selectedSeats,
        passengerDetails,
        isLoading,
        error,
        userBookings,
        totalBookings,
        currentPage,
        initiateBooking,
        confirmBooking,
        fetchUserBookings,
        getBookingByReference,
        cancelBooking,
        clearCurrentBooking,
        setSelectedSeats,
        setPassengerDetails,
        clearError,
        addLockedSeat,
        removeLockedSeat
      }}
    >
      {children}
    </BookingContext.Provider>
  );
};
