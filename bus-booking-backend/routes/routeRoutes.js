import express from 'express';
import {
    createRoute,
    getAllRoutes,
    getRouteById,
    searchRoutes,
    updateRoute,
    toggleRouteActive,
    deleteRoute
} from '../controllers/routeController.js';
import { authenticate } from '../middleware/auth.js';
import { isAdmin } from '../middleware/roleCheck.js';
import { validate, routeSchema, routeUpdateSchema } from '../middleware/validation.js';
import { simpleAudit } from '../middleware/audit.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Public routes
router.get('/', apiLimiter, getAllRoutes);
router.get('/search', apiLimiter, searchRoutes);
router.get('/:id', apiLimiter, getRouteById);

// Admin only routes
router.post('/', authenticate, isAdmin, validate(routeSchema), simpleAudit('CREATE', 'route'), createRoute);
router.put('/:id', authenticate, isAdmin, validate(routeUpdateSchema), simpleAudit('UPDATE', 'route'), updateRoute);
router.patch('/:id/toggle', authenticate, isAdmin, simpleAudit('TOGGLE', 'route'), toggleRouteActive);
router.delete('/:id', authenticate, isAdmin, simpleAudit('DELETE', 'route'), deleteRoute);

export default router;