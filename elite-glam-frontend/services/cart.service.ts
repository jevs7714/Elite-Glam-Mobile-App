import AsyncStorage from "@react-native-async-storage/async-storage";
import { Product } from "./products.service";

export interface CartItem {
  id: string; // Unique cart item ID
  productId: string;
  productName: string;
  productPrice: number;
  productImage?: string;
  quantity: number;
  selectedSize: string;

  // Booking details
  eventDate: string;
  eventTime: string;
  eventTimePeriod: string;
  eventType: string;
  otherEventType?: string;
  eventLocation: string;
  fittingTime: string;
  fittingTimePeriod: string;
  includeMakeup: boolean;

  // Seller information
  ownerUsername: string;
  ownerUid: string;
  sellerLocation: string;

  // Calculated totals
  itemTotal: number;
  totalPrice: number; // Including makeup if selected

  // Timestamps
  addedAt: Date;
}

const CART_STORAGE_KEY = "enhancedCartItems";
const RENT_LATER_STORAGE_KEY = "rentLaterItems"; // Keep for backward compatibility

export const cartService = {
  // Enhanced cart operations
  async getCartItems(): Promise<CartItem[]> {
    try {
      const cartItems = await AsyncStorage.getItem(CART_STORAGE_KEY);
      return cartItems ? JSON.parse(cartItems) : [];
    } catch (error) {
      console.error("Error loading cart items:", error);
      return [];
    }
  },

  async addToCart(cartItem: Omit<CartItem, "id" | "addedAt">): Promise<void> {
    try {
      const existingItems = await this.getCartItems();

      // Generate unique ID for cart item
      const newItem: CartItem = {
        ...cartItem,
        id: `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        addedAt: new Date(),
      };

      const updatedItems = [...existingItems, newItem];
      await AsyncStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify(updatedItems)
      );
      console.log("Item added to cart:", newItem);
    } catch (error) {
      console.error("Error adding item to cart:", error);
      throw error;
    }
  },

  async removeFromCart(cartItemId: string): Promise<void> {
    try {
      const existingItems = await this.getCartItems();
      const updatedItems = existingItems.filter(
        (item) => item.id !== cartItemId
      );
      await AsyncStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify(updatedItems)
      );
      console.log("Item removed from cart:", cartItemId);
    } catch (error) {
      console.error("Error removing item from cart:", error);
      throw error;
    }
  },

  async updateCartItemQuantity(
    cartItemId: string,
    quantity: number
  ): Promise<void> {
    try {
      const existingItems = await this.getCartItems();
      const updatedItems = existingItems.map((item) => {
        if (item.id === cartItemId) {
          const itemTotal = item.productPrice * quantity;
          const makeupServicePrice = 1500;
          const totalPrice = item.includeMakeup
            ? itemTotal + makeupServicePrice
            : itemTotal;

          return {
            ...item,
            quantity,
            itemTotal,
            totalPrice,
          };
        }
        return item;
      });

      await AsyncStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify(updatedItems)
      );
      console.log("Cart item quantity updated:", cartItemId, quantity);
    } catch (error) {
      console.error("Error updating cart item quantity:", error);
      throw error;
    }
  },

  async clearCart(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CART_STORAGE_KEY);
      console.log("Cart cleared");
    } catch (error) {
      console.error("Error clearing cart:", error);
      throw error;
    }
  },

  async getCartItemCount(): Promise<number> {
    try {
      const cartItems = await this.getCartItems();
      return cartItems.reduce((total, item) => total + item.quantity, 0);
    } catch (error) {
      console.error("Error getting cart item count:", error);
      return 0;
    }
  },

  async getCartTotal(): Promise<number> {
    try {
      const cartItems = await this.getCartItems();
      return cartItems.reduce((total, item) => total + item.totalPrice, 0);
    } catch (error) {
      console.error("Error calculating cart total:", error);
      return 0;
    }
  },

  // Legacy rent later operations (for backward compatibility)
  async getRentLaterItems(): Promise<Product[]> {
    try {
      const rentLaterItems = await AsyncStorage.getItem(RENT_LATER_STORAGE_KEY);
      return rentLaterItems ? JSON.parse(rentLaterItems) : [];
    } catch (error) {
      console.error("Error loading rent later items:", error);
      return [];
    }
  },

  async addToRentLater(product: Product): Promise<void> {
    try {
      const existingItems = await this.getRentLaterItems();
      const isAlreadyAdded = existingItems.some(
        (item) => item.id === product.id
      );

      if (!isAlreadyAdded) {
        const updatedItems = [...existingItems, product];
        await AsyncStorage.setItem(
          RENT_LATER_STORAGE_KEY,
          JSON.stringify(updatedItems)
        );
        console.log("Item added to rent later:", product.id);
      }
    } catch (error) {
      console.error("Error adding item to rent later:", error);
      throw error;
    }
  },

  async removeFromRentLater(productId: string): Promise<void> {
    try {
      const existingItems = await this.getRentLaterItems();
      const updatedItems = existingItems.filter(
        (item) => item.id !== productId
      );
      await AsyncStorage.setItem(
        RENT_LATER_STORAGE_KEY,
        JSON.stringify(updatedItems)
      );
      console.log("Item removed from rent later:", productId);
    } catch (error) {
      console.error("Error removing item from rent later:", error);
      throw error;
    }
  },

  async isInRentLater(productId: string): Promise<boolean> {
    try {
      const rentLaterItems = await this.getRentLaterItems();
      return rentLaterItems.some((item) => item.id === productId);
    } catch (error) {
      console.error("Error checking rent later status:", error);
      return false;
    }
  },

  // Migration helper (can be called once to migrate old rent later items)
  async migrateRentLaterToCart(): Promise<void> {
    try {
      const rentLaterItems = await this.getRentLaterItems();
      console.log(
        "Migrating rent later items to new cart system:",
        rentLaterItems.length
      );

      // For now, we'll keep both systems running in parallel
      // The old rent later system will continue to work for simple "save for later" functionality
      // The new cart system will handle complete booking information
    } catch (error) {
      console.error("Error migrating rent later items:", error);
    }
  },
};
