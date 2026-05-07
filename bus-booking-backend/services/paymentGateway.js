import axios from 'axios';
import logger from '../utils/logger.js';
import CryptoJS from "crypto-js";
import { errorResponse, successResponse } from '../utils/response.js';
/**
 * Initiate eSewa payment
 * @param {number} amount - Amount in NPR
 * @param {string} bookingRef - Booking reference
 * @param {string} productName - Product name
 * @param {number} paymentTransactionId - Payment transaction ID for tracking
 * @returns {Promise<{payment_url: string, transaction_id: string|null}>}
 */
export const initiateEsewaPayment = async (amount, bookingRef, productName, txId = null) => {
    try {
        const transaction_uuid = `ESEWA_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        let hash=CryptoJS.HmacSHA256(
             `total_amount=${amount},transaction_uuid=${transaction_uuid},product_code=${process.env.ESEWA_MERCHANT_CODE}`,
            process.env.ESEWA_SECRET_KEY
        );
        let signature = CryptoJS.enc.Base64.stringify(hash);

        return { 
            // payment_response: response.data, 
      amount:amount,
      tax_amount:0,
      total_amount:amount,
      transaction_uuid:transaction_uuid,
      product_code:process.env.ESEWA_MERCHANT_CODE,
      product_service_charge:0,
      product_delivery_charge:0,

      success_url: `${process.env.ESEWA_SUCCESS_URL}/${txId}`,
      failure_url: `${process.env.ESEWA_FAILURE_URL}/${txId}`,
      signed_field_names:
        "total_amount,transaction_uuid,product_code",
      signature:signature,
      transaction_id:txId
        };
    } catch (err) {
        logger.error(`Error initiating eSewa payment: ${err.message}`);
        throw err;
    }
};

/**
 * Verify eSewa payment with actual API call
 * @param {Object} params - Verification parameters { amt, pid, rid }
 * @returns {Promise<{success: boolean, transaction_id?: string, error?: string}>}
 */
export const verifyEsewaPayment = async (params) => {
    try {
        const { total_amount, transaction_uuid, product_code } = params;
        

        // Validate required parameters
        if (!total_amount || !transaction_uuid || !product_code) {
            logger.error(`Invalid eSewa verification params: ${JSON.stringify(params)}`);
            return { 
                success: false, 
                error: 'Missing verification parameters (amt, pid, rid)'
            };
        }
        
        // if (!process.env.ESEWA_MERCHANT_CODE) {
        //     logger.error(`ESEWA_MERCHANT_CODE not configured in environment`);
        //     return { 
        //         success: false, 
        //         error: 'eSewa merchant code not configured' 
        //     };
        // }
        
        // eSewa verification endpoint (UAT)
        // For production: https://esewa.com.np/epay/transrec
        const verificationUrl = `${process.env.ESEWA_VERIFICATION_URL}?product_code=${product_code}&total_amount=${total_amount}&transaction_uuid=${transaction_uuid}`||'https://rc.esewa.com.np/api/epay/transaction/status/?product_code=EPAYTEST&total_amount=100&transaction_uuid=123';
        
        logger.info(`Sending verification request to: ${verificationUrl}`);
        
        // eSewa expects form-data with POST request
        const formData = new URLSearchParams();
        formData.append('total_amount', total_amount);
        formData.append('transaction_uuid', transaction_uuid);
        formData.append('product_code', product_code);
        // formData.append('scd', process.env.ESEWA_MERCHANT_CODE);
        
        const response = await axios.post(verificationUrl, formData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            timeout: 15000
        });
        
        // logger.info(`eSewa verification response: ${JSON.stringify(response.data)}`);
        
        // Parse eSewa response
        // eSewa returns success=true (as string) for successful transactions
        // const responseData = response.data;
//           {
//   "product_code": "EPAYTEST",
//   "transaction_uuid": "123",
//   "total_amount": 100.0
//   "status": "COMPLETE",
//   "ref_id": "0001TS9"
// }
         console.log(response.data);
         successResponse(response.data, 'Payment successful', response.data); 
        // if (response.data.status === 'COMPLETE') {
        //     return { success: true, transaction_id: response.data.ref_id };
        // }
        // return { success: false, error: 'Payment not completed' };
    } catch (err){
        console.log(err);
         errorResponse(err, 'Payment verification failed', 400);
    }
        
};

/**
 * Initiate Khalti payment (stub – real integration uses Khalti API)
 * @param {number} amount - Amount in NPR
 * @param {string} bookingRef - Booking reference
 * @returns {Promise<{payment_url: string, transaction_id: string|null}>}
 */
export const initiateKhaltiPayment = async (amount, bookingRef) => {
    // Khalti test endpoint
    const payload = {
        return_url: `${process.env.FRONTEND_URL}/payments/khalti/verify`,
        website_url: process.env.FRONTEND_URL,
        amount: amount * 100, // convert to paisa
        purchase_order_id: bookingRef,
        purchase_order_name: 'Bus Ticket',
        customer_info: {
            name: 'Customer',
            email: 'customer@example.com',
            phone: '9800000000'
        }
    };
    try {
        const response = await axios.post('https://a.khalti.com/api/v2/epayment/initiate/', payload, {
            headers: {
                'Authorization': `Key ${process.env.KHALTI_SECRET_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        if (response.data && response.data.payment_url) {
            return { payment_url: response.data.payment_url, transaction_id: response.data.pidx };
        }
        throw new Error('Khalti initiation failed: no payment_url');
    } catch (err) {
        logger.error(`Khalti initiation error: ${err.message}`);
        // Fallback stub
        const payment_url = `${process.env.FRONTEND_URL}/mock-payment/khalti?ref=${bookingRef}`;
        return { payment_url, transaction_id: `KHALTI_STUB_${Date.now()}` };
    }
};

/**
 * Verify Khalti payment (stub)
 * @param {string} pidx - Payment ID
 * @returns {Promise<{success: boolean, transaction_id?: string, error?: string}>}
 */
export const verifyKhaltiPayment = async (pidx) => {
    try {
        const response = await axios.post('https://a.khalti.com/api/v2/epayment/lookup/', { pidx }, {
            headers: { 'Authorization': `Key ${process.env.KHALTI_SECRET_KEY}` }
        });
        if (response.data && response.data.status === 'Completed') {
            return { success: true, transaction_id: response.data.transaction_id };
        }
        return { success: false, error: 'Payment not completed' };
    } catch (err) {
        logger.error(`Khalti verification error: ${err.message}`);
        return { success: false, error: err.message };
    }
};

/**
 * Initiate ConnectIPS payment (stub)
 * @param {number} amount - Amount in NPR
 * @param {string} bookingRef - Booking reference
 * @returns {Promise<{payment_url: string, transaction_id: string|null}>}
 */
export const initiateConnectIPSPayment = async (amount, bookingRef) => {
    // ConnectIPS integration is more complex; stub
    const payment_url = `https://connectips.com/pay?amount=${amount}&ref=${bookingRef}&merchant=${process.env.CONNECTIPS_MERCHANT_ID}`;
    logger.info(`ConnectIPS payment initiated: ${payment_url}`);
    return { payment_url, transaction_id: `CONNECTIPS_${Date.now()}` };
};

/**
 * Verify ConnectIPS payment (stub)
 * @param {Object} params - Verification data
 * @returns {Promise<{success: boolean, transaction_id?: string, error?: string}>}
 */
export const verifyConnectIPSPayment = async (params) => {
    // In production: call ConnectIPS verification endpoint
    return { success: true, transaction_id: params.transaction_id || `TXN_${Date.now()}` };
};

/**
 * Unified payment initiation based on gateway
 * @param {string} gateway - 'esewa', 'khalti', 'connectips'
 * @param {number} amount - Amount
 * @param {string} bookingRef - Booking reference
 * @returns {Promise<{payment_url: string, transaction_id: string|null}>}
 */
export const initiatePayment = async (gateway, amount, bookingRef) => {
    switch (gateway) {
        case 'esewa':
            return initiateEsewaPayment(amount, bookingRef, 'Bus Ticket');
        case 'khalti':
            return initiateKhaltiPayment(amount, bookingRef);
        case 'connectips':
            return initiateConnectIPSPayment(amount, bookingRef);
        default:
            throw new Error(`Unsupported gateway: ${gateway}`);
    }
};

/**
 * Unified payment verification
 * @param {string} gateway - Payment gateway
 * @param {Object} params - Verification parameters
 * @returns {Promise<{success: boolean, transaction_id?: string, error?: string}>}
 */
export const verifyPayment = async (gateway, params) => {
    switch (gateway) {
        case 'esewa':
            return verifyEsewaPayment(params);
        case 'khalti':
            return verifyKhaltiPayment(params.pidx || params.transaction_id);
        case 'connectips':
            return verifyConnectIPSPayment(params);
        default:
            return { success: false, error: 'Unsupported gateway' };
    }
};