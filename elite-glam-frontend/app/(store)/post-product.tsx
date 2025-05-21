import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, Platform, Modal, Image, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import React, { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { productsService } from '../../services/products.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { API_URL } from '../../config/api.config';

const categories = [
  'Gown',
  'Dress',
  'Suit',
  'Sportswear',
  'Other'
] as const;

type Category = typeof categories[number];

export default function PostProductScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    category: '',
    quantity: '',
  });

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your photo library');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Product name is required');
      return false;
    }
    if (!formData.price.trim() || isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return false;
    }
    if (!formData.category.trim()) {
      Alert.alert('Error', 'Category is required');
      return false;
    }
    if (!formData.quantity.trim() || isNaN(Number(formData.quantity)) || Number(formData.quantity) < 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return false;
    }
    if (!formData.description.trim()) {
      Alert.alert('Error', 'Description is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setIsLoading(true);
      
      // Get current user data
      const userData = await AsyncStorage.getItem('userData');
      if (!userData) {
        throw new Error('User data not found');
      }
      const user = JSON.parse(userData);
      
      // Create form data for multipart/form-data
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name.trim());
      formDataToSend.append('price', formData.price.toString());
      formDataToSend.append('description', formData.description.trim());
      formDataToSend.append('category', formData.category.trim());
      formDataToSend.append('quantity', formData.quantity.toString());
      formDataToSend.append('userId', user.uid);
      formDataToSend.append('rating', '0');

      if (image) {
        const imageUri = image;
        const filename = imageUri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename || '');
        const type = match ? `image/${match[1]}` : 'image';

        formDataToSend.append('image', {
          uri: imageUri,
          name: filename,
          type,
        } as any);
      }

      console.log('Sending form data:', {
        name: formData.name.trim(),
        price: formData.price,
        description: formData.description.trim(),
        category: formData.category.trim(),
        quantity: formData.quantity,
        userId: user.uid,
        rating: '0',
        hasImage: !!image
      });

      const result = await productsService.createProduct(formDataToSend);
      console.log('Product created:', result);
      Alert.alert('Success', 'Product created successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.error('Error creating product:', error);
      Alert.alert('Error', `Failed to create product: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView 
        style={styles.container}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add New Product</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Product Details Form */}
        <View style={styles.form}>
          {/* Image Upload */}
          <View style={styles.imageUploadContainer}>
            <TouchableOpacity 
              style={styles.imageUploadButton}
              onPress={pickImage}
              disabled={isLoading}
            >
              {image ? (
                <Image source={{ uri: image }} style={styles.uploadedImage} />
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <MaterialIcons name="add-photo-alternate" size={32} color="#666" />
                  <Text style={styles.uploadText}>Add Product Image</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Product Name</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Enter product name"
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Price (PHP)</Text>
            <TextInput
              style={styles.input}
              value={formData.price}
              onChangeText={(text) => setFormData({ ...formData, price: text })}
              placeholder="Enter price"
              keyboardType="numeric"
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScrollContainer}
              keyboardShouldPersistTaps="always"
            >
              {categories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryChip,
                    formData.category === category && styles.categoryChipSelected
                  ]}
                  onPress={() => {
                    Keyboard.dismiss();
                    setFormData({ ...formData, category });
                  }}
                  disabled={isLoading}
                >
                  <Text style={[
                    styles.categoryChipText,
                    formData.category === category && styles.categoryChipTextSelected
                  ]}>
                    {category}
                  </Text>
                  {formData.category === category && (
                    <MaterialIcons 
                      name="check-circle" 
                      size={16} 
                      color="#fff" 
                      style={styles.categoryCheckIcon}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            {!formData.category && (
              <Text style={styles.categoryHelperText}>Please select a category</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Quantity</Text>
            <TextInput
              style={styles.input}
              value={formData.quantity}
              onChangeText={(text) => setFormData({ ...formData, quantity: text })}
              placeholder="Enter quantity"
              keyboardType="numeric"
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              placeholder="Enter product description"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!isLoading}
            />
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity 
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]} 
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Post Product</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  form: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#7E57C2',
    margin: 16,
    marginBottom: Platform.OS === 'ios' ? 100 : 80,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#B39DDB',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  categoryScrollContainer: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    minHeight: 50,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 36,
  },
  categoryChipSelected: {
    backgroundColor: '#7E57C2',
    borderColor: '#7E57C2',
    elevation: 3,
    shadowColor: '#7E57C2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  categoryChipText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  categoryChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  categoryCheckIcon: {
    marginLeft: 4,
  },
  categoryHelperText: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  imageUploadContainer: {
    marginBottom: 16,
  },
  imageUploadButton: {
    width: '100%',
    height: 200,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  uploadPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadText: {
    marginTop: 8,
    fontSize: 16,
    color: '#666',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
}); 