import api from './client';

export const initiatePayment = (bookingId, gateway) => api.post('/payments/initiate', { booking_id: bookingId, gateway });
export const verifyPayment = (transactionId, gateway, params) => api.get('/payments/success', { params: { payment_transaction_id: transactionId, gateway, ...params } });
export const paymentWebhook = (data) => api.post('/payments/webhook', data);