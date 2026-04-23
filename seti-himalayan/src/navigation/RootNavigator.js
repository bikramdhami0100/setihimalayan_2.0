import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View } from 'react-native';
import useAuthStore from '../store/authStore';
import AuthNavigator from './AuthNavigator';
import CustomerNavigator from './CustomerNavigator';
import AdminNavigator from './AdminNavigator';
import { colors } from '../utils/colors';

export const RootNavigator = () => {
  const { user, isAuthenticated, isLoading, loadUser } = useAuthStore();
  console.log('Auth State:', { user, isAuthenticated, isLoading });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      await loadUser();
      setIsReady(true);
    };
    init();
  }, []);

  if (!isReady || isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!isAuthenticated ? (
        <AuthNavigator />
      ) : user?.role === 'admin' || user?.role === 'super_admin' ? (
        <AdminNavigator />
      ) : (
        <CustomerNavigator />
      )}
    </NavigationContainer>
  );
};