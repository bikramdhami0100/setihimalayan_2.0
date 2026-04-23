import { useState } from 'react';
import { initiatePayment, verifyPayment } from '../api/payments';
import useUIStore from '../store/uiStore';
import { Linking } from 'react-native';

export const usePayment = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { showSnackbar } = useUIStore();

  const initiate = async (bookingId, gateway) => {
    setIsProcessing(true);
    try {
      const response = await initiatePayment(bookingId, gateway);
      const { payment_url, transaction_id, payment_transaction_id } = response.data.data;
      setIsProcessing(false);
      // Open payment URL in browser or WebView
      if (payment_url) {
        await Linking.openURL(payment_url);
      }
      return { success: true, payment_url, transaction_id, payment_transaction_id };
    } catch (error) {
      const message = error.response?.data?.message || 'Payment initiation failed';
      showSnackbar(message, 'error');
      setIsProcessing(false);
      return { success: false, message };
    }
  };

  const verify = async (transactionId, gateway, params) => {
    setIsProcessing(true);
    try {
      const response = await verifyPayment(transactionId, gateway, params);
      const result = response.data;
      setIsProcessing(false);
      if (result.success) {
        showSnackbar('Payment successful!', 'success');
      } else {
        showSnackbar('Payment verification failed', 'error');
      }
      return result;
    } catch (error) {
      const message = error.response?.data?.message || 'Verification failed';
      showSnackbar(message, 'error');
      setIsProcessing(false);
      return { success: false, message };
    }
  };

  return { isProcessing, initiate, verify };
};