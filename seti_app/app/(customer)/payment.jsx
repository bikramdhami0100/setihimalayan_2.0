import React, { useState, useContext, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { WebView } from "react-native-webview";
import { initiatePayment, getPaymentStatus } from "../../api/payments";
import { UIContext } from "../../context/UIContext";

const { width } = Dimensions.get("window");

const PAYMENT_METHODS = [
  { id: "esewa", name: "eSewa", color: "#60bb46", icon: "wallet", desc: "Pay via eSewa wallet" },
  { id: "khalti", name: "Khalti", color: "#5d2e8e", icon: "cash", desc: "Pay via Khalti wallet" },
  { id: "connectips", name: "ConnectIPS", color: "#1e3a8a", icon: "business", desc: "Pay via bank account" },
];

export default function PaymentScreen() {
  const { bookingId, amount, reference } = useLocalSearchParams();
  const [selectedMethod, setSelectedMethod] = useState("esewa");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showWebView, setShowWebView] = useState(false);
  const [paymentTransactionId, setPaymentTransactionId] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [esewaFormData, setEsewaFormData] = useState(null);
  const statusCheckIntervalRef = useRef(null);
  const { showSnackbar } = useContext(UIContext);

  const clearPolling = () => {
    if (statusCheckIntervalRef.current) {
      clearInterval(statusCheckIntervalRef.current);
      statusCheckIntervalRef.current = null;
    }
  };

  const startPolling = (txnId) => {
    if (!txnId) return;
    clearPolling();
    setIsVerifying(true);

    statusCheckIntervalRef.current = setInterval(async () => {
      try {
        const response = await getPaymentStatus(txnId);
        const { status, booking_status } = response.data.data;

        if (status === "success") {
          clearPolling();
          setIsVerifying(false);
          showSnackbar("Payment successful! Booking confirmed.", "success");
          router.replace(`/booking/${bookingId}/confirmation`);
        } else if (status === "failed") {
          clearPolling();
          setIsVerifying(false);
          showSnackbar("Payment failed. Please try again.", "error");
          router.back();
        } else if (status === "pending_verification") {
          console.log("Waiting for payment verification...");
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 3000);
  };

  useEffect(() => {
    return () => clearPolling();
  }, []);

  const handleWebViewNavigationStateChange = (navState) => {
    const url = navState.url;
    if (url.includes("/payments/success/")) {
      setShowWebView(false);
      startPolling(paymentTransactionId);
    } else if (url.includes("/payments/failure/")) {
      clearPolling();
      setShowWebView(false);
      showSnackbar("Payment cancelled or failed.", "error");
      router.back();
    }
  };

  const handleShouldStartLoadWithRequest = (request) => {
    const url = request.url;
    if (url.includes("/payments/success/")) {
      setShowWebView(false);
      startPolling(paymentTransactionId);
      return false;
    }
    if (url.includes("/payments/failure/")) {
      clearPolling();
      setShowWebView(false);
      showSnackbar("Payment cancelled or failed.", "error");
      router.back();
      return false;
    }
    return true;
  };

  const handleWebViewError = (syntheticEvent) => {
    const { description } = syntheticEvent.nativeEvent;
    console.warn("WebView error:", description);
  };

  const getEsewaHtml = (formData) => `
    <html>
      <body onload="document.forms[0].submit()">
        <form action="https://rc-epay.esewa.com.np/api/epay/main/v2/form" method="POST">
          ${Object.keys(formData)
            .map(key => `<input type="hidden" name="${key}" value="${formData[key]}" />`)
            .join("")}
        </form>
        <p style="text-align:center; margin-top:50px;">Redirecting to eSewa...</p>
      </body>
    </html>
  `;

  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      const response = await initiatePayment(bookingId, selectedMethod);
      const { esewaResult, khaltiResult, connectResult } = response.data.data;

      if (selectedMethod === "esewa") {
        const formData = esewaResult;
        setEsewaFormData(formData);
        setPaymentTransactionId(formData.transaction_id);

        if (Platform.OS === "web") {
          const form = document.createElement("form");
          form.method = "POST";
          form.action = "https://rc-epay.esewa.com.np/api/epay/main/v2/form";
          Object.keys(formData).forEach(key => {
            const input = document.createElement("input");
            input.type = "hidden";
            input.name = key;
            input.value = formData[key];
            form.appendChild(input);
          });
          document.body.appendChild(form);
          form.submit();
          setIsProcessing(false);
        } else {
          setShowWebView(true);
        }
      } else if (selectedMethod === "khalti") {
        showSnackbar("Khalti payment coming soon", "info");
      } else if (selectedMethod === "connectips") {
        showSnackbar("ConnectIPS payment coming soon", "info");
      }
    } catch (err) {
      showSnackbar(err.response?.data?.message || "Payment initiation failed", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const getMethodIcon = (id) => {
    switch (id) {
      case "esewa": return { name: "wallet-outline", type: Ionicons };
      case "khalti": return { name: "cash-outline", type: Ionicons };
      case "connectips": return { name: "account-balance", type: MaterialCommunityIcons };
      default: return { name: "wallet-outline", type: Ionicons };
    }
  };

  if (esewaFormData && showWebView && Platform.OS !== "web") {
    return (
      <View style={styles.container}>
        <View style={styles.webViewSafeArea}>
          <View style={styles.webViewHeader}>
            <TouchableOpacity onPress={() => { setShowWebView(false); clearPolling(); router.back(); }} style={styles.webViewBack}>
              <Ionicons name="arrow-back" size={22} color="#0f172a" />
            </TouchableOpacity>
            <Text style={styles.webViewHeaderTitle}>eSewa Payment</Text>
            <View style={{ width: 40 }} />
          </View>

          <WebView
            originWhitelist={["*"]}
            source={{ html: getEsewaHtml(esewaFormData) }}
            onNavigationStateChange={handleWebViewNavigationStateChange}
            onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
            onError={handleWebViewError}
            startInLoadingState={true}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            sharedCookiesEnabled={true}
            thirdPartyCookiesEnabled={true}
          />

          {isVerifying && (
            <View style={styles.verifyingBar}>
              <ActivityIndicator size="small" color="#1e3a8a" />
              <Text style={styles.verifyingText}>Verifying payment...</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  const selectedMethodData = PAYMENT_METHODS.find((m) => m.id === selectedMethod);

  return (
    <View style={styles.container}>
      <View style={styles.topCircle} />

      <View style={styles.safeArea}>
        {/* ─── HEADER ─── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.brandText}>SETI HIMALAYAN</Text>
            <Text style={styles.headerTitle}>Complete Payment</Text>
          </View>
          <View style={styles.headerIconWrap}>
            <Feather name="lock" size={18} color="#fff" />
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* ─── AMOUNT CARD ─── */}
          <View style={styles.amountCard}>
            <View style={styles.amountIconWrap}>
              <Feather name="credit-card" size={22} color="#fff" />
            </View>
            <Text style={styles.amountLabel}>Amount to Pay</Text>
            <Text style={styles.amountValue}>NPR {amount}</Text>
            <View style={styles.refBadge}>
              <Ionicons name="receipt-outline" size={12} color="#64748b" />
              <Text style={styles.refText}>{reference}</Text>
            </View>
          </View>

          {/* ─── PAYMENT METHODS ─── */}
          <View style={styles.sectionHead}>
            <View style={[styles.sectionBar, { backgroundColor: "#1e3a8a" }]} />
            <Text style={styles.sectionTitle}>Choose Payment Method</Text>
          </View>

          {PAYMENT_METHODS.map((method) => {
            const isSelected = selectedMethod === method.id;
            const iconObj = getMethodIcon(method.id);
            return (
              <TouchableOpacity
                key={method.id}
                onPress={() => setSelectedMethod(method.id)}
                activeOpacity={0.7}
                style={[styles.methodCard, isSelected && styles.methodCardSelected]}
              >
                <View style={[styles.methodIconWrap, { backgroundColor: method.color + "15" }]}>
                  <iconObj.type name={iconObj.name} size={22} color={method.color} />
                </View>
                <View style={styles.methodInfo}>
                  <Text style={styles.methodName}>{method.name}</Text>
                  <Text style={styles.methodDesc}>{method.desc}</Text>
                </View>
                <View style={[styles.radio, isSelected && { borderColor: method.color, backgroundColor: method.color }]}>
                  {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
              </TouchableOpacity>
            );
          })}

          {/* ─── SECURE NOTE ─── */}
          <View style={styles.secureCard}>
            <View style={[styles.secureIconWrap, { backgroundColor: "#eff6ff" }]}>
              <Ionicons name="shield-checkmark" size={22} color="#1e3a8a" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.secureTitle}>Secure Transaction</Text>
              <Text style={styles.secureText}>
                Your payment is protected with 256-bit encryption. We do not store your financial details.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* ─── BOTTOM PAY BAR ─── */}
        <View style={styles.bottomBar}>
          <View style={styles.bottomAmount}>
            <Text style={styles.bottomAmountLabel}>Total Payment</Text>
            <Text style={styles.bottomAmountValue}>NPR {amount}</Text>
          </View>
          <TouchableOpacity
            onPress={handlePayment}
            disabled={isProcessing}
            activeOpacity={0.85}
            style={styles.payBtn}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Text style={styles.payBtnText}>
                  Pay with {selectedMethodData?.name || "eSewa"}
                </Text>
                <Feather name="arrow-right" size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  safeArea: { flex: 1 },
  topCircle: {
    position: "absolute",
    top: -width * 0.4,
    right: -width * 0.2,
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
    backgroundColor: "#e0f2fe",
  },

  // ── Header ──
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#1e3a8a",
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: { color: "#1e3a8a", fontSize: 10, fontWeight: "900", letterSpacing: 1.5 },
  headerTitle: { color: "#0f172a", fontSize: 22, fontWeight: "900", marginTop: 1 },
  headerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#1e3a8a",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Scroll ──
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24 },

  // ── Amount Card ──
  amountCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f1f5f9",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 24,
  },
  amountIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#1e3a8a",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  amountLabel: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  amountValue: {
    color: "#0f172a",
    fontSize: 34,
    fontWeight: "900",
    marginTop: 4,
  },
  refBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  refText: { color: "#64748b", fontSize: 10, fontWeight: "700", letterSpacing: 0.3 },

  // ── Section ──
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  sectionBar: { width: 4, height: 16, borderRadius: 2 },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: "#0f172a" },

  // ── Method Cards ──
  methodCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: "#f1f5f9",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  methodCardSelected: {
    borderColor: "#1e3a8a",
    backgroundColor: "#f8faff",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  methodIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  methodInfo: { flex: 1 },
  methodName: { color: "#0f172a", fontSize: 15, fontWeight: "700" },
  methodDesc: { color: "#94a3b8", fontSize: 12, marginTop: 2 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Secure Note ──
  secureCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    marginTop: 4,
    marginBottom: 20,
  },
  secureIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  secureTitle: { color: "#0f172a", fontSize: 13, fontWeight: "700", marginBottom: 4 },
  secureText: { color: "#94a3b8", fontSize: 12, lineHeight: 18 },

  // ── Bottom Bar ──
  bottomBar: {
    padding: 20,
    paddingBottom: 28,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bottomAmount: { flex: 1 },
  bottomAmountLabel: { color: "#94a3b8", fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  bottomAmountValue: { color: "#0f172a", fontSize: 20, fontWeight: "900", marginTop: 1 },
  payBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1e3a8a",
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 24,
    shadowColor: "#1e3a8a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  payBtnText: { color: "#fff", fontSize: 14, fontWeight: "800" },

  // ── WebView ──
  webViewSafeArea: { flex: 1, backgroundColor: "#fff" },
  webViewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  webViewBack: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center" },
  webViewHeaderTitle: { color: "#0f172a", fontSize: 16, fontWeight: "700" },
  verifyingBar: {
    padding: 14,
    backgroundColor: "#eff6ff",
    borderTopWidth: 1,
    borderTopColor: "#dbeafe",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  verifyingText: { color: "#1e3a8a", fontWeight: "700", fontSize: 13 },
});
