import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import React, { useState, useCallback } from "react";
import { MaterialIcons, AntDesign, Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Product } from "../../services/products.service";
import { cartService, CartItem } from "../../services/cart.service";
import { bookingService } from "../../services/booking.service";
import { productsService } from "../../services/products.service";

const defaultProductImage = require("../../assets/images/dressProduct.png");

export default function MyCartScreen() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [rentLaterProducts, setRentLaterProducts] = useState<Product[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [processingItems, setProcessingItems] = useState<Set<string>>(
    new Set()
  );

  const loadCartData = async () => {
    try {
      console.log("Loading cart data..."); // Debug log

      // Load enhanced cart items
      const enhancedCartItems = await cartService.getCartItems();
      console.log("Enhanced cart items:", enhancedCartItems); // Debug log
      setCartItems(enhancedCartItems);

      // Load legacy rent later items
      const rentLaterItems = await cartService.getRentLaterItems();
      console.log("Rent later items:", rentLaterItems); // Debug log
      setRentLaterProducts(rentLaterItems);
    } catch (error) {
      console.error("Error loading cart data:", error);
    }
  };

  // Use useFocusEffect instead of useEffect to reload items when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log("My Cart screen focused"); // Debug log
      loadCartData();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadCartData().finally(() => setRefreshing(false));
  }, []);

  const updateCartItemQuantity = async (
    cartItemId: string,
    newQuantity: number
  ) => {
    try {
      await cartService.updateCartItemQuantity(cartItemId, newQuantity);
      await loadCartData(); // Reload to get updated data
    } catch (error) {
      console.error("Error updating cart item quantity:", error);
      Alert.alert("Error", "Failed to update quantity");
    }
  };

  const removeCartItem = async (cartItemId: string) => {
    try {
      await cartService.removeFromCart(cartItemId);
      await loadCartData(); // Reload to get updated data
    } catch (error) {
      console.error("Error removing cart item:", error);
      Alert.alert("Error", "Failed to remove item from cart");
    }
  };

  const removeFromRentLater = async (productId: string) => {
    try {
      await cartService.removeFromRentLater(productId);
      await loadCartData(); // Reload to get updated data
    } catch (error) {
      console.error("Error removing item from rent later:", error);
      Alert.alert("Error", "Failed to remove item from rent later");
    }
  };

  const handleRentNow = async (cartItem: CartItem) => {
    const itemKey = cartItem.id;
    if (processingItems.has(itemKey)) return;

    try {
      setProcessingItems((prev) => new Set(prev).add(itemKey));

      // Get user data from storage
      const userDataStr = await AsyncStorage.getItem("userData");
      if (!userDataStr) {
        throw new Error("User data not found");
      }
      const userData = JSON.parse(userDataStr);

      // Check product availability
      const productData = await productsService.getProductById(
        cartItem.productId
      );
      if (!productData || productData.quantity < cartItem.quantity) {
        Alert.alert(
          "Insufficient Stock",
          `Only ${
            productData?.quantity || 0
          } items available. Please update your cart.`
        );
        return;
      }

      // Create booking data from cart item
      const bookingData = {
        customerName: userData.username,
        serviceName: cartItem.productName,
        productId: cartItem.productId,
        date: cartItem.eventDate,
        time: cartItem.eventTime,
        status: "pending" as const,
        price: cartItem.totalPrice,
        notes: "",
        createdAt: new Date(),
        updatedAt: new Date(),
        uid: userData.uid,
        ownerUid: cartItem.ownerUid,
        ownerUsername: cartItem.ownerUsername,
        sellerLocation: cartItem.sellerLocation,
        productImage: cartItem.productImage,
        eventTimePeriod: cartItem.eventTimePeriod,
        eventType: cartItem.eventType,
        fittingTime: cartItem.fittingTime,
        fittingTimePeriod: cartItem.fittingTimePeriod,
        eventLocation: cartItem.eventLocation,
        includeMakeup: cartItem.includeMakeup,
        quantity: cartItem.quantity,
        selectedSize: cartItem.selectedSize,
      };

      console.log("Creating booking from cart item:", bookingData);

      // Create the booking
      const response = await bookingService.createBooking(bookingData);
      console.log("Booking created from cart:", response);

      // Update product quantity
      try {
        const newQuantity = productData.quantity - cartItem.quantity;
        await productsService.updateProductQuantity(
          cartItem.productId,
          newQuantity
        );
        console.log(
          `Product quantity updated from ${productData.quantity} to ${newQuantity}`
        );
      } catch (quantityError) {
        console.error("Failed to update product quantity:", quantityError);
        // Continue with booking success even if quantity update fails
      }

      // Remove item from cart
      await cartService.removeFromCart(cartItem.id);
      await loadCartData();

      Alert.alert(
        "Success",
        "Your booking has been confirmed! You can check its status in the Booking Status screen.",
        [
          {
            text: "View Booking",
            onPress: () => router.push("/booking-status"),
          },
          {
            text: "Continue Shopping",
            onPress: () => router.push("/(tabs)"),
            style: "cancel",
          },
        ]
      );
    } catch (error: any) {
      console.error("Error creating booking from cart:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to create booking. Please try again."
      );
    } finally {
      setProcessingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(itemKey);
        return newSet;
      });
    }
  };

  const renderCartItem = (item: CartItem) => {
    const isProcessing = processingItems.has(item.id);

    return (
      <View key={item.id} style={styles.cartItemCard}>
        <Image
          source={
            item.productImage ? { uri: item.productImage } : defaultProductImage
          }
          style={styles.cartItemImage}
        />

        <View style={styles.cartItemDetails}>
          <Text style={styles.cartItemName} numberOfLines={2}>
            {item.productName}
          </Text>

          <View style={styles.cartItemInfo}>
            <Text style={styles.cartItemInfoText}>
              Size: {item.selectedSize}
            </Text>
            <Text style={styles.cartItemInfoText}>
              Event: {item.eventType} on{" "}
              {new Date(item.eventDate).toLocaleDateString()}
            </Text>
            {item.includeMakeup && (
              <Text style={styles.cartItemInfoText}>+ Makeup Service</Text>
            )}
          </View>

          <View style={styles.cartItemPricing}>
            <Text style={styles.cartItemPrice}>
              ₱{item.totalPrice.toLocaleString()}
            </Text>
            <Text style={styles.cartItemPricePerItem}>
              ₱{item.productPrice.toLocaleString()} each
            </Text>
          </View>

          {/* Quantity Controls */}
          <View style={styles.quantityContainer}>
            <TouchableOpacity
              style={[
                styles.quantityButton,
                item.quantity <= 1 && styles.quantityButtonDisabled,
              ]}
              onPress={() =>
                updateCartItemQuantity(item.id, Math.max(1, item.quantity - 1))
              }
              disabled={item.quantity <= 1 || isProcessing}
            >
              <AntDesign
                name="minus"
                size={16}
                color={item.quantity <= 1 ? "#ccc" : "#666"}
              />
            </TouchableOpacity>

            <Text style={styles.quantityText}>{item.quantity}</Text>

            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => updateCartItemQuantity(item.id, item.quantity + 1)}
              disabled={isProcessing}
            >
              <AntDesign name="plus" size={16} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View style={styles.cartItemActions}>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeCartItem(item.id)}
              disabled={isProcessing}
            >
              <MaterialIcons name="delete-outline" size={20} color="#ff4444" />
              <Text style={styles.removeButtonText}>Remove</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.rentButton,
                isProcessing && styles.rentButtonDisabled,
              ]}
              onPress={() => handleRentNow(item)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="calendar" size={20} color="#fff" />
                  <Text style={styles.rentButtonText}>Rent Now</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderRentLaterItem = (product: Product) => (
    <TouchableOpacity
      key={product.id}
      style={styles.rentLaterCard}
      onPress={() => router.push(`/(store)/product-details?id=${product.id}`)}
    >
      <Image
        source={product.image ? { uri: product.image } : defaultProductImage}
        style={styles.rentLaterImage}
      />
      <TouchableOpacity
        style={styles.rentLaterRemoveButton}
        onPress={() => removeFromRentLater(product.id)}
      >
        <MaterialIcons name="remove-shopping-cart" size={20} color="#ff4444" />
      </TouchableOpacity>
      <View style={styles.rentLaterInfo}>
        <Text style={styles.rentLaterName} numberOfLines={2}>
          {product.name}
        </Text>
        <View style={styles.rentLaterRating}>
          <MaterialIcons name="star" size={14} color="#FFD700" />
          <Text style={styles.rentLaterRatingText}>
            {product.rating || "0"}
          </Text>
        </View>
        <Text style={styles.rentLaterPrice}>
          PHP {product.price?.toLocaleString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const totalCartValue = cartItems.reduce(
    (total, item) => total + item.totalPrice,
    0
  );
  const totalCartItems = cartItems.reduce(
    (total, item) => total + item.quantity,
    0
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Cart</Text>
          <View style={styles.backButton} />
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#7E57C2"]}
          />
        }
      >
        {/* Enhanced Cart Items Section */}
        {cartItems.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Ready to Rent</Text>
              <Text style={styles.sectionSubtitle}>
                {totalCartItems} {totalCartItems === 1 ? "item" : "items"} • ₱
                {totalCartValue.toLocaleString()}
              </Text>
            </View>
            {cartItems.map(renderCartItem)}
          </View>
        )}

        {/* Rent Later Items Section */}
        {rentLaterProducts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Saved for Later</Text>
              <Text style={styles.sectionSubtitle}>
                {rentLaterProducts.length}{" "}
                {rentLaterProducts.length === 1 ? "item" : "items"}
              </Text>
            </View>
            <View style={styles.rentLaterGrid}>
              {rentLaterProducts.map(renderRentLaterItem)}
            </View>
          </View>
        )}

        {/* Empty State */}
        {cartItems.length === 0 && rentLaterProducts.length === 0 && (
          <View style={styles.emptyStateContainer}>
            <MaterialIcons name="shopping-cart" size={64} color="#ccc" />
            <Text style={styles.emptyStateText}>Your cart is empty</Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => router.push("/")}
            >
              <Text style={styles.browseButtonText}>Browse Products</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    paddingTop: Platform.OS === "ios" ? 60 : 20,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  backButton: {
    width: 40,
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  cartItemCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cartItemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  cartItemDetails: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  cartItemInfo: {
    marginBottom: 8,
  },
  cartItemInfoText: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  cartItemPricing: {
    marginBottom: 12,
  },
  cartItemPrice: {
    fontSize: 18,
    fontWeight: "700",
    color: "#6B46C1",
  },
  cartItemPricePerItem: {
    fontSize: 12,
    color: "#666",
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 8,
  },
  quantityButtonDisabled: {
    backgroundColor: "#f8f8f8",
  },
  quantityText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    minWidth: 30,
    textAlign: "center",
  },
  cartItemActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  removeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ff4444",
  },
  removeButtonText: {
    color: "#ff4444",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 4,
  },
  rentButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: "#6B46C1",
  },
  rentButtonDisabled: {
    opacity: 0.7,
  },
  rentButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  rentLaterGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  rentLaterCard: {
    width: "48%",
    marginBottom: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rentLaterImage: {
    width: "100%",
    height: 120,
    resizeMode: "cover",
  },
  rentLaterRemoveButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 6,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rentLaterInfo: {
    padding: 12,
  },
  rentLaterName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: 4,
  },
  rentLaterRating: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  rentLaterRatingText: {
    marginLeft: 4,
    fontSize: 12,
    color: "#666",
  },
  rentLaterPrice: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 64,
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: "#7E57C2",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  browseButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
});
