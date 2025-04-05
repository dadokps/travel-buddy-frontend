
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View, Text } from 'react-native';
import { useAuth } from '../context/AuthContext';

// Auth Screens
import SignInScreen from '../screens/auth/SignInScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

// Main Screens
import TripsScreen from '../screens/main/TripsScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import CreateTripScreen from '../screens/main/CreateTripScreen';
import TripDetailsScreen from '../screens/main/TripDetailsScreen';
import EditProfileScreen from '../screens/main/EditProfileScreen';
import TripChatScreen from '../screens/main/TripChatScreen';

// Navigation Types
import { RootStackParamList, AuthStackParamList, MainTabParamList, MainStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const AuthNavigator = () => {
  return (
    <AuthStack.Navigator 
      screenOptions={{ 
        headerShown: false,
        animation: 'slide_from_right'
      }}
    >
      <AuthStack.Screen name="SignIn" component={SignInScreen} />
      <AuthStack.Screen name="SignUp" component={SignUpScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  );
};

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: '#3498db',
        tabBarInactiveTintColor: '#95a5a6',
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#f0f0f0',
          height: 60,
          paddingBottom: 10,
          paddingTop: 5,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Trips') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'Explore') {
            iconName = focused ? 'compass' : 'compass-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person-circle' : 'person-circle-outline';
          }

          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen 
        name="Trips" 
        component={TripsScreen} 
        options={{
          title: 'My Trips'
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          title: 'Profile'
        }}  
      />
    </Tab.Navigator>
  );
};

const MainNavigator = () => {
  return (
    <MainStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right'
      }}
    >
      <MainStack.Screen name="MainTabs" component={MainTabs} />
      <MainStack.Screen 
        name="CreateTrip" 
        component={CreateTripScreen} 
        options={{
          headerShown: true,
          title: 'Create Trip',
          animation: 'slide_from_bottom'
        }}
      />
      <MainStack.Screen 
        name="TripDetails" 
        component={TripDetailsScreen} 
        options={{
          headerShown: false
        }}
      />
      <MainStack.Screen 
        name="EditProfile" 
        component={EditProfileScreen} 
        options={{
          headerShown: false
        }}
      />
      <MainStack.Screen 
        name="TripChat" 
        component={TripChatScreen} 
        options={{
          headerShown: false
        }}
      />
    </MainStack.Navigator>
  );
};

const Navigation = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#7f8c8d' }}>
          Loading...
        </Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="Main" component={MainNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default Navigation;
