
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../integrations/supabase/client';
import AppButton from '../../components/AppButton';

type Props = BottomTabScreenProps<MainTabParamList, 'Profile'>;

interface UserProfile {
  id: string;
  firstname: string;
  lastname: string;
  age: number | null;
  bio: string | null;
  avatar_url: string | null;
  rating_average: number | null;
  rating_count: number | null;
  created_at: string;
}

interface UserTrip {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  start_location: string;
  is_organizer: boolean;
}

const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [trips, setTrips] = useState<UserTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [tripsLoading, setTripsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchUserTrips();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      console.error('Error fetching profile:', error.message);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserTrips = async () => {
    try {
      setTripsLoading(true);
      
      // Fetch trips user is participating in
      const { data: participatingTrips, error: participatingError } = await supabase
        .from('trip_participants')
        .select(`
          trip_id,
          trips:trip_id(
            id,
            title,
            start_date,
            end_date,
            start_location,
            organizer_id
          )
        `)
        .eq('user_id', user?.id);
      
      if (participatingError) throw participatingError;
      
      // Fetch trips user is organizing but not participating in
      const { data: organizingTrips, error: organizingError } = await supabase
        .from('trips')
        .select('id, title, start_date, end_date, start_location, organizer_id')
        .eq('organizer_id', user?.id)
        .not('id', 'in', (participatingTrips || []).map(pt => pt.trip_id).filter(Boolean));
      
      if (organizingError) throw organizingError;
      
      // Combine both sets of trips and mark if user is organizer
      const combinedTrips = [
        ...(participatingTrips || []).map(pt => ({
          id: pt.trips.id,
          title: pt.trips.title,
          start_date: pt.trips.start_date,
          end_date: pt.trips.end_date,
          start_location: pt.trips.start_location,
          is_organizer: pt.trips.organizer_id === user?.id
        })),
        ...(organizingTrips || []).map(trip => ({
          id: trip.id,
          title: trip.title,
          start_date: trip.start_date,
          end_date: trip.end_date,
          start_location: trip.start_location,
          is_organizer: true
        }))
      ];
      
      // Sort by start date, most recent first
      combinedTrips.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
      
      setTrips(combinedTrips);
    } catch (error: any) {
      console.error('Error fetching user trips:', error.message);
    } finally {
      setTripsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const handleEditProfile = () => {
    navigation.navigate('EditProfile', { profile });
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <View style={styles.profileImageContainer}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.profileImage} />
          ) : (
            <View style={styles.initialsContainer}>
              <Text style={styles.initialsText}>
                {profile ? getInitials(profile.firstname, profile.lastname) : 'U'}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.profileInfo}>
          <Text style={styles.name}>{profile?.firstname} {profile?.lastname}</Text>
          {profile?.rating_average ? (
            <View style={styles.ratingContainer}>
              <View style={styles.starsContainer}>
                {[...Array(5)].map((_, i) => (
                  <Ionicons
                    key={i}
                    name={i < Math.round(profile.rating_average) ? 'star' : 'star-outline'}
                    size={16}
                    color="#f39c12"
                    style={styles.star}
                  />
                ))}
              </View>
              <Text style={styles.ratingText}>
                {profile.rating_average.toFixed(1)} ({profile.rating_count} {profile.rating_count === 1 ? 'review' : 'reviews'})
              </Text>
            </View>
          ) : (
            <Text style={styles.noRatingText}>No ratings yet</Text>
          )}
          
          <TouchableOpacity style={styles.editProfileButton} onPress={handleEditProfile}>
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.bioSection}>
        <Text style={styles.bioTitle}>About Me</Text>
        <Text style={styles.bioText}>{profile?.bio || 'No bio added yet.'}</Text>
        
        <View style={styles.detailsContainer}>
          <View style={styles.detailItem}>
            <Ionicons name="calendar-outline" size={20} color="#7f8c8d" />
            <Text style={styles.detailText}>
              Joined {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Recently'}
            </Text>
          </View>
          
          {profile?.age && (
            <View style={styles.detailItem}>
              <Ionicons name="person-outline" size={20} color="#7f8c8d" />
              <Text style={styles.detailText}>Age: {profile.age}</Text>
            </View>
          )}
        </View>
      </View>
      
      <View style={styles.tripsSection}>
        <Text style={styles.sectionTitle}>My Trips</Text>
        
        {tripsLoading ? (
          <ActivityIndicator size="small" color="#3498db" style={styles.tripsLoading} />
        ) : trips.length === 0 ? (
          <View style={styles.emptyTripsContainer}>
            <Ionicons name="airplane-outline" size={48} color="#ccc" />
            <Text style={styles.emptyTripsText}>You haven't joined any trips yet</Text>
            <TouchableOpacity
              style={styles.findTripsButton}
              onPress={() => navigation.navigate('Trips')}
            >
              <Text style={styles.findTripsText}>Find Trips</Text>
            </TouchableOpacity>
          </View>
        ) : (
          trips.map((trip) => (
            <TouchableOpacity
              key={trip.id}
              style={styles.tripCard}
              onPress={() => navigation.navigate('TripDetails', { tripId: trip.id })}
            >
              <View style={styles.tripHeader}>
                <Text style={styles.tripTitle}>{trip.title}</Text>
                {trip.is_organizer && (
                  <View style={styles.organizerBadge}>
                    <Text style={styles.organizerText}>Organizer</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.tripDetails}>
                <View style={styles.tripDetail}>
                  <Ionicons name="calendar-outline" size={16} color="#7f8c8d" />
                  <Text style={styles.tripDetailText}>
                    {formatDate(trip.start_date)} - {formatDate(trip.end_date)}
                  </Text>
                </View>
                
                <View style={styles.tripDetail}>
                  <Ionicons name="location-outline" size={16} color="#7f8c8d" />
                  <Text style={styles.tripDetailText}>{trip.start_location}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
      
      <AppButton
        title="Sign Out"
        onPress={handleSignOut}
        type="outline"
        style={styles.signOutButton}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  contentContainer: {
    padding: 16,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  profileImageContainer: {
    marginRight: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  initialsContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  star: {
    marginRight: 2,
  },
  ratingText: {
    fontSize: 13,
    color: '#7f8c8d',
  },
  noRatingText: {
    fontSize: 13,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  editProfileButton: {
    backgroundColor: '#f2f2f2',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  editProfileText: {
    color: '#3498db',
    fontSize: 13,
    fontWeight: '500',
  },
  bioSection: {
    marginTop: 16,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  bioTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  bioText: {
    fontSize: 14,
    color: '#7f8c8d',
    lineHeight: 20,
    marginBottom: 16,
  },
  detailsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#f2f2f2',
    paddingTop: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 8,
    color: '#7f8c8d',
    fontSize: 14,
  },
  tripsSection: {
    marginTop: 16,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
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
    marginBottom: 16,
  },
  tripsLoading: {
    marginTop: 20,
    marginBottom: 20,
  },
  emptyTripsContainer: {
    alignItems: 'center',
    padding: 20,
  },
  emptyTripsText: {
    marginTop: 12,
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  findTripsButton: {
    marginTop: 16,
    backgroundColor: '#3498db',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  findTripsText: {
    color: 'white',
    fontWeight: '600',
  },
  tripCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#3498db',
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tripTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
  },
  organizerBadge: {
    backgroundColor: '#e8f5fd',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  organizerText: {
    color: '#3498db',
    fontSize: 12,
    fontWeight: '500',
  },
  tripDetails: {
    gap: 5,
  },
  tripDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tripDetailText: {
    marginLeft: 5,
    fontSize: 13,
    color: '#7f8c8d',
  },
  signOutButton: {
    marginTop: 24,
  },
});

export default ProfileScreen;
