import PaymentTransaction from '../models/PaymentTransaction.js';
import Booking from '../models/Booking.js';
import { initiateEsewaPayment, initiateKhaltiPayment, initiateConnectIPSPayment, verifyPayment, verifyEsewaPayment } from '../services/paymentGateway.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { confirmBookingAfterPayment } from './bookingController.js';
import logger from '../utils/logger.js';

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
        
        // Create payment transaction record first
        const txData = {
            booking_id,
            gateway,
            amount,
            request_payload: { booking_ref: bookingRef, amount },
            ip_address: req.ip,
            user_agent: req.headers['user-agent']
        };
        const txId = await PaymentTransaction.create(txData);
        let esewaResult, khaltiResult, connectResult;
        switch (gateway) {
            case 'esewa':
                esewaResult = await initiateEsewaPayment(amount, bookingRef, 'Bus Ticket', txId);
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
        
        // Update payment transaction with transaction ID
        if (transactionId) {
            await PaymentTransaction.updateStatus(txId, 'pending_verification', { transaction_id: transactionId, payment_url: paymentUrl });
        }
        
        successResponse(res, 'Payment initiated', {esewaResult, khaltiResult, connectResult});
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

/**
 * eSewa specific success callback handler
 * Called when eSewa redirects back after successful payment
 * eSewa sends: oid (order ID), amt (amount), rid (reference ID), refId
 * Handles verification and booking confirmation
 * Supports: ?is_api=true for mobile apps, otherwise redirects for web browsers
 */
export const esewaPaymentSuccess = async (req, res, next) => {
    try {
        const { payment_transaction_id, is_api } = req.query;
        
        // eSewa sends response in query params: oid, amt, rid, refId
        const oid = req.query.oid || req.body.oid;
        const amt = req.query.amt || req.body.amt;
        const rid = req.query.rid || req.body.rid;
        const refId = req.query.refId || req.body.refId;

        logger.info(`eSewa Success Callback Received:`);
        logger.info(`  - Payment Transaction ID: ${payment_transaction_id}`);
        logger.info(`  - Order ID (oid): ${oid}`);
        logger.info(`  - Amount (amt): ${amt}`);
        logger.info(`  - Reference ID (rid): ${rid}`);
        logger.info(`  - Ref ID: ${refId}`);
        logger.info(`  - Is API Call: ${is_api}`);

        if (!payment_transaction_id) {
            logger.error('Missing payment_transaction_id in success callback');
            return res.redirect(`${process.env.FRONTEND_URL}/payment/failure?error=missing_transaction_id`);
        }

        const tx = await PaymentTransaction.findById(payment_transaction_id);
        if (!tx) {
            logger.error(`Payment transaction not found: ${payment_transaction_id}`);
            return res.redirect(`${process.env.FRONTEND_URL}/payment/failure?error=transaction_not_found&payment_transaction_id=${payment_transaction_id}`);
        }

        try {
            // ✅ Verify payment with eSewa API
            logger.info(`Verifying eSewa payment with parameters: amt=${amt}, pid=${oid}, rid=${rid}`);
            
            const isVerified = await verifyEsewaPayment({
                amt: amt || tx.amount,
                pid: oid || tx.request_payload?.booking_ref,
                rid: rid || refId
            });

            if (isVerified.success) {
                // ✅ CONFIRM BOOKING - Payment verified successfully
                logger.info(`✅ eSewa payment verified successfully for transaction ${payment_transaction_id}`);
                logger.info(`   - Verified Transaction ID: ${isVerified.transaction_id}`);
                logger.info(`   - Amount: ${isVerified.amount}`);
                
                await PaymentTransaction.updateStatus(tx.id, 'success', {
                    response_payload: isVerified,
                    transaction_id: isVerified.transaction_id || rid,
                    refId: isVerified.refId || rid
                });

                // Confirm the booking
                await confirmBookingAfterPayment(tx.booking_id, isVerified);

                logger.info(`✅ Booking ${tx.booking_id} confirmed after successful eSewa payment`);
                
                // Support both API response (for mobile apps) and redirects (for web browsers)
                if (is_api === 'true') {
                    // Return JSON response for API/mobile clients
                    return successResponse(res, '✅ Payment verified and booking confirmed', {
                        payment_transaction_id,
                        transaction_id: isVerified.transaction_id,
                        booking_id: tx.booking_id,
                        amount: isVerified.amount,
                        status: 'success'
                    });
                } else {
                    // Redirect for web browsers
                    return res.redirect(`${process.env.FRONTEND_URL}/payment/success?payment_transaction_id=${payment_transaction_id}&gateway=esewa&transaction_id=${isVerified.transaction_id}`);
                }
            } else {
                // ❌ CANCEL BOOKING - Verification failed
                logger.warn(`❌ eSewa payment verification failed: ${isVerified.error}`);
                throw new Error(`Verification failed: ${isVerified.error}`);
            }
        } catch (verificationError) {
            logger.error(`❌ eSewa payment verification error: ${verificationError.message}`);
            
            await PaymentTransaction.updateStatus(tx.id, 'failed', {
                error_message: verificationError.message,
                response_payload: { error: verificationError.message, oid, amt, rid }
            });

            // Cancel the booking if still pending
            const booking = await Booking.findById(tx.booking_id);
            if (booking && booking.status === 'pending_payment') {
                await Booking.updateStatus(tx.booking_id, 'cancelled', {
                    cancellation_reason: `Payment verification failed: ${verificationError.message}`,
                    cancelled_at: new Date()
                });
                logger.warn(`❌ Booking ${tx.booking_id} cancelled due to verification failure`);
            }

            // Support both API response and redirects
            if (is_api === 'true') {
                return errorResponse(res, `❌ Payment verification failed: ${verificationError.message}`, 400);
            } else {
                return res.redirect(`${process.env.FRONTEND_URL}/payment/failure?error=${encodeURIComponent(verificationError.message)}&payment_transaction_id=${payment_transaction_id}&gateway=esewa`);
            }
        }
    } catch (err) {
        logger.error(`❌ Unexpected error in esewaPaymentSuccess: ${err.message}`);
        const ptId = req.query.payment_transaction_id;
        
        // Support both API response and redirects
        if (is_api === 'true') {
            return errorResponse(res, `❌ Unexpected error: ${err.message}`, 500);
        } else {
            return res.redirect(`${process.env.FRONTEND_URL}/payment/failure?error=${encodeURIComponent(err.message)}&payment_transaction_id=${ptId}`);
        }
    }
};

/**
 * eSewa specific failure callback handler
 * Called when user cancels payment or payment fails
 * eSewa redirects here with payment_transaction_id in query params
 * Supports: ?is_api=true for mobile apps, otherwise redirects for web browsers
 */
export const esewaPaymentFailure = async (req, res, next) => {
    try {
        const { payment_transaction_id, is_api } = req.query;
        const errorReason = req.query.error || req.body.error || 'User cancelled or payment failed';

        logger.warn(`eSewa Failure Callback Received:`);
        logger.warn(`  - Payment Transaction ID: ${payment_transaction_id}`);
        logger.warn(`  - Error Reason: ${errorReason}`);
        logger.warn(`  - Is API Call: ${is_api}`);
        logger.warn(`  - Full Query Params: ${JSON.stringify(req.query)}`);

        if (!payment_transaction_id) {
            logger.error('Missing payment_transaction_id in failure callback');
            if (is_api === 'true') {
                return errorResponse(res, 'Missing payment transaction ID', 400);
            }
            return res.redirect(`${process.env.FRONTEND_URL}/payment/failure?error=missing_transaction_id&gateway=esewa`);
        }

        const tx = await PaymentTransaction.findById(payment_transaction_id);
        if (!tx) {
            logger.error(`Payment transaction not found: ${payment_transaction_id}`);
            if (is_api === 'true') {
                return errorResponse(res, 'Payment transaction not found', 404);
            }
            return res.redirect(`${process.env.FRONTEND_URL}/payment/failure?error=transaction_not_found&payment_transaction_id=${payment_transaction_id}&gateway=esewa`);
        }

        // ❌ CANCEL BOOKING
        logger.warn(`❌ Cancelling payment transaction ${payment_transaction_id} - Status: ${tx.status}`);
        
        await PaymentTransaction.updateStatus(tx.id, 'failed', {
            error_message: errorReason,
            cancelled_reason: 'User cancelled or payment gateway error'
        });

        // Update booking status to cancelled
        const booking = await Booking.findById(tx.booking_id);
        if (booking && booking.status === 'pending_payment') {
            await Booking.updateStatus(tx.booking_id, 'cancelled', {
                cancellation_reason: `Payment cancelled: ${errorReason}`,
                cancelled_at: new Date()
            });
            logger.warn(`❌ Booking ${tx.booking_id} cancelled due to payment failure`);
        } else if (booking) {
            logger.warn(`Booking ${tx.booking_id} already in status: ${booking.status}, not cancelling`);
        }

        logger.warn(`❌ User redirected to failure page for transaction ${payment_transaction_id}`);
        
        // Support both API response and redirects
        if (is_api === 'true') {
            return errorResponse(res, `❌ Payment failed: ${errorReason}`, 400);
        } else {
            return res.redirect(`${process.env.FRONTEND_URL}/payment/failure?gateway=esewa&payment_transaction_id=${payment_transaction_id}&error=${encodeURIComponent(errorReason)}`);
        }
    } catch (err) {
        logger.error(`❌ Error in esewaPaymentFailure: ${err.message}`);
        const ptId = req.query.payment_transaction_id || 'unknown';
        const is_api_err = req.query.is_api;
        
        // Support both API response and redirects
        if (is_api_err === 'true') {
            return errorResponse(res, `❌ Error: ${err.message}`, 500);
        } else {
            return res.redirect(`${process.env.FRONTEND_URL}/payment/failure?error=${encodeURIComponent(err.message)}&payment_transaction_id=${ptId}&gateway=esewa`);
        }
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

/**
 * Debug endpoint for testing eSewa verification
 * POST /api/payment/esewa/test
 * Body: { amt, pid, rid }
 */
/**
 * Check payment transaction status - allows frontend to poll for payment status
 * GET /api/payment/status/:payment_transaction_id
 */
export const checkPaymentStatus = async (req, res, next) => {
    try {
        const { payment_transaction_id } = req.params;
        
        if (!payment_transaction_id) {
            return errorResponse(res, 'Missing payment_transaction_id', 400);
        }
        
        const tx = await PaymentTransaction.findById(payment_transaction_id);
        if (!tx) {
            return errorResponse(res, 'Payment transaction not found', 404);
        }
        
        // Get booking details
        const booking = await Booking.findById(tx.booking_id);
        
        const statusData = {
            payment_transaction_id: tx.id,
            status: tx.status,  // 'pending_verification', 'success', 'failed'
            gateway: tx.gateway,
            amount: tx.amount,
            booking_id: tx.booking_id,
            booking_status: booking?.status,
            created_at: tx.created_at,
            verified_at: tx.updated_at
        };
        
        if (tx.status === 'success') {
            statusData.message = '✅ Payment successful and booking confirmed';
            return successResponse(res, statusData.message, statusData);
        } else if (tx.status === 'failed') {
            statusData.message = `❌ Payment failed: ${tx.response_payload?.error_message || 'Unknown error'}`;
            return errorResponse(res, statusData.message, 400);
        } else if (tx.status === 'pending_verification') {
            statusData.message = '⏳ Payment pending verification - waiting for eSewa response';
            return res.status(202).json({ success: false, message: statusData.message, data: statusData });
        }
        
        successResponse(res, 'Payment status retrieved', statusData);
    } catch (err) {
        logger.error(`Error in checkPaymentStatus: ${err.message}`);
        next(err);
    }
};

export const testEsewaVerification = async (req, res, next) => {
    try {
        const { amt, pid, rid } = req.body;
        
        logger.info(`🧪 Testing eSewa Verification`);
        logger.info(`Parameters:`, { amt, pid, rid });
        
        if (!amt || !pid || !rid) {
            return errorResponse(res, 'Missing required parameters: amt, pid, rid', 400);
        }
        
        const result = await verifyEsewaPayment({ amt, pid, rid });
        
        logger.info(`🧪 Test Result:`, result);
        
        if (result.success) {
            successResponse(res, '✅ eSewa verification successful', result);
        } else {
            errorResponse(res, `❌ eSewa verification failed: ${result.error}`, 400);
        }
    } catch (err) {
        logger.error(`Error in testEsewaVerification: ${err.message}`);
        next(err);
    }
};
/**
 * Serve HTML form that auto-submits to eSewa
 * GET /api/payments/esewa/form?payment_transaction_id=xxx
 */
export const esewaPaymentForm = async (req, res) => {
    try {
        const { payment_transaction_id } = req.query;
        if (!payment_transaction_id) {
            return res.status(400).send('Missing payment_transaction_id');
        }

        // Fetch transaction details from DB
        const PaymentTransaction = (await import('../models/PaymentTransaction.js')).default;
        const tx = await PaymentTransaction.findById(payment_transaction_id);
        if (!tx) {
            return res.status(404).send('Transaction not found');
        }

        // Re-build the exact same parameters as before
        const amount = tx.amount;
        const transaction_uuid = tx.transaction_id; // stored during initiation
        const product_code = process.env.ESEWA_MERCHANT_CODE;
        
        // Re-calculate signature (must match the one used during initiation)
        const CryptoJS = (await import('crypto-js')).default;
        const signedFields = `total_amount=${amount},transaction_uuid=${transaction_uuid},product_code=${product_code}`;
        const hash = CryptoJS.HmacSHA256(signedFields, process.env.ESEWA_SECRET_KEY);
        const signature = CryptoJS.enc.Base64.stringify(hash);

        // Success & failure URLs – they point back to your backend callbacks
        const baseBackendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
        const successUrl = `${baseBackendUrl}/api/payments/esewa/success?payment_transaction_id=${payment_transaction_id}`;
        const failureUrl = `${baseBackendUrl}/api/payments/esewa/failure?payment_transaction_id=${payment_transaction_id}`;

        // Generate HTML form that auto-submits
       const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Redirecting to eSewa...</title>
    <style>
        body { font-family: sans-serif; text-align: center; padding: 2rem; }
        .spinner { display: inline-block; width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #4CAF50; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 1rem; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        button { margin-top: 1rem; padding: 0.5rem 1rem; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; }
        .error { color: red; margin-top: 1rem; }
    </style>
</head>
<body>
    <div class="spinner"></div>
    <p>Redirecting to eSewa payment gateway...</p>
    <p id="message">Please wait...</p>
    <button id="manualButton" style="display:none;">Click here to continue</button>
    <div id="error" class="error"></div>

    <form id="esewaForm" action="https://rc-epay.esewa.com.np/api/epay/main/v2/form" method="POST">
        <input type="hidden" name="amount" value="${amount}" />
        <input type="hidden" name="total_amount" value="${amount}" />
        <input type="hidden" name="transaction_uuid" value="${transaction_uuid}" />
        <input type="hidden" name="product_code" value="${product_code}" />
        <input type="hidden" name="product_service_charge" value="0" />
        <input type="hidden" name="product_delivery_charge" value="0" />
        <input type="hidden" name="success_url" value="${successUrl}" />
        <input type="hidden" name="failure_url" value="${failureUrl}" />
        <input type="hidden" name="signed_field_names" value="total_amount,transaction_uuid,product_code" />
        <input type="hidden" name="signature" value="${signature}" />
    </form>

    <script>
        (function() {
            var form = document.getElementById('esewaForm');
            var manualBtn = document.getElementById('manualButton');
            var messageEl = document.getElementById('message');
            var errorEl = document.getElementById('error');

            function submitForm() {
                console.log('Submitting form to eSewa...');
                messageEl.innerText = 'Submitting...';
                form.submit();
            }

            // Try auto-submit after a short delay (more reliable than onload)
            setTimeout(function() {
                try {
                    submitForm();
                } catch(e) {
                    console.error('Auto-submit error:', e);
                    errorEl.innerText = 'Auto-redirect failed. Please click the button.';
                    manualBtn.style.display = 'inline-block';
                    messageEl.innerText = 'Auto-redirect failed.';
                }
            }, 500);

            // Manual fallback
            manualBtn.onclick = function(e) {
                e.preventDefault();
                submitForm();
            };

            // If the form hasn't submitted after 2 seconds, show manual button
            setTimeout(function() {
                if (document.body.contains(form) && !form.submitted) {
                    manualBtn.style.display = 'inline-block';
                    messageEl.innerText = 'Still waiting? Click the button.';
                }
            }, 2000);
        })();
    </script>
</body>
</html>
`;

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    } catch (err) {
        logger.error(`Error serving eSewa form: ${err.message}`);
        res.status(500).send('Internal server error');
    }
};