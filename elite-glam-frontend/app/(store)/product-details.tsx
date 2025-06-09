'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
  FlatList,
  TextInput,
  Platform,
  ViewStyle,
  TextStyle,
  ImageStyle,
  KeyboardAvoidingView,
  Keyboard,
  BackHandler
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FontAwesome } from '@expo/vector-icons';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { productsService, Product } from '../../services/products.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../services/api';
import { bookingService } from '../../services/booking.service';
import NetInfo from '@react-native-community/netinfo';
import { ratingsService, Rating } from '../../services/ratings.service';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const defaultProductImage = require('../../assets/images/dressProduct.png');

type Styles = {
  loadingContainer: ViewStyle;
  errorContainer: ViewStyle;
  errorText: TextStyle;
  backButton: ViewStyle;
  backButtonText: TextStyle;
  container: ViewStyle;
  header: ViewStyle;
  headerTitle: TextStyle;
  content: ViewStyle;
  imageContainer: ViewStyle;
  productImage: ImageStyle;
  price: TextStyle;
  title: TextStyle;
  description: TextStyle;
  conditionContainer: ViewStyle;
  conditionTitle: TextStyle;
  conditionDescription: TextStyle;
  ratingsContainer: ViewStyle;
  ratingWrapper: ViewStyle;
  ratingNumber: TextStyle;
  ratingText: TextStyle;
  reviewContainer: ViewStyle;
  reviewHeader: ViewStyle;
  avatarPlaceholder: ViewStyle;
  reviewInfo: ViewStyle;
  reviewNameContainer: ViewStyle;
  reviewName: TextStyle;
  heartIcon: TextStyle;
  reviewCount: TextStyle;
  helpfulText: TextStyle;
  bottomActions: ViewStyle;
  iconButton: ViewStyle;
  iconButtonActive: ViewStyle;
  iconButtonText: TextStyle;
  iconButtonTextActive: TextStyle;
  bookButton: ViewStyle;
  bookButtonText: TextStyle;
  sellerContainer: ViewStyle;
  sellerAvatar: ViewStyle;
  sellerAvatarImage: ImageStyle;
  sellerInitial: TextStyle;
  sellerInfo: ViewStyle;
  sellerName: TextStyle;
  sellerLabel: TextStyle;
  viewProfileButton: ViewStyle;
  viewProfileText: TextStyle;
  sellerAddressContainer: ViewStyle;
  sellerAddressText: TextStyle;
  paginationContainer: ViewStyle;
  paginationDot: ViewStyle;
  paginationDotActive: ViewStyle;
  ratingOverlay: ViewStyle;
  ratingSection: ViewStyle;
  ratingHeader: ViewStyle;
  ratingHeaderContent: ViewStyle;
  ratingTitle: TextStyle;
  closeButton: ViewStyle;
  ratingContent: ViewStyle;
  ratingLabel: TextStyle;
  starsContainer: ViewStyle;
  starButton: ViewStyle;
  ratingValue: TextStyle;
  ratingDescription: TextStyle;
  commentContainer: ViewStyle;
  commentLabel: TextStyle;
  commentInput: TextStyle;
  submitButton: ViewStyle;
  submitButtonDisabled: ViewStyle;
  submitButtonText: TextStyle;
  rateButtonContainer: ViewStyle;
  rateButton: ViewStyle;
  rateButtonText: TextStyle;
  reviewItem: ViewStyle;
  avatarText: TextStyle;
  starRating: ViewStyle;
  starIcon: ViewStyle;
  reviewComment: TextStyle;
  reviewDate: TextStyle;
  reviewerAvatar: ImageStyle;
  noReviewsContainer: ViewStyle;
  noReviewsText: TextStyle;
  reviewsContainer: ViewStyle;
  reviewsTitle: TextStyle;
  reviewerInfo: ViewStyle;
  avatarContainer: ViewStyle;
  reviewerDetails: ViewStyle;
  ratingScrollContent: ViewStyle;
  loadMoreButton: ViewStyle;
  loadMoreText: TextStyle;
  keyboardAvoidingView: ViewStyle;
  scrollContent: ViewStyle;
  bottomSpacer: ViewStyle;
  leftActions: ViewStyle;
  detailsContainer: ViewStyle;
  ratingScrollContentWithKeyboard: ViewStyle;
  mainContainer: ViewStyle;
};

const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes in milliseconds
const PRODUCT_CACHE_KEY = (id: string) => `product_${id}_cache`;
const SELLER_CACHE_KEY = (id: string) => `seller_${id}_cache`;
const RATINGS_CACHE_KEY = (id: string) => `ratings_${id}_cache`;

interface CacheData {
  data: any;
  timestamp: number;
}

const ProductDetails = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInRentLater, setIsInRentLater] = useState(false);
  const [sellerLocation, setSellerLocation] = useState<string>('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isRatingMode, setIsRatingMode] = useState(false);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [productRatings, setProductRatings] = useState<any[]>([]);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [sellerProfile, setSellerProfile] = useState<any>(null);
  const [reviewerProfiles, setReviewerProfiles] = useState<{[key: string]: any}>({});
  const [displayedRatings, setDisplayedRatings] = useState<Rating[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreRatings, setHasMoreRatings] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const REVIEWS_PER_PAGE = 4;
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const loadFromCache = async (key: string): Promise<any | null> => {
    try {
      const cachedData = await AsyncStorage.getItem(key);
      if (cachedData) {
        const { data, timestamp } = JSON.parse(cachedData) as CacheData;
        const isExpired = Date.now() - timestamp > CACHE_EXPIRY;
        
        if (!isExpired) {
          console.log('Loading from cache:', key);
          return data;
        }
      }
      return null;
    } catch (error) {
      console.error('Error loading from cache:', error);
      return null;
    }
  };

  const saveToCache = async (key: string, data: any) => {
    try {
      const cacheData: CacheData = {
        data,
        timestamp: Date.now()
      };
      await AsyncStorage.setItem(key, JSON.stringify(cacheData));
      console.log('Saved to cache:', key);
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  };

  const loadMoreRatings = () => {
    if (!hasMoreRatings || isLoadingMore || !productRatings) return;

    setIsLoadingMore(true);
    const startIndex = (currentPage - 1) * REVIEWS_PER_PAGE;
    const endIndex = startIndex + REVIEWS_PER_PAGE;
    const newRatings = productRatings.slice(startIndex, endIndex);

    if (newRatings.length > 0) {
      setDisplayedRatings(prev => [...prev, ...newRatings]);
      setCurrentPage(prev => prev + 1);
      setHasMoreRatings(endIndex < productRatings.length);
    } else {
      setHasMoreRatings(false);
    }
    setIsLoadingMore(false);
  };

  const fetchProductRatings = async (productId: string) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Try to load from cache first
      const cachedRatings = await loadFromCache(RATINGS_CACHE_KEY(productId));
      if (cachedRatings) {
        const ratings = cachedRatings.ratings || [];
        setProductRatings(ratings);
        setAverageRating(cachedRatings.averageRating || 0);
        setReviewerProfiles(cachedRatings.profiles || {});
        
        // Initialize displayed ratings
        const initialRatings = ratings.slice(0, REVIEWS_PER_PAGE);
        setDisplayedRatings(initialRatings);
        setHasMoreRatings(ratings.length > REVIEWS_PER_PAGE);
        return;
      }

      // Fetch ratings with authentication
      const response = await api.get(`/ratings/product/${productId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const ratings = response.data || [];
      
      // Fetch user profiles for each rating
      const ratingsWithUsernames = await Promise.all(
        ratings.map(async (rating: any) => {
          try {
            if (rating.userId) {
              const userResponse = await api.get(`/users/${rating.userId}`, {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });
              const userData = userResponse.data || {};
              
              // Store user profile
              setReviewerProfiles(prev => ({
                ...prev,
                [rating.userId]: userData
              }));

              // Return rating with username
              return {
                ...rating,
                userName: userData?.username || 'Anonymous',
                rating: rating.rating || 0
              };
            }
            return {
              ...rating,
              userName: 'Anonymous',
              rating: rating.rating || 0
            };
          } catch (error) {
            console.error('Error fetching user profile:', error);
            return {
              ...rating,
              userName: 'Anonymous',
              rating: rating.rating || 0
            };
          }
        })
      );
      
      // Update state with ratings that include usernames
      setProductRatings(ratingsWithUsernames);
      
      // Initialize displayed ratings
      const initialRatings = ratingsWithUsernames.slice(0, REVIEWS_PER_PAGE);
      setDisplayedRatings(initialRatings);
      setHasMoreRatings(ratingsWithUsernames.length > REVIEWS_PER_PAGE);
      
      // Calculate average rating
      const validRatings = ratingsWithUsernames.filter((r: { rating?: number }) => 
        typeof r.rating === 'number' && !isNaN(r.rating)
      );
      let averageRating = 0;
      if (validRatings.length > 0) {
        const sum = validRatings.reduce((acc: number, curr: any) => acc + (curr.rating || 0), 0);
        averageRating = sum / validRatings.length;
      }
      setAverageRating(averageRating);

      // Save to cache
      await saveToCache(RATINGS_CACHE_KEY(productId), {
        ratings: ratingsWithUsernames,
        averageRating,
        profiles: reviewerProfiles
      });
    } catch (error) {
      console.error('Error fetching product ratings:', error);
      setProductRatings([]);
      setDisplayedRatings([]);
      setAverageRating(0);
      setHasMoreRatings(false);
    }
  };

  const fetchProductDetails = async () => {
    if (!id) {
      setError('No product ID provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Try to load from cache first
      const cachedProduct = await loadFromCache(PRODUCT_CACHE_KEY(id.toString()));
      if (cachedProduct) {
        setProduct(cachedProduct);
        setProductImages(cachedProduct.images || []);
        setIsInRentLater(cachedProduct.isInRentLater);
      }

      // Try to load seller from cache
      const cachedSeller = await loadFromCache(SELLER_CACHE_KEY(id.toString()));
      if (cachedSeller) {
        setSellerProfile(cachedSeller);
        setSellerLocation(cachedSeller.location);
      }

      // Fetch fresh data
      const productData = await productsService.getProductById(id.toString());
      setProduct(productData);
      
      // Set product images
      const images = productData.images || [];
      if (productData.image && !images.includes(productData.image)) {
        images.unshift(productData.image);
      }
      setProductImages(images.slice(0, 7)); // Limit to 7 images
      
      // Fetch seller's profile data
      if (productData.userId) {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          try {
            const response = await api.get(`/users/${productData.userId}`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            const sellerData = response.data;
            setSellerProfile(sellerData);
            
            if (sellerData?.profile?.address) {
              const { street, city, state, country } = sellerData.profile.address;
              const location = [street, city, state, country]
                .filter(Boolean)
                .join(', ');
              setSellerLocation(location || 'Location not available');

              // Save seller data to cache
              await saveToCache(SELLER_CACHE_KEY(id.toString()), {
                ...sellerData,
                location: location || 'Location not available'
              });
            } else {
              setSellerLocation('Location not available');
            }
          } catch (error) {
            console.error('Error fetching seller profile:', error);
            setSellerLocation('Location not available');
          }
        }
      }
      
      // Check if product is in rent later list
      const rentLaterItems = await AsyncStorage.getItem('rentLaterItems');
      const items = rentLaterItems ? JSON.parse(rentLaterItems) : [];
      const isInRentLater = items.some((item: Product) => item.id === productData.id);
      setIsInRentLater(isInRentLater);

      // Save product data to cache
      await saveToCache(PRODUCT_CACHE_KEY(id.toString()), {
        ...productData,
        images: images.slice(0, 7),
        isInRentLater
      });

      // Fetch product ratings
      await fetchProductRatings(id.toString());
    } catch (error: any) {
      console.error('Error fetching product details:', error);
      setError(error.message || 'Failed to load product details');
      Alert.alert('Error', 'Failed to load product details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductDetails();
  }, [id]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
        // Scroll to the comment input when keyboard appears
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (isRatingMode) {
          setIsRatingMode(false);
          return true; // Prevent default behavior
        }
        return false; // Allow default behavior
      }
    );

    return () => {
      backHandler.remove();
    };
  }, [isRatingMode]);

  const handleRentLater = async () => {
    if (!product) return;

    try {
      console.log('Handling rent later...'); // Debug log
      const rentLaterItems = await AsyncStorage.getItem('rentLaterItems');
      console.log('Current rent later items:', rentLaterItems); // Debug log
      let items = rentLaterItems ? JSON.parse(rentLaterItems) : [];

      if (isInRentLater) {
        // Remove from rent later
        items = items.filter((item: Product) => item.id !== product.id);
        console.log('Removed item from rent later. New items:', items); // Debug log
        Alert.alert('Success', 'Product removed from Rent Later list');
      } else {
        // Add to rent later
        items.push(product);
        console.log('Added item to rent later. New items:', items); // Debug log
        Alert.alert('Success', 'Product added to Rent Later list');
      }

      await AsyncStorage.setItem('rentLaterItems', JSON.stringify(items));
      console.log('Successfully saved to AsyncStorage'); // Debug log
      setIsInRentLater(!isInRentLater);
    } catch (error) {
      console.error('Error updating rent later items:', error);
      Alert.alert('Error', 'Failed to update Rent Later list');
    }
  };

  const handleSubmitRating = async () => {
    if (!product?.id || rating === 0) {
      Alert.alert('Error', 'Please select a rating before submitting.');
      return;
    }

    setIsSubmittingRating(true);

    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Error', 'Please log in to submit a rating.');
        return;
      }

      const ratingData = {
        productId: product.id,
        rating: rating,
        comment: comment.trim() || null
      };

      const response = await api.post('/ratings', ratingData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data) {
        // Update the local ratings state
        const newRating = response.data;
        const updatedRatings = productRatings ? [newRating, ...productRatings] : [newRating];
        setProductRatings(updatedRatings);
        
        // Recalculate average rating
        const totalRating = updatedRatings.reduce((sum, r) => sum + (r.rating || 0), 0);
        const newAverageRating = totalRating / updatedRatings.length;
        setAverageRating(newAverageRating);

        // Update displayed ratings
        setDisplayedRatings(updatedRatings.slice(0, REVIEWS_PER_PAGE));
        setCurrentPage(1);
        setHasMoreRatings(updatedRatings.length > REVIEWS_PER_PAGE);

        // Reset the form
        setRating(0);
        setComment('');
        setIsRatingMode(false);

        // Show success message
        Alert.alert(
          'Success',
          'Thank you for your rating!',
          [{ text: 'OK' }]
        );

        // Update the cache
        await saveToCache(RATINGS_CACHE_KEY(product.id), {
          ratings: updatedRatings,
          averageRating: newAverageRating,
          profiles: reviewerProfiles
        });
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      Alert.alert(
        'Error',
        'Failed to submit rating. Please try again.'
      );
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const handleMessageButtonPress = () => {
    Alert.alert(
      'Coming Soon',
      'The messaging feature is currently under development. Please check back later!',
      [{ text: 'OK' }]
    );
  };

  const getUserName = (review: Rating, reviewer: any) => {
    // First try to get username from the review object
    if (review.userName) {
      return review.userName;
    }
    // Then try to get it from the reviewer profile
    if (reviewer?.username) {
      return reviewer.username;
    }
    // Finally fall back to Anonymous
    return 'Anonymous';
  };

  const renderRatingsSection = () => (
    <View style={styles.ratingsContainer}>
      <View style={styles.ratingWrapper}>
        <FontAwesome name="star" size={16} color="#FFD700" />
        <Text style={styles.ratingNumber}>
          {typeof averageRating === 'number' ? averageRating.toFixed(1) : '0.0'}
        </Text>
      </View>
      <Text style={styles.ratingText}>
        {productRatings ? `${productRatings.length} ${productRatings.length === 1 ? 'Rating' : 'Ratings'}` : '0 Ratings'}
      </Text>
    </View>
  );

  const renderReviewsSection = () => {
    if (!productRatings || productRatings.length === 0) {
      return (
        <View style={styles.noReviewsContainer}>
          <Text style={styles.noReviewsText}>No reviews yet</Text>
        </View>
      );
    }

    return (
      <View style={styles.reviewContainer}>
        {productRatings.map((review: Rating, index: number) => {
          const reviewer = reviewerProfiles[review.userId] || {};
          const profilePhoto = reviewer?.profile?.photoURL;
          const userName = getUserName(review, reviewer);
          
          return (
            <View key={`${review.id}-${index}-${review.userId}`} style={styles.reviewItem}>
              <View style={styles.reviewHeader}>
                <View style={styles.avatarPlaceholder}>
                  {profilePhoto ? (
                    <Image 
                      source={{ uri: profilePhoto }} 
                      style={styles.reviewerAvatar}
                    />
                  ) : (
                    <Text style={styles.avatarText}>
                      {userName.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                <View style={styles.reviewInfo}>
                  <View style={styles.reviewNameContainer}>
                    <Text style={styles.reviewName}>{userName}</Text>
                    <View style={styles.starRating}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <FontAwesome
                          key={star}
                          name={star <= (review.rating || 0) ? "star" : "star-o"}
                          size={12}
                          color="#FFD700"
                          style={styles.starIcon}
                        />
                      ))}
                    </View>
                  </View>
                  {review.comment && (
                    <Text style={styles.reviewComment}>{review.comment}</Text>
                  )}
                  <Text style={styles.reviewDate}>
                    {new Date(review.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderRatingSection = () => {
    if (!isRatingMode) return null;

    return (
      <View style={styles.ratingOverlay}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.ratingSection}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
          <ScrollView 
            ref={scrollViewRef}
            contentContainerStyle={[
              styles.ratingScrollContent,
              keyboardVisible && styles.ratingScrollContentWithKeyboard
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
          >
            <View style={styles.ratingHeader}>
              <View style={styles.ratingHeaderContent}>
                <MaterialIcons name="star" size={24} color="#FFD700" />
                <Text style={styles.ratingTitle}>Rate Your Experience</Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsRatingMode(false)}
              >
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.ratingContent}>
              <Text style={styles.ratingLabel}>How would you rate this product?</Text>
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setRating(star)}
                    style={styles.starButton}
                  >
                    <MaterialIcons
                      name={star <= rating ? "star" : "star-border"}
                      size={40}
                      color="#FFD700"
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.ratingValue}>{rating.toFixed(1)}</Text>
              <Text style={styles.ratingDescription}>
                {rating === 0 ? 'Select a rating' :
                 rating === 1 ? 'Poor' :
                 rating === 2 ? 'Fair' :
                 rating === 3 ? 'Good' :
                 rating === 4 ? 'Very Good' :
                 'Excellent'}
              </Text>
            </View>

            <View style={styles.commentContainer}>
              <Text style={styles.commentLabel}>Share your experience (Optional)</Text>
              <TextInput
                style={styles.commentInput}
                multiline
                numberOfLines={4}
                placeholder="Tell us what you liked or didn't like about this product..."
                placeholderTextColor="#999"
                value={comment}
                onChangeText={setComment}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.submitButton,
                (rating === 0 || isSubmittingRating) && styles.submitButtonDisabled
              ]}
              onPress={handleSubmitRating}
              disabled={rating === 0 || isSubmittingRating}
            >
              {isSubmittingRating ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {rating === 0 ? 'Select a Rating' : 'Submit Rating'}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  };

  const renderReviews = () => {
    if (!displayedRatings || displayedRatings.length === 0) {
      return (
        <View style={styles.noReviewsContainer}>
          <Text style={styles.noReviewsText}>No reviews yet</Text>
        </View>
      );
    }

    return (
      <View style={styles.reviewsContainer}>
        <Text style={styles.reviewsTitle}>Customer Reviews</Text>
        {displayedRatings.map((review: Rating, index: number) => {
          const reviewer = reviewerProfiles[review.userId] || {};
          const profilePhoto = reviewer?.profile?.photoURL;
          const userName = review.userName || reviewer?.username || 'Anonymous';
          
          return (
            <View 
              key={`${review.id}-${index}`} 
              style={styles.reviewItem}
            >
              <View style={styles.reviewHeader}>
                <View style={styles.reviewerInfo}>
                  <View style={styles.avatarContainer}>
                    {profilePhoto ? (
                      <Image 
                        source={{ uri: profilePhoto }} 
                        style={styles.reviewerAvatar}
                      />
                    ) : (
                      <Text style={styles.avatarText}>
                        {userName.charAt(0).toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <View style={styles.reviewerDetails}>
                    <Text style={styles.reviewName}>{userName}</Text>
                    <View style={styles.starRating}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <FontAwesome
                          key={star}
                          name={star <= (review.rating || 0) ? "star" : "star-o"}
                          size={12}
                          color="#FFD700"
                          style={styles.starIcon}
                        />
                      ))}
                    </View>
                    {review.comment && (
                      <Text style={styles.reviewComment}>{review.comment}</Text>
                    )}
                    <Text style={styles.reviewDate}>
                      {new Date(review.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          );
        })}
        {hasMoreRatings && (
          <TouchableOpacity 
            style={styles.loadMoreButton}
            onPress={loadMoreRatings}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? (
              <ActivityIndicator size="small" color="#666" />
            ) : (
              <Text style={styles.loadMoreText}>Load More Reviews</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6B46C1" />
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || 'Product not found'}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#666" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.mainContainer}>
        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Product Images with Pagination */}
          <View style={styles.imageContainer}>
            <FlatList
              data={productImages}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
                setCurrentImageIndex(newIndex);
              }}
              renderItem={({ item }) => (
                <View style={{ width, height: width, justifyContent: 'center', alignItems: 'center' }}>
                  <Image
                    source={item ? { uri: item } : defaultProductImage}
                    style={styles.productImage}
                    resizeMode="contain"
                  />
                </View>
              )}
              keyExtractor={(item, index) => index.toString()}
            />
            {productImages.length > 1 && (
              <View style={styles.paginationContainer}>
                {productImages.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.paginationDot,
                      index === currentImageIndex && styles.paginationDotActive
                    ]}
                  />
                ))}
              </View>
            )}
          </View>

          <View style={styles.detailsContainer}>
            {/* Price */}
            <Text style={styles.price}>PHP {product.price?.toLocaleString() || '0'}{product.rentAvailable ? '/RENT' : ''}</Text>

            {/* Title and Description */}
            <Text style={styles.title}>{product.name}</Text>
            <Text style={styles.description}>
              {product.description || 'No description available'}
            </Text>

            {/* Seller Info */}
            <View style={styles.sellerContainer}>
              <View style={styles.sellerAvatar}>
                {sellerProfile?.profile?.photoURL ? (
                  <Image 
                    source={{ uri: sellerProfile.profile.photoURL }} 
                    style={styles.sellerAvatarImage}
                  />
                ) : (
                  <Text style={styles.sellerInitial}>
                    {product.sellerName ? product.sellerName.charAt(0).toUpperCase() : '?'}
                  </Text>
                )}
              </View>
              <View style={styles.sellerInfo}>
                <Text style={styles.sellerName}>{product.sellerName || 'Unknown Seller'}</Text>
                <Text style={styles.sellerLabel}>Product Owner</Text>
              </View>
              <TouchableOpacity 
                style={styles.viewProfileButton}
                onPress={() => router.push({
                  pathname: '/(store)/view-profile',
                  params: { userId: product.userId }
                })}
              >
                <Text style={styles.viewProfileText}>View Profile</Text>
              </TouchableOpacity>
            </View>

            {/* Seller Address */}
            <View style={styles.sellerAddressContainer}>
              <MaterialIcons name="location-on" size={16} color="#666" />
              <Text style={styles.sellerAddressText}>
                {sellerLocation}
              </Text>
            </View>

            {/* Ratings */}
            {renderRatingsSection()}

            <View style={styles.rateButtonContainer}>
              <TouchableOpacity
                style={styles.rateButton}
                onPress={() => setIsRatingMode(true)}
              >
                <MaterialIcons name="star" size={20} color="white" />
                <Text style={styles.rateButtonText}>Rate This Product</Text>
              </TouchableOpacity>
            </View>

            {/* Reviews */}
            {renderReviews()}

            {/* Bottom Spacer */}
            <View style={styles.bottomSpacer} />
          </View>
        </ScrollView>

        {/* Bottom Actions */}
        <View style={[styles.bottomActions, { paddingBottom: insets.bottom }]}>
          <View style={styles.leftActions}>
            <TouchableOpacity 
              style={[
                styles.iconButton,
                isInRentLater && styles.iconButtonActive
              ]}
              onPress={handleRentLater}
            >
              <MaterialCommunityIcons 
                name={isInRentLater ? "cart" : "cart-outline"} 
                size={20} 
                color={isInRentLater ? "#fff" : "#666"} 
              />
              <Text style={[
                styles.iconButtonText,
                isInRentLater && styles.iconButtonTextActive
              ]}>{isInRentLater ? "Remove from Cart" : "Add to Cart"}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity 
            style={styles.bookButton}
            onPress={() => router.push({
              pathname: '/(store)/confirm-booking',
              params: {
                productId: product.id,
                productName: product.name,
                productPrice: product.price
              }
            })}
          >
            <Text style={styles.bookButtonText}>Rent Now</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Rating Section */}
      {renderRatingSection()}
    </View>
  );
};

const styles = StyleSheet.create({
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
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 80 : 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
    zIndex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B46C1',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'ios' ? 160 : 140,
  },
  bottomSpacer: {
    height: Platform.OS === 'ios' ? 160 : 140,
  },
  imageContainer: {
    width: width,
    height: width,
    backgroundColor: '#f9f9f9',
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  productImage: {
    width: width,
    height: width,
    resizeMode: 'contain',
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginHorizontal: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 8,
    marginHorizontal: 16,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    marginHorizontal: 0,
    paddingHorizontal: 16,
    lineHeight: 24,
    textAlign: 'left',
    width: '100%',
  },
  conditionContainer: {
    marginTop: 16,
    marginHorizontal: 16,
  },
  conditionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  conditionDescription: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  ratingsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  ratingWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingNumber: {
    marginLeft: 4,
    fontWeight: '600',
  },
  ratingText: {
    marginLeft: 8,
    color: '#666',
  },
  reviewContainer: {
    marginTop: 16,
    marginHorizontal: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    width: '100%',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eee',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewInfo: {
    marginLeft: 12,
  },
  reviewNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  heartIcon: {
    marginLeft: 8,
  },
  reviewCount: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666',
  },
  helpfulText: {
    marginTop: 4,
    fontSize: 14,
    color: '#666',
  },
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#eee',
    justifyContent: 'center',
    marginRight: 8,
  },
  iconButtonText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  iconButtonTextActive: {
    color: '#fff',
  },
  iconButtonActive: {
    backgroundColor: '#7E57C2',
    borderColor: '#7E57C2',
  },
  bookButton: {
    flex: 1,
    backgroundColor: '#6B46C1',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    height: 40,
    marginLeft: 8,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  sellerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginHorizontal: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
    width: '100%',
    backgroundColor: '#fff',
  },
  sellerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#7E57C2',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  sellerAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  sellerInitial: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  sellerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  sellerLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  viewProfileButton: {
    backgroundColor: '#7E57C2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 12,
  },
  viewProfileText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  sellerAddressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#f9f9f9',
    width: '100%',
  },
  sellerAddressText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  paginationContainer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#fff',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  ratingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  ratingSection: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    marginBottom: Platform.OS === 'ios' ? 90 : 80,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  ratingScrollContent: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
  },
  ratingScrollContentWithKeyboard: {
    paddingBottom: Platform.OS === 'ios' ? 200 : 180,
  },
  ratingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  ratingHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  ratingContent: {
    alignItems: 'center',
    marginBottom: 24,
  },
  ratingLabel: {
    fontSize: 18,
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  starButton: {
    padding: 8,
  },
  ratingValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  ratingDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  commentContainer: {
    marginBottom: 24,
  },
  commentLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
    fontWeight: '500',
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    backgroundColor: '#f9f9f9',
    marginBottom: 24,
  },
  submitButton: {
    backgroundColor: '#7E57C2',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  rateButtonContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  rateButton: {
    backgroundColor: '#7E57C2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  rateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  reviewItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  starRating: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  starIcon: {
    marginRight: 2,
  },
  reviewComment: {
    fontSize: 14,
    color: '#333',
    marginTop: 8,
    lineHeight: 20,
  },
  reviewDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  reviewerAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  noReviewsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noReviewsText: {
    fontSize: 16,
    color: '#666',
  },
  reviewsContainer: {
    padding: 0,
    paddingHorizontal: 16,
    width: '100%',
    marginBottom: 16,
  },
  reviewsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#7E57C2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  reviewerDetails: {
    flex: 1,
  },
  loadMoreButton: {
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  loadMoreText: {
    color: '#7E57C2',
    fontSize: 14,
    fontWeight: '600',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  detailsContainer: {
    padding: 0,
    width: '100%',
  },
  mainContainer: {
    flex: 1,
    position: 'relative',
  },
});

export default ProductDetails; 