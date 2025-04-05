
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import Navigation from './navigation/Navigation';
import { Platform, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';

// Initialize React Query client
const queryClient = new QueryClient();

const App = () => {
  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'}
        backgroundColor="#3498db"
      />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Navigation />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
};

export default App;
