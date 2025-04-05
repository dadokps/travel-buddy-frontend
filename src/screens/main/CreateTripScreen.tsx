
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, TextInput } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/types';
import { supabase } from '../../integrations/supabase/client';
import InputField from '../../components/InputField';
import AppButton from '../../components/AppButton';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

type Props = NativeStackScreenProps<MainStackParamList, 'CreateTrip'>;

interface Waypoint {
  id: string;
  location_name: string;
  latitude: number;
  longitude: number;
  sequence_order: number;
}

const CreateTripScreen: React.FC<Props> = ({ navigation }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startLocation, setStartLocation] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('4');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(new Date().setDate(new Date().getDate() + 7)));
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [newWaypointName, setNewWaypointName] = useState('');
  const [newWaypointLocation, setNewWaypointLocation] = useState({ latitude: 37.7749, longitude: -122.4194 });
  const [region, setRegion] = useState({
    latitude: 37.7749,
    longitude: -122.4194,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const getCurrentLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission to access location was denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      
      setRegion({
        latitude,
        longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
      
      setNewWaypointLocation({ latitude, longitude });
    } catch (error) {
      console.log('Error getting location', error);
      Alert.alert('Error', 'Could not get your current location');
    }
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!title.trim()) newErrors.title = 'Title is required';
    if (!description.trim()) newErrors.description = 'Description is required';
    if (!startLocation.trim()) newErrors.startLocation = 'Start location is required';
    
    const maxPart = parseInt(maxParticipants);
    if (isNaN(maxPart) || maxPart < 2) {
      newErrors.maxParticipants = 'Must allow at least 2 participants';
    }
    
    if (endDate < startDate) {
      newErrors.endDate = 'End date must be after start date';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const addWaypoint = () => {
    if (!newWaypointName.trim()) {
      Alert.alert('Error', 'Please enter a location name');
      return;
    }
    
    const newWaypoint: Waypoint = {
      id: Date.now().toString(), // temporary id for UI
      location_name: newWaypointName,
      latitude: newWaypointLocation.latitude,
      longitude: newWaypointLocation.longitude,
      sequence_order: waypoints.length + 1,
    };
    
    setWaypoints([...waypoints, newWaypoint]);
    setNewWaypointName('');
  };

  const removeWaypoint = (index: number) => {
    const updatedWaypoints = [...waypoints];
    updatedWaypoints.splice(index, 1);
    
    // Update sequence_order for all waypoints after the removed one
    const reorderedWaypoints = updatedWaypoints.map((waypoint, idx) => ({
      ...waypoint,
      sequence_order: idx + 1
    }));
    
    setWaypoints(reorderedWaypoints);
  };

  const handleCreateTrip = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      // Insert trip
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .insert([
          {
            title,
            description,
            start_location: startLocation,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            max_participants: parseInt(maxParticipants),
            // organizer_id is set automatically via RLS policy
          }
        ])
        .select()
        .single();
      
      if (tripError) throw tripError;
      
      // Insert waypoints
      if (waypoints.length > 0) {
        const waypointsToInsert = waypoints.map(wp => ({
          trip_id: tripData.id,
          location_name: wp.location_name,
          latitude: wp.latitude,
          longitude: wp.longitude,
          sequence_order: wp.sequence_order
        }));
        
        const { error: waypointsError } = await supabase
          .from('trip_waypoints')
          .insert(waypointsToInsert);
        
        if (waypointsError) throw waypointsError;
      }
      
      Alert.alert('Success', 'Trip created successfully');
      navigation.navigate('TripDetails', { tripId: tripData.id });
    } catch (error: any) {
      console.error('Error creating trip:', error.message);
      Alert.alert('Error', 'Failed to create trip. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create New Trip</Text>

      <View style={styles.formContainer}>
        <InputField
          label="Trip Title"
          value={title}
          onChangeText={setTitle}
          placeholder="Enter a catchy title for your trip"
          error={errors.title}
        />
        
        <View style={styles.formGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.textArea, errors.description && styles.inputError]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your trip, activities, expectations..."
            multiline
            numberOfLines={4}
          />
          {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
        </View>
        
        <InputField
          label="Starting Location"
          value={startLocation}
          onChangeText={setStartLocation}
          placeholder="City or specific location"
          error={errors.startLocation}
        />
        
        <InputField
          label="Maximum Participants"
          value={maxParticipants}
          onChangeText={setMaxParticipants}
          placeholder="Enter number"
          keyboardType="numeric"
          error={errors.maxParticipants}
        />
        
        <View style={styles.datesContainer}>
          <View style={styles.datePickerContainer}>
            <Text style={styles.label}>Start Date</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowStartDatePicker(true)}
            >
              <Text>{formatDate(startDate)}</Text>
              <Ionicons name="calendar-outline" size={20} color="#3498db" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.datePickerContainer}>
            <Text style={styles.label}>End Date</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowEndDatePicker(true)}
            >
              <Text>{formatDate(endDate)}</Text>
              <Ionicons name="calendar-outline" size={20} color="#3498db" />
            </TouchableOpacity>
            {errors.endDate && <Text style={styles.errorText}>{errors.endDate}</Text>}
          </View>
        </View>

        {showStartDatePicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowStartDatePicker(false);
              if (selectedDate) setStartDate(selectedDate);
            }}
            minimumDate={new Date()}
          />
        )}

        {showEndDatePicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowEndDatePicker(false);
              if (selectedDate) setEndDate(selectedDate);
            }}
            minimumDate={startDate}
          />
        )}

        <Text style={styles.sectionTitle}>Add Waypoints</Text>
        <Text style={styles.sectionSubtitle}>
          Mark locations you plan to visit during your trip
        </Text>
        
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            region={region}
            onRegionChangeComplete={setRegion}
            onPress={(e) => setNewWaypointLocation(e.nativeEvent.coordinate)}
          >
            {waypoints.map((waypoint, index) => (
              <Marker
                key={waypoint.id}
                coordinate={{
                  latitude: waypoint.latitude,
                  longitude: waypoint.longitude,
                }}
                title={waypoint.location_name}
                pinColor={index === 0 ? 'green' : 'red'}
              />
            ))}
            <Marker
              coordinate={newWaypointLocation}
              title="New Waypoint"
              pinColor="blue"
            />
          </MapView>
          <TouchableOpacity 
            style={styles.locationButton}
            onPress={getCurrentLocation}
          >
            <Ionicons name="locate" size={24} color="white" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.waypointForm}>
          <InputField
            label="Waypoint Name"
            value={newWaypointName}
            onChangeText={setNewWaypointName}
            placeholder="Enter location name"
          />
          <AppButton 
            title="Add Waypoint" 
            onPress={addWaypoint}
            type="secondary"
          />
        </View>
        
        {waypoints.length > 0 && (
          <View style={styles.waypointsList}>
            <Text style={styles.waypointsTitle}>Trip Waypoints:</Text>
            {waypoints.map((waypoint, index) => (
              <View key={waypoint.id} style={styles.waypointItem}>
                <Text style={styles.waypointNumber}>{index + 1}.</Text>
                <Text style={styles.waypointName}>{waypoint.location_name}</Text>
                <TouchableOpacity 
                  onPress={() => removeWaypoint(index)}
                  style={styles.removeButton}
                >
                  <Ionicons name="close" size={18} color="#e74c3c" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        
        <AppButton
          title="Create Trip"
          onPress={handleCreateTrip}
          loading={loading}
          style={styles.createButton}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: '#f9f9f9',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
    marginTop: 8,
  },
  formContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
    color: '#333',
    fontWeight: '500',
  },
  textArea: {
    height: 100,
    borderWidth: 1,
    borderRadius: 8,
    borderColor: '#ddd',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'white',
    fontSize: 16,
    textAlignVertical: 'top',
  },
  datesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  datePickerContainer: {
    width: '48%',
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    borderColor: '#ddd',
    paddingHorizontal: 12,
    backgroundColor: 'white',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 12,
    marginTop: 4,
  },
  inputError: {
    borderColor: '#e74c3c',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 16,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 16,
  },
  mapContainer: {
    height: 300,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  locationButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: '#3498db',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  waypointForm: {
    marginBottom: 16,
  },
  waypointsList: {
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
  },
  waypointsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#2c3e50',
  },
  waypointItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  waypointNumber: {
    fontWeight: 'bold',
    marginRight: 8,
    color: '#3498db',
    width: 20,
  },
  waypointName: {
    flex: 1,
    fontSize: 14,
  },
  removeButton: {
    padding: 4,
  },
  createButton: {
    marginTop: 16,
  },
});

export default CreateTripScreen;
