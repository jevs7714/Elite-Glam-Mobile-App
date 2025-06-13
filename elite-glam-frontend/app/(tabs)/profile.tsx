import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { api } from "../../services/api";

interface UserData {
  uid: string;
  username: string;
  email: string;
  profile?: {
    photoURL?: string;
    bio?: string;
  };
}

export default function ProfileScreen() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadUserData = async (showLoading = true) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      }
      setIsRefreshing(true);

      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        throw new Error("Not authenticated");
      }

      // Always try to get fresh data from API first
      const response = await api.get("/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("API Response:", JSON.stringify(response.data, null, 2));

      if (response.data) {
        // Get stored data to preserve profile information
        const storedData = await AsyncStorage.getItem("userData");
        const storedUserData = storedData ? JSON.parse(storedData) : null;

        // Ensure we have the correct data structure
        const userData: UserData = {
          uid: response.data.uid || storedUserData?.uid,
          username: response.data.username || "",
          email: response.data.email || "",
          profile: {
            // Preserve existing profile data if available
            photoURL:
              response.data.profile?.photoURL ||
              storedUserData?.profile?.photoURL,
            bio: response.data.profile?.bio || storedUserData?.profile?.bio,
          },
        };

        console.log("Processed User Data:", JSON.stringify(userData, null, 2));
        setUserData(userData);

        // Update stored data
        await AsyncStorage.setItem("userData", JSON.stringify(userData));
      }
    } catch (error) {
      console.error("Error loading user data:", error);
      // Only show error alert if it's not a refresh
      if (showLoading) {
        Alert.alert("Error", "Failed to load user data. Please try again.");
      }
      // If API fails, try to get from storage
      const storedUserData = await AsyncStorage.getItem("userData");
      if (storedUserData) {
        const parsedData = JSON.parse(storedUserData);
        console.log(
          "Loaded from storage:",
          JSON.stringify(parsedData, null, 2)
        );
        setUserData(parsedData);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Load data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadUserData();
    }, [])
  );

  const handleLogout = async () => {
    try {
      Alert.alert("Logout", "Are you sure you want to logout?", [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              // Clear all authentication and user data
              await AsyncStorage.multiRemove([
                "userToken",
                "userData",
                "rentLaterItems",
              ]);

              // Reset the user data state
              setUserData(null);

              // Navigate to login screen
              router.replace("/login");
            } catch (error) {
              console.error("Error during logout:", error);
              Alert.alert("Error", "Failed to logout. Please try again.");
            }
          },
        },
      ]);
    } catch (error) {
      console.error("Error in handleLogout:", error);
      Alert.alert("Error", "Failed to logout. Please try again.");
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => loadUserData(false)}
          colors={["#7E57C2"]}
          tintColor="#7E57C2"
        />
      }
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            {isLoading ? (
              <ActivityIndicator size="large" color="#7E57C2" />
            ) : userData?.profile?.photoURL ? (
              <Image
                source={{ uri: userData.profile.photoURL }}
                style={styles.avatar}
                onError={(error) => {
                  console.error(
                    "Error loading profile image:",
                    error.nativeEvent
                  );
                  if (userData?.profile?.photoURL) {
                    console.log("Failed image URL:", userData.profile.photoURL);
                  }
                  // If image fails to load, try to refresh the data
                  loadUserData(false);
                }}
                onLoad={() => {
                  if (userData?.profile?.photoURL) {
                    console.log(
                      "Image loaded successfully:",
                      userData.profile.photoURL
                    );
                  }
                }}
              />
            ) : (
              <MaterialIcons name="person" size={60} color="#7E57C2" />
            )}
          </View>
          <Text style={styles.username}>{userData?.username || "User"}</Text>
          <Text style={styles.email}>{userData?.email || "Loading..."}</Text>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/edit-profile")}
          >
            <MaterialIcons name="edit" size={24} color="#333" />
            <Text style={styles.menuText}>Edit Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/(tabs)/notifications")}
          >
            <MaterialIcons name="notifications" size={24} color="#333" />
            <Text style={styles.menuText}>Notifications</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/(store)/dashboard")}
          >
            <MaterialIcons name="store" size={24} color="#333" />
            <Text style={styles.menuText}>My Store</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/(store)/booking-status")}
          >
            <MaterialIcons name="event-note" size={24} color="#333" />
            <Text style={styles.menuText}>Rent Status</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() =>
              Alert.alert(
                "Coming Soon",
                "Settings feature is under development. Stay tuned!",
                [{ text: "OK" }]
              )
            }
          >
            <MaterialIcons name="settings" size={24} color="#333" />
            <Text style={styles.menuText}>Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, styles.logoutButton]}
            onPress={handleLogout}
          >
            <MaterialIcons name="logout" size={24} color="#ff4444" />
            <Text style={[styles.menuText, styles.logoutText]}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: "#fff",
    padding: 20,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#eee",
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 50,
    backgroundColor: "#f0f0f0",
  },
  username: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: "#666",
  },
  section: {
    backgroundColor: "#fff",
    marginTop: 20,
    paddingHorizontal: 20,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  menuText: {
    fontSize: 16,
    marginLeft: 16,
    color: "#333",
  },
  logoutButton: {
    marginTop: 20,
    borderBottomWidth: 0,
  },
  logoutText: {
    color: "#ff4444",
  },
});