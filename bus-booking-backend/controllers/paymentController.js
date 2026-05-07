import PaymentTransaction from '../models/PaymentTransaction.js';
import Booking from '../models/Booking.js';
import { initiateEsewaPayment, initiateKhaltiPayment, initiateConnectIPSPayment, verifyPayment, verifyEsewaPayment } from '../services/paymentGateway.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { confirmBookingAfterPayment ,cancelBooking} from './bookingController.js';
import logger from '../utils/logger.js';
import SeatLock from '../models/SeatLock.js';
import { getIO } from '../config/socket.js';
// import jwt from "jsonwebtoken";
// Add this helper at the top of paymentController.js
const sendRedirectHtml = (res, url, message) => {
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
         <meta http-equiv="refresh" content="0;url=${url}">
        <title>Payment Redirect</title></head>
        <body onload="window.location.href = '${url}';" style="display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif;">
            <div style="text-align:center;">
                <h3>${message}</h3>
                <p>Redirecting you back to the app...</p>
                <script>window.location.href = "${url}";</script>
            </div>
        </body>
        </html>
    `;
    res.send(html);
};

export const paymentSuccess = async (req, res, next) => {
  try {
    const { payment_transaction_id } = req.params;
    const { data } = req.query;

    if (!payment_transaction_id || !data) {
      return sendRedirectHtml(
        res,
        `${process.env.FRONTEND_URL}/payment/result?status=failed&message=Missing parameters`,
        "Missing payment information"
      );
    }

    // Decode base64 response from eSewa
    let decodedData;
    try {
      const jsonString = Buffer.from(data, 'base64').toString('utf-8');
      decodedData = JSON.parse(jsonString);
    } catch (err) {
      return sendRedirectHtml(
        res,
        `${process.env.FRONTEND_URL}/payment/result?status=failed&message=Invalid response data`,
        "Invalid eSewa response"
      );
    }

    // Find transaction
    const tx = await PaymentTransaction.findById(payment_transaction_id);
    if (!tx) {
      return sendRedirectHtml(
        res,
        `${process.env.FRONTEND_URL}/payment/result?status=failed&message=Transaction not found`,
        "Payment record not found"
      );
    }

    // Check eSewa status
    if (decodedData.status !== 'COMPLETE') {
      await PaymentTransaction.updateStatus(tx.id, 'failed', {
        response_payload: decodedData,
        error_message: 'Payment not completed by user',
      });
      return sendRedirectHtml(
        res,
        `${process.env.FRONTEND_URL}/payment/result?status=failed&message=Payment incomplete`,
        "Payment was not completed"
      );
    }

    // Verify with eSewa API
    const verification = await verifyEsewaPayment({
      total_amount: decodedData.total_amount,
      transaction_uuid: decodedData.transaction_uuid,
      product_code: decodedData.product_code,
    });
    // console.log(verification,"verification ok");
    // return 0

    if (!verification) {
      await PaymentTransaction.updateStatus(tx.id, 'failed', {
        response_payload: verification,
        error_message: verification.error,
      });
      return sendRedirectHtml(
        res,
        `${process.env.FRONTEND_URL}/payment/result?status=failed&message=Verification failed`,
        "Payment verification failed"
      );
    }

    // Update transaction as success
    await PaymentTransaction.updateStatus(tx.id, 'success', {
      transaction_id: decodedData.transaction_code,
      response_payload: decodedData,
    });

    
        // Confirm booking – handle already confirmed case
        const booking = await Booking.findById(tx.booking_id);
        if (booking.status === 'confirmed') {
            console.log(`Booking ${booking.id} already confirmed – skipping confirmation.`);
        } else if (booking.status === 'pending_payment') {
            await confirmBookingAfterPayment(tx.booking_id, verification);
        } else {
            // Unexpected status, log but still treat as success for user
            console.warn(`Booking ${booking.id} has status ${booking.status} – not confirming again.`);
        }

        // Redirect to frontend success page
        const successUrl = `${process.env.FRONTEND_URL}/payment/result?status=success&payment_transaction_id=${payment_transaction_id}&booking_id=${tx.booking_id}`;
        console.log(successUrl,"frontend url")
        sendRedirectHtml(res, successUrl, "Payment successful!");

  } catch (err) {
    next(err);
  }
};

export const paymentFailure = async (req, res, next) => {
  try {
    const { payment_transaction_id } = req.params;
    if (payment_transaction_id) {
      const tx = await PaymentTransaction.findById(payment_transaction_id);
      if (tx) {
        await PaymentTransaction.updateStatus(payment_transaction_id,
             'failed', {
          error_message: 'User cancelled or payment failed',
        });
        // Release seat locks
        const booking = await Booking.findById(tx.booking_id);
        if (booking && booking.status === 'pending_payment') {
          await SeatLock.releaseAllByBooking(booking.id);
          await Booking.updateStatus(booking.id, 'cancelled', 'Payment cancelled by user');
        }
      }
    }
    const failUrl = `${process.env.FRONTEND_URL}/payment/result?status=failed&message=Payment cancelled`;
    sendRedirectHtml(res, failUrl, "Payment cancelled or failed");
  } catch (err) {
    next(err);
  }
};
async function bookingCancelPaymentFailure  (bookingReference,cancellation_reason)  {
       try {
        const booking = await Booking.findByReference(bookingReference);
        if (!booking) return errorResponse(res, 'Booking not found', 404);

        // const { cancellation_reason } = req.body;
        let refundAmount = null;

        if(booking.status==="pending_payment"){
            // refundAmount = booking.total_amount;
            await Booking.cancelBooking(booking.id, cancellation_reason, refundAmount);
            
            await SeatLock.releaseAllByBooking(booking.id);
        }
        
        // await Booking.cancelBooking(booking.id, cancellation_reason, refundAmount);
        // await SeatLock.releaseAllByBooking(booking.id);
        
        // Emit socket event
        const io = getIO();
        io.to(`schedule-${booking.schedule_id}`).emit('seats-released', { seats: booking.selected_seats });
        
        successResponse(res, 'Booking cancelled', { refund_amount: refundAmount });q
        
        // Emit socket event
        // const io = getIO();
        io.to(`schedule-${booking.schedule_id}`).emit('seats-released', { seats: booking.selected_seats });
        
        // successResponse(, 'Booking cancelled', { refund_amount: refundAmount });
    } catch (err) {
        // next(err);
        console.log(err);
    }
}
// async function bookingPaymentSuccess  (bookingReference)  {
//         try {
//         const booking = await Booking.findByReference(bookingReference);
//         if (!booking) return errorResponse(res, 'Booking not found', 404);
//         await confirmBookingAfterPayment(booking.id);
//         // Emit socket event
//         const io = getIO();
//         io.to(`schedule-${booking.schedule_id}`).emit('seats-released', { seats: booking.selected_seats });
        
//         successResponse(res, 'Booking confirmed', { booking_id: booking.id });
//     } catch (err) {
//         // next(err);
//         console.log(err);
//     }
// }
export const initiatePayment = async (req, res, next) => {
    try {
        let esewaResult, khaltiResult, connectResult, transactionId, paymentUrl;
        const { booking_id, gateway } = req.body;
        if (!booking_id || !gateway) return errorResponse(res, 'booking_id and gateway required', 400);
        
        const booking = await Booking.findById(booking_id);
        if (!booking) return errorResponse(res, 'Booking not found', 404);
        if (booking.user_id !== req.user.id) return errorResponse(res, 'Unauthorized', 403);
        if (booking.status !== 'pending_payment') return errorResponse(res, 'Booking not in pending payment state', 400);
 
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
    
        switch (gateway) {
            case 'esewa':
                esewaResult = await initiateEsewaPayment(amount, bookingRef, 'Bus Ticket', txId);
                // amount, bookingRef, productName, txId = null
                // console.log("esewa",esewaResult)
                // return
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

export const paymentWebhook = async (req, res, next) => {
    try {
        // For gateways that send webhook notifications
        const { gateway, data } = req.body;
        // Validate and process
        // Similar to paymentSuccess
        // res.status(200).json({ received: true });
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
            // return res.status(202).json({ success: false, message: statusData.message, data: statusData });
        }
        
        successResponse(res, 'Payment status retrieved', statusData);
    } catch (err) {
        logger.error(`Error in checkPaymentStatus: ${err.message}`);
        next(err);
    }
};
