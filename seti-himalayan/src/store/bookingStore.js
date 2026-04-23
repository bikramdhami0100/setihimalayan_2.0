import { create } from 'zustand';
import * as bookingsApi from '../api/bookings';
import { SEAT_LOCK_DURATION } from '../utils/constants';

const useBookingStore = create((set, get) => ({
  currentBooking: null,
  selectedSeats: [],
  passengerDetails: null,
  isLoading: false,
  error: null,
  userBookings: [],
  totalBookings: 0,
  currentPage: 1,

  setSelectedSeats: (seats) => set({ selectedSeats: seats }),
  setPassengerDetails: (details) => set({ passengerDetails: details }),

  initiateBooking: async (scheduleId, selectedSeats, passengerDetails, specialRequests = '') => {
    set({ isLoading: true, error: null });
    try {
      const response = await bookingsApi.initiateBooking({
        schedule_id: scheduleId,
        selected_seats: selectedSeats,
        passenger_details: passengerDetails,
        special_requests: specialRequests,
      });
      const booking = response.data.data;
      set({ 
        currentBooking: booking, 
        selectedSeats: selectedSeats, 
        passengerDetails: passengerDetails,
        isLoading: false 
      });
      return { success: true, booking };
    } catch (error) {
      const message = error.response?.data?.message || 'Booking initiation failed';
      set({ error: message, isLoading: false });
      return { success: false, message };
    }
  },

  confirmBooking: async (bookingId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await bookingsApi.confirmBooking(bookingId);
      const confirmedBooking = response.data.data;
      set({ currentBooking: confirmedBooking, isLoading: false });
      return { success: true, booking: confirmedBooking };
    } catch (error) {
      const message = error.response?.data?.message || 'Booking confirmation failed';
      set({ error: message, isLoading: false });
      return { success: false, message };
    }
  },

  fetchUserBookings: async (page = 1, limit = 10) => {
    set({ isLoading: true, error: null });
    try {
      const response = await bookingsApi.getUserBookings(page, limit);
      const { data, pagination } = response.data;
      set({ 
        userBookings: data, 
        totalBookings: pagination?.total || data.length,
        currentPage: page,
        isLoading: false 
      });
      return { success: true, bookings: data };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to fetch bookings';
      set({ error: message, isLoading: false });
      return { success: false, message };
    }
  },

  getBookingByReference: async (reference) => {
    set({ isLoading: true, error: null });
    try {
      const response = await bookingsApi.getBookingByReference(reference);
      const booking = response.data.data.booking;
      set({ currentBooking: booking, isLoading: false });
      return { success: true, booking };
    } catch (error) {
      const message = error.response?.data?.message || 'Booking not found';
      set({ error: message, isLoading: false });
      return { success: false, message };
    }
  },

  cancelBooking: async (reference, reason) => {
    set({ isLoading: true, error: null });
    try {
      await bookingsApi.cancelBooking(reference, reason);
      set({ isLoading: false });
      // Refresh bookings list after cancel
      await get().fetchUserBookings(get().currentPage);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Cancellation failed';
      set({ error: message, isLoading: false });
      return { success: false, message };
    }
  },

  clearCurrentBooking: () => set({ currentBooking: null, selectedSeats: [], passengerDetails: null }),
  clearError: () => set({ error: null }),
}));

export default useBookingStore;