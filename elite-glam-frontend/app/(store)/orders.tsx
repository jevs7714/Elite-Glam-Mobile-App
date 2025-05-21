import React, { useState, useEffect } from 'react';
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
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { bookingService, Booking, BookingStatus } from '../../services/booking.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../../services/api';

const ITEMS_PER_PAGE = 4;

const STATUS_COLORS = {
  pending: '#FFA500',
  confirmed: '#4CAF50',
  cancelled: '#F44336',
  completed: '#2196F3',
  rejected: '#F44336'
} as const;

const STATUS_ICONS = {
  pending: 'schedule' as const,
  confirmed: 'check-circle' as const,
  cancelled: 'cancel' as const,
  completed: 'done-all' as const,
  rejected: 'close' as const
} as const;

export default function OrdersScreen() {
  const [orders, setOrders] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<BookingStatus | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<string>('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userData = await AsyncStorage.getItem('userData');
        console.log('Loaded user data:', userData); // Debug log
        if (userData) {
          const parsedData = JSON.parse(userData);
          console.log('Parsed user data:', parsedData); // Debug log
          if (parsedData.uid) {
            setCurrentUser(parsedData.uid);
          } else {
            console.error('No uid found in user data');
            // Try to get fresh data from API
            const token = await AsyncStorage.getItem('userToken');
            if (token) {
              const response = await api.get('/auth/me', {
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });
              if (response.data?.uid) {
                setCurrentUser(response.data.uid);
                // Update stored data with uid
                await AsyncStorage.setItem('userData', JSON.stringify({
                  ...parsedData,
                  uid: response.data.uid
                }));
              }
            }
          }
        } else {
          console.error('No user data found in AsyncStorage');
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };
    loadUserData();
  }, []);

  const fetchOrders = async (pageNumber: number = 1, shouldRefresh: boolean = false) => {
    try {
      console.log('Fetching orders for user:', currentUser); // Debug log
      
      if (!currentUser) {
        console.error('No current user found');
        setOrders([]);
        return;
      }
      
      if (shouldRefresh) {
        setPage(1);
        setHasMore(true);
      }

      setIsLoadingMore(true);
      const data = await bookingService.getSellerBookings();
      console.log('Fetched orders data:', data); // Debug log
      
      if (!data || !Array.isArray(data)) {
        console.error('Invalid data received:', data);
        setOrders([]);
        return;
      }
      
      // Only filter out cancelled bookings, show all other bookings
      const activeOrders = data.filter(order => order.status !== 'cancelled');
      console.log('Active orders:', activeOrders); // Debug log
      
      // Calculate pagination
      const startIndex = (pageNumber - 1) * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      const paginatedOrders = activeOrders.slice(startIndex, endIndex);
      console.log('Paginated orders:', paginatedOrders); // Debug log
      
      if (paginatedOrders.length < ITEMS_PER_PAGE) {
        setHasMore(false);
      }

      setOrders(prevOrders => {
        const newOrders = shouldRefresh ? paginatedOrders : [...prevOrders, ...paginatedOrders];
        console.log('Updated orders state:', newOrders); // Debug log
        return newOrders;
      });
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      if (error.response?.status === 401) {
        // Handle unauthorized error
        await AsyncStorage.removeItem('userToken');
        router.replace('/(auth)/login');
      } else {
      Alert.alert(
        'Error',
        'Failed to load orders. Please try again later.'
      );
      }
      setOrders([]); // Clear orders on error
    } finally {
      setLoading(false);
      setRefreshing(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    console.log('Current user changed:', currentUser); // Debug log
    if (currentUser) {
      fetchOrders(1, true);
    } else {
      console.log('No current user, clearing orders');
      setOrders([]);
    }
  }, [currentUser]);

  useFocusEffect(
    React.useCallback(() => {
      console.log('Screen focused, current user:', currentUser); // Debug log
      if (currentUser) {
        fetchOrders(1, true);
      }
    }, [currentUser])
  );

  const loadMore = () => {
    if (!isLoadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchOrders(nextPage);
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: BookingStatus) => {
    try {
      // Show confirmation dialog based on the action
      let confirmMessage = '';
      let confirmTitle = '';
      
      if (newStatus === 'confirmed') {
        confirmTitle = 'Confirm Booking';
        confirmMessage = 'Are you sure you want to confirm this booking?';
      } else if (newStatus === 'cancelled') {
        confirmTitle = 'Cancel Booking';
        confirmMessage = 'Are you sure you want to cancel this booking?';
      } else if (newStatus === 'rejected') {
        confirmTitle = 'Reject Booking';
        confirmMessage = 'Are you sure you want to reject this booking? Note: Only the 7 most recent rejected bookings will be kept.';
      }
      
      Alert.alert(
        confirmTitle,
        confirmMessage,
        [
          { text: 'No', style: 'cancel' },
          { 
            text: 'Yes', 
            style: 'default',
            onPress: async () => {
              try {
                // Update the booking status
                await bookingService.updateBookingStatus(orderId, newStatus);
                
                // Show success message based on the action
                let successMessage = '';
                if (newStatus === 'confirmed') {
                  successMessage = 'Booking has been confirmed successfully';
                } else if (newStatus === 'cancelled') {
                  successMessage = 'Booking has been cancelled';
                } else if (newStatus === 'rejected') {
                  successMessage = 'Booking has been rejected';
                }
                
                Alert.alert('Success', successMessage);
                
                // Immediately update the local state to reflect the change
                setOrders(prevOrders => {
                  return prevOrders.map(order => {
                    if (order.id === orderId) {
                      return { ...order, status: newStatus };
                    }
                    return order;
                  });
                });
                
                // Also refresh the list to ensure consistency with the server
                fetchOrders();
              } catch (error) {
                console.error('Error updating order status:', error);
                Alert.alert('Error', 'Failed to update order status');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in handleStatusUpdate:', error);
      Alert.alert('Error', 'Failed to update order status');
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        order.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        order.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    // If a specific status is selected, only show orders with that status
    // Otherwise, show all non-cancelled orders
    const matchesStatus = selectedStatus ? order.status === selectedStatus : true;
    
    return matchesSearch && matchesStatus;
  });

  const renderStatusFilter = () => (
    <View style={styles.filterContainer}>
      {/* Filter out 'cancelled' and 'completed' from status options */}
      {(Object.keys(STATUS_COLORS).filter(status => status !== 'cancelled' && status !== 'completed') as BookingStatus[]).map((status) => (
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
  );

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.loadingMoreContainer}>
        <ActivityIndicator size="small" color="#6B4EFF" />
        <Text style={styles.loadingMoreText}>Loading more orders...</Text>
      </View>
    );
  };

  const renderOrderItem = ({ item: order }: { item: Booking }) => (
    <TouchableOpacity
      onPress={() => router.push({ pathname: '/(store)/order-details', params: { id: order.id } })}
      style={styles.orderCard}
    >
      <View style={styles.orderContent}>
        <View style={styles.imageContainer}>
          {order.productImage ? (
            <Image
              source={{ uri: order.productImage }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.noImageContainer}>
              <MaterialIcons name="image-not-supported" size={24} color="#ccc" />
            </View>
          )}
        </View>

        <View style={styles.orderInfo}>
          <View style={styles.headerRow}>
            <View style={styles.titleContainer}>
              <Text style={styles.serviceName} numberOfLines={1}>
                {order.serviceName ? order.serviceName : 'Product not Available'}
              </Text>
              <View style={styles.customerInfo}>
                <MaterialIcons name="person" size={14} color="#666" />
              <Text style={styles.customerName} numberOfLines={1}>
                {order.customerName}
              </Text>
              </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[order.status] }]}>
              <MaterialIcons name={STATUS_ICONS[order.status]} size={14} color="white" />
          <Text style={styles.statusText}>
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </Text>
        </View>
      </View>

          <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
              <MaterialIcons name="schedule" size={16} color="#666" />
              <Text style={styles.detailText}>
                Created: {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString()}
              </Text>
        </View>
          </View>
        </View>
      </View>
          </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6B4EFF" />
        <Text style={styles.loadingText}>Loading orders...</Text>
      </View>
    );
  }

  if (orders.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Orders Management</Text>
        </View>

        <View style={styles.emptyContainer}>
          <MaterialIcons name="receipt-long" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No orders found</Text>
          <Text style={styles.emptySubtext}>When you receive orders, they will appear here</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Orders Management</Text>
      </View>

      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={24} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search orders..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {renderStatusFilter()}

      <FlatList
        data={filteredOrders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        onRefresh={() => fetchOrders(1, true)}
        refreshing={refreshing}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
      />
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
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
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
  orderCard: {
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
  orderContent: {
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
  orderInfo: {
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
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  customerName: {
    fontSize: 14,
    color: '#666',
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
  },
  detailText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
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
  loadingMoreContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingMoreText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
});