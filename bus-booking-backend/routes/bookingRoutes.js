import express from 'express';
import {
    initiateBooking,
    confirmBooking,
    getUserBookings,
    getBookingDetails,
    cancelBooking,
    downloadTicket
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
router.get('/:reference/ticket', downloadTicket);

export default router;