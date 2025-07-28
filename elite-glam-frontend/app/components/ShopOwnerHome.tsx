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
  UIManager,
  LayoutAnimation,
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

interface GroupedOrder {
  productName: string;
  productImage?: string;
  orders: Booking[];
}

// Enable LayoutAnimation for Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function ShopOwnerHome() {
  const [groupedOrders, setGroupedOrders] = useState<GroupedOrder[]>([]);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(
    new Set()
  );
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
        setGroupedOrders([]);
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
        setGroupedOrders([]);
        return;
      }

      // Only filter out cancelled bookings, show all other bookings
      const activeOrders = data.filter((order) => order.status !== "cancelled");

      // Group orders by product name
      const ordersByProduct = activeOrders.reduce((acc, order) => {
        const key = order.serviceName || "Uncategorized";
        if (!acc[key]) {
          acc[key] = {
            productName: key,
            productImage: order.productImage,
            orders: [],
          };
        }
        acc[key].orders.push(order);
        return acc;
      }, {} as Record<string, GroupedOrder>);

      const newGroupedOrders = Object.values(ordersByProduct);

      // Simple pagination for grouped products - can be refined if needed
      const startIndex = (pageNumber - 1) * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      const paginatedGroups = newGroupedOrders.slice(startIndex, endIndex);

      if (paginatedGroups.length < ITEMS_PER_PAGE) {
        setHasMore(false);
      }

      setGroupedOrders((prevGroups) =>
        shouldRefresh ? paginatedGroups : [...prevGroups, ...paginatedGroups]
      );
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      if (error.response?.status === 401) {
        // Handle unauthorized error
        await AsyncStorage.removeItem("userToken");
        router.replace("/(auth)/login");
      } else {
        Alert.alert("Error", "Failed to load orders. Please try again later.");
      }
      setGroupedOrders([]); // Clear orders on error
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
      setGroupedOrders([]);
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
              setGroupedOrders((prevGroupedOrders) => {
                return prevGroupedOrders.map((group) => {
                  return {
                    ...group,
                    orders: group.orders.map((order) => {
                      if (order.id === orderId) {
                        return { ...order, status: newStatus };
                      }
                      return order;
                    }),
                  };
                });
              });
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

  const toggleProductExpansion = (productName: string) => {
    // Add a smooth animation for expanding/collapsing
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedProducts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productName)) {
        newSet.delete(productName);
      } else {
        newSet.add(productName);
      }
      return newSet;
    });
  };

  const filteredGroupedOrders = groupedOrders
    .map((group) => {
      // Filter orders within the group first
      const filteredOrdersInGroup = group.orders.filter((order) => {
        const matchesSearch =
          order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.id.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = selectedStatus
          ? order.status === selectedStatus
          : true;
        return matchesSearch && matchesStatus;
      });

      // If the group has orders after filtering, return it
      if (filteredOrdersInGroup.length > 0) {
        return { ...group, orders: filteredOrdersInGroup };
      }
      return null;
    })
    .filter((group): group is GroupedOrder => group !== null);

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

  const renderEmptyList = () => (
    <View style={styles.centeredContainer}>
      <MaterialIcons name="inbox" size={64} color="#ccc" />
      <Text style={styles.noOrdersText}>
        No orders found for the selected criteria.
      </Text>
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
    // This renders the individual order card, slightly modified to fit inside the group
    // The main TouchableOpacity is removed from here as the parent will handle navigation
    <View style={styles.orderCardInner}>
      <TouchableOpacity
        onPress={() =>
          router.push({
            pathname: "/(store)/order-details",
            params: { id: order.id },
          })
        }
        style={styles.orderTouchableContent}
      >
        <View style={styles.orderItemImageContainer}>
          {order.productImage ? (
            <Image
              source={{ uri: order.productImage }}
              style={styles.orderItemImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.orderItemImagePlaceholder}>
              <MaterialIcons name="photo-size-select-actual" size={20} color="#a0a0a0" />
            </View>
          )}
        </View>

        <View style={styles.orderInfo}>
          <View style={styles.headerRow}>
            <View style={styles.titleContainer}>
              {/* Service name is now in the group header, so we show customer name here */}
              <Text style={styles.orderCustomerName} numberOfLines={1}>
                {order.customerName}
              </Text>
              <View style={styles.orderIdContainer}>
                <MaterialIcons name="receipt" size={14} color="#666" />
                <Text style={styles.orderIdText} numberOfLines={1}>
                  ID: {order.id.substring(0, 8)}...
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
      </TouchableOpacity>

      {/* Action Buttons */}
      {order.status === "pending" && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.button, styles.confirmButton]}
            onPress={() => handleStatusUpdate(order.id, "confirmed")}
          >
            <MaterialIcons name="check" size={18} color="white" />
            <Text style={styles.confirmButtonText}>Confirm</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.rejectButton]}
            onPress={() => handleStatusUpdate(order.id, "rejected")}
          >
            <MaterialIcons name="close" size={18} color="#F44336" />
            <Text style={styles.rejectButtonText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderProductGroup = ({ item: group }: { item: GroupedOrder }) => {
    const isExpanded = expandedProducts.has(group.productName);
    const pendingOrderCount = group.orders.filter(
      (o) => o.status === "pending"
    ).length;

    return (
      <View style={styles.productGroupContainer}>
        <TouchableOpacity
          style={styles.productGroupHeader}
          onPress={() => toggleProductExpansion(group.productName)}
        >
          <View style={styles.productGroupInfo}>
            <Image
              source={{
                uri: group.productImage || "https://via.placeholder.com/150",
              }}
              style={styles.productGroupImage}
            />
            <View style={styles.productGroupTextContainer}>
              <Text style={styles.productGroupName}>{group.productName}</Text>
              <Text style={styles.productOrderCount}>
                {group.orders.length} Order(s) total
                {pendingOrderCount > 0 ? `, ${pendingOrderCount} pending` : ""}
              </Text>
            </View>
          </View>
          <View style={styles.productGroupCTA}>
            {pendingOrderCount > 0 && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>{pendingOrderCount}</Text>
              </View>
            )}
            <MaterialIcons
              name={isExpanded ? "expand-less" : "expand-more"}
              size={28}
              color="#6B4EFF"
            />
          </View>
        </TouchableOpacity>
        {isExpanded && (
          <View style={styles.ordersListContainer}>
            {group.orders.map((order) => (
              <View key={order.id}>{renderOrderItem({ item: order })}</View>
            ))}
          </View>
        )}
      </View>
    );
  };



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

      {loading ? (
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color="#6B4EFF" />
        </View>
      ) : (
        <FlatList
          data={filteredGroupedOrders}
          renderItem={renderProductGroup}
          keyExtractor={(item) => item.productName}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmptyList}
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
  productGroupContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  productGroupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  productGroupInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  productGroupImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
  },
  productGroupTextContainer: {
    flex: 1,
  },
  productGroupName: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#333",
  },
  productOrderCount: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  productGroupCTA: {
    flexDirection: "row",
    alignItems: "center",
  },
  pendingBadge: {
    backgroundColor: "#FFA500",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  pendingBadgeText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 12,
  },
  ordersListContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  orderCardInner: {
    marginVertical: 8,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#eef0f2",
    backgroundColor: "#fff",
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginLeft: 8,
  },
  confirmButton: {
    backgroundColor: "#4CAF50", // Green
  },
  rejectButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#F44336",
  },
  confirmButtonText: {
    color: "white",
    marginLeft: 6,
    fontWeight: "bold",
  },
  rejectButtonText: {
    color: "#F44336",
    marginLeft: 6,
    fontWeight: "bold",
  },
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
  orderTouchableContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  orderItemImageContainer: {
    width: 50,
    height: 50,
    borderRadius: 8,
    overflow: "hidden",
    marginRight: 12,
    backgroundColor: "#f0f0f0",
  },
  orderItemImage: {
    width: "100%",
    height: "100%",
  },
  orderItemImagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#e9ecef",
  },
  loadingMoreContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loadingMoreText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
  orderInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
    marginRight: 8,
  },
  orderCustomerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  orderIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  orderIdText: {
    fontSize: 12,
    color: '#777',
    marginLeft: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  detailsContainer: {
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 8,
  },
});
