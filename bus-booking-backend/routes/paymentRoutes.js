import express from 'express';
import {
    initiatePayment,
    paymentSuccess,
    paymentFailure,
    paymentWebhook,
    esewaPaymentSuccess,
    esewaPaymentFailure,
    checkPaymentStatus,
    testEsewaVerification,
    esewaPaymentForm
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
router.get('/success', paymentSuccess);  // Redirect from gateway
router.get('/failure', paymentFailure);  // Redirect from gateway

// eSewa specific endpoints (handles verification and booking confirmation/cancellation)
router.post('/esewa/success', esewaPaymentSuccess);  // eSewa success callback
router.get('/esewa/success', esewaPaymentSuccess);   // eSewa success callback (GET alternative)
router.post('/esewa/failure', esewaPaymentFailure);  // eSewa failure callback
router.get('/esewa/failure', esewaPaymentFailure);   // eSewa failure callback (GET alternative)
// router.get('/esewa/form', esewaPaymentForm);
// Debug/Test endpoint for eSewa verification (development only)
router.post('/esewa/test', testEsewaVerification);   // Test eSewa verification

// Webhook (no auth, called by payment gateway)
router.post('/webhook', paymentWebhook);

export default router;