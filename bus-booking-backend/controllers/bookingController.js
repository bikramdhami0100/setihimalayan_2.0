import Schedule from '../models/Schedule.js';
import Booking from '../models/Booking.js';
import SeatLock from '../models/SeatLock.js';
import User from '../models/User.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { sendBookingConfirmation } from '../services/emailService.js';
import { generateTicketPDF } from '../services/pdfService.js';
import pool from '../config/database.js';
import { getIO } from '../config/socket.js';

export const initiateBooking = async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        
        const { schedule_id, selected_seats, passenger_details, special_requests } = req.body;
        
        // Get schedule details
        const schedule = await Schedule.findById(schedule_id);
        if (!schedule || schedule.status !== 'scheduled') {
            return errorResponse(res, 'Schedule not available for booking', 400);
        }
        
        // Check seat availability
        const lockedSeats = await SeatLock.getLockedSeats(schedule_id);
        // Get confirmed booked seats
        const [bookedRows] = await connection.execute(
            `SELECT selected_seats FROM bookings WHERE schedule_id = ? AND status = 'confirmed' AND deleted_at IS NULL`,
            [schedule_id]
        );
        const bookedSeats = bookedRows.flatMap(row => JSON.parse(row.selected_seats));
        
        const unavailable = selected_seats.filter(seat => lockedSeats.includes(seat) || bookedSeats.includes(seat));
        if (unavailable.length > 0) {
            return errorResponse(res, `Seats ${unavailable.join(', ')} are not available`, 400);
        }
        
        const totalAmount = schedule.base_price * selected_seats.length;
        const lockExpiry = new Date(Date.now() + (process.env.SEAT_LOCK_MINUTES || 5) * 60 * 1000);
        
        // Create booking
        const booking = await Booking.create({
            user_id: req.user.id,
            schedule_id,
            selected_seats,
            total_amount: totalAmount,
            passenger_details,
            special_requests,
            seat_lock_expires_at: lockExpiry
        });
        
        // Create seat locks
        for (const seat of selected_seats) {
            await SeatLock.createLock(schedule_id, seat, booking.id, req.user.id, lockExpiry);
        }
        
        await connection.commit();
        
        // Emit socket event for seat lock (real-time update)
        const io = getIO();
        io.to(`schedule-${schedule_id}`).emit('seats-locked', { seats: selected_seats, expires_at: lockExpiry });
        
        successResponse(res, 'Booking initiated. Proceed to payment.', {
            booking_id: booking.id,
            booking_reference: booking.booking_reference,
            total_amount: totalAmount,
            expires_at: lockExpiry
        });
    } catch (err) {
        await connection.rollback();
        next(err);
    } finally {
        connection.release();
    }
};

export const confirmBooking = async (req, res, next) => {
    try {
        const { booking_id } = req.params;
        const booking = await Booking.findById(booking_id);
        if (!booking) return errorResponse(res, 'Booking not found', 404);
        
        if (booking.user_id !== req.user.id && req.user.role === 'passenger') {
            return errorResponse(res, 'Unauthorized', 403);
        }
        
        if (booking.status !== 'pending_payment') {
            return errorResponse(res, `Booking cannot be confirmed. Current status: ${booking.status}`, 400);
        }
        
        // Simulate payment success (in real system, payment gateway would call webhook)
        // Here we'll just confirm directly for demo
        await Booking.updateStatus(booking_id, 'confirmed', { confirmed_at: new Date() });
        await SeatLock.releaseAllByBooking(booking_id);
        
        // Update schedule available seats
        const seatCount = booking.selected_seats.length;
        await Schedule.updateAvailableSeats(booking.schedule_id, -seatCount);
        
        // Generate PDF ticket
        const schedule = await Schedule.findById(booking.schedule_id);
        const user = await User.findById(booking.user_id);
        const pdfBuffer = await generateTicketPDF(booking, schedule, user);
        
        // Send email with ticket
        await sendBookingConfirmation(user.email, booking, pdfBuffer);
        
        // Emit socket event: seats booked
        const io = getIO();
        io.to(`schedule-${booking.schedule_id}`).emit('seats-booked', { seats: booking.selected_seats });
        
        successResponse(res, 'Booking confirmed successfully', {
            booking_reference: booking.booking_reference,
            ticket_download_url: `/api/bookings/${booking.booking_reference}/ticket`
        });
    } catch (err) {
        next(err);
    }
};

export const getUserBookings = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        
        const bookings = await Booking.getUserBookings(req.user.id, limit, offset);
        successResponse(res, 'User bookings', { bookings, page, limit });
    } catch (err) {
        next(err);
    }
};

export const getBookingDetails = async (req, res, next) => {
    try {
        const booking = await Booking.findByReference(req.params.reference);
        if (!booking) return errorResponse(res, 'Booking not found', 404);
        
        if (booking.user_id !== req.user.id && req.user.role === 'passenger') {
            return errorResponse(res, 'Unauthorized', 403);
        }
        
        successResponse(res, 'Booking details', { booking });
    } catch (err) {
        next(err);
    }
};

export const cancelBooking = async (req, res, next) => {
    try {
        const booking = await Booking.findByReference(req.params.reference);
        if (!booking) return errorResponse(res, 'Booking not found', 404);
        
        if (booking.user_id !== req.user.id && req.user.role === 'passenger') {
            return errorResponse(res, 'Unauthorized', 403);
        }
        
        if (booking.status !== 'confirmed' && booking.status !== 'pending_payment') {
            return errorResponse(res, `Booking cannot be cancelled. Status: ${booking.status}`, 400);
        }
        
        const { cancellation_reason } = req.body;
        let refundAmount = null;
        if (booking.status === 'confirmed') {
            // Calculate refund based on cancellation policy (e.g., 80% if within 24h)
            refundAmount = booking.total_amount * 0.8; // example
        }
        
        await Booking.cancelBooking(booking.id, cancellation_reason, refundAmount);
        
        // Release locks if pending_payment
        if (booking.status === 'pending_payment') {
            await SeatLock.releaseAllByBooking(booking.id);
        }
        
        // Emit socket event
        const io = getIO();
        io.to(`schedule-${booking.schedule_id}`).emit('seats-released', { seats: booking.selected_seats });
        
        successResponse(res, 'Booking cancelled', { refund_amount: refundAmount });
    } catch (err) {
        next(err);
    }
};

export const downloadTicket = async (req, res, next) => {
    try {
        const booking = await Booking.findByReference(req.params.reference);
        if (!booking) return errorResponse(res, 'Booking not found', 404);
        
        if (booking.user_id !== req.user.id && req.user.role === 'passenger') {
            return errorResponse(res, 'Unauthorized', 403);
        }
        
        if (booking.status !== 'confirmed') {
            return errorResponse(res, 'Ticket available only for confirmed bookings', 400);
        }
        
        const schedule = await Schedule.findById(booking.schedule_id);
        const user = await User.findById(booking.user_id);
        const pdfBuffer = await generateTicketPDF(booking, schedule, user);
        
        await Booking.markTicketDownloaded(booking.id);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=ticket-${booking.booking_reference}.pdf`);
        res.send(pdfBuffer);
    } catch (err) {
        next(err);
    }
};
// get all bookings (admin)
export const getAllBookings = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, search } = req.query;
        const offset = (page - 1) * limit;  
        const { bookings, total } = await Booking.findAll({ page, limit, search });
        successResponse(res, 'Bookings retrieved', { 
            bookings,   
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        next(err);
    }
}

// Add this function to the existing bookingController.js

/**
 * Confirm booking after successful payment (called from paymentController)
 * @param {number} bookingId - Booking ID
 * @param {Object} paymentDetails - Payment verification details
 * @returns {Promise<Object>} Updated booking
 */
export const confirmBookingAfterPayment = async (bookingId, paymentDetails) => {
    const booking = await Booking.findById(bookingId);
    if (!booking) throw new Error('Booking not found');
    if (booking.status !== 'pending_payment') throw new Error(`Booking cannot be confirmed. Status: ${booking.status}`);
    
    await Booking.updateStatus(bookingId, 'confirmed', { confirmed_at: new Date() });
    await SeatLock.releaseAllByBooking(bookingId);
    
    // Update schedule available seats
    const seatCount = booking.selected_seats.length;
    await Schedule.updateAvailableSeats(booking.schedule_id, -seatCount);
    
    // Generate PDF and send email
    const schedule = await Schedule.findById(booking.schedule_id);
    const user = await User.findById(booking.user_id);
    const pdfBuffer = await generateTicketPDF(booking, schedule, user);
    await sendBookingConfirmation(user.email, booking, pdfBuffer);
    
    // Real-time seat update via Socket.IO
    const io = getIO();
    io.to(`schedule-${booking.schedule_id}`).emit('seats-booked', { seats: booking.selected_seats });
    
    return booking;
};