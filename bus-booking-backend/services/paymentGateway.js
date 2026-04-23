import axios from 'axios';
import logger from '../utils/logger.js';

/**
 * Initiate eSewa payment (stub – in production, call actual eSewa API)
 * @param {number} amount - Amount in NPR
 * @param {string} bookingRef - Booking reference
 * @param {string} productName - Product name
 * @returns {Promise<{payment_url: string, transaction_id: string|null}>}
 */
export const initiateEsewaPayment = async (amount, bookingRef, productName) => {
    // In production: https://uat.esewa.com.np/epay/main
    const paymentUrl = `https://uat.esewa.com.np/epay/main?amt=${amount}&pdc=0&psc=0&txAmt=0&tAmt=${amount}&pid=${bookingRef}&scd=${process.env.ESEWA_MERCHANT_CODE}&su=${process.env.FRONTEND_URL}/payment/success?gateway=esewa&pu=${encodeURIComponent(process.env.FRONTEND_URL)}&fu=${process.env.FRONTEND_URL}/payment/failure?gateway=esewa`;
    // Simulate transaction ID
    const transaction_id = `ESEWA_${Date.now()}_${bookingRef}`;
    logger.info(`eSewa payment initiated: ${paymentUrl}`);
    return { payment_url: paymentUrl, transaction_id };
};

/**
 * Verify eSewa payment (stub)
 * @param {Object} params - Verification parameters
 * @returns {Promise<{success: boolean, transaction_id?: string, error?: string}>}
 */
export const verifyEsewaPayment = async (params) => {
    // In production: call eSewa verification API
    logger.info(`Verifying eSewa payment: ${JSON.stringify(params)}`);
    // Simulate success
    return { success: true, transaction_id: params.transaction_id || `TXN_${Date.now()}` };
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
        return_url: `${process.env.FRONTEND_URL}/payment/khalti/verify`,
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