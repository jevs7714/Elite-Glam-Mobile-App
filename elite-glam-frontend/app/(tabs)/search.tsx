import { StyleSheet, Text, View, TextInput, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import React, { useState, useEffect, useCallback } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { api } from '@/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ITEMS_PER_PAGE = 8;
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes in milliseconds
const SEARCH_CACHE_KEY = (query: string, page: number) => `search_${query}_${page}_cache`;
const SEARCH_HISTORY_KEY = 'search_history';
const MAX_HISTORY_ITEMS = 7;

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  rating?: number;
  image: string;
  category: string;
  size: string[];
  color: string[];
  available: boolean;
}

interface CacheData {
  data: any;
  timestamp: number;
}

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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#6B3FA0',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    height: '100%',
  },
  clearButton: {
    padding: 4,
  },
  resultsContainer: {
    flex: 1,
    padding: 16,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 64,
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
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
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  outOfStockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
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
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 12,
    color: '#666',
  },
  loadingMoreContainer: {
    width: '100%',
    padding: 10,
    alignItems: 'center',
  },
  loadingMoreText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  historyContainer: {
    padding: 16,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  clearHistoryText: {
    color: '#6B3FA0',
    fontSize: 14,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  historyItemText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  currencyText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
});

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);

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

  const loadSearchHistory = async () => {
    try {
      const history = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
      if (history) {
        setSearchHistory(JSON.parse(history));
      }
    } catch (error) {
      console.error('Error loading search history:', error);
    }
  };

  const saveSearchHistory = async (query: string) => {
    try {
      // Get current history
      const history = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
      let newHistory: string[] = [];
      
      if (history) {
        newHistory = JSON.parse(history);
      }

      // Remove the query if it already exists
      newHistory = newHistory.filter(item => item !== query);
      
      // Add the new query at the beginning
      newHistory.unshift(query);
      
      // Limit to MAX_HISTORY_ITEMS
      newHistory = newHistory.slice(0, MAX_HISTORY_ITEMS);

      // Save the updated history
      setSearchHistory(newHistory);
      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  };

  const clearSearchHistory = async () => {
    try {
      setSearchHistory([]);
      await AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch (error) {
      console.error('Error clearing search history:', error);
    }
  };

  const fetchProducts = async (pageNumber: number, shouldRefresh: boolean = false) => {
    try {
      if (shouldRefresh) {
        setError(null);
        setPage(1);
        setHasMore(true);
      }

      // Try to load from cache first if it's a search query
      if (searchQuery && pageNumber === 1 && !shouldRefresh) {
        const cachedResults = await loadFromCache(SEARCH_CACHE_KEY(searchQuery, pageNumber));
        if (cachedResults) {
          setProducts(cachedResults.products);
          setHasMore(cachedResults.hasMore);
          setIsLoading(false);
          return;
        }
      }

      setIsLoadingMore(true);
      
      // Update API call to use the correct endpoint structure
      const response = await api.get(`/products`, {
        params: {
          search: searchQuery,
          page: pageNumber,
          limit: ITEMS_PER_PAGE
        }
      });
      
      // Ensure all products have required properties with default values
      const processedProducts = response.data.map((product: Product) => ({
        ...product,
        rating: product.rating || 0,
        price: product.price || 0,
        available: product.available ?? true,
        size: product.size || [],
        color: product.color || [],
      }));

      // Filter products based on search query
      const filteredProducts = processedProducts.filter((product: Product) => {
        const searchLower = searchQuery.toLowerCase().trim();
        const productNameLower = product.name.toLowerCase();
        const productCategoryLower = product.category.toLowerCase();
        
        // Check if the search term is in the product name or matches the category exactly
        return productNameLower.includes(searchLower) || productCategoryLower === searchLower;
      });

      if (filteredProducts.length < ITEMS_PER_PAGE) {
        setHasMore(false);
      }

      const updatedProducts = shouldRefresh ? filteredProducts : [...products, ...filteredProducts];
      setProducts(updatedProducts);

      // Save to cache if it's a search query
      if (searchQuery && pageNumber === 1) {
        await saveToCache(SEARCH_CACHE_KEY(searchQuery, pageNumber), {
          products: updatedProducts,
          hasMore: filteredProducts.length === ITEMS_PER_PAGE
        });
      }

      setError(null);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products. Please try again later.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    loadSearchHistory();
    fetchProducts(1, true);
  }, []);

  const handleSearch = (query: string) => {
    const trimmedQuery = query.trim();
    setSearchQuery(trimmedQuery);
    setShowHistory(false);
    if (trimmedQuery) {
      saveSearchHistory(trimmedQuery);
      fetchProducts(1, true);
    } else {
      setProducts([]);
      fetchProducts(1, true);
    }
  };

  const loadMore = () => {
    if (!isLoadingMore && hasMore) {
      console.log('Loading more products...', { currentPage: page, hasMore });
      const nextPage = page + 1;
      setPage(nextPage);
      fetchProducts(nextPage);
    }
  };

  const filteredProducts = products;

  const handleProductPress = (product: Product) => {
    router.push({
      pathname: '/(store)/product-details',
      params: {
        id: product.id.toString(),
        name: product.name,
        description: product.description,
        price: product.price.toString(),
        rating: product.rating ? product.rating.toString() : '0',
        image: product.image,
        category: product.category,
        available: product.available ? 'true' : 'false',
      }
    });
  };

  const renderSearchHistory = () => (
    <View style={styles.historyContainer}>
      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>Recent Searches</Text>
        {searchHistory.length > 0 && (
          <TouchableOpacity onPress={clearSearchHistory}>
            <Text style={styles.clearHistoryText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>
      {searchHistory.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={styles.historyItem}
          onPress={() => handleSearch(item)}
        >
          <Text>
            <MaterialIcons name="history" size={20} color="#666" />
          </Text>
          <Text style={styles.historyItemText}>{item}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>
          <MaterialIcons name="hourglass-empty" size={48} color="#6B3FA0" />
        </Text>
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text>
          <MaterialIcons name="error-outline" size={48} color="#FF3B30" />
        </Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => fetchProducts(1, true)}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text>
            <MaterialIcons name="search" size={24} color="#666" style={styles.searchIcon} />
          </Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or category..."
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              if (!text.trim()) {
                setShowHistory(true);
              }
            }}
            onSubmitEditing={() => {
              if (searchQuery.trim()) {
                setShowHistory(false);
                handleSearch(searchQuery);
              }
            }}
            returnKeyType="search"
            onFocus={() => setShowHistory(true)}
            placeholderTextColor="#666"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={() => {
                setSearchQuery('');
                setShowHistory(true);
                clearSearchHistory();
                fetchProducts(1, true);
              }}
            >
              <Text>
                <MaterialIcons name="close" size={20} color="#666" />
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search Results or History */}
      <ScrollView 
        style={styles.resultsContainer}
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const paddingToBottom = 20;
          const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= 
              contentSize.height - paddingToBottom;
          
          if (isCloseToBottom && !showHistory) {
            loadMore();
          }
        }}
        scrollEventThrottle={16}
      >
        {showHistory && searchQuery.length === 0 ? (
          renderSearchHistory()
        ) : searchQuery.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Text>
              <MaterialIcons name="search" size={64} color="#ccc" />
            </Text>
            <Text style={styles.emptyStateText}>Search for products by name or category...</Text>
          </View>
        ) : filteredProducts.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Text>
              <MaterialIcons name="search-off" size={64} color="#ccc" />
            </Text>
            <Text style={styles.emptyStateText}>No products found</Text>
          </View>
        ) : (
          <View style={styles.productsGrid}>
            {filteredProducts.map((product) => (
              <TouchableOpacity 
                key={product.id} 
                style={styles.productCard}
                onPress={() => handleProductPress(product)}
              >
                <View style={styles.imageContainer}>
                  <Image 
                    source={{ uri: product.image }} 
                    style={styles.productImage}
                    onError={() => {
                      console.log('Image failed to load:', product.image);
                    }}
                  />
                  {!product.available && (
                    <View style={styles.outOfStockOverlay}>
                      <Text style={styles.outOfStockText}>Out of Stock</Text>
                    </View>
                  )}
                </View>
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={2}>
                    {product.name}
                  </Text>
                  {product.rating && product.rating > 0 && (
                    <View style={styles.ratingContainer}>
                      <Text>
                        <MaterialIcons name="star" size={16} color="#FFD700" />
                      </Text>
                      <Text style={styles.ratingText}>{product.rating.toFixed(1)}</Text>
                    </View>
                  )}
                  <View style={styles.priceContainer}>
                    <Text style={styles.currencyText}>PHP </Text>
                    <Text style={styles.priceValue}>{product.price.toLocaleString()}</Text>
                  </View>
                  <Text style={styles.productCategory}>{product.category}</Text>
                </View>
              </TouchableOpacity>
            ))}
            {isLoadingMore && (
              <View style={styles.loadingMoreContainer}>
                <ActivityIndicator size="small" color="#6B3FA0" />
                <Text style={styles.loadingMoreText}>Loading more...</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
} 