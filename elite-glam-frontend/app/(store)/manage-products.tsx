import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  FlatList,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import React, { useState, useEffect, useCallback } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { api } from "@/services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { productsService, Product } from "@/services/products.service";

interface ProductFormData {
  name: string;
  price: string;
  description: string;
  category: string;
  quantity: string;
  condition: string;
  sellerMessage: string;
  rentAvailable: boolean;
}

export default function ManageProductsScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const ITEMS_PER_PAGE = 4;

  const checkUserAndFetchProducts = useCallback(
    async (pageNumber: number = 1, shouldRefresh: boolean = false) => {
      try {
        if (shouldRefresh) {
          setIsLoading(true);
          setPage(1);
          setHasMore(true);
        } else {
          setIsLoadingMore(true);
        }
        setError(null);

        const storedUser = await AsyncStorage.getItem("userData");
        console.log("Stored user:", storedUser);

        if (!storedUser) {
          console.log("No user found, showing empty state...");
          setError("Please login to view your products");
          setProducts([]);
          return;
        }

        const user = JSON.parse(storedUser);
        if (!user || !user.uid) {
          console.log("Invalid user data, showing empty state...");
          setError("Invalid user data. Please login again.");
          setProducts([]);
          return;
        }

        const fetchedProducts = await productsService.getAllProducts(
          user.uid,
          pageNumber,
          ITEMS_PER_PAGE
        );
        console.log("Fetched products:", fetchedProducts);

        if (Array.isArray(fetchedProducts)) {
          if (fetchedProducts.length < ITEMS_PER_PAGE) {
            setHasMore(false);
          }

          setProducts((prevProducts) => {
            if (shouldRefresh) {
              return fetchedProducts;
            }
            return [...prevProducts, ...fetchedProducts];
          });

          if (shouldRefresh) {
            setPage(1);
          } else {
            setPage((prevPage) => prevPage + 1);
          }
        } else {
          console.error("Products is not an array:", fetchedProducts);
          setError("Invalid products data received");
          setProducts([]);
        }
      } catch (error) {
        console.error("Error in fetchProducts:", error);
        setError("Failed to load products. Please try again.");
        setProducts([]);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    []
  );

  useEffect(() => {
    checkUserAndFetchProducts(1, true);
  }, [checkUserAndFetchProducts]);

  const handleRefresh = useCallback(() => {
    checkUserAndFetchProducts(1, true);
  }, [checkUserAndFetchProducts]);

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore && !isLoading) {
      checkUserAndFetchProducts(page + 1);
    }
  }, [isLoadingMore, hasMore, isLoading, page, checkUserAndFetchProducts]);

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEditProduct = (product: Product) => {
    try {
      console.log("Navigating to edit product:", product.id);
      router.push({
        pathname: "/(store)/post-product",
        params: {
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price.toString(),
          image: product.image || "",
          category: product.category,
          quantity: product.quantity.toString(),
          condition: product.condition || "",
          sellerMessage: product.sellerMessage || "",
          rentAvailable: product.rentAvailable?.toString() || "false",
        },
      });
    } catch (error) {
      console.error("Error navigating to edit product:", error);
      Alert.alert("Navigation Error", "Failed to open product editor");
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    Alert.alert(
      "Delete Product",
      "Are you sure you want to delete this product?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/products/${productId}`);
              setProducts(products.filter((p) => p.id !== productId));
            } catch (err) {
              console.error("Error deleting product:", err);
              // Show error message
            }
          },
        },
      ]
    );
  };

  const renderProductItem = ({ item }: { item: Product }) => (
    <View style={styles.productCard}>
      <Image
        source={{ uri: item.image || "https://via.placeholder.com/150" }}
        style={styles.productImage}
        onError={() => console.log("Image failed to load:", item.image)}
      />
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.productPrice}>
          PHP {item.price.toLocaleString()}
        </Text>
        <View style={styles.productMeta}>
          <Text style={styles.stockText}>Quantity: {item.quantity}</Text>
          <Text
            style={[
              styles.statusText,
              { color: item.quantity > 0 ? "#4CAF50" : "#FF3B30" },
            ]}
          >
            {item.quantity > 0 ? "Available" : "Out of Stock"}
          </Text>
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteProduct(item.id)}
          >
            <MaterialIcons name="delete" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <MaterialIcons name="hourglass-empty" size={48} color="#6B3FA0" />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={48} color="#FF3B30" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => checkUserAndFetchProducts(1, true)}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => router.push("/(auth)/login")}
        >
          <Text style={styles.loginButtonText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (products.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="inventory" size={48} color="#6B3FA0" />
        <Text style={styles.emptyText}>No products found</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            try {
              console.log("Navigating to add new product from empty state");
              router.push("/(store)/post-product");
            } catch (error) {
              console.error("Error navigating to add product:", error);
              Alert.alert("Navigation Error", "Failed to open product form");
            }
          }}
        >
          <Text style={styles.addButton}>Add New Product</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>


      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <MaterialIcons
            name="search"
            size={24}
            color="#666"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#666"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setSearchQuery("")}
            >
              <MaterialIcons name="close" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Products List */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProductItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.productsList}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        onRefresh={() => handleRefresh()}
        refreshing={isLoading && page === 1}
        ListFooterComponent={() =>
          isLoadingMore ? (
            <View style={styles.loadingMoreContainer}>
              <ActivityIndicator size="small" color="#6B3FA0" />
              <Text style={styles.loadingMoreText}>
                Loading more products...
              </Text>
            </View>
          ) : null
        }
      />

      {/* FAB to add new product */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          try {
            router.push("/(store)/post-product");
          } catch (error) {
            console.error("Error navigating to add product from FAB:", error);
            Alert.alert("Navigation Error", "Failed to open product form");
          }
        }}
      >
        <MaterialIcons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: "#FF3B30",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#6B3FA0",
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },


  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
  },
  addButton: {
    backgroundColor: "#6B3FA0",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
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
    color: "#333",
    height: "100%",
  },
  clearButton: {
    padding: 4,
  },
  productsList: {
    padding: 8,
    paddingBottom: Platform.OS === "ios" ? 100 : 80,
  },
  productCard: {
    flex: 1,
    margin: 8,
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
    height: 150,
    resizeMode: "cover",
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
  productPrice: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  productMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  stockText: {
    fontSize: 12,
    color: "#666",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "center",
  },
  deleteButton: {
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },

  loginButton: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#6B3FA0",
    borderRadius: 8,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingMoreContainer: {
    paddingVertical: 20,
    alignItems: "center",
  },
  loadingMoreText: {
    marginLeft: 10,
    fontSize: 14,
    color: "#666",
  },
  fab: {
    position: "absolute",
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    right: 20,
    bottom: 20,
    backgroundColor: "#6B3FA0",
    borderRadius: 30,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});
