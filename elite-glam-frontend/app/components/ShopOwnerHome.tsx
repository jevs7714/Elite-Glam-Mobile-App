import React, { useState, useEffect } from "react";
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
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import {
  bookingService,
  Booking,
  BookingStatus,
} from "../../services/booking.service";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../../services/api";

const ITEMS_PER_PAGE = 4;

const STATUS_COLORS = {
  pending: "#FFA500",
  confirmed: "#4CAF50",
  cancelled: "#F44336",
  completed: "#2196F3",
  rejected: "#F44336",
} as const;

const STATUS_ICONS = {
  pending: "schedule" as const,
  confirmed: "check-circle" as const,
  cancelled: "cancel" as const,
  completed: "done-all" as const,
  rejected: "close" as const,
} as const;

export default function ShopOwnerHome() {
  const [orders, setOrders] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<BookingStatus | null>(
    null
  );
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<string>("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userData = await AsyncStorage.getItem("userData");
        console.log("Loaded user data:", userData); 
        if (userData) {
          const parsedData = JSON.parse(userData);
          console.log("Parsed user data:", parsedData); 
          if (parsedData.uid) {
            setCurrentUser(parsedData.uid);
          } else {
            console.error("No uid found in user data");
            // Try to get fresh data from API
            const token = await AsyncStorage.getItem("userToken");
            if (token) {
              const response = await api.get("/auth/me", {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });
              if (response.data?.uid) {
                setCurrentUser(response.data.uid);
                // Update stored data with uid
                await AsyncStorage.setItem(
                  "userData",
                  JSON.stringify({
                    ...parsedData,
                    uid: response.data.uid,
                  })
                );
              }
            }
          }
        } else {
          console.error("No user data found in AsyncStorage");
        }
      } catch (error) {
        console.error("Error loading user data:", error);
      }
    };
    loadUserData();
  }, []);

  const fetchOrders = async (
    pageNumber: number = 1,
    shouldRefresh: boolean = false
  ) => {
    try {
      console.log("Fetching orders for user:", currentUser); 

      if (!currentUser) {
        console.error("No current user found");
        setOrders([]);
        return;
      }

      if (shouldRefresh) {
        setPage(1);
        setHasMore(true);
      }

      setIsLoadingMore(true);
      const data = await bookingService.getSellerBookings();
      console.log("Fetched orders data:", data); 

      if (!data || !Array.isArray(data)) {
        console.error("Invalid data received:", data);
        setOrders([]);
        return;
      }

      // Only filter out cancelled bookings, show all other bookings
      const activeOrders = data.filter((order) => order.status !== "cancelled");
      console.log("Active orders:", activeOrders); // Debug log

      // Calculate pagination
      const startIndex = (pageNumber - 1) * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      const paginatedOrders = activeOrders.slice(startIndex, endIndex);
      console.log("Paginated orders:", paginatedOrders); // Debug log

      if (paginatedOrders.length < ITEMS_PER_PAGE) {
        setHasMore(false);
      }

      setOrders((prevOrders) => {
        const newOrders = shouldRefresh
          ? paginatedOrders
          : [...prevOrders, ...paginatedOrders];
        console.log("Updated orders state:", newOrders); // Debug log
        return newOrders;
      });
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      if (error.response?.status === 401) {
        // Handle unauthorized error
        await AsyncStorage.removeItem("userToken");
        router.replace("/(auth)/login");
      } else {
        Alert.alert("Error", "Failed to load orders. Please try again later.");
      }
      setOrders([]); // Clear orders on error
    } finally {
      setLoading(false);
      setRefreshing(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    console.log("Current user changed:", currentUser); // Debug log
    if (currentUser) {
      fetchOrders(1, true);
    } else {
      console.log("No current user, clearing orders");
      setOrders([]);
    }
  }, [currentUser]);

  useFocusEffect(
    React.useCallback(() => {
      console.log("Screen focused, current user:", currentUser); // Debug log
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

  const handleStatusUpdate = async (
    orderId: string,
    newStatus: BookingStatus
  ) => {
    try {
      // Show confirmation dialog based on the action
      let confirmMessage = "";
      let confirmTitle = "";

      if (newStatus === "confirmed") {
        confirmTitle = "Confirm Booking";
        confirmMessage = "Are you sure you want to confirm this booking?";
      } else if (newStatus === "cancelled") {
        confirmTitle = "Cancel Booking";
        confirmMessage = "Are you sure you want to cancel this booking?";
      } else if (newStatus === "rejected") {
        confirmTitle = "Reject Booking";
        confirmMessage =
          "Are you sure you want to reject this booking? Note: Only the 7 most recent rejected bookings will be kept.";
      }

      Alert.alert(confirmTitle, confirmMessage, [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          style: "default",
          onPress: async () => {
            try {
              // Update the booking status
              await bookingService.updateBookingStatus(orderId, newStatus);

              // Show success message based on the action
              let successMessage = "";
              if (newStatus === "confirmed") {
                successMessage = "Booking has been confirmed successfully";
              } else if (newStatus === "cancelled") {
                successMessage = "Booking has been cancelled";
              } else if (newStatus === "rejected") {
                successMessage = "Booking has been rejected";
              }

              Alert.alert("Success", successMessage);

              // Immediately update the local state to reflect the change
              setOrders((prevOrders) => {
                return prevOrders.map((order) => {
                  if (order.id === orderId) {
                    return { ...order, status: newStatus };
                  }
                  return order;
                });
              });

              // Also refresh the list to ensure consistency with the server
              fetchOrders();
            } catch (error) {
              console.error("Error updating order status:", error);
              Alert.alert("Error", "Failed to update order status");
            }
          },
        },
      ]);
    } catch (error) {
      console.error("Error in handleStatusUpdate:", error);
      Alert.alert("Error", "Failed to update order status");
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase());

    // If a specific status is selected, only show orders with that status
    // Otherwise, show all non-cancelled orders
    const matchesStatus = selectedStatus
      ? order.status === selectedStatus
      : true;

    return matchesSearch && matchesStatus;
  });

  const renderStatusFilter = () => (
    <View style={styles.filterContainer}>
      {/* Filter out 'cancelled' and 'completed' from status options */}
      {(
        Object.keys(STATUS_COLORS).filter(
          (status) => status !== "cancelled" && status !== "completed"
        ) as BookingStatus[]
      ).map((status) => (
        <TouchableOpacity
          key={status}
          style={[
            styles.filterButton,
            selectedStatus === status && styles.filterButtonActive,
            {
              backgroundColor:
                selectedStatus === status
                  ? STATUS_COLORS[status]
                  : "transparent",
            },
          ]}
          onPress={() =>
            setSelectedStatus(selectedStatus === status ? null : status)
          }
        >
          <MaterialIcons
            name={STATUS_ICONS[status]}
            size={20}
            color={selectedStatus === status ? "white" : STATUS_COLORS[status]}
          />
          <Text
            style={[
              styles.filterText,
              {
                color:
                  selectedStatus === status ? "white" : STATUS_COLORS[status],
              },
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
      onPress={() =>
        router.push({
          pathname: "/(store)/order-details",
          params: { id: order.id },
        })
      }
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
              <MaterialIcons
                name="image-not-supported"
                size={24}
                color="#ccc"
              />
            </View>
          )}
        </View>

        <View style={styles.orderInfo}>
          <View style={styles.headerRow}>
            <View style={styles.titleContainer}>
              <Text style={styles.serviceName} numberOfLines={1}>
                {order.serviceName
                  ? order.serviceName
                  : "Product not Available"}
              </Text>
              <View style={styles.customerInfo}>
                <MaterialIcons name="person" size={14} color="#666" />
                <Text style={styles.customerName} numberOfLines={1}>
                  {order.customerName}
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: STATUS_COLORS[order.status] },
              ]}
            >
              <MaterialIcons
                name={STATUS_ICONS[order.status]}
                size={14}
                color="white"
              />
              <Text style={styles.statusText}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </Text>
            </View>
          </View>

          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <MaterialIcons name="schedule" size={16} color="#666" />
              <Text style={styles.detailText}>
                Created: {new Date(order.createdAt).toLocaleDateString()} at{" "}
                {new Date(order.createdAt).toLocaleTimeString()}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      {order.status === "pending" && (
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.confirmButton]}
            onPress={() => handleStatusUpdate(order.id, "confirmed")}
          >
            <MaterialIcons name="check" size={18} color="white" />
            <Text style={styles.actionButtonText}>Confirm</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleStatusUpdate(order.id, "rejected")}
          >
            <MaterialIcons name="close" size={18} color="white" />
            <Text style={styles.actionButtonText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#6B4EFF" />
        <Text style={styles.loadingText}>Loading Orders...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Manage Orders</Text>
      </View>

      <View style={styles.searchContainer}>
        <MaterialIcons
          name="search"
          size={24}
          color="#999"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by customer, service, or order ID..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
      </View>

      {renderStatusFilter()}

      {filteredOrders.length === 0 ? (
        <View style={styles.centeredContainer}>
          <MaterialIcons name="inbox" size={64} color="#ccc" />
          <Text style={styles.noOrdersText}>
            No orders found for the selected criteria.
          </Text>
        </View>
      ) : (
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  centeredContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  noOrdersText: {
    marginTop: 20,
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  header: {
    backgroundColor: "white",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 8,
    margin: 16,
    paddingHorizontal: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: "#333",
  },
  filterContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "white",
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  filterButtonActive: {
    borderWidth: 0,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  filterText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "600",
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  orderCard: {
    backgroundColor: "white",
    borderRadius: 12,
    marginBottom: 16,
    overflow: Platform.OS === "android" ? "hidden" : "visible",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  orderContent: {
    flexDirection: "row",
    padding: 12,
  },
  imageContainer: {
    width: 70,
    height: 70,
    borderRadius: 8,
    overflow: "hidden",
    marginRight: 12,
    backgroundColor: "#f0f0f0",
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  noImageContainer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#e9ecef",
  },
  orderInfo: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
    marginRight: 8,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  customerInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  customerName: {
    fontSize: 14,
    color: "#555",
    marginLeft: 4,
    flexShrink: 1,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  statusText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
    marginLeft: 4,
  },
  detailsContainer: {
    marginTop: 4,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  detailText: {
    fontSize: 13,
    color: "#666",
    marginLeft: 8,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
  },
  actionButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 6,
  },
  confirmButton: {
    backgroundColor: "#4CAF50",
  },
  rejectButton: {
    backgroundColor: "#F44336",
  },
  loadingMoreContainer: {
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  loadingMoreText: {
    marginLeft: 10,
    color: "#666",
    fontSize: 14,
  },
});
