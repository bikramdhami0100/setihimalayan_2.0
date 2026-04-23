import express from 'express';
import {
    initiatePayment,
    paymentSuccess,
    paymentFailure,
    paymentWebhook
} from '../controllers/paymentController.js';
import { authenticate } from '../middleware/auth.js';
import { validate, paymentInitiateSchema } from '../middleware/validation.js';
import { paymentLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Protected routes
router.post('/initiate', authenticate, paymentLimiter, validate(paymentInitiateSchema), initiatePayment);
router.get('/success', paymentSuccess);  // Redirect from gateway
router.get('/failure', paymentFailure);  // Redirect from gateway

// Webhook (no auth, called by payment gateway)
router.post('/webhook', paymentWebhook);

export default router;