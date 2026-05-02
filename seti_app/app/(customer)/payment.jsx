import React, { useState, useContext } from "react";
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { initiatePayment } from "../../api/payments";
import { UIContext } from "../../context/UIContext";
import { BookingContext } from "../../context/BookingContext";

const PAYMENT_METHODS = [
  { id: 'esewa', name: 'eSewa', icon: 'https://esewa.com.np/common/images/esewa_logo.png', color: '#60bb46' },
  { id: 'khalti', name: 'Khalti', icon: 'https://khalti.com/static/resources/img/khalti-logo.png', color: '#5d2e8e' },
  { id: 'connectips', name: 'ConnectIPS', icon: 'https://login.connectips.com/resources/images/connectips.png', color: '#1e3a8a' },
];

export default function PaymentScreen() {
  const { bookingId, amount, reference } = useLocalSearchParams();
  console.log(bookingId,amount,reference,"these are params")
  const [selectedMethod, setSelectedMethod] = useState('esewa');
  const [isProcessing, setIsProcessing] = useState(false);
  const { showSnackbar } = useContext(UIContext);

  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      const response = await initiatePayment(bookingId, selectedMethod);
      console.log(response,"this is response")
      const { payment_url, transaction_id,payment_transaction_id } = response.data.data;
      
      // In a real app, we would open a WebView here.
      // For this demo, we'll simulate a successful payment.
      console.log("Payment URL:", payment_url);
      
      setTimeout(() => {
        setIsProcessing(false);
        showSnackbar("Payment successful!", "success");
        router.push({
          pathname: "/(customer)/booking-confirmation",
          params: { bookingReference: reference }
        });
      }, 2000);
      
    } catch (err) {
      setIsProcessing(false);
      showSnackbar("Payment initiation failed", "error");
    }
  };

  return (
    <SafeAreaView style={{flex: 1}} className="flex-1 bg-[#f8fafc]">
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text className="text-[#0f172a] text-lg font-bold">Payment</Text>
      </View>

      <ScrollView className="flex-1 p-6" showsVerticalScrollIndicator={false}>
        <View className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-8 items-center">
          <Text className="text-gray-400 text-xs font-bold tracking-widest uppercase mb-2">Amount to Pay</Text>
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
            className={`flex-row items-center bg-white p-5 rounded-2xl mb-4 border-2 ${selectedMethod === method.id ? 'border-[#0f172a]' : 'border-transparent shadow-sm'}`}
          >
            <View className="w-12 h-12 bg-gray-50 rounded-xl items-center justify-center mr-4">
              {/* Use Ionicons as fallback for icons */}
              <Ionicons name="wallet-outline" size={24} color={method.color} />
            </View>
            <View className="flex-1">
              <Text className="text-[#0f172a] text-base font-bold">{method.name}</Text>
              <Text className="text-gray-400 text-xs">Fast & Secure Payment</Text>
            </View>
            <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${selectedMethod === method.id ? 'border-[#0f172a] bg-[#0f172a]' : 'border-gray-200'}`}>
              {selectedMethod === method.id && <Ionicons name="checkmark" size={16} color="white" />}
            </View>
          </TouchableOpacity>
        ))}

        <View className="bg-blue-50 p-4 rounded-2xl flex-row items-start mb-10">
          <Ionicons name="shield-checkmark" size={20} color="#3b82f6" />
          <View className="flex-1 ml-3">
            <Text className="text-blue-800 text-xs font-bold mb-1">Secure Transaction</Text>
            <Text className="text-blue-600/70 text-[10px] leading-4">Your payment is protected with 256-bit encryption. We do not store your financial details.</Text>
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
