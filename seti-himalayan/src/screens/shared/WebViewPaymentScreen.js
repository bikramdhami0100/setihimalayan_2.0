import React, { useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { Text, Button } from 'react-native-paper';
import { colors } from '../../utils/colors';
import { confirmBooking } from '../../api/bookings';
import useUIStore from '../../store/uiStore';

export default function WebViewPaymentScreen({ route, navigation }) {
  const { url, bookingId } = route.params;
  const webViewRef = useRef(null);
  const { showSnackbar } = useUIStore();
  const [loading, setLoading] = useState(true);

  const handleNavigationStateChange = async (navState) => {
    // Check if navigation URL indicates success or failure
    if (navState.url.includes('/payment/success') || navState.url.includes('success')) {
      try {
        await confirmBooking(bookingId);
        showSnackbar('Payment successful! Booking confirmed.', 'success');
        navigation.replace('MyBookings');
      } catch (error) {
        showSnackbar('Payment succeeded but booking confirmation failed. Contact support.', 'error');
        navigation.replace('MyBookings');
      }
    } else if (navState.url.includes('/payment/failure') || navState.url.includes('failure')) {
      showSnackbar('Payment failed or cancelled', 'error');
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loaderText}>Loading payment gateway...</Text>
        </View>
      )}
      <WebView
        ref={webViewRef}
        source={{ uri: url }}
        onNavigationStateChange={handleNavigationStateChange}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        style={styles.webview}
      />
      <Button mode="outlined" onPress={() => navigation.goBack()} style={styles.cancelButton}>
        Cancel Payment
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loader: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.9)', zIndex: 1 },
  loaderText: { marginTop: 12, color: colors.textSecondary },
  webview: { flex: 1 },
  cancelButton: { margin: 16, borderColor: colors.error, marginBottom: 20 },
});