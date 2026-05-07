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
import axios from "axios";
import { getAccessToken } from "../../utils/storage";
import { getBookingByReference } from "../../api/bookings";

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
  const [paymentUrl, setPaymentUrl] = useState(null);
  const [paymentTransactionId, setPaymentTransactionId] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const webViewRef = useRef(null);
  const [esewaFormData, setEsewaFormData] = useState(null);
  const statusCheckIntervalRef = useRef(null);
  const { showSnackbar } = useContext(UIContext);
  // get the number of booking seats


  // Handle WebView navigation (native only)
  const handleWebViewNavigationStateChange = (newNavState) => {
    const url = newNavState.url;
    console.log("WebView URL:", url);

    if (url.includes("/esewa/success") || url.includes("/payment/success")) {
      console.log("✅ Payment Success Detected!");
      setShowWebView(false);
      setIsVerifying(true);
      startPolling(paymentTransactionId);
    } else if (url.includes("/esewa/failure") || url.includes("/payment/failure")) {
      console.log("❌ Payment Failure Detected!");
      clearPolling();
      setShowWebView(false);
      showSnackbar("❌ Payment cancelled or failed", "error");
    }
  };

  const handlePayment = async () => {
    setIsProcessing(true);
  
    
    try {
      const response = await initiatePayment(bookingId, selectedMethod);
        // const {amount,failure_url,product_code,product_delivery_charge,signature,signed_field_names,success_url,transaction_uuid,tax_amount,total_amount,transaction_id}=response?.data?.data?.esewaResult;
      const esewaData = response?.data?.data?.esewaResult;
       setEsewaFormData(esewaData);
      if (selectedMethod === "esewa") {
        
        // Platform-specific handling
        if (Platform.OS === "web") {
          // Web: open in new tab
           const form = document.createElement("form");

           
               form.method = "POST";
               form.action =
                 "https://rc-epay.esewa.com.np/api/epay/main/v2/form";
           
               Object.keys(esewaData).forEach((key) => {
           
                 const input = document.createElement("input");
           
                 input.type = "hidden";
                 input.name = key;
                 input.value = esewaData[key];
           
                 form.appendChild(input);
               });
           
               document.body.appendChild(form);
           
               form.submit();
          setIsProcessing(false);
          startPolling(payment_transaction_id);
          showSnackbar("Payment opened in new tab. Complete it there.", "info");
        } else {
          // Native: use WebView
      //      setPaymentUrl(
      //     "https://rc-epay.esewa.com.np/api/epay/main/v2/form"
      //  );

    setPaymentTransactionId(
      esewaData.transaction_uuid
    );

    // setEsewaFormData(esewaData);
          setShowWebView(true);
          // Fallback polling after 5 seconds (if WebView callback misses)
          // setTimeout(() => {
          //   if (showWebView && paymentTransactionId === payment_transaction_id) {
          //     startPolling(payment_transaction_id);
          //   }
          // }, 5000);
        }
      } else if (selectedMethod === "khalti") {
        showSnackbar("Khalti payment coming soon", "info");
        setIsProcessing(false);
      } else if (selectedMethod === "connectips") {
        showSnackbar("ConnectIPS payment coming soon", "info");
        setIsProcessing(false);
      }
    } catch (err) {
      console.error("Payment error:", err);
      showSnackbar(err.response?.data?.message || "Payment initiation failed", "error");
      setIsProcessing(false);
    }
  };



  // ----- WebView for native platforms only -----
  if ( esewaFormData && showWebView && paymentUrl && Platform.OS !== "web") {
    return (
      <SafeAreaView style={{ flex: 1 }} className="flex-1 bg-white">
        <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
          <Text className="text-[#0f172a] text-lg font-bold">eSewa Payment</Text>
          <TouchableOpacity
            onPress={() => {
              setShowWebView(false);
              clearPolling();
            }}
            className="p-2"
          >
            <Ionicons name="close" size={24} color="#0f172a" />
          </TouchableOpacity>
        </View>

        <WebView
          ref={webViewRef}
          originWhitelist={["*"]}
          source={{ 
             html:`
              <html>
        <body onload="document.forms[0].submit()">
          <form
            action="https://rc-epay.esewa.com.np/api/epay/main/v2/form"
            method="POST"
          >
            ${Object.keys(esewaFormData || {})
              .map(
                key => `
                  <input
                    type="hidden"
                    name="${key}"
                    value="${esewaFormData[key]}"
                  />
                `
              )
              .join("")}
          </form>
        </body>
      </html>
             `
           }}
          onNavigationStateChange={handleWebViewNavigationStateChange}

          // startInLoadingState={true}
          // renderLoading={() => (
          //   <View className="flex-1 items-center justify-center">
          //     <ActivityIndicator size="large" color="#0f172a" />
          //     <Text className="mt-4 text-gray-500">Loading eSewa...</Text>
          //   </View>
          // )}
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

  // ----- Main UI (shared across all platforms) -----
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