'use client';

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  FlatList
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { productsService, Product } from '../../services/products.service';
import { api } from '../../services/api';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = width / 2 - 24;

interface UserProfile {
  id: string;
  username: string;
  email: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    photoURL?: string;
    bio?: string;
  };
  products?: Product[];
}

const ViewProfile = () => {
  const router = useRouter();
  const { userId } = useLocalSearchParams();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        // Fetch user profile
        const response = await api.get(`/users/${userId}`);
        const userData = response.data;
        
        // Fetch user's products
        const products = await productsService.getAllProducts(userId as string);
        
        setProfile({
          ...userData,
          products
        });
      } catch (error: any) {
        console.error('Error fetching profile:', error);
        setError(error.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchProfile();
    }
  }, [userId]);

  const filteredProducts = profile?.products?.filter(product => 
    selectedCategory === 'all' || product.category === selectedCategory
  ) || [];

  const categories = ['all', ...new Set(profile?.products?.map(p => p.category) || [])];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6B46C1" />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || 'Profile not found'}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity 
      style={styles.productCard}
      onPress={() => router.push({
        pathname: '/(store)/product-details',
        params: { id: item.id }
      })}
    >
      <Image
        source={item.image ? { uri: item.image } : require('../../assets/images/dressProduct.png')}
        style={styles.productImage}
        resizeMode="cover"
      />
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.productPrice}>PHP {item.price?.toLocaleString()}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#666" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Seller Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.productsGrid}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={() => (
          <>
            {/* Profile Section */}
            <View style={styles.profileSection}>
              <Image
                source={profile.profile?.photoURL ? { uri: profile.profile.photoURL } : require('../../assets/images/dressProduct.png')}
                style={styles.profileImage}
              />
              <Text style={styles.username}>{profile.username}</Text>
              {profile.profile?.bio ? (
                <Text style={styles.bio}>{profile.profile.bio}</Text>
              ) : (
                <Text style={styles.noBio}>No bio available</Text>
              )}
            </View>

            {/* Categories */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.categoriesContainer}
            >
              {categories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryButton,
                    selectedCategory === category && styles.categoryButtonActive
                  ]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <Text style={[
                    styles.categoryText,
                    selectedCategory === category && styles.categoryTextActive
                  ]}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ff4444',
    marginBottom: 20,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#6B46C1',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B46C1',
  },
  content: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  bio: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 8,
    paddingHorizontal: 20,
  },
  noBio: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
  },
  categoryButtonActive: {
    backgroundColor: '#7E57C2',
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
  },
  categoryTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  productsContainer: {
    flex: 1,
    padding: 16,
  },
  productsGrid: {
    paddingBottom: 20,
  },
  productCard: {
    width: ITEM_WIDTH,
    marginBottom: 16,
    marginHorizontal: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productImage: {
    width: '100%',
    height: ITEM_WIDTH,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    color: '#6B46C1',
    fontWeight: '600',
  },
});

export default ViewProfile; 