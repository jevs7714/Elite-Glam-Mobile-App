import { Tabs, useFocusEffect } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import {
  TouchableOpacity,
  Platform,
  View,
  Text,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import React, { useState, useCallback, useEffect } from "react";
import { notificationsService } from "../../services/notifications.service";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../../services/api";

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 30, // Adjust as needed
    height: 30, // Adjust as needed
    marginRight: 8,
  },
  brandText: {
    fontSize: 18, // Adjust as needed
    fontWeight: "bold",
    color: "#fff", // Ensure text is white
  },
  brandE: { color: "#fff" }, // Specific styles if needed, otherwise parent brandText covers it
  brandLite: { color: "#fff" },
  brandG: { color: "#fff" },
  brandLam: { color: "#fff" },
  iconButton: {
    padding: 10,
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: 5,
    right: 5,
    backgroundColor: "#FF4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#7E57C2",
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
});

interface UserData {
  role?: "customer" | "shop_owner";
}

const CustomHeaderTitle = () => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadUnreadCount();
    // Set up interval to check for new notifications every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadUnreadCount = async () => {
    try {
      const count = await notificationsService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error("Error loading unread count:", error);
    }
  };

  return (
    <View style={styles.headerContainer}>
      <View style={styles.headerLeft}>
        <Image
          source={require("../../assets/images/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.brandText}>
          <Text style={styles.brandE}>E</Text>
          <Text style={styles.brandLite}>lite</Text>
          <Text style={styles.brandG}>G</Text>
          <Text style={styles.brandLam}>lam</Text>
        </Text>
      </View>
    </View>
  );
};

export default function TabsLayout() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notificationCount, setNotificationCount] = useState(0);

  const loadUserData = useCallback(async () => {
    // Do not set loading to true on every focus, only on initial load.
    // The isLoading state is handled by the initial useState(true).
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        setUserData(null); // Guest user
        return;
      }

      // If token exists, fetch fresh user data from API
      const response = await api.get("/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data) {
        // Update AsyncStorage to keep it in sync
        const storedData = await AsyncStorage.getItem("userData");
        const storedUserData = storedData ? JSON.parse(storedData) : {};
        const updatedUserData = { ...storedUserData, ...response.data };
        await AsyncStorage.setItem("userData", JSON.stringify(updatedUserData));

        // Set state to trigger re-render
        setUserData(updatedUserData);
      } else {
        // Fallback to whatever is in storage if API fails
        const userDataString = await AsyncStorage.getItem("userData");
        setUserData(userDataString ? JSON.parse(userDataString) : null);
      }
    } catch (error) {
      console.error(
        "Failed to fetch user data for layout, falling back to storage:",
        error
      );
      try {
        const userDataString = await AsyncStorage.getItem("userData");
        setUserData(userDataString ? JSON.parse(userDataString) : null);
      } catch (storageError) {
        console.error(
          "Failed to read user data from storage for layout:",
          storageError
        );
        setUserData(null); // Ultimate fallback
      }
    } finally {
      // Ensure loading is turned off after the first load.
      if (isLoading) {
        setIsLoading(false);
      }
    }
  }, [isLoading]); // Depend on isLoading to run this once initially

  const fetchNotificationCount = useCallback(async () => {
    try {
      const notifications = await notificationsService.getNotifications();
      const unreadCount = notifications.filter((n) => !n.isRead).length;
      setNotificationCount(unreadCount);
    } catch (error) {
      console.error("Failed to fetch notification count for layout:", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadUserData();
      fetchNotificationCount();
    }, [loadUserData, fetchNotificationCount])
  );

  if (isLoading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView
          style={styles.loadingContainer}
          edges={["bottom", "left", "right"]}
        >
          <ActivityIndicator size="large" color="#7E57C2" />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  const isShopOwner = userData?.role === "shop_owner";

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "#fff" }}
        edges={["bottom", "left", "right"]}
      >
        <Tabs
          screenOptions={{
            headerStyle: {
              backgroundColor: "#7E57C2",
            },
            headerTintColor: "#fff",
            tabBarActiveTintColor: "#7E57C2",
            tabBarInactiveTintColor: "#888",
            tabBarStyle: {
              height: 55,
              paddingBottom: Platform.OS === "android" ? 5 : 12,
              paddingTop: 5,
              backgroundColor: "#fff",
              elevation: 20,
              zIndex: 100,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              borderTopWidth: 0.5,
              borderTopColor: "#eee",
            },
            tabBarLabelStyle: {
              fontSize: 11,
            },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: "Home",
              headerTitle: () => <CustomHeaderTitle />,
              tabBarIcon: ({ color, size }) => (
                <MaterialIcons name="home" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="manage"
            options={{
              title: "Manage",
              headerTitle: "Manage Products",
              tabBarIcon: ({ color, size }) => (
                <MaterialIcons name="store" size={size} color={color} />
              ),
              href: isShopOwner ? "/manage" : null,
            }}
          />
          <Tabs.Screen
            name="my-cart"
            options={{
              title: "My Cart",
              headerTitle: "My Cart",
              tabBarIcon: ({ color, size }) => (
                <MaterialIcons
                  name="shopping-cart"
                  size={size}
                  color={color}
                />
              ),
              href: !isShopOwner ? "/my-cart" : null,
            }}
          />
          <Tabs.Screen
            name="notifications"
            options={{
              title: "Notifications",
              headerTitle: "Notifications",
              tabBarIcon: ({ color, size }) => (
                <MaterialIcons name="notifications" size={size} color={color} />
              ),
              tabBarBadge: notificationCount > 0 ? notificationCount : undefined,
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: "Profile",
              tabBarIcon: ({ color, size }) => (
                <MaterialIcons name="person" size={size} color={color} />
              ),
            }}
          />

          <Tabs.Screen
            name="edit-profile"
            options={{
              title: "Edit Profile",
              tabBarIcon: ({ color, size }) => (
                <MaterialIcons name="edit" size={size} color={color} />
              ),
              href: null,
            }}
          />
          <Tabs.Screen
            name="choose-photo"
            options={{
              title: "Choose Photo",
              tabBarIcon: ({ color, size }) => (
                <MaterialIcons name="photo-camera" size={size} color={color} />
              ),
              href: null,
            }}
          />
        </Tabs>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
