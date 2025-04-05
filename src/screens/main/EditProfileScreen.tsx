
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Image, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/types';
import { supabase } from '../../integrations/supabase/client';
import { useAuth } from '../../context/AuthContext';
import InputField from '../../components/InputField';
import AppButton from '../../components/AppButton';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<MainStackParamList, 'EditProfile'>;

interface UserProfile {
  id: string;
  firstname: string;
  lastname: string;
  age: number | null;
  bio: string | null;
  avatar_url: string | null;
}

const EditProfileScreen: React.FC<Props> = ({ navigation, route }) => {
  const { profile } = route.params;
  const { user } = useAuth();
  
  const [firstName, setFirstName] = useState(profile?.firstname || '');
  const [lastName, setLastName] = useState(profile?.lastname || '');
  const [age, setAge] = useState(profile?.age ? profile.age.toString() : '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [avatar, setAvatar] = useState<string | null>(profile?.avatar_url);
  const [newAvatarUri, setNewAvatarUri] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission required', 'Please allow access to your photo library');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        setNewAvatarUri(selectedAsset.uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!firstName.trim()) newErrors.firstName = 'First name is required';
    if (!lastName.trim()) newErrors.lastName = 'Last name is required';
    
    if (age && isNaN(parseInt(age))) {
      newErrors.age = 'Age must be a number';
    } else if (age && (parseInt(age) < 13 || parseInt(age) > 120)) {
      newErrors.age = 'Please enter a valid age between 13 and 120';
    }
    
    if (bio && bio.length > 300) {
      newErrors.bio = 'Bio must be 300 characters or less';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!newAvatarUri || !user) return null;
    
    try {
      // Convert the image URI to a Blob
      const response = await fetch(newAvatarUri);
      const blob = await response.blob();
      
      const fileExt = newAvatarUri.split('.').pop()?.toLowerCase() || 'jpg';
      const filePath = `avatars/${user.id}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
        });
        
      if (uploadError) throw uploadError;
      
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error: any) {
      console.error('Error uploading avatar:', error.message);
      return null;
    }
  };

  const handleSaveProfile = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      let avatarUrl = avatar;
      
      // Upload new avatar if selected
      if (newAvatarUri) {
        avatarUrl = await uploadAvatar();
      }
      
      const updateData: Partial<UserProfile> = {
        firstname: firstName,
        lastname: lastName,
        bio: bio || null,
      };
      
      if (age) updateData.age = parseInt(age);
      if (avatarUrl) updateData.avatar_url = avatarUrl;
      
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user?.id);
      
      if (error) throw error;
      
      Alert.alert('Success', 'Profile updated successfully');
      navigation.goBack();
    } catch (error: any) {
      console.error('Error updating profile:', error.message);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Edit Profile</Text>
      
      <View style={styles.avatarContainer}>
        {newAvatarUri ? (
          <Image source={{ uri: newAvatarUri }} style={styles.avatar} />
        ) : avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.initialsContainer}>
            <Text style={styles.initialsText}>
              {getInitials(firstName || 'U', lastName || 'U')}
            </Text>
          </View>
        )}
        
        <TouchableOpacity style={styles.changePhotoButton} onPress={pickImage}>
          <Ionicons name="camera" size={20} color="white" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.formContainer}>
        <InputField
          label="First Name"
          value={firstName}
          onChangeText={setFirstName}
          placeholder="Enter your first name"
          autoCapitalize="words"
          error={errors.firstName}
        />
        
        <InputField
          label="Last Name"
          value={lastName}
          onChangeText={setLastName}
          placeholder="Enter your last name"
          autoCapitalize="words"
          error={errors.lastName}
        />
        
        <InputField
          label="Age (Optional)"
          value={age}
          onChangeText={setAge}
          placeholder="Enter your age"
          keyboardType="numeric"
          error={errors.age}
        />
        
        <View style={styles.textAreaContainer}>
          <Text style={styles.label}>Bio (Optional)</Text>
          <InputField
            value={bio}
            onChangeText={setBio}
            placeholder="Tell others about yourself..."
            error={errors.bio}
          />
          <Text style={styles.charCount}>{bio ? bio.length : 0}/300</Text>
        </View>
        
        <AppButton
          title="Save Changes"
          onPress={handleSaveProfile}
          loading={loading}
        />
        
        <AppButton
          title="Cancel"
          onPress={() => navigation.goBack()}
          type="outline"
        />
      </View>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 24,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  initialsContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    color: 'white',
    fontSize: 42,
    fontWeight: 'bold',
  },
  changePhotoButton: {
    position: 'absolute',
    bottom: 0,
    right: '35%',
    backgroundColor: '#3498db',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  textAreaContainer: {
    marginBottom: 16,
    position: 'relative',
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
    color: '#333',
    fontWeight: '500',
  },
  charCount: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    fontSize: 12,
    color: '#7f8c8d',
  },
});

export default EditProfileScreen;
