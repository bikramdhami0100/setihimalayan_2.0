import express from 'express';
import {
    initiatePayment,
    paymentSuccess,
    paymentFailure,
    paymentWebhook,
    checkPaymentStatus,
} from '../controllers/paymentController.js';
import { authenticate } from '../middleware/auth.js';
import { validate, paymentInitiateSchema } from '../middleware/validation.js';
import { paymentLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Protected routes
router.post('/initiate', authenticate, paymentLimiter, validate(paymentInitiateSchema), initiatePayment);

// Check payment status - allows polling from frontend
router.get('/status/:payment_transaction_id', checkPaymentStatus);

// Generic success/failure endpoints (for unified handling)
router.get('/success/:payment_transaction_id', paymentSuccess);  // Redirect from gateway
router.get('/failure/:payment_transaction_id', paymentFailure);  // Redirect from gateway

// Webhook (no auth, called by payment gateway)
router.post('/webhook', paymentWebhook);

export default router;