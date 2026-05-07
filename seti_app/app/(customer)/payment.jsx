import React, { useState, useContext, useRef, useEffect } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { WebView } from "react-native-webview";
import { initiatePayment, getPaymentStatus } from "../../api/payments";
import { UIContext } from "../../context/UIContext";

const PAYMENT_METHODS = [
  { id: "esewa", name: "eSewa", color: "#60bb46" },
  { id: "khalti", name: "Khalti", color: "#5d2e8e" },
  { id: "connectips", name: "ConnectIPS", color: "#1e3a8a" },
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

  // ---------- Polling Helpers ----------
  const clearPolling = () => {
    if (statusCheckIntervalRef.current) {
      clearInterval(statusCheckIntervalRef.current);
      statusCheckIntervalRef.current = null;
    }
  };

  const startPolling = (txnId) => {
    if (!txnId) return;
    clearPolling(); // ensure no duplicate intervals
    setIsVerifying(true);

    statusCheckIntervalRef.current = setInterval(async () => {
      try {
        const response = await getPaymentStatus(txnId);
        const { status, booking_status } = response.data.data;

        if (status === "success") {
          clearPolling();
          setIsVerifying(false);
          showSnackbar("✅ Payment successful! Booking confirmed.", "success");
          // Navigate to booking confirmation screen
          router.replace(`/booking/${bookingId}/confirmation`);
        } else if (status === "failed") {
          clearPolling();
          setIsVerifying(false);
          showSnackbar("❌ Payment failed. Please try again.", "error");
          router.back();
        } else if (status === "pending_verification") {
          // still waiting – keep polling
          console.log("⏳ Waiting for payment verification...");
        }
      } catch (error) {
        console.error("Polling error:", error);
        // Don't stop polling on network error – retry
      }
    }, 3000); // poll every 3 seconds
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => clearPolling();
  }, []);

  // ---------- Handle eSewa WebView navigation (native only) ----------
  const handleWebViewNavigationStateChange = (navState) => {
    const url = navState.url;
    console.log("WebView URL:", url);

    // Detect backend success/failure endpoints
    if (url.includes("/payments/success/")) {
      console.log("✅ Payment Success Detected in WebView!");
      setShowWebView(false);
      startPolling(paymentTransactionId);
    } else if (url.includes("/payments/failure/")) {
      console.log("❌ Payment Failure Detected in WebView!");
      clearPolling();
      setShowWebView(false);
      showSnackbar("Payment cancelled or failed.", "error");
      router.back();
    }
  };

  // ---------- Generate HTML form for eSewa (used in WebView & web fallback) ----------
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

  // ---------- Initiate Payment ----------
  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      const response = await initiatePayment(bookingId, selectedMethod);
      const { esewaResult, khaltiResult, connectResult } = response.data.data;

      if (selectedMethod === "esewa") {
        const formData = esewaResult;
        setEsewaFormData(formData);
        // The transaction_uuid is our internal payment_transaction.id
        setPaymentTransactionId(formData.transaction_uuid);

        if (Platform.OS === "web") {
          // Web: dynamically create and submit a form (opens eSewa in same tab)
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
          // After submission, the page leaves – no further action here.
          // The user will be redirected back via backend success/failure endpoints.
          setIsProcessing(false);
          // Polling will start after user returns to the app (we'll handle on mount via URL params if needed)
          // For simplicity, we rely on the backend redirecting to a frontend result screen.
          // Alternatively, you can listen to page visibility API – but not necessary for functional flow.
        } else {
          // Mobile: show WebView with auto-submit HTML
          setShowWebView(true);
          // Polling will start after WebView detects success/failure navigation
        }
      } else if (selectedMethod === "khalti") {
        showSnackbar("Khalti payment coming soon", "info");
      } else if (selectedMethod === "connectips") {
        showSnackbar("ConnectIPS payment coming soon", "info");
      }
    } catch (err) {
      console.error("Payment error:", err);
      showSnackbar(err.response?.data?.message || "Payment initiation failed", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // ---------- WebView Render (mobile only) ----------
  if (esewaFormData && showWebView && Platform.OS !== "web") {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
        <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
          <Text className="text-[#0f172a] text-lg font-bold">eSewa Payment</Text>
          <TouchableOpacity
            onPress={() => {
              setShowWebView(false);
              clearPolling();
              router.back();
            }}
            className="p-2"
          >
            <Ionicons name="close" size={24} color="#0f172a" />
          </TouchableOpacity>
        </View>

        <WebView
          originWhitelist={["*"]}
          source={{ html: getEsewaHtml(esewaFormData) }}
          onNavigationStateChange={handleWebViewNavigationStateChange}
          startInLoadingState={true}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />

        {isVerifying && (
          <View className="p-4 bg-blue-50 border-t border-blue-200 flex-row items-center">
            <ActivityIndicator color="#3b82f6" />
            <Text className="ml-3 text-blue-700 font-semibold">Verifying payment...</Text>
          </View>
        )}
      </SafeAreaView>
    );
  }

  // ---------- Main Payment UI ----------
  return (
    <SafeAreaView style={{ flex: 1 }} className="flex-1 bg-[#f8fafc]">
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text className="text-[#0f172a] text-lg font-bold">Payment</Text>
      </View>

      <ScrollView className="flex-1 p-6" showsVerticalScrollIndicator={false}>
        <View className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-8 items-center">
          <Text className="text-gray-400 text-xs font-bold tracking-widest uppercase mb-2">
            Amount to Pay
          </Text>
          <Text className="text-[#0f172a] text-3xl font-black">NPR {amount}</Text>
          <View className="mt-4 bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
            <Text className="text-slate-500 text-[10px] font-bold">Ref: {reference}</Text>
          </View>
        </View>

        <Text className="text-[#0f172a] text-base font-black mb-4">Select Payment Method</Text>

        {PAYMENT_METHODS.map((method) => (
          <TouchableOpacity
            key={method.id}
            onPress={() => setSelectedMethod(method.id)}
            className={`flex-row items-center bg-white p-5 rounded-2xl mb-4 border-2 ${
              selectedMethod === method.id
                ? "border-[#0f172a]"
                : "border-transparent shadow-sm"
            }`}
          >
            <View className="w-12 h-12 bg-gray-50 rounded-xl items-center justify-center mr-4">
              <Ionicons name="wallet-outline" size={24} color={method.color} />
            </View>
            <View className="flex-1">
              <Text className="text-[#0f172a] text-base font-bold">{method.name}</Text>
              <Text className="text-gray-400 text-xs">Fast & Secure Payment</Text>
            </View>
            <View
              className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                selectedMethod === method.id
                  ? "border-[#0f172a] bg-[#0f172a]"
                  : "border-gray-200"
              }`}
            >
              {selectedMethod === method.id && (
                <Ionicons name="checkmark" size={16} color="white" />
              )}
            </View>
          </TouchableOpacity>
        ))}

        <View className="bg-blue-50 p-4 rounded-2xl flex-row items-start mb-10">
          <Ionicons name="shield-checkmark" size={20} color="#3b82f6" />
          <View className="flex-1 ml-3">
            <Text className="text-blue-800 text-xs font-bold mb-1">Secure Transaction</Text>
            <Text className="text-blue-600/70 text-[10px] leading-4">
              Your payment is protected with 256-bit encryption. We do not store your
              financial details.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View className="p-6 bg-white border-t border-gray-100">
        <TouchableOpacity
          onPress={handlePayment}
          disabled={isProcessing}
          className="bg-[#0f172a] rounded-2xl py-4 flex-row justify-center items-center shadow-lg shadow-slate-300"
        >
          {isProcessing ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Text className="text-white text-lg font-bold mr-2">Pay NPR {amount}</Text>
              <Ionicons name="lock-closed" size={18} color="white" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}