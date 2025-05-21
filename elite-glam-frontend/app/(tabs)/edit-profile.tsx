import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, TextInput, ActivityIndicator, Image } from 'react-native';
import React, { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../services/api';
import * as ImagePicker from 'expo-image-picker';

interface UserData {
  username: string;
  email: string;
  profile?: {
    photoURL?: string;
    bio?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
    };
  };
}

interface UpdateProfileData {
  username: string;
  email: string;
  profile: {
    bio: string;
    photoURL: string;
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
  };
}

export default function EditProfileScreen() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    bio: '',
    profilePhoto: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
    },
  });

  useEffect(() => {
    loadUserData();
    requestPermission();
  }, []);

  const requestPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant permission to access your photos');
    }
  };

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      const storedUserData = await AsyncStorage.getItem('userData');
      if (storedUserData) {
        const userData = JSON.parse(storedUserData);
        setUserData(userData);
        setFormData(prev => ({
          ...prev,
          username: userData.username || '',
          email: userData.email || '',
          bio: userData.profile?.bio || '',
          profilePhoto: userData.profile?.photoURL || '',
          address: {
            street: userData.profile?.address?.street || '',
            city: userData.profile?.address?.city || '',
            state: userData.profile?.address?.state || '',
            zipCode: userData.profile?.address?.zipCode || '',
            country: userData.profile?.address?.country || '',
          },
        }));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      Alert.alert('Error', 'Failed to load user data');
    } finally {
      setIsLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setIsUploadingPhoto(true);
        
        // Get the auth token
        const token = await AsyncStorage.getItem('userToken');
        if (!token) {
          throw new Error('Not authenticated');
        }

        // Create form data
        const formData = new FormData();
        formData.append('photo', {
          uri: result.assets[0].uri,
          type: 'image/jpeg',
          name: 'profile-photo.jpg',
        } as any);

        // Upload to server
        const response = await api.post('/auth/upload-photo', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.data && response.data.photoUrl) {
          setFormData(prev => ({
            ...prev,
            profilePhoto: response.data.photoUrl,
          }));
        } else {
          throw new Error('No photo URL in response');
        }
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      Alert.alert('Error', 'Failed to upload photo. Please try again.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      // Validate form data
      if (!formData.username.trim()) {
        Alert.alert('Error', 'Username is required');
        return;
      }

      if (!formData.email.trim()) {
        Alert.alert('Error', 'Email is required');
        return;
      }

      // Get the auth token
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Prepare update data
      const updateData: UpdateProfileData = {
        username: formData.username,
        email: formData.email,
        profile: {
          bio: formData.bio,
          photoURL: formData.profilePhoto,
          address: {
            street: formData.address.street,
            city: formData.address.city,
            state: formData.address.state,
            zipCode: formData.address.zipCode,
            country: formData.address.country,
          },
        }
      };

      // Call API to update profile
      const response = await api.put('/auth/profile', updateData, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      // Update local storage with complete user data including address
      const updatedUserData = {
        ...userData,
        username: formData.username,
        email: formData.email,
        profile: {
          ...userData?.profile,
          bio: formData.bio,
          photoURL: formData.profilePhoto,
          address: {
            street: formData.address.street,
            city: formData.address.city,
            state: formData.address.state,
            zipCode: formData.address.zipCode,
            country: formData.address.country,
          },
        }
      };
      await AsyncStorage.setItem('userData', JSON.stringify(updatedUserData));
      setUserData(updatedUserData);

      Alert.alert('Success', 'Profile updated successfully', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to update profile'
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7E57C2" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.photoSection}>
          <TouchableOpacity 
            style={styles.photoContainer}
            onPress={() => router.push('/choose-photo')}
          >
            {formData.profilePhoto ? (
              <Image 
                source={{ uri: formData.profilePhoto }} 
                style={styles.profilePhoto}
              />
            ) : (
              <View style={styles.photoPlaceholder}>
                <MaterialIcons name="person" size={40} color="#7E57C2" />
              </View>
            )}
              <View style={styles.editOverlay}>
                <MaterialIcons name="camera-alt" size={24} color="#fff" />
              </View>
          </TouchableOpacity>
          <Text style={styles.photoText}>Tap to change photo</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            value={formData.username}
            onChangeText={(text) => setFormData(prev => ({ ...prev, username: text }))}
            placeholder="Enter username"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={formData.email}
            onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
            placeholder="Enter email"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            value={formData.bio}
            onChangeText={(text) => setFormData(prev => ({ ...prev, bio: text }))}
            placeholder="Tell us about yourself"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Address Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Address Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Street Address</Text>
            <TextInput
              style={styles.input}
              value={formData.address.street}
              onChangeText={(text) => setFormData(prev => ({
                ...prev,
                address: { ...prev.address, street: text }
              }))}
              placeholder="Enter street address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>City</Text>
            <TextInput
              style={styles.input}
              value={formData.address.city}
              onChangeText={(text) => setFormData(prev => ({
                ...prev,
                address: { ...prev.address, city: text }
              }))}
              placeholder="Enter city"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>State/Province</Text>
            <TextInput
              style={styles.input}
              value={formData.address.state}
              onChangeText={(text) => setFormData(prev => ({
                ...prev,
                address: { ...prev.address, state: text }
              }))}
              placeholder="Enter state/province"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>ZIP/Postal Code</Text>
            <TextInput
              style={styles.input}
              value={formData.address.zipCode}
              onChangeText={(text) => setFormData(prev => ({
                ...prev,
                address: { ...prev.address, zipCode: text }
              }))}
              placeholder="Enter ZIP/postal code"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Country</Text>
            <TextInput
              style={styles.input}
              value={formData.address.country}
              onChangeText={(text) => setFormData(prev => ({
                ...prev,
                address: { ...prev.address, country: text }
              }))}
              placeholder="Enter country"
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  form: {
    padding: 16,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  photoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  profilePhoto: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  editOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoText: {
    marginTop: 8,
    color: '#666',
    fontSize: 14,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  bioInput: {
    height: 100,
    paddingTop: 12,
  },
  section: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: '#7E57C2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 