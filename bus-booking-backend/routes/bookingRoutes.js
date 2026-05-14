import express from 'express';
import {
    initiateBooking,
    confirmBooking,
    getUserBookings,
    getBookingDetails,
    cancelBooking,
    downloadTicket,
    getAllBookings,
    getBookingById,
    updateBooking,
    deleteBooking,
    createAdminBooking
} from '../controllers/bookingController.js';
import { authenticate } from '../middleware/auth.js';
import { validate, bookingSchema, cancelBookingSchema } from '../middleware/validation.js';
import { bookingLimiter } from '../middleware/rateLimiter.js';
import { simpleAudit } from '../middleware/audit.js';

const router = express.Router();

// All booking routes require authentication
router.use(authenticate);

router.post('/initiate', bookingLimiter, validate(bookingSchema), simpleAudit('INITIATE', 'booking'), initiateBooking);
router.post('/:booking_id/confirm', simpleAudit('CONFIRM', 'booking'), confirmBooking);
router.get('/my-bookings', getUserBookings);
router.get('/reference/:reference', getBookingDetails);
router.post('/:reference/cancel', validate(cancelBookingSchema), simpleAudit('CANCEL', 'booking'), cancelBooking);
// get booking by id 
// export const getBookingByReference = (reference) => api.get(`/bookings/reference/${reference}`);
router.get("/:id", getBookingById);
router.get('/:reference/ticket', downloadTicket);
router.get("/", getAllBookings); // Admin route to get all bookings with pagination and search
// Additional admin routes for booking management can be added here (e.g., update, delete)
// export const createBooking = (data) => api.post('/bookings', data);
// export const updateBooking = (id, data) => api.put(`/bookings/${id}`, data);
// export const deleteBooking = (id) => api.delete(`/bookings/${id}`);
router.post('/', simpleAudit('CREATE', 'booking'), createAdminBooking);
router.put('/:id', simpleAudit('UPDATE', 'booking'), updateBooking);
router.delete('/:id', simpleAudit('DELETE', 'booking'), deleteBooking);

export default router;