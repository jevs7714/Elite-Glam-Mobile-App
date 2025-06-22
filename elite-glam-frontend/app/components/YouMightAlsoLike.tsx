import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";
import { api } from "../../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Product as BaseProduct } from "../../services/products.service";

// Extend the Product interface to include averageRating
interface Product extends BaseProduct {
  averageRating?: number;
}

interface YouMightAlsoLikeProps {
  productId: string;
  category: string;
}

const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes in milliseconds
const SIMILAR_PRODUCTS_CACHE_KEY = (category: string) =>
  `similar_products_${category}_cache`;

interface CacheData {
  data: Product[];
  timestamp: number;
}

const YouMightAlsoLike: React.FC<YouMightAlsoLikeProps> = ({
  productId,
  category,
}) => {
  const router = useRouter();
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFromCache = async (key: string): Promise<Product[] | null> => {
    try {
      const cachedData = await AsyncStorage.getItem(key);
      if (cachedData) {
        const { data, timestamp } = JSON.parse(cachedData) as CacheData;
        const isExpired = Date.now() - timestamp > CACHE_EXPIRY;

        if (!isExpired) {
          console.log("Loading similar products from cache:", key);
          return data;
        }
      }
      return null;
    } catch (error) {
      console.error("Error loading from cache:", error);
      return null;
    }
  };

  const saveToCache = async (key: string, data: Product[]) => {
    try {
      const cacheData: CacheData = {
        data,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(key, JSON.stringify(cacheData));
      console.log("Saved similar products to cache:", key);
    } catch (error) {
      console.error("Error saving to cache:", error);
    }
  };

  const fetchSimilarProducts = async () => {
    if (!category) {
      setError("No category provided");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Try to load from cache first
      const cacheKey = SIMILAR_PRODUCTS_CACHE_KEY(category);
      const cachedProducts = await loadFromCache(cacheKey);

      if (cachedProducts) {
        // Filter out the current product
        const filteredProducts = cachedProducts.filter(
          (product) => product.id !== productId
        );
        setSimilarProducts(filteredProducts);
        setLoading(false);
        return;
      }

      // Fetch products with the same category and minimum rating
      const token = await AsyncStorage.getItem("userToken");
      const response = await api.get("/products", {
        params: {
          categories: [category],
          limit: 10, // Fetch more to ensure we have enough after filtering
          minRating: 0, // Include this to ensure proper backend filtering
        },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      let products = response.data.products || response.data;

      // Filter out the current product
      products = products.filter(
        (product: Product) => product.id !== productId
      );

      // Sort by rating (highest first)
      products.sort((a: Product, b: Product) => {
        // Use averageRating if available, otherwise fallback to rating property, or 0 if neither exists
        const ratingA = a.averageRating !== undefined ? a.averageRating : (a.rating || 0);
        const ratingB = b.averageRating !== undefined ? b.averageRating : (b.rating || 0);
        return ratingB - ratingA;
      });

      // Limit to 6 products
      products = products.slice(0, 6);

      setSimilarProducts(products);

      // Save to cache
      await saveToCache(cacheKey, products);
    } catch (err: any) {
      setError(err.message || "Failed to load similar products.");
      console.error("Error fetching similar products:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSimilarProducts();
  }, [productId, category]);

  if (loading) {
    return (
      <ActivityIndicator size="large" color="#7E57C2" style={styles.loader} />
    );
  }

  if (error) {
    return <Text style={styles.errorText}>{error}</Text>;
  }

  if (similarProducts.length === 0) {
    return null; // Don't render anything if there are no similar products
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>You might also like</Text>
      <FlatList
        data={similarProducts}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() =>
              router.push(`/(store)/product-details?id=${item.id}`)
            }
            style={styles.productCard}
          >
            <Image
              source={{
                uri: (item.images && item.images.length > 0)
                  ? item.images[0]
                  : item.image
              }}
              style={styles.productImage}
              defaultSource={require("../../assets/images/dressProduct.png")}
            />
            <Text style={styles.productName} numberOfLines={2}>
              {item.name}
            </Text>
            <View style={styles.ratingContainer}>
              <FontAwesome name="star" style={styles.ratingStar} />
              <Text style={styles.ratingText}>
                {(item.averageRating !== undefined ? item.averageRating : (item.rating || 0)).toFixed(1)}
              </Text>
            </View>
            <Text style={styles.productPrice}>PHP {item.price.toFixed(2)}</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    backgroundColor: "#F9F9F9",
    paddingVertical: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    paddingHorizontal: 16,
    color: "#333",
  },
  productCard: {
    width: 140,
    marginRight: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  productImage: {
    width: "100%",
    height: 120,
    borderRadius: 6,
    marginBottom: 8,
  },
  productName: {
    fontSize: 13,
    fontWeight: "500",
    color: "#444",
    marginBottom: 4,
    minHeight: 32, // To ensure consistent height for 1 or 2 lines
  },
  productPrice: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#7E57C2",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  ratingStar: {
    fontSize: 12,
    color: "#FFD700",
    marginRight: 2,
  },
  ratingText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  loader: {
    marginVertical: 20,
  },
  errorText: {
    color: "#ff4444",
    textAlign: "center",
    marginVertical: 20,
    paddingHorizontal: 16,
  },
});

export default YouMightAlsoLike;
