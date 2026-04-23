import express from 'express';
import {
    createBus,
    getAllBuses,
    getBusById,
    updateBus,
    updateBusStatus,
    deleteBus
} from '../controllers/busController.js';
import { authenticate } from '../middleware/auth.js';
import { isAdmin } from '../middleware/roleCheck.js';
import { validate, busSchema, busUpdateSchema } from '../middleware/validation.js';
import { simpleAudit } from '../middleware/audit.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Public routes (view buses)
router.get('/', apiLimiter, getAllBuses);
router.get('/:id', apiLimiter, getBusById);

// Admin only routes
router.post('/', authenticate, isAdmin, validate(busSchema), simpleAudit('CREATE', 'bus'), createBus);
router.put('/:id', authenticate, isAdmin, validate(busUpdateSchema), simpleAudit('UPDATE', 'bus'), updateBus);
router.patch('/:id/status', authenticate, isAdmin, simpleAudit('UPDATE_STATUS', 'bus'), updateBusStatus);
router.delete('/:id', authenticate, isAdmin, simpleAudit('DELETE', 'bus'), deleteBus);

export default router;