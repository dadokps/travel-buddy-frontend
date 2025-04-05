
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  Trips: undefined;
  Explore: undefined;
  Profile: undefined;
};

export type MainStackParamList = {
  MainTabs: undefined;
  CreateTrip: undefined;
  TripDetails: { tripId: string };
  EditProfile: { profile: any };
  TripChat: { tripId: string };
};

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};
