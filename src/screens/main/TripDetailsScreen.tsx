
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/types';
import { supabase } from '../../integrations/supabase/client';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import AppButton from '../../components/AppButton';
import MapView, { Marker, Polyline } from 'react-native-maps';

type Props = NativeStackScreenProps<MainStackParamList, 'TripDetails'>;

interface TripDetails {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  start_location: string;
  organizer_id: string;
  max_participants: number;
  organizer: {
    firstname: string;
    lastname: string;
    avatar_url: string | null;
  };
}

interface Waypoint {
  id: string;
  location_name: string;
  latitude: number;
  longitude: number;
  sequence_order: number;
}

interface Participant {
  id: string;
  user_id: string;
  approved: boolean;
  user: {
    firstname: string;
    lastname: string;
    avatar_url: string | null;
    rating_average: number | null;
  };
}

const TripDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { tripId } = route.params;
  const { user } = useAuth();
  
  const [trip, setTrip] = useState<TripDetails | null>(null);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [isParticipant, setIsParticipant] = useState(false);
  const [isPendingApproval, setIsPendingApproval] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [region, setRegion] = useState({
    latitude: 37.7749,
    longitude: -122.4194,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  useEffect(() => {
    fetchTripDetails();
  }, [tripId]);

  const fetchTripDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch trip details
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('*, organizer:profiles!trips_organizer_id_fkey(firstname, lastname, avatar_url)')
        .eq('id', tripId)
        .single();
      
      if (tripError) throw tripError;
      setTrip(tripData);
      setIsOrganizer(tripData.organizer_id === user?.id);
      
      // Fetch waypoints
      const { data: waypointData, error: waypointError } = await supabase
        .from('trip_waypoints')
        .select('*')
        .eq('trip_id', tripId)
        .order('sequence_order', { ascending: true });
      
      if (waypointError) throw waypointError;
      setWaypoints(waypointData || []);
      
      // Fetch participants
      const { data: participantData, error: participantError } = await supabase
        .from('trip_participants')
        .select('*, user:profiles!trip_participants_user_id_fkey(firstname, lastname, avatar_url, rating_average)')
        .eq('trip_id', tripId);
      
      if (participantError) throw participantError;
      setParticipants(participantData || []);
      setParticipantCount((participantData || []).filter(p => p.approved).length);
      
      // Check if current user is a participant
      const userParticipation = (participantData || []).find(p => p.user_id === user?.id);
      setIsParticipant(userParticipation?.approved || false);
      setIsPendingApproval(userParticipation && !userParticipation.approved);
      
      // Set map region based on waypoints or starting location
      if (waypointData && waypointData.length > 0) {
        setRegion({
          latitude: waypointData[0].latitude,
          longitude: waypointData[0].longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
      }
    } catch (error: any) {
      console.error('Error fetching trip details:', error.message);
      Alert.alert('Error', 'Failed to load trip details');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinTrip = async () => {
    try {
      setJoinLoading(true);
      
      // Check if the trip is full
      if (participantCount >= trip!.max_participants) {
        Alert.alert('Trip Full', 'Sorry, this trip has reached its maximum number of participants.');
        return;
      }
      
      const { error } = await supabase.rpc('apply_for_trip', {
        p_trip_id: tripId
      });
      
      if (error) throw error;
      
      Alert.alert(
        'Application Submitted',
        'Your request to join this trip has been submitted. You will be notified once the organizer approves your request.'
      );
      
      setIsPendingApproval(true);
    } catch (error: any) {
      console.error('Error joining trip:', error.message);
      Alert.alert('Error', 'Failed to join trip. Please try again.');
    } finally {
      setJoinLoading(false);
    }
  };

  const handleApproveParticipant = async (participantId: string, userId: string) => {
    try {
      const { error } = await supabase.rpc('approve_participant', {
        p_trip_id: tripId,
        p_user_id: userId
      });
      
      if (error) throw error;
      
      // Update UI
      fetchTripDetails();
      
      // Add participant to chat room
      await supabase.rpc('add_participant_to_chat', {
        p_trip_id: tripId,
        p_user_id: userId
      });
      
      Alert.alert('Success', 'Participant approved successfully');
    } catch (error: any) {
      console.error('Error approving participant:', error.message);
      Alert.alert('Error', 'Failed to approve participant');
    }
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };
  
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };
  
  const openChatRoom = () => {
    navigation.navigate('TripChat', { tripId });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading trip details...</Text>
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#e74c3c" />
        <Text style={styles.errorTitle}>Trip Not Found</Text>
        <AppButton
          title="Go Back"
          onPress={() => navigation.goBack()}
          type="outline"
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{trip.title}</Text>
        <View style={styles.organizerInfo}>
          <Text style={styles.organizerLabel}>Organized by</Text>
          <View style={styles.organizerProfile}>
            {trip.organizer.avatar_url ? (
              <Image
                source={{ uri: trip.organizer.avatar_url }}
                style={styles.organizerAvatar}
              />
            ) : (
              <View style={styles.organizerInitials}>
                <Text style={styles.initialsText}>
                  {getInitials(trip.organizer.firstname, trip.organizer.lastname)}
                </Text>
              </View>
            )}
            <Text style={styles.organizerName}>
              {trip.organizer.firstname} {trip.organizer.lastname}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={20} color="#3498db" />
            <View>
              <Text style={styles.infoLabel}>Start Date</Text>
              <Text style={styles.infoText}>{formatDate(trip.start_date)}</Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={20} color="#3498db" />
            <View>
              <Text style={styles.infoLabel}>End Date</Text>
              <Text style={styles.infoText}>{formatDate(trip.end_date)}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="location-outline" size={20} color="#3498db" />
            <View>
              <Text style={styles.infoLabel}>Starting Point</Text>
              <Text style={styles.infoText}>{trip.start_location}</Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="people-outline" size={20} color="#3498db" />
            <View>
              <Text style={styles.infoLabel}>Participants</Text>
              <Text style={styles.infoText}>{participantCount}/{trip.max_participants}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trip Description</Text>
        <Text style={styles.description}>{trip.description}</Text>
      </View>

      {waypoints.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trip Route</Text>
          
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              region={region}
              scrollEnabled={true}
              zoomEnabled={true}
            >
              {waypoints.map((waypoint, index) => (
                <Marker
                  key={waypoint.id}
                  coordinate={{
                    latitude: waypoint.latitude,
                    longitude: waypoint.longitude,
                  }}
                  title={waypoint.location_name}
                  pinColor={index === 0 ? 'green' : index === waypoints.length - 1 ? 'red' : 'blue'}
                />
              ))}
              
              {waypoints.length > 1 && (
                <Polyline
                  coordinates={waypoints.map(waypoint => ({
                    latitude: waypoint.latitude,
                    longitude: waypoint.longitude,
                  }))}
                  strokeColor="#3498db"
                  strokeWidth={3}
                />
              )}
            </MapView>
          </View>
          
          <View style={styles.waypointsList}>
            {waypoints.map((waypoint, index) => (
              <View key={waypoint.id} style={styles.waypointItem}>
                <View style={[styles.waypointMarker, 
                  index === 0 ? styles.startWaypoint : 
                  index === waypoints.length - 1 ? styles.endWaypoint : 
                  styles.midWaypoint
                ]}>
                  <Text style={styles.waypointNumber}>{index + 1}</Text>
                </View>
                <View style={styles.waypointDetails}>
                  <Text style={styles.waypointName}>{waypoint.location_name}</Text>
                  {index === 0 && <Text style={styles.waypointTag}>Starting Point</Text>}
                  {index === waypoints.length - 1 && <Text style={styles.waypointTag}>Destination</Text>}
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Participants</Text>
        
        {participants.length === 0 ? (
          <Text style={styles.noParticipantsText}>No participants yet</Text>
        ) : (
          <View style={styles.participantsList}>
            {participants.filter(p => p.approved).map((participant) => (
              <View key={participant.id} style={styles.participantItem}>
                {participant.user.avatar_url ? (
                  <Image
                    source={{ uri: participant.user.avatar_url }}
                    style={styles.participantAvatar}
                  />
                ) : (
                  <View style={styles.participantInitials}>
                    <Text style={styles.initialsText}>
                      {getInitials(participant.user.firstname, participant.user.lastname)}
                    </Text>
                  </View>
                )}
                <View style={styles.participantInfo}>
                  <Text style={styles.participantName}>
                    {participant.user.firstname} {participant.user.lastname}
                    {participant.user_id === trip.organizer_id && (
                      <Text style={styles.organizerTag}> (Organizer)</Text>
                    )}
                  </Text>
                  
                  {participant.user.rating_average && (
                    <View style={styles.ratingContainer}>
                      <Text style={styles.ratingText}>
                        {participant.user.rating_average.toFixed(1)}
                      </Text>
                      <Ionicons name="star" size={12} color="#f39c12" />
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
        
        {isOrganizer && participants.filter(p => !p.approved).length > 0 && (
          <View style={styles.pendingSection}>
            <Text style={styles.pendingSectionTitle}>Pending Approvals</Text>
            
            {participants.filter(p => !p.approved).map((participant) => (
              <View key={participant.id} style={styles.pendingItem}>
                <View style={styles.pendingParticipantInfo}>
                  {participant.user.avatar_url ? (
                    <Image
                      source={{ uri: participant.user.avatar_url }}
                      style={styles.pendingAvatar}
                    />
                  ) : (
                    <View style={styles.pendingInitials}>
                      <Text style={styles.pendingInitialsText}>
                        {getInitials(participant.user.firstname, participant.user.lastname)}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.pendingName}>
                    {participant.user.firstname} {participant.user.lastname}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.approveButton}
                  onPress={() => handleApproveParticipant(participant.id, participant.user_id)}
                >
                  <Text style={styles.approveButtonText}>Approve</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.actionButtons}>
        {isParticipant || isOrganizer ? (
          <AppButton
            title="Open Chat"
            onPress={openChatRoom}
            type="primary"
            style={styles.chatButton}
          />
        ) : isPendingApproval ? (
          <View style={styles.pendingContainer}>
            <Ionicons name="time-outline" size={24} color="#f39c12" />
            <Text style={styles.pendingText}>Waiting for approval</Text>
          </View>
        ) : (
          <AppButton
            title="Join Trip"
            onPress={handleJoinTrip}
            loading={joinLoading}
            disabled={participantCount >= trip.max_participants}
          />
        )}
        
        {participantCount >= trip.max_participants && !isParticipant && !isPendingApproval && (
          <Text style={styles.tripFullText}>This trip is full</Text>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#7f8c8d',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginVertical: 16,
  },
  header: {
    backgroundColor: '#3498db',
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 16,
  },
  organizerInfo: {
    flexDirection: 'column',
  },
  organizerLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginBottom: 4,
  },
  organizerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  organizerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'white',
  },
  organizerInitials: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'white',
  },
  initialsText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  organizerName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginTop: -20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '48%',
  },
  infoLabel: {
    color: '#7f8c8d',
    fontSize: 12,
    marginBottom: 2,
    marginLeft: 6,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2c3e50',
    marginLeft: 6,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    margin: 16,
    marginTop: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#7f8c8d',
    lineHeight: 20,
  },
  mapContainer: {
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  waypointsList: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  waypointItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  waypointMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  startWaypoint: {
    backgroundColor: '#2ecc71',
  },
  midWaypoint: {
    backgroundColor: '#3498db',
  },
  endWaypoint: {
    backgroundColor: '#e74c3c',
  },
  waypointNumber: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  waypointDetails: {
    flex: 1,
  },
  waypointName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2c3e50',
  },
  waypointTag: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  participantsList: {
    gap: 12,
  },
  noParticipantsText: {
    color: '#7f8c8d',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 12,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  participantInitials: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  participantInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  participantName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2c3e50',
  },
  organizerTag: {
    color: '#3498db',
    fontWeight: 'normal',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff8e1',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  ratingText: {
    fontSize: 12,
    color: '#f39c12',
    marginRight: 2,
  },
  pendingSection: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 16,
  },
  pendingSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  pendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  pendingParticipantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pendingAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  pendingInitials: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#95a5a6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  pendingInitialsText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  pendingName: {
    fontSize: 14,
    color: '#2c3e50',
  },
  approveButton: {
    backgroundColor: '#2ecc71',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  approveButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionButtons: {
    padding: 16,
    paddingBottom: 32,
  },
  chatButton: {
    backgroundColor: '#2ecc71',
  },
  pendingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff8e1',
    paddingVertical: 12,
    borderRadius: 8,
  },
  pendingText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#f39c12',
    fontWeight: '500',
  },
  tripFullText: {
    textAlign: 'center',
    color: '#e74c3c',
    marginTop: 8,
  },
});

export default TripDetailsScreen;
