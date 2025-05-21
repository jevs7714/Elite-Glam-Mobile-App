import { StyleSheet, Text, View, TouchableOpacity, Alert, Image, FlatList, Dimensions, ActivityIndicator } from 'react-native';
import React, { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../services/api';
import * as ImagePicker from 'expo-image-picker';

interface UserData {
  uid: string;
  profile?: {
    photoURL?: string;
  };
}

const { width } = Dimensions.get('window');
const numColumns = 3;
const tileSize = width / numColumns - 20;

const STORAGE_KEY = 'uploaded_photos';

export default function ChoosePhotoScreen() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadUserPhotos();
  }, []);

  const loadUserPhotos = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('Not authenticated');
      }

      // First try to load from API
      const response = await api.get('/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      // Store current user ID
      if (response.data?.uid) {
        setCurrentUserId(response.data.uid);
      } else {
        throw new Error('User ID not found');
      }

      let photos: string[] = [];

      // Get stored photos from AsyncStorage
      const storedPhotos = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedPhotos) {
        const parsedPhotos = JSON.parse(storedPhotos);
        // Only include photos for the current user
        if (parsedPhotos[response.data.uid]) {
          photos = parsedPhotos[response.data.uid];
        }
      }

      // Add current profile photo if it exists and isn't already in the list
      if (response.data?.profile?.photoURL) {
        const currentPhoto = response.data.profile.photoURL;
        if (!photos.includes(currentPhoto)) {
          photos = [currentPhoto, ...photos];
        }
      }

      setUploadedPhotos(photos);
      
      // Update storage with the latest photos, maintaining other users' photos
      const allStoredPhotos = storedPhotos ? JSON.parse(storedPhotos) : {};
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...allStoredPhotos,
        [response.data.uid]: photos
      }));
    } catch (error) {
      console.error('Error loading user photos:', error);
      // If API fails, try to load from storage
      const storedPhotos = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedPhotos && currentUserId) {
        const parsedPhotos = JSON.parse(storedPhotos);
        if (parsedPhotos[currentUserId]) {
          setUploadedPhotos(parsedPhotos[currentUserId]);
        }
      } else {
        Alert.alert('Error', 'Failed to load user photos');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoSelect = async (photoUrl: string) => {
    try {
      setIsUploading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Update local storage
      const storedUserData = await AsyncStorage.getItem('userData');
      if (storedUserData) {
        const userData = JSON.parse(storedUserData);
        userData.profile = {
          ...userData.profile,
          photoURL: photoUrl,
        };
        await AsyncStorage.setItem('userData', JSON.stringify(userData));
      }

      Alert.alert('Success', 'Profile photo updated successfully', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Error updating profile photo:', error);
      Alert.alert('Error', 'Failed to update profile photo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePhoto = async (photoUrl: string) => {
    try {
      Alert.alert(
        'Delete Photo',
        'Are you sure you want to delete this photo?',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                setIsDeleting(true);
                const token = await AsyncStorage.getItem('userToken');
                if (!token) {
                  throw new Error('Not authenticated');
                }

                // Extract the file ID from the ImageKit URL
                // The fileId is the part after the last slash and before any query parameters
                const urlParts = photoUrl.split('/');
                const fileName = urlParts[urlParts.length - 1].split('?')[0];
                if (!fileName) {
                  throw new Error('Invalid image URL');
                }

                // Delete from ImageKit using the correct endpoint
                await api.delete(`/auth/photos/${fileName}`, {
                  headers: {
                    'Authorization': `Bearer ${token}`
                  }
                });

              // Remove photo from the list
              const newPhotos = uploadedPhotos.filter(photo => photo !== photoUrl);
              setUploadedPhotos(newPhotos);

              // Update storage maintaining other users' photos
              const storedPhotos = await AsyncStorage.getItem(STORAGE_KEY);
              const allStoredPhotos = storedPhotos ? JSON.parse(storedPhotos) : {};
              if (currentUserId) {
                await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
                  ...allStoredPhotos,
                  [currentUserId]: newPhotos
                }));
              }

              // If this was the profile photo, clear it
              const storedUserData = await AsyncStorage.getItem('userData');
              if (storedUserData) {
                const userData = JSON.parse(storedUserData);
                if (userData.profile?.photoURL === photoUrl) {
                  userData.profile = {
                    ...userData.profile,
                    photoURL: undefined,
                  };
                  await AsyncStorage.setItem('userData', JSON.stringify(userData));
                }
                }

                Alert.alert('Success', 'Photo deleted successfully');
              } catch (error: any) {
                console.error('Error deleting photo:', error);
                const errorMessage = error.response?.data?.message || 'Failed to delete photo. Please try again.';
                Alert.alert('Error', errorMessage);
              } finally {
                setIsDeleting(false);
                setIsUploading(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in delete confirmation:', error);
      Alert.alert('Error', 'Failed to process delete request');
    }
  };

  const handleImagePick = async (type: 'camera' | 'library') => {
    try {
      // Check if we've reached the limit
      if (uploadedPhotos.length >= 3) {
        Alert.alert('Limit Reached', 'You can only upload up to 3 photos. Please delete one to add a new photo.');
        return;
      }

      const hasPermission = await requestPermission(type);
      if (!hasPermission) return;

      const options = {
        type: 'image',
        allowsEditing: true,
        aspect: [1, 1] as [number, number],
        quality: 0.8,
      };

      const result = type === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const requestPermission = async (type: 'camera' | 'library') => {
    const permission = type === 'camera' 
      ? ImagePicker.requestCameraPermissionsAsync()
      : ImagePicker.requestMediaLibraryPermissionsAsync();
    
    const { status } = await permission;
    if (status !== 'granted') {
      Alert.alert('Permission needed', `Please grant permission to access your ${type}`);
      return false;
    }
    return true;
  };

  const uploadImage = async (uri: string) => {
    try {
      setIsUploading(true);
      
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Get current user data first
      const userResponse = await api.get('/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const formData = new FormData();
      formData.append('photo', {
        uri,
        type: 'image/jpeg',
        name: 'profile-photo.jpg',
      } as any);

      const response = await api.post('/auth/upload-photo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.data && response.data.photoUrl) {
        // Add the new photo to the list and update storage
        const newPhotos = [response.data.photoUrl, ...uploadedPhotos];
        setUploadedPhotos(newPhotos);

        // Update storage maintaining other users' photos
        const storedPhotos = await AsyncStorage.getItem(STORAGE_KEY);
        const allStoredPhotos = storedPhotos ? JSON.parse(storedPhotos) : {};
        if (currentUserId) {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
            ...allStoredPhotos,
            [currentUserId]: newPhotos
          }));
        }

        // Update local storage with the new photo URL while preserving other profile data
        const storedUserData = await AsyncStorage.getItem('userData');
        if (storedUserData) {
          const userData = JSON.parse(storedUserData);
          userData.profile = {
            ...userData.profile,
            photoURL: response.data.photoUrl,
          };
          await AsyncStorage.setItem('userData', JSON.stringify(userData));
        }

        Alert.alert('Success', 'Profile photo updated successfully', [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]);
      } else {
        throw new Error('No photo URL in response');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      Alert.alert('Error', 'Failed to upload photo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const renderPhotoItem = ({ item }: { item: string }) => (
    <View style={styles.photoItemContainer}>
      <TouchableOpacity 
        style={styles.photoItem}
        onPress={() => handlePhotoSelect(item)}
        disabled={isUploading}
      >
        <Image 
          source={{ uri: item }} 
          style={styles.photoThumbnail}
        />
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.deleteButton}
        onPress={() => handleDeletePhoto(item)}
        disabled={isUploading}
      >
        <MaterialIcons name="delete" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Choose Photo</Text>
      </View>

      <View style={styles.content}>
        {isLoading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color="#7E57C2" />
          </View>
        ) : uploadedPhotos.length > 0 ? (
          <>
            <Text style={styles.photoCount}>
              {uploadedPhotos.length}/3 photos uploaded
            </Text>
            <FlatList
              data={uploadedPhotos}
              renderItem={renderPhotoItem}
              keyExtractor={(item) => item}
              numColumns={numColumns}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.photoGrid}
            />
          </>
        ) : (
          <View style={styles.emptyState}>
            <MaterialIcons name="photo-library" size={60} color="#ccc" />
            <Text style={styles.emptyStateText}>No photos uploaded yet</Text>
          </View>
        )}

        <View style={styles.uploadOptions}>
          <TouchableOpacity 
            style={[styles.uploadButton, uploadedPhotos.length >= 3 && styles.uploadButtonDisabled]}
            onPress={() => handleImagePick('library')}
            disabled={isUploading || uploadedPhotos.length >= 3}
          >
            <MaterialIcons name="photo-library" size={24} color="#fff" />
            <Text style={styles.uploadButtonText}>Choose from Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.uploadButton, uploadedPhotos.length >= 3 && styles.uploadButtonDisabled]}
            onPress={() => handleImagePick('camera')}
            disabled={isUploading || uploadedPhotos.length >= 3}
          >
            <MaterialIcons name="camera-alt" size={24} color="#fff" />
            <Text style={styles.uploadButtonText}>Take a Photo</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isUploading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#7E57C2" />
            <Text style={styles.loadingText}>
              {isDeleting ? 'Deleting photo...' : 'Uploading photo...'}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  content: {
    flex: 1,
    padding: 10,
  },
  photoGrid: {
    padding: 5,
  },
  photoItemContainer: {
    position: 'relative',
    margin: 5,
  },
  photoItem: {
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  photoThumbnail: {
    width: tileSize,
    height: tileSize,
    borderRadius: 10,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  uploadOptions: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7E57C2',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 10,
  },
  deleteButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(255, 0, 0, 0.7)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoCount: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginVertical: 10,
  },
  uploadButtonDisabled: {
    opacity: 0.5,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
}); 