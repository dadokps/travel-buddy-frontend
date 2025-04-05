
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
  EditProfile: { userId: string };
  TripChat: { tripId: string };
};

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

// Waypoint type
export type Waypoint = {
  id?: string;
  trip_id: string;
  location_name: string;
  latitude: number;
  longitude: number;
  sequence_order: number;
};

// Trip type
export type TripDetails = {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  start_location: string;
  destination: string;
  max_participants: number;
  organizer_id: string;
  created_at: string;
  organizer?: {
    id: string;
    firstname: string;
    lastname: string;
    avatar_url?: string;
  };
};

// Participant type
export type Participant = {
  id: string;
  user_id: string;
  trip_id: string;
  joined_at: string;
  approved: boolean;
  user?: {
    id: string;
    firstname: string;
    lastname: string;
    avatar_url?: string;
  };
};

// Chat Message type
export type ChatMessage = {
  id: string;
  room_id: string;
  sender_id: string;
  message_text: string;
  sent_at: string;
  sender?: {
    id: string;
    firstname: string;
    lastname: string;
    avatar_url?: string;
  };
};

// Profile type
export type Profile = {
  id: string;
  firstname: string;
  lastname: string;
  bio?: string;
  avatar_url?: string;
  rating?: number;
  created_at: string;
};
