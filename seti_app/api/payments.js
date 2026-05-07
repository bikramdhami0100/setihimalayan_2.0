// import api from './client';

// export const initiatePayment = (bookingId, gateway) => api.post('/payments/initiate', { booking_id: bookingId, gateway });
// export const verifyPayment = (transactionId, gateway, params) => api.get('/payments/success', { params: { payment_transaction_id: transactionId, gateway, ...params } });
// export const paymentWebhook = (data) => api.post('/payments/webhook', data);
import api from './client';

// Initiate a payment
export const initiatePayment = (bookingId, gateway) => 
  api.post('/payments/initiate', { booking_id: bookingId, gateway });

// Check payment status (polling)
export const getPaymentStatus = (paymentTransactionId) => 
  api.get(`/payments/status/${paymentTransactionId}`);

// Verify payment after redirect (if needed)
export const verifyPayment = (transactionId, gateway, params) => 
  api.get('/payments/success', { 
    params: { payment_transaction_id: transactionId, gateway, ...params } 
  });

// Webhook (for server‑to‑server)
export const paymentWebhook = (data) => 
  api.post('/payments/webhook', data);