import { useEffect, useContext } from 'react';
import { BookingContext } from '../context/BookingContext';
import { UIContext } from '../context/UIContext';

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
    initiateBooking: initiateBookingCtx,
    confirmBooking: confirmBookingCtx,
    fetchUserBookings: fetchUserBookingsCtx,
    getBookingByReference: getBookingByReferenceCtx,
    cancelBooking: cancelBookingCtx,
    clearCurrentBooking,
    setSelectedSeats,
    setPassengerDetails,
    clearError,
  } = useContext(BookingContext);
  const { showSnackbar } = useContext(UIContext);

  useEffect(() => {
    if (error) {
      showSnackbar(error, 'error');
      clearError();
    }
  }, [error]);

  const initiate = async (scheduleId, seats, details, requests) => {
    const result = await initiateBookingCtx(scheduleId, seats, details, requests);
    if (result.success) {
      showSnackbar('Booking initiated! Proceed to payment.', 'success');
    } else {
      showSnackbar(result.message, 'error');
    }
    return result;
  };

  const confirm = async (bookingId) => {
    const result = await confirmBookingCtx(bookingId);
    if (result.success) {
      showSnackbar('Booking confirmed! Ticket sent to email.', 'success');
    } else {
      showSnackbar(result.message, 'error');
    }
    return result;
  };

  const fetchBookings = async (page, limit) => {
    await fetchUserBookingsCtx(page, limit);
  };

  const getBooking = async (reference) => {
    const result = await getBookingByReferenceCtx(reference);
    if (!result.success) {
      showSnackbar(result.message, 'error');
    }
    return result;
  };

  const cancel = async (reference, reason) => {
    const result = await cancelBookingCtx(reference, reason);
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