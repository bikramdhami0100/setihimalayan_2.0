import express from 'express';
import {
    createSchedule,
    searchSchedules,
    getAllSchedules,
    getScheduleById,
    updateSchedule,
    cancelSchedule,
    getSeatLayout
} from '../controllers/scheduleController.js';
import { authenticate } from '../middleware/auth.js';
import { isAdmin } from '../middleware/roleCheck.js';
import { validate, scheduleSchema, scheduleUpdateSchema } from '../middleware/validation.js';
import { simpleAudit } from '../middleware/audit.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Public routes
router.get('/search', apiLimiter, searchSchedules);
router.get('/', apiLimiter, getAllSchedules);
router.get('/:id', apiLimiter, getScheduleById);
router.get('/:id/seats', apiLimiter, getSeatLayout);

// Admin only routes
router.post('/', authenticate, isAdmin, validate(scheduleSchema), simpleAudit('CREATE', 'schedule'), createSchedule);
router.put('/:id', authenticate, isAdmin, validate(scheduleUpdateSchema), simpleAudit('UPDATE', 'schedule'), updateSchedule);
router.post('/:id/cancel', authenticate, isAdmin, simpleAudit('CANCEL', 'schedule'), cancelSchedule);

export default router;