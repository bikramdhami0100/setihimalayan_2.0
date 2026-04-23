import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../../api/client';
import useUIStore from '../../store/uiStore';
import { colors } from '../../utils/colors';

const forgotSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export default function ForgotPasswordScreen({ navigation }) {
  const [isLoading, setIsLoading] = useState(false);
  const { showSnackbar } = useUIStore();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: data.email });
      showSnackbar('Password reset link sent to your email', 'success');
      navigation.navigate('Login');
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to send reset link';
      showSnackbar(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            Reset Password
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Enter your email to receive a password reset link
          </Text>
        </View>

        <View style={styles.form}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                mode="outlined"
                label="Email"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                autoCapitalize="none"
                keyboardType="email-address"
                left={<TextInput.Icon icon="email" />}
                error={!!errors.email}
                style={styles.input}
              />
            )}
          />
          {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}

          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
            disabled={isLoading}
            style={styles.button}
            buttonColor={colors.primary}
          >
            Send Reset Link
          </Button>

          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.linkText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  header: { alignItems: 'center', marginBottom: 32 },
  title: { color: colors.primary, fontWeight: 'bold' },
  subtitle: { color: colors.textSecondary, marginTop: 8, textAlign: 'center' },
  form: { width: '100%' },
  input: { marginBottom: 8, backgroundColor: colors.surface },
  errorText: { color: colors.error, fontSize: 12, marginBottom: 12, marginLeft: 8 },
  button: { marginTop: 16, paddingVertical: 6 },
  linkText: { textAlign: 'center', marginTop: 20, color: colors.primary },
});