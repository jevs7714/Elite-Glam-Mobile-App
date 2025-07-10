import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Platform,
} from "react-native";
import React, { useState, useCallback } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Product } from "../../services/products.service";

const defaultProductImage = require("../../assets/images/dressProduct.png");

export default function RentLaterScreen() {
  const [rentLaterProducts, setRentLaterProducts] = useState<Product[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadRentLaterItems = async () => {
    try {
      console.log("Loading rent later items..."); // Debug log
      const rentLaterItems = await AsyncStorage.getItem("rentLaterItems");
      console.log("Rent later items from storage:", rentLaterItems); // Debug log
      const items = rentLaterItems ? JSON.parse(rentLaterItems) : [];
      setRentLaterProducts(items);
    } catch (error) {
      console.error("Error loading rent later items:", error);
    }
  };

  // Use useFocusEffect instead of useEffect to reload items when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log("Rent Later screen focused"); // Debug log
      loadRentLaterItems();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadRentLaterItems().finally(() => setRefreshing(false));
  }, []);

  const removeFromRentLater = async (productId: string) => {
    try {
      const rentLaterItems = await AsyncStorage.getItem("rentLaterItems");
      let items = rentLaterItems ? JSON.parse(rentLaterItems) : [];
      items = items.filter((item: Product) => item.id !== productId);
      await AsyncStorage.setItem("rentLaterItems", JSON.stringify(items));
      setRentLaterProducts(items);
    } catch (error) {
      console.error("Error removing item from rent later:", error);
    }
  };

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

      {/* Rent Later Items List */}
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
        {rentLaterProducts.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <MaterialIcons name="watch-later" size={64} color="#ccc" />
            <Text style={styles.emptyStateText}>No items in rent later</Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => router.push("/")}
            >
              <Text style={styles.browseButtonText}>Browse Products</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.productsGrid}>
            {rentLaterProducts.map((product) => (
              <TouchableOpacity
                key={product.id}
                style={styles.productCard}
                onPress={() =>
                  router.push(`/(store)/product-details?id=${product.id}`)
                }
              >
                <Image
                  source={
                    product.image ? { uri: product.image } : defaultProductImage
                  }
                  style={styles.productImage}
                />
                <TouchableOpacity
                  style={styles.rentLaterButton}
                  onPress={() => removeFromRentLater(product.id)}
                >
                  <MaterialIcons
                    name="remove-shopping-cart"
                    size={24}
                    color="#ff4444"
                  />
                </TouchableOpacity>
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={2}>
                    {product.name}
                  </Text>
                  <View style={styles.ratingContainer}>
                    <MaterialIcons name="star" size={16} color="#FFD700" />
                    <Text style={styles.ratingText}>
                      {product.rating || "0"}
                    </Text>
                  </View>
                  <Text style={styles.productPrice}>
                    PHP {product.price?.toLocaleString()}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
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
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    padding: 16,
  },
  productCard: {
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
  productImage: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
  },
  rentLaterButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 12,
    color: "#666",
  },
  productPrice: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
});
