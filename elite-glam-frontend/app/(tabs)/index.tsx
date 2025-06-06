import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import React, { useState, useEffect, useCallback } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useFocusEffect, Href } from 'expo-router';
import { productsService, Product } from '../../services/products.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../services/api';

const ITEMS_PER_PAGE = 8; // Number of items to load per page
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes in milliseconds
const CACHE_KEY = 'home_products_cache';

const categories = [
  { id: 'all', name: 'All' },
  { id: 'gown', name: 'Gown' },
  { id: 'dress', name: 'Dress' },
  { id: 'suit', name: 'Suit' },
  { id: 'sportswear', name: 'Sportswear' },
  { id: 'other', name: 'Other' }
] as const;

const defaultProductImage = require('../../assets/images/dressProduct.png');

interface CacheData {
  products: Product[];
  timestamp: number;
  category: string;
}

interface ProductWithRating extends Product {
  averageRating: number;
}

export default function HomeScreen() {
  const [selectedCategory, setSelectedCategory] = useState<typeof categories[number]['id']>('all');
  const [products, setProducts] = useState<ProductWithRating[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const loadCachedProducts = async () => {
    try {
      const cachedData = await AsyncStorage.getItem(CACHE_KEY);
      if (cachedData) {
        const { products: cachedProducts, timestamp, category } = JSON.parse(cachedData) as CacheData;
        const isExpired = Date.now() - timestamp > CACHE_EXPIRY;
        const isSameCategory = category === selectedCategory;

        if (!isExpired && isSameCategory) {
          console.log('Loading products from cache');
          setProducts(cachedProducts as ProductWithRating[]);
          setIsLoading(false);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error loading cached products:', error);
      return false;
    }
  };

  const saveToCache = async (products: Product[]) => {
    try {
      const cacheData: CacheData = {
        products,
        timestamp: Date.now(),
        category: selectedCategory
      };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      console.log('Products saved to cache');
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  };

  const fetchProductRatings = async (productId: string): Promise<number> => {
    try {
      const response = await api.get(`/ratings/product/${productId}`);
      if (response.data && response.data.length > 0) {
        const sum = response.data.reduce((acc: number, curr: any) => acc + curr.rating, 0);
        return sum / response.data.length;
      }
      return 0;
    } catch (error) {
      console.error('Error fetching product ratings:', error);
      return 0;
    }
  };

  const fetchProducts = async (pageNumber: number, shouldRefresh: boolean = false) => {
    try {
      if (shouldRefresh) {
        setError(null);
        setPage(1);
        setHasMore(true);
      }

      // Try to load from cache first if it's the initial load
      if (pageNumber === 1 && !shouldRefresh) {
        const hasCachedData = await loadCachedProducts();
        if (hasCachedData) {
          return;
        }
      }

      setIsLoadingMore(true);
      console.log(`Fetching products page ${pageNumber}...`);
      
      const fetchedProducts = await productsService.getProductsByPage(
        pageNumber,
        ITEMS_PER_PAGE,
        selectedCategory === 'all' ? undefined : selectedCategory
      );

      console.log(`Fetched ${fetchedProducts.length} products`);

      // Fetch ratings for each product
      const productsWithRatings = await Promise.all(
        fetchedProducts.map(async (product: Product) => {
          const averageRating = await fetchProductRatings(product.id);
          return {
            ...product,
            averageRating
          };
        })
      );

      if (productsWithRatings.length < ITEMS_PER_PAGE) {
        setHasMore(false);
      }

      const updatedProducts = shouldRefresh ? productsWithRatings : [...products, ...productsWithRatings];
      setProducts(updatedProducts as ProductWithRating[]);

      // Save to cache if it's the first page
      if (pageNumber === 1) {
        await saveToCache(updatedProducts);
      }
    } catch (error: any) {
      console.error('Error in fetchProducts:', error);
      setError(error.message || 'Failed to fetch products');
      Alert.alert('Error', 'Failed to fetch products. Pull down to refresh.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
    }
  };

  const onRefresh = useCallback(() => {
    console.log('Refreshing products...'); // Debug log
    setIsRefreshing(true);
    fetchProducts(1, true);
  }, [selectedCategory]);

  const loadMore = () => {
    if (!isLoadingMore && hasMore) {
      console.log('Loading more products...', { currentPage: page, hasMore });
      const nextPage = page + 1;
      setPage(nextPage);
      fetchProducts(nextPage);
    } else {
      console.log('Not loading more because:', { isLoadingMore, hasMore });
    }
  };

  // Reset products when category changes
  useEffect(() => {
    setProducts([]);
    setPage(1);
    setHasMore(true);
    fetchProducts(1, true);
  }, [selectedCategory]);

  // Fetch products when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('Screen focused, fetching products...'); // Debug log
      fetchProducts(1, true);
    }, [])
  );

  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter(product => product.category.toLowerCase() === selectedCategory.toLowerCase());

  console.log('Filtered products:', filteredProducts); // Debug log

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A148C" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Categories */}
      <View style={styles.categorySection}>
        <View style={styles.categoryHeader}>
          <Text style={styles.categoryTitle}>Category</Text>
          <TouchableOpacity
            onPress={() => Alert.alert(
              'Coming Soon',
              'Filter feature is under development. Stay tuned!',
              [{ text: 'OK' }]
            )}
          >
            <MaterialIcons name="tune" size={24} color="#333" />
          </TouchableOpacity>
        </View>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryButton,
                selectedCategory === category.id && styles.categoryButtonActive
              ]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <Text style={[
                styles.categoryButtonText,
                selectedCategory === category.id && styles.categoryButtonTextActive
              ]}>
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Products Grid */}
      <ScrollView 
        style={styles.productsContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={['#4A148C']}
          />
        }
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const paddingToBottom = 20;
          const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= 
              contentSize.height - paddingToBottom;
          
          console.log('Scroll position:', {
            scrollY: contentOffset.y,
            contentHeight: contentSize.height,
            viewportHeight: layoutMeasurement.height,
            isCloseToBottom,
            distanceToBottom: contentSize.height - (layoutMeasurement.height + contentOffset.y)
          });

          if (isCloseToBottom) {
            loadMore();
          }
        }}
        scrollEventThrottle={16} // Changed from 400 to 16 for smoother detection
      >
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchProducts(1, true)}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.productsGrid}>
            {products.length === 0 ? (
              <View style={styles.noProductsContainer}>
                <Text style={styles.noProductsText}>No products found</Text>
              </View>
            ) : (
              <>
                {products.map((product) => (
                <TouchableOpacity 
                  key={product.id} 
                  style={styles.productCard}
                  onPress={() => router.push(`/(store)/product-details?id=${product.id}` as Href<any>)}
                >
                  <Image 
                    source={product.image ? { uri: product.image } : defaultProductImage} 
                    style={styles.productImage} 
                  />
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>
                      {product.name}
                    </Text>
                    <View style={styles.ratingContainer}>
                      <MaterialIcons name="star" size={16} color="#FFD700" />
                      <Text style={styles.ratingText}>
                        {product.averageRating ? product.averageRating.toFixed(1) : '0.0'}
                      </Text>
                    </View>
                    <Text style={styles.productPrice}>PHP {product.price.toLocaleString()}</Text>
                  </View>
                </TouchableOpacity>
                ))}
                {isLoadingMore && (
                  <View style={styles.loadingMoreContainer}>
                    <ActivityIndicator size="small" color="#4A148C" />
                  </View>
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  noProductsContainer: {
    width: '100%',
    padding: 20,
    alignItems: 'center',
  },
  noProductsText: {
    fontSize: 16,
    color: '#666',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 40,
    height: 40,
    marginRight: 8,
  },
  brandText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  brandE: { color: '#4A148C' },
  brandLite: { color: '#333' },
  brandG: { color: '#FFD700' },
  brandLam: { color: '#333' },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    marginLeft: 8,
  },
  categorySection: {
    padding: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
  },
  categoryButtonActive: {
    backgroundColor: '#4A148C',
    borderColor: '#4A148C',
  },
  categoryButtonText: {
    color: '#666',
    fontSize: 14,
  },
  categoryButtonTextActive: {
    color: '#fff',
  },
  productsContainer: {
    flex: 1,
    padding: 16,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productCard: {
    width: '48%',
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
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
  productImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#666',
  },
  productPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#ff4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#4A148C',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingMoreContainer: {
    width: '100%',
    paddingVertical: 16,
    alignItems: 'center',
  },
}); 