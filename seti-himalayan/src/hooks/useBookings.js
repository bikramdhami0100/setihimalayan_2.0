import { useEffect, useState } from 'react';
import useBookingStore from '../store/bookingStore';
import useUIStore from '../store/uiStore';

export const useBookings = () => {
  const {
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
  } = useBookingStore();
  const { showSnackbar } = useUIStore();

  useEffect(() => {
    if (error) {
      showSnackbar(error, 'error');
      clearError();
    }
  }, [error]);

  const initiate = async (scheduleId, seats, details, requests) => {
    const result = await initiateBooking(scheduleId, seats, details, requests);
    if (result.success) {
      showSnackbar('Booking initiated! Proceed to payment.', 'success');
    } else {
      showSnackbar(result.message, 'error');
    }
    return result;
  };

  const confirm = async (bookingId) => {
    const result = await confirmBooking(bookingId);
    if (result.success) {
      showSnackbar('Booking confirmed! Ticket sent to email.', 'success');
    } else {
      showSnackbar(result.message, 'error');
    }
    return result;
  };

  const fetchBookings = async (page, limit) => {
    await fetchUserBookings(page, limit);
  };

  const getBooking = async (reference) => {
    const result = await getBookingByReference(reference);
    if (!result.success) {
      showSnackbar(result.message, 'error');
    }
    return result;
  };

  const cancel = async (reference, reason) => {
    const result = await cancelBooking(reference, reason);
    if (result.success) {
      showSnackbar('Booking cancelled successfully', 'success');
    } else {
      showSnackbar(result.message, 'error');
    }
    return result;
  };

  return {
    currentBooking,
    selectedSeats,
    passengerDetails,
    isLoading,
    userBookings,
    totalBookings,
    currentPage,
    initiateBooking: initiate,
    confirmBooking: confirm,
    fetchUserBookings: fetchBookings,
    getBookingByReference: getBooking,
    cancelBooking: cancel,
    clearCurrentBooking,
    setSelectedSeats,
    setPassengerDetails,
  };
};