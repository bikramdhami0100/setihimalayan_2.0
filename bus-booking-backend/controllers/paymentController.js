import PaymentTransaction from '../models/PaymentTransaction.js';
import Booking from '../models/Booking.js';
import { initiateEsewaPayment, initiateKhaltiPayment, initiateConnectIPSPayment, verifyPayment } from '../services/paymentGateway.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { confirmBookingAfterPayment } from './bookingController.js';

export const initiatePayment = async (req, res, next) => {
    try {
        const { booking_id, gateway } = req.body;
        if (!booking_id || !gateway) return errorResponse(res, 'booking_id and gateway required', 400);
        
        const booking = await Booking.findById(booking_id);
        if (!booking) return errorResponse(res, 'Booking not found', 404);
        if (booking.user_id !== req.user.id) return errorResponse(res, 'Unauthorized', 403);
        if (booking.status !== 'pending_payment') return errorResponse(res, 'Booking not in pending payment state', 400);
        
        let paymentUrl, transactionId;
        const amount = booking.total_amount;
        const bookingRef = booking.booking_reference;
        
        switch (gateway) {
            case 'esewa':
                const esewaResult = await initiateEsewaPayment(amount, bookingRef, 'Bus Ticket');
                paymentUrl = esewaResult.payment_url;
                transactionId = esewaResult.transaction_id;
                break;
            case 'khalti':
                const khaltiResult = await initiateKhaltiPayment(amount, bookingRef);
                paymentUrl = khaltiResult.payment_url;
                transactionId = khaltiResult.transaction_id;
                break;
            case 'connectips':
                const connectResult = await initiateConnectIPSPayment(amount, bookingRef);
                paymentUrl = connectResult.payment_url;
                transactionId = connectResult.transaction_id;
                break;
            default:
                return errorResponse(res, 'Invalid gateway', 400);
        }
        
        // Create payment transaction record
        const txData = {
            booking_id,
            gateway,
            amount,
            request_payload: { booking_ref: bookingRef, amount },
            ip_address: req.ip,
            user_agent: req.headers['user-agent']
        };
        const txId = await PaymentTransaction.create(txData);
        if (transactionId) {
            await PaymentTransaction.updateStatus(txId, 'pending_verification', { transaction_id: transactionId, payment_url: paymentUrl });
        }
        
        successResponse(res, 'Payment initiated', { payment_url: paymentUrl, transaction_id: transactionId, payment_transaction_id: txId });
    } catch (err) {
        next(err);
    }
};

export const paymentSuccess = async (req, res, next) => {
    try {
        const { payment_transaction_id, gateway, transaction_id, ref_id } = req.query; // depends on gateway
        if (!payment_transaction_id) return errorResponse(res, 'Missing payment transaction ID', 400);
        
        const tx = await PaymentTransaction.findById(payment_transaction_id);
        if (!tx) return errorResponse(res, 'Payment transaction not found', 404);
        
        // Verify payment with gateway (stub)
        const verification = await verifyPayment(tx.gateway, { transaction_id: tx.transaction_id, ref_id });
        if (verification.success) {
            await PaymentTransaction.updateStatus(tx.id, 'success', { response_payload: verification, transaction_id: verification.transaction_id });
            // Confirm booking
            await confirmBookingAfterPayment(tx.booking_id, verification);
            successResponse(res, 'Payment successful, booking confirmed');
        } else {
            await PaymentTransaction.updateStatus(tx.id, 'failed', { error_message: verification.error });
            errorResponse(res, 'Payment verification failed', 400);
        }
    } catch (err) {
        next(err);
    }
};

export const paymentFailure = async (req, res, next) => {
    try {
        const { payment_transaction_id } = req.query;
        if (payment_transaction_id) {
            await PaymentTransaction.updateStatus(payment_transaction_id, 'failed', { error_message: 'User cancelled or payment failed' });
        }
        errorResponse(res, 'Payment failed or cancelled', 400);
    } catch (err) {
        next(err);
    }
};

export const paymentWebhook = async (req, res, next) => {
    try {
        // For gateways that send webhook notifications
        const { gateway, data } = req.body;
        // Validate and process
        // Similar to paymentSuccess
        res.status(200).json({ received: true });
    } catch (err) {
        next(err);
    }
};