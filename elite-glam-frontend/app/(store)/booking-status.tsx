import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Platform,
  RefreshControl,
  Image,
  BackHandler,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { bookingService, Booking } from '../../services/booking.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const STATUS_COLORS = {
  pending: '#FFA500',
  confirmed: '#4CAF50',
  cancelled: '#F44336',
  rejected: '#F44336',
} as const;

const STATUS_ICONS = {
  pending: 'schedule' as const,
  confirmed: 'check-circle' as const,
  cancelled: 'cancel' as const,
  rejected: 'close' as const,
} as const;

type BookingStatus = keyof typeof STATUS_COLORS;

export default function BookingStatusScreen() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<BookingStatus | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const ITEMS_PER_PAGE = 4;
  const [isOffline, setIsOffline] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  // Handle back button press
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      router.back();
      return true;
    });

    return () => backHandler.remove();
  }, []);

  // Monitor network status
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
      if (state.isConnected && retryCount > 0) {
        fetchBookings(1, true);
      }
    });

    return () => unsubscribe();
  }, [retryCount]);

  // Enhanced fetchBookings with retry logic
  const fetchBookings = useCallback(async (pageNum: number = 1, isRefreshing: boolean = false) => {
    try {
      if (isOffline) {
        throw new Error('No internet connection');
      }

      if (isRefreshing) {
        setLoading(true);
        setPage(1);
      } else if (pageNum === 1) {
      setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      setError(null);
      
      const userDataStr = await AsyncStorage.getItem('userData');
      if (!userDataStr) {
        throw new Error('No user data found');
      }
      
      const userData = JSON.parse(userDataStr);
      const data = await bookingService.getAllBookings();
      
      // Reset retry count on successful fetch
      setRetryCount(0);
      
      // Filter out cancelled bookings
      const activeBookings = data.filter(booking => booking.status !== 'cancelled');
      
      // Sort bookings by date (newest first)
      const sortedBookings = activeBookings.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      // Calculate pagination
      const startIndex = (pageNum - 1) * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      const paginatedBookings = sortedBookings.slice(startIndex, endIndex);
      
      setHasMore(endIndex < sortedBookings.length);
      
      if (isRefreshing || pageNum === 1) {
        setBookings(paginatedBookings);
      } else {
        setBookings(prev => [...prev, ...paginatedBookings]);
      }
    } catch (error: any) {
      if (error.message === 'No internet connection') {
        setError('Please check your internet connection');
      } else if (error.response?.status === 401) {
        await AsyncStorage.removeItem('userToken');
        router.replace('/(auth)/login');
      } else if (error.response?.status === 404) {
        setBookings([]);
      } else {
        setError('Failed to load bookings. Please try again.');
        if (retryCount < MAX_RETRIES) {
          setRetryCount(prev => prev + 1);
          setTimeout(() => fetchBookings(pageNum, isRefreshing), 2000 * (retryCount + 1));
        }
      }
      setBookings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [isOffline, retryCount]);

  // Memoize the filtered bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter(booking => {
    const matchesSearch = booking.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        booking.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus ? booking.status === selectedStatus : true;
    return matchesSearch && matchesStatus;
  });
  }, [bookings, searchQuery, selectedStatus]);

  // Memoize the status filter render function
  const renderStatusFilter = useCallback(() => (
    <View style={styles.filterContainer}>
      {(Object.keys(STATUS_COLORS).filter(status => status !== 'cancelled') as BookingStatus[]).map((status) => (
        <TouchableOpacity
          key={status}
          style={[
            styles.filterButton,
            selectedStatus === status && styles.filterButtonActive,
            { backgroundColor: selectedStatus === status ? STATUS_COLORS[status] : 'transparent' }
          ]}
          onPress={() => setSelectedStatus(selectedStatus === status ? null : status)}
        >
          <MaterialIcons
            name={STATUS_ICONS[status]}
            size={20}
            color={selectedStatus === status ? 'white' : STATUS_COLORS[status]}
          />
          <Text
            style={[
              styles.filterText,
              { color: selectedStatus === status ? 'white' : STATUS_COLORS[status] }
            ]}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  ), [selectedStatus]);

  // Memoize the booking item render function
  const renderBookingItem = useCallback(({ item: booking }: { item: Booking }) => (
    <TouchableOpacity
      style={styles.bookingCard}
      onPress={() => {
        router.push({
          pathname: '/booking-details',
          params: { id: booking.id }
        });
      }}
    >
      <View style={styles.bookingContent}>
        <View style={styles.imageContainer}>
          {booking.productImage ? (
            <Image
              source={{ uri: booking.productImage }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.noImageContainer}>
              <MaterialIcons name="image-not-supported" size={24} color="#ccc" />
            </View>
          )}
        </View>

        <View style={styles.bookingInfo}>
          <View style={styles.headerRow}>
            <View style={styles.titleContainer}>
              <Text style={styles.serviceName} numberOfLines={1}>
              {booking.serviceName ? booking.serviceName : 'Product not Available'}
            </Text>
              <View style={styles.priceContainer}>
                <MaterialIcons name="attach-money" size={14} color="#666" />
                <Text style={styles.priceText}>₱{booking.price.toLocaleString()}</Text>
              </View>
            </View>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[booking.status] }]}>
              <MaterialIcons name={STATUS_ICONS[booking.status]} size={14} color="white" />
          <Text style={styles.statusText}>
            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
          </Text>
        </View>
      </View>

          <View style={styles.detailsContainer}>
            {booking.sellerLocation && (
        <View style={styles.detailRow}>
                <MaterialIcons name="store" size={16} color="#666" />
                <Text style={styles.detailText} numberOfLines={1}>{booking.sellerLocation}</Text>
        </View>
            )}
        <View style={styles.detailRow}>
              <MaterialIcons name="schedule" size={16} color="#666" />
              <Text style={styles.detailText}>
                Created: {new Date(booking.createdAt).toLocaleDateString()} at {new Date(booking.createdAt).toLocaleTimeString()}
              </Text>
            </View>
      </View>
        </View>
      </View>
    </TouchableOpacity>
  ), []);

  // Memoize the list footer component
  const ListFooterComponent = useCallback(() => (
    loadingMore ? (
      <View style={styles.loadingMoreContainer}>
        <ActivityIndicator size="small" color="#6B4EFF" />
        <Text style={styles.loadingMoreText}>Loading more bookings...</Text>
      </View>
    ) : null
  ), [loadingMore]);

  // Memoize the onRefresh callback
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBookings(1, true);
  }, [fetchBookings]);

  // Memoize the loadMore callback
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchBookings(nextPage);
    }
  }, [loadingMore, hasMore, page, fetchBookings]);

  useEffect(() => {
    fetchBookings(1);
  }, [fetchBookings]);

  useFocusEffect(
    React.useCallback(() => {
      fetchBookings(1);
    }, [fetchBookings])
  );

  const renderError = useCallback(() => (
    <View style={styles.errorContainer}>
      <MaterialIcons name="error-outline" size={48} color="#F44336" />
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={() => {
          setRetryCount(0);
          fetchBookings(1, true);
        }}
      >
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  ), [error, fetchBookings]);

  const renderOfflineMessage = useCallback(() => (
    <View style={styles.offlineContainer}>
      <MaterialIcons name="wifi-off" size={24} color="#666" />
      <Text style={styles.offlineText}>You're offline</Text>
    </View>
  ), []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6B4EFF" />
        <Text style={styles.loadingText}>Loading your bookings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>My Bookings</Text>
          <View style={styles.backButton} />
        </View>
      </View>

      {isOffline && renderOfflineMessage()}

      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={24} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search bookings..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
      </View>

      {renderStatusFilter()}

      {error ? (
        renderError()
      ) : bookings.length === 0 && !loading ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="event-busy" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No bookings found</Text>
          <Text style={styles.emptySubtext}>Your booking history will appear here</Text>
          <TouchableOpacity
            style={styles.createBookingButton}
            onPress={() => router.push('/confirm-booking')}
          >
            <Text style={styles.createBookingText}>Create a Booking</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
          renderItem={renderBookingItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={['#6B4EFF']}
              tintColor="#6B4EFF"
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={ListFooterComponent}
          removeClippedSubviews={true}
          maxToRenderPerBatch={5}
          windowSize={5}
          initialNumToRender={4}
        />
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
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  backButton: {
    width: 40,
    alignItems: 'center',
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  filterButtonActive: {
    borderColor: 'transparent',
  },
  filterText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
  },
  listContainer: {
    padding: 16,
  },
  bookingCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  bookingContent: {
    flexDirection: 'row',
    padding: 16,
  },
  imageContainer: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 16,
    backgroundColor: '#f5f5f5',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  noImageContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookingInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priceText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  detailsContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  createBookingButton: {
    backgroundColor: '#6B4EFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  createBookingText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#6B4EFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  offlineContainer: {
    backgroundColor: '#FFF3E0',
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineText: {
    color: '#666',
    marginLeft: 8,
    fontSize: 14,
  },
}); 