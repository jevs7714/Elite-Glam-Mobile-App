import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, ActivityIndicator, RefreshControl, Alert, TextInput, Platform } from 'react-native';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { productsService, Product as CategoryProduct } from '../../services/products.service'; // Renamed to avoid conflict
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../services/api';
import FilterModal, { Filters } from '../components/FilterModal';

// Constants for category products
const CATEGORY_ITEMS_PER_PAGE = 8;
const CATEGORY_CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
const CATEGORY_CACHE_KEY = 'home_products_cache';

// Constants for search functionality
const SEARCH_ITEMS_PER_PAGE = 8;
const SEARCH_CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
const SEARCH_CACHE_KEY_PREFIX = 'search_cache_';
const SEARCH_HISTORY_KEY = 'search_history';
const MAX_HISTORY_ITEMS = 7;

const getSearchCacheKey = (query: string, page: number) => `${SEARCH_CACHE_KEY_PREFIX}${query}_${page}`;

// Default product image
const defaultProductImage = require('../../assets/images/dressProduct.png');

// Interface for category product cache
interface CategoryCacheData {
  products: CategoryProductWithRating[];
  timestamp: number;
  category: string;
}

// Interface for category products with rating
interface CategoryProductWithRating extends CategoryProduct {
  averageRating: number;
}

// Interface for searched products (structure from former search.tsx)
interface SearchProduct {
  id: number; // Search API might return number ID
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  size: string[];
  color: string[];
  available: boolean;
  averageRating?: number;
}

// Interface for search result cache
interface SearchCacheData {
  data: SearchProduct[];
  timestamp: number;
}

export default function HomeScreen() {
  const categoryScrollRef = useRef<ScrollView>(null);
  const categoryButtonLayouts = useRef(new Map<string, { x: number; width: number }>());
  const [categoryScrollViewWidth, setCategoryScrollViewWidth] = useState(0);
  const [categoryScrollContentWidth, setCategoryScrollContentWidth] = useState(0);

  // State for category products
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Filters>({ categories: [] });
  const [categoryProducts, setCategoryProducts] = useState<CategoryProductWithRating[]>([]);
  const [isCategoryLoading, setIsCategoryLoading] = useState(true);
  const [isCategoryRefreshing, setIsCategoryRefreshing] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [categoryPage, setCategoryPage] = useState(1);
  const [categoryHasMore, setCategoryHasMore] = useState(true);
  const [isCategoryLoadingMore, setIsCategoryLoadingMore] = useState(false);
  const [isCategorySwitchLoading, setIsCategorySwitchLoading] = useState(false);

  // State for search functionality
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedProducts, setSearchedProducts] = useState<SearchProduct[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchPage, setSearchPage] = useState(1);
  const [searchHasMore, setSearchHasMore] = useState(true);
  const [isSearchLoadingMore, setIsSearchLoadingMore] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false); // To control view mode

  // --- Category Product Logic ---
  const loadCachedCategoryProducts = async () => {
    try {
      const cachedData = await AsyncStorage.getItem(CATEGORY_CACHE_KEY);
      if (cachedData) {
        const { products: cachedProducts, timestamp, category } = JSON.parse(cachedData) as CategoryCacheData;
        const isExpired = Date.now() - timestamp > CATEGORY_CACHE_EXPIRY;
        const isSameCategory = category === 'all';
        if (!isExpired && isSameCategory) {
          setCategoryProducts(cachedProducts);
          setIsCategoryLoading(false);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error loading cached category products:', error);
      return false;
    }
  };

  const saveCategoryProductsToCache = async (productsToCache: CategoryProductWithRating[]) => {
    try {
      const cacheData: CategoryCacheData = {
        products: productsToCache,
        timestamp: Date.now(),
        category: 'all'
      };
      await AsyncStorage.setItem(CATEGORY_CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error saving category products to cache:', error);
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
      // console.error('Error fetching product ratings:', error);
      return 0;
    }
  };

  const fetchCategoryProducts = async (filters: Filters, pageNumber: number, shouldRefresh: boolean = false) => {
    if (shouldRefresh) {
      setCategoryError(null);
      setCategoryPage(1);
      setCategoryHasMore(true);
    } else if (pageNumber === 1 && !isCategorySwitchLoading) {
      // Try to load from cache first if it's the initial load for the category (not a switch)
      const hasCachedData = await loadCachedCategoryProducts();
      if (hasCachedData) return;
    }

    if (pageNumber === 1 && !shouldRefresh) setIsCategoryLoading(true);
    if (pageNumber > 1) setIsCategoryLoadingMore(true);

    try {
      const params: any = {
        page: pageNumber,
        limit: CATEGORY_ITEMS_PER_PAGE,
        categories: filters.categories?.join(','),
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        minRating: filters.minRating,
      };

      // Remove undefined or null params
      Object.keys(params).forEach(key => (params[key] === undefined || params[key] === null || params[key] === '') && delete params[key]);

      const response = await api.get('/products', { params });
      const fetchedProductsRaw = response.data.products || response.data;

      const productsWithRatings = await Promise.all(
        fetchedProductsRaw.map(async (product: CategoryProduct) => ({
          ...product,
          averageRating: await fetchProductRatings(product.id)
        }))
      );

      setCategoryProducts(prev => shouldRefresh || isCategorySwitchLoading ? productsWithRatings : [...prev, ...productsWithRatings]);
      setCategoryHasMore(productsWithRatings.length === CATEGORY_ITEMS_PER_PAGE);
      if (shouldRefresh || isCategorySwitchLoading) {
        await saveCategoryProductsToCache(productsWithRatings);
      }
    } catch (err: any) {
      setCategoryError(err.message || 'Failed to fetch products.');
    } finally {
      setIsCategoryLoading(false);
      setIsCategoryRefreshing(false);
      setIsCategoryLoadingMore(false);
      setIsCategorySwitchLoading(false);
    }
  };

  const onCategoryRefresh = useCallback(() => {
    setIsCategoryRefreshing(true);
    fetchCategoryProducts(activeFilters, 1, true);
  }, [activeFilters]);

  const loadMoreCategoryProducts = () => {
    if (!isCategoryLoadingMore && categoryHasMore) {
      const nextPage = categoryPage + 1;
      setCategoryPage(nextPage);
      fetchCategoryProducts(activeFilters, nextPage);
    }
  };

  useEffect(() => {
    // Initial load for the default category or when category changes
    setIsCategorySwitchLoading(true);
    setCategoryPage(1);
    setCategoryHasMore(true);
    fetchCategoryProducts(activeFilters, 1, true).finally(() => setIsCategorySwitchLoading(false));
  }, [activeFilters]);

  useFocusEffect(
    useCallback(() => {
      // Re-fetch category products on focus if not actively searching
      if (!isSearchActive) {
        fetchCategoryProducts(activeFilters, 1, true);
      }
      // Load search history on focus as well
      loadSearchHistory();
    }, [isSearchActive, activeFilters])
  );

  // --- Search Functionality Logic ---
  const loadSearchFromCache = async (key: string): Promise<SearchProduct[] | null> => {
    try {
      const cachedResult = await AsyncStorage.getItem(key);
      if (cachedResult) {
        const { data, timestamp } = JSON.parse(cachedResult) as SearchCacheData;
        if (Date.now() - timestamp < SEARCH_CACHE_EXPIRY) {
          return data;
        }
        await AsyncStorage.removeItem(key); // Expired, remove it
      }
      return null;
    } catch (error) {
      console.error('Error loading search from cache:', error);
      return null;
    }
  };

  const saveSearchToCache = async (key: string, data: SearchProduct[]) => {
    try {
      const item: SearchCacheData = { data, timestamp: Date.now() };
      await AsyncStorage.setItem(key, JSON.stringify(item));
    } catch (error) {
      console.error('Error saving search to cache:', error);
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
    if (!query.trim()) return;
    try {
      let updatedHistory = [query, ...searchHistory.filter(item => item !== query)];
      if (updatedHistory.length > MAX_HISTORY_ITEMS) {
        updatedHistory = updatedHistory.slice(0, MAX_HISTORY_ITEMS);
      }
      setSearchHistory(updatedHistory);
      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updatedHistory));
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

  const fetchSearchedProducts = async (currentQuery: string, pageNumber: number, isNewSearch: boolean = false) => {
    if (!currentQuery.trim()) {
      setSearchedProducts([]);
      setIsSearchActive(false);
      return;
    }
    setIsSearchActive(true);
    const cacheKey = getSearchCacheKey(currentQuery, pageNumber);

    if (isNewSearch) {
      setSearchError(null);
      setSearchPage(1);
      setSearchHasMore(true);
      setSearchedProducts([]); // Clear previous results for new search
      setIsSearchLoading(true);
    } else {
      setIsSearchLoadingMore(true);
    }

    try {
      if (isNewSearch) { // Check cache only for the first page of a new search
        const cachedProducts = await loadSearchFromCache(cacheKey);
        if (cachedProducts) {
          setSearchedProducts(cachedProducts);
          setSearchHasMore(cachedProducts.length === SEARCH_ITEMS_PER_PAGE);
          setIsSearchLoading(false);
          return;
        }
      }

      const response = await api.get('/products', { 
        params: { search: currentQuery, page: pageNumber, limit: SEARCH_ITEMS_PER_PAGE }
      });
      
      const productsWithRatings = await Promise.all(
        (response.data.products || response.data).map(async (product: SearchProduct) => ({
          ...product,
          averageRating: await fetchProductRatings(product.id.toString())
        }))
      );

      setSearchedProducts(prev => isNewSearch ? productsWithRatings : [...prev, ...productsWithRatings]);
      setSearchHasMore(productsWithRatings.length === SEARCH_ITEMS_PER_PAGE);
      await saveSearchToCache(cacheKey, productsWithRatings); // Cache new page results

    } catch (err: any) {
      setSearchError(err.message || 'Failed to fetch search results.');
    } finally {
      setIsSearchLoading(false);
      setIsSearchLoadingMore(false);
    }
  };

  const handleSearchSubmit = (query: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setSearchedProducts([]);
      setIsSearchActive(false); // No query, show categories
      setShowSearchHistory(false);
      return;
    }
    setSearchQuery(trimmedQuery);
    setIsSearchActive(true);
    setShowSearchHistory(false);
    saveSearchHistory(trimmedQuery);
    fetchSearchedProducts(trimmedQuery, 1, true);
  };

  const debouncedSearch = useCallback(
    debounce((query: string) => {
      if (query.trim().length > 0) {
        handleSearchSubmit(query);
      } else if (query.trim().length === 0 && isSearchActive) {
        // If search was active and query is cleared, reset to category view
        // setShowSearchHistory(true); // Option 1: Show history immediately
        setIsSearchActive(false); // Option 2: Go back to categories, history on focus
        setSearchedProducts([]);
      }
    }, 500), 
    [isSearchActive] // Recreate if isSearchActive changes, to ensure correct closure
  );

  useEffect(() => {
    if (searchQuery.trim().length === 0 && !isSearchActive) {
      // If search query is cleared and search is not active, ensure category products are shown
      // This might be redundant if useFocusEffect handles it, but good for explicit clear
      // fetchCategoryProducts(1, true); 
    } else {
      debouncedSearch(searchQuery);
    }
  }, [searchQuery]);

  const loadMoreSearchResults = () => {
    if (!isSearchLoadingMore && searchHasMore && searchQuery.trim()) {
      const nextPage = searchPage + 1;
      setSearchPage(nextPage);
      fetchSearchedProducts(searchQuery, nextPage, false);
    }
  };

  const handleSearchedProductPress = (product: SearchProduct) => {
    router.push({ pathname: '/(store)/product-details', params: { id: product.id.toString() } });
  };
  
  const handleCategoryProductPress = (product: CategoryProductWithRating) => {
    router.push({ pathname: '/(store)/product-details', params: { id: product.id.toString() } });
  };

  const renderSearchHistoryComponent = () => (
    <View style={styles.historyContainer}>
      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>Recent Searches</Text>
        {searchHistory.length > 0 && (
          <TouchableOpacity onPress={clearSearchHistory}>
            <Text style={styles.clearHistoryButton}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>
      {searchHistory.length === 0 ? (
        <Text style={styles.historyEmptyText}>No recent searches.</Text>
      ) : (
        searchHistory.map((item, index) => (
          <TouchableOpacity key={index} style={styles.historyItem} onPress={() => handleSearchSubmit(item)}>
            <MaterialIcons name="history" size={20} color="#666" style={styles.historyIcon} />
            <Text style={styles.historyItemText}>{item}</Text>
          </TouchableOpacity>
        ))
      )}
    </View>
  );

  // --- Render Logic ---
  if (isCategoryLoading && categoryProducts.length === 0 && !isSearchActive) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#4A148C" /><Text style={styles.loadingText}>Loading Products...</Text></View>;
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchSectionContainer}>
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search gowns, suits, accessories..."
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              if (!text.trim()) {
                // If text is cleared, decide if history should be shown or go back to categories
                // setShowSearchHistory(true); // Option 1: Show history immediately
                setIsSearchActive(false); // Option 2: Go back to categories, history on focus
                setSearchedProducts([]);
              }
            }}
            onSubmitEditing={() => handleSearchSubmit(searchQuery)}
            onFocus={() => {
              if (searchQuery.trim().length === 0) {
                setShowSearchHistory(true);
                setIsSearchActive(true); // Set search active to show history view
              }
            }}
            // onBlur={() => setShowSearchHistory(false)} // Can hide history on blur
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setIsSearchActive(false); setSearchedProducts([]); setShowSearchHistory(false); }}>
              <MaterialIcons name="close" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.filterButton} onPress={() => setIsFilterModalVisible(true)}>
          <FontAwesome name="sliders" size={20} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView
        stickyHeaderIndices={!isSearchActive ? [0] : undefined}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const paddingToBottom = 20;
          const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
          if (isCloseToBottom) {
            if (isSearchActive && searchQuery.trim()) {
              loadMoreSearchResults();
            } else if (!isSearchActive) {
              loadMoreCategoryProducts();
            }
          }
        }}
        scrollEventThrottle={100} // Adjusted for performance
        refreshControl={
          isSearchActive ? undefined : (
            <RefreshControl
              refreshing={isCategoryRefreshing}
              onRefresh={onCategoryRefresh}
              colors={['#4A148C']}
            />
          )
        }
      >
        {/* Sticky Category Section - Rendered first when !isSearchActive */}
        {!isSearchActive && (
          <View>
          </View>
        )}

        {/* Search History / Results - Rendered if search is active */}
        {isSearchActive && showSearchHistory && searchQuery.trim().length === 0 && renderSearchHistoryComponent()}

        {isSearchActive && searchQuery.trim().length > 0 && (
          // Search Results View
          <View style={styles.productsContainer}>
            {isSearchLoading && searchedProducts.length === 0 ? (
              <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#6B3FA0" /><Text style={styles.loadingText}>Searching...</Text></View>
            ) : searchError ? (
              <View style={styles.errorContainer}><Text style={styles.errorText}>{String(searchError)}</Text></View>
            ) : searchedProducts.length === 0 && !isSearchLoading ? (
              <View style={styles.emptyStateContainer}><MaterialIcons name="search-off" size={64} color="#ccc" /><Text style={styles.emptyStateText}>No products found for "{String(searchQuery)}".</Text></View>
            ) : (
              <View style={styles.productsGrid}>
                {searchedProducts.map((product) => (
                  <TouchableOpacity key={`search-${product.id}`} style={styles.productCard} onPress={() => handleSearchedProductPress(product)}>
                    <Image source={product.image ? { uri: product.image } : defaultProductImage} style={styles.productImage} />
                    <View style={styles.productInfo}>
                      <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                      {product.averageRating && product.averageRating > 0 ? (
                        <View style={styles.ratingContainer}>
                          <MaterialIcons name="star" size={12} color="#FFD700" />
                          <Text style={styles.ratingText}>{product.averageRating.toFixed(1)}</Text>
                        </View>
                      ) : null}
                      <Text style={styles.productPrice}>PHP {product.price.toLocaleString()}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {isSearchLoadingMore && <View style={styles.loadingMoreContainer}><ActivityIndicator size="small" color="#6B3FA0" /><Text style={styles.loadingMoreText}>Loading more...</Text></View>}
          </View>
        )}

        {!isSearchActive && (
          // Category Products Grid (actual products, category bar is now sticky above)
          <>
            {isCategorySwitchLoading ? (
                <View style={styles.categoryLoadingContainer}><ActivityIndicator size="large" color="#4A148C" /></View>
            ) : categoryError ? (
              <View style={styles.errorContainer}><Text style={styles.errorText}>{categoryError}</Text><TouchableOpacity style={styles.retryButton} onPress={onCategoryRefresh}><Text style={styles.retryButtonText}>Retry</Text></TouchableOpacity></View>
            ) : categoryProducts.length === 0 && !isCategoryLoading ? (
              <View style={styles.noProductsContainer}><Text style={styles.noProductsText}>No products found in this category.</Text></View>
            ) : (
              <View style={styles.productsContainer}>
                <View style={styles.productsGrid}>
                  {categoryProducts.map(product => (
                    <TouchableOpacity key={`cat-${product.id}`} style={styles.productCard} onPress={() => handleCategoryProductPress(product)}>
                      <Image source={product.image ? { uri: product.image } : defaultProductImage} style={styles.productImage} />
                      <View style={styles.productInfo}>
                        <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                        <View style={styles.ratingContainer}>
                          <MaterialIcons name="star" size={12} color="#FFD700" />
                          <Text style={styles.ratingText}>{product.averageRating ? product.averageRating.toFixed(1) : '0.0'}</Text>
                        </View>
                        <Text style={styles.productPrice}>PHP {product.price.toLocaleString()}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            {isCategoryLoadingMore && <View style={styles.loadingMoreContainer}><ActivityIndicator size="small" color="#4A148C" /><Text style={styles.loadingMoreText}>Loading more...</Text></View>}
          </>
        )}
      </ScrollView>
      <FilterModal 
        visible={isFilterModalVisible}
        onClose={() => setIsFilterModalVisible(false)}
        onApply={(newFilters) => {
          setActiveFilters(newFilters);
          setIsFilterModalVisible(false);
        }}
        initialFilters={activeFilters}
      />
    </View>
  );
}

// Debounce utility
function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Parameters<F>) => {
    if (timeout !== null) {
      clearTimeout(timeout);
      timeout = null;
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };

  return debounced as (...args: Parameters<F>) => void;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContentContainer: {
    paddingBottom: 20, // Space for last items and loading indicator
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  categoryLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
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
  // Search Bar Styles
  searchSectionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Platform.OS === 'android' ? 8 : 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 44,
    marginRight: 8,
  },
  filterButton: {
    padding: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    height: '100%',
  },
  // Category Styles
  filterBar: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterButtonText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  // Products Grid Styles (shared by category and search)
  productsContainer: {
    paddingHorizontal: 16,
    paddingTop: 16, 
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productCard: {
    width: '48%', // Two cards per row with a little space
    marginBottom: 12, // Reduced from 16
    backgroundColor: '#fff',
    borderRadius: 10, // Slightly smaller radius
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0f0f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  productImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  outOfStockOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockText: {
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 14,
    padding: 5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4,
  },
  productInfo: {
    padding: 10, // Reduced from 12
  },
  productName: {
    fontSize: 14, // Reduced from 15
    fontWeight: '600',
    color: '#333',
    marginBottom: 2, // Reduced from 5
    minHeight: 20, // Adjusted for new font size
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4, // Reduced from 5
  },
  ratingText: {
    marginLeft: 4, // Reduced from 5
    fontSize: 12, // Reduced from 13
    color: '#555',
  },
  productPrice: {
    fontSize: 15, // Reduced from 16
    fontWeight: 'bold',
    color: '#4A148C',
  },
  noProductsContainer: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  noProductsText: {
    fontSize: 16,
    color: '#666',
  },
  loadingMoreContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingMoreText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  // Search History Styles
  historyContainer: {
    padding: 16,
    borderTopWidth: 1, // If search bar is separate
    borderTopColor: '#eee',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  clearHistoryButton: {
    fontSize: 14,
    color: '#4A148C',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  historyIcon: {
    marginRight: 12,
  },
  historyItemText: {
    fontSize: 16,
    color: '#444',
  },
  historyEmptyText: {
    fontSize: 15,
    color: '#777',
    textAlign: 'center',
    marginTop: 20,
  },
  emptyStateContainer: {
    flex: 1, // Ensure it can take space if needed
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 200, // Give it some minimum height
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});