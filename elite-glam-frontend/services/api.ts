import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import Constants from "expo-constants";

// Function to get the base URL based on platform and device
const getBaseUrl = async () => {
  if (__DEV__) {
    try {
      // Check network connectivity
      const networkState = await NetInfo.fetch();
      console.log("Network State:", {
        isConnected: networkState.isConnected,
        type: networkState.type,
        isInternetReachable: networkState.isInternetReachable,
      });

      if (!networkState.isConnected) {
        throw new Error("No internet connection");
      }

      // For development on mobile device
      if (Platform.OS !== "web") {
        // Try to get the local IP from storage first
        const savedIp = await AsyncStorage.getItem("local_ip");
        if (savedIp) {
          const url = `http://${savedIp}:3001`;
          console.log("Using saved local IP:", url);
          return url;
        }

        // Use the Expo development server IP
        const expoServerIp = Constants.expoConfig?.hostUri?.split(":")[0];
        if (expoServerIp) {
          const url = `http://${expoServerIp}:3001`;
          console.log("Using Expo server IP:", url);
          return url;
        }

        // Fallback to localhost for Android
        if (Platform.OS === "android") {
          return "http://10.0.2.2:3001";
        }

        // Fallback to localhost for iOS
        if (Platform.OS === "ios") {
          return "http://localhost:3001";
        }
      }

      // For web development
      return "http://localhost:3001";
    } catch (error) {
      console.error("Error getting network info:", error);
      // Fallback to localhost
      return "http://localhost:3001";
    }
  }
  // Production URL
  return "https://elite-glam-mobile-app.onrender.com";
};

// Log the environment and platform
console.log("Environment:", __DEV__ ? "Development" : "Production");
console.log("Platform:", Platform.OS);
console.log("API URL:", getBaseUrl());

// Create axios instance with default config
export const api = axios.create({
  timeout: 30000, // 30 seconds timeout
  headers: {
    "Content-Type": "application/json",
    "X-Device-Platform": Platform.OS,
    "X-Device-Version": Platform.Version,
  },
});

// Add a function to set the local IP
export const setLocalIp = async (ip: string) => {
  try {
    await AsyncStorage.setItem("local_ip", ip);
    const url = `http://${ip}:3001`;
    api.defaults.baseURL = url;
    console.log("Local IP set to:", url);
    return url;
  } catch (error) {
    console.error("Error setting local IP:", error);
    throw error;
  }
};

// Add a function to test the connection
export const testConnection = async () => {
  try {
    const baseUrl = await getBaseUrl();
    console.log("Testing connection to:", baseUrl);
    const response = await axios.get(`${baseUrl}/health`);
    console.log("Connection test successful:", response.data);
    return true;
  } catch (error) {
    console.error("Connection test failed:", error);
    return false;
  }
};

// Set the base URL
getBaseUrl()
  .then((baseUrl) => {
    api.defaults.baseURL = baseUrl;
    console.log("API Base URL set to:", baseUrl);
  })
  .catch((error) => {
    console.error("Error setting base URL:", error);
  });

// Add request interceptor to include auth token and handle network issues
api.interceptors.request.use(
  async (config) => {
    try {
      // Check network connectivity
      const networkState = await NetInfo.fetch();
      if (!networkState.isConnected) {
        throw new Error("No internet connection");
      }

      const token = await AsyncStorage.getItem("userToken");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      return config;
    } catch (error) {
      console.error("Request interceptor error:", error);
      return Promise.reject(error);
    }
  },
  (error) => {
    console.error("Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    console.log("API Error:", {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      platform: Platform.OS,
      isDev: __DEV__,
      baseURL: api.defaults.baseURL,
      deviceInfo: {
        platform: Platform.OS,
        version: Platform.Version,
        deviceId: Constants.deviceId,
        deviceName: Constants.deviceName,
      },
    });

    return Promise.reject(error);
  }
);

// Auth service methods
export const authService = {
  async login(email: string, password: string) {
    try {
      console.log("Attempting login with email:", email);

      // Validate input
      if (!email || !password) {
        throw new Error("Email and password are required");
      }

      if (!email.includes("@")) {
        throw new Error("Please enter a valid email address");
      }

      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters long");
      }

      const response = await api.post("/auth/login", { email, password });

      if (!response.data) {
        throw new Error("No response data received from server");
      }

      const { token, user } = response.data;

      if (!token || !user) {
        throw new Error("Invalid response format from server");
      }

      // Ensure user data has required fields
      if (!user.uid) {
        throw new Error("User ID not found in server response");
      }

      // Create a clean user data object with all required fields
      const userData = {
        uid: user.uid,
        username: user.username,
        email: user.email,
        profile: user.profile || {},
      };

      console.log("Login successful, user data:", {
        uid: userData.uid,
        username: userData.username,
        hasProfile: !!userData.profile,
      });

      // Store token and user data
      await AsyncStorage.setItem("userToken", token);
      await AsyncStorage.setItem("userData", JSON.stringify(userData));

      return { token, user: userData };
    } catch (error: any) {
      console.error("Login error:", error);
      throw error;
    }
  },

  async register(userData: any) {
    try {
      console.log("Starting registration process...");

      // Validate input
      if (!userData.email || !userData.password || !userData.username) {
        throw new Error("All fields are required");
      }

      if (!userData.email.includes("@")) {
        throw new Error("Please enter a valid email address");
      }

      if (userData.password.length < 6) {
        throw new Error("Password must be at least 6 characters long");
      }

      if (userData.password !== userData.passwordConfirm) {
        throw new Error("Passwords do not match");
      }

      // Validate role-specific fields
      if (userData.role === "shop_owner") {
        if (!userData.shopName) {
          throw new Error("Shop name is required");
        }
        if (!userData.location) {
          throw new Error("Location is required");
        }
      } else if (userData.role === "customer") {
        if (!userData.firstName) {
          throw new Error("First name is required");
        }
        if (!userData.lastName) {
          throw new Error("Last name is required");
        }
      }

      const response = await api.post("/auth/register", userData);
      return response.data;
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  },

  async logout() {
    try {
      await AsyncStorage.removeItem("userToken");
      await AsyncStorage.removeItem("userData");
      return true;
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  },

  async isAuthenticated() {
    try {
      const token = await AsyncStorage.getItem("userToken");
      return !!token;
    } catch (error) {
      console.error("Auth check error:", error);
      return false;
    }
  },

  async sendPasswordResetCode(email: string) {
    try {
      console.log("Sending password reset code to:", email);

      if (!email || !email.includes("@")) {
        throw new Error("Please enter a valid email address");
      }

      const response = await api.post("/auth/forgot-password", { email });
      return response.data;
    } catch (error: any) {
      console.error("Send password reset code error:", error);
      throw error;
    }
  },

  async verifyPasswordResetCode(email: string, code: string) {
    try {
      console.log("Verifying password reset code for:", email);

      if (!email || !code) {
        throw new Error("Email and verification code are required");
      }

      if (code.length !== 6) {
        throw new Error("Verification code must be 6 digits");
      }

      const response = await api.post("/auth/verify-reset-code", { email, code });
      return response.data;
    } catch (error: any) {
      console.error("Verify password reset code error:", error);
      throw error;
    }
  },

  async resetPassword(email: string, code: string, newPassword: string) {
    try {
      console.log("Resetting password for:", email);

      if (!email || !code || !newPassword) {
        throw new Error("Email, verification code, and new password are required");
      }

      if (newPassword.length < 6) {
        throw new Error("Password must be at least 6 characters long");
      }

      const response = await api.post("/auth/reset-password", {
        email,
        code,
        newPassword,
      });
      return response.data;
    } catch (error: any) {
      console.error("Reset password error:", error);
      throw error;
    }
  },
};
