import express from 'express';
import {
    getDailyRevenue,
    getPopularRoutes,
    getBookingStats,
    getUtilizationReport,
    getAdminDashboard
} from '../controllers/reportController.js';
import { authenticate } from '../middleware/auth.js';
import { isAdmin } from '../middleware/roleCheck.js';
import { validate, dateRangeSchema } from '../middleware/validation.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.get('/popular-routes', getPopularRoutes);
// All report routes require admin authentication
router.use(authenticate, isAdmin, apiLimiter);

router.get('/dashboard', getAdminDashboard);
router.get('/daily-revenue', validate(dateRangeSchema), getDailyRevenue);
router.get('/booking-stats', validate(dateRangeSchema), getBookingStats);
router.get('/utilization', getUtilizationReport);

export default router;