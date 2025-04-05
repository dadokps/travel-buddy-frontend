
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../integrations/supabase/client';
import { MainTabParamList } from '../../navigation/types';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

type Props = BottomTabScreenProps<MainTabParamList, 'Trips'>;

interface Trip {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  start_location: string;
  organizer_id: string;
  created_at: string;
  participant_count: number;
  max_participants: number;
}

const TripsScreen: React.FC<Props> = ({ navigation }) => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrips = async () => {
    try {
      setError(null);
      const { data, error } = await supabase
        .from('trips')
        .select(`
          id, 
          title, 
          description, 
          start_date, 
          end_date, 
          start_location,
          organizer_id,
          created_at,
          max_participants
        `)
        .order('start_date', { ascending: true });

      if (error) throw error;
      
      // Get participant counts for each trip
      if (data) {
        const tripsWithCounts = await Promise.all(data.map(async (trip) => {
          const { count, error: countError } = await supabase
            .from('trip_participants')
            .select('*', { count: 'exact', head: true })
            .eq('trip_id', trip.id);
          
          return {
            ...trip,
            participant_count: countError ? 0 : (count || 0)
          };
        }));
        
        setTrips(tripsWithCounts);
      }
    } catch (error: any) {
      console.error('Error fetching trips:', error.message);
      setError('Failed to load trips. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTrips();
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading trips...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Trip Explorer</Text>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => navigation.navigate('CreateTrip')}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchTrips}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : trips.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="airplane-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No trips found</Text>
          <Text style={styles.emptySubtitle}>Be the first to create a trip!</Text>
          <TouchableOpacity
            style={styles.createTripButton}
            onPress={() => navigation.navigate('CreateTrip')}
          >
            <Text style={styles.createTripButtonText}>Create a Trip</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.tripCard}
              onPress={() => navigation.navigate('TripDetails', { tripId: item.id })}
            >
              <View style={styles.tripHeader}>
                <Text style={styles.tripTitle}>{item.title}</Text>
                <View style={styles.participantsContainer}>
                  <Ionicons name="people" size={16} color="#7f8c8d" />
                  <Text style={styles.participantsText}>{item.participant_count}/{item.max_participants}</Text>
                </View>
              </View>
              
              <Text style={styles.tripDescription} numberOfLines={2}>
                {item.description}
              </Text>
              
              <View style={styles.tripFooter}>
                <View style={styles.dateContainer}>
                  <Ionicons name="calendar-outline" size={16} color="#7f8c8d" />
                  <Text style={styles.dateText}>
                    {formatDate(item.start_date)} - {formatDate(item.end_date)}
                  </Text>
                </View>
                
                <View style={styles.locationContainer}>
                  <Ionicons name="location-outline" size={16} color="#7f8c8d" />
                  <Text style={styles.locationText} numberOfLines={1}>
                    {item.start_location}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  createButton: {
    backgroundColor: '#3498db',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
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
  list: {
    padding: 16,
  },
  tripCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tripTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
  },
  participantsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  participantsText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#7f8c8d',
  },
  tripDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 16,
  },
  tripFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#7f8c8d',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '50%',
  },
  locationText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#7f8c8d',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#3498db',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 8,
    marginBottom: 24,
  },
  createTripButton: {
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  createTripButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default TripsScreen;
