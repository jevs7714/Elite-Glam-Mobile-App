import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from "react-native";
import { MaterialIcons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios, { AxiosError } from "axios";
import { dashboardService, DashboardStats } from "../../services/dashboard.service";

export default function AdminHome() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await AsyncStorage.getItem("userToken");
      
      if (!token) {
        throw new Error("Authentication token not found");
      }

      const dashboardStats = await dashboardService.getDashboardStats(token);
      setStats(dashboardStats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      setError("Failed to load dashboard statistics. Please try again.");
      
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response?.status === 401) {
          // Handle unauthorized error
          await AsyncStorage.removeItem("userToken");
          router.replace("/(auth)/login");
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchDashboardStats();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardStats();
  };

  const renderStatCard = (title: string, value: number, icon: React.ReactNode, color: string) => {
    return (
      <View style={[styles.statCard, { borderLeftColor: color }]}>
        <View style={styles.statIconContainer}>
          {icon}
        </View>
        <View style={styles.statInfo}>
          <Text style={styles.statValue}>{value}</Text>
          <Text style={styles.statTitle}>{title}</Text>
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6B4EFF" />
        <Text style={styles.loadingText}>Loading dashboard statistics...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchDashboardStats}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>User Statistics</Text>
            <View style={styles.statsGrid}>
              {stats && (
                <>
                  {renderStatCard(
                    "Total Users", 
                    stats.users.total, 
                    <MaterialIcons name="people" size={28} color="#6B4EFF" />,
                    "#6B4EFF"
                  )}
                  {renderStatCard(
                    "Customers", 
                    stats.users.customerCount, 
                    <MaterialIcons name="person" size={28} color="#2196F3" />,
                    "#2196F3"
                  )}
                  {renderStatCard(
                    "Shop Owners", 
                    stats.users.shopOwnerCount, 
                    <MaterialIcons name="store" size={28} color="#4CAF50" />,
                    "#4CAF50"
                  )}
                  {renderStatCard(
                    "Admins", 
                    stats.users.adminCount, 
                    <MaterialIcons name="security" size={28} color="#FF5722" />,
                    "#FF5722"
                  )}
                </>
              )}
            </View>
          </View>

          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Product Statistics</Text>
            <View style={styles.statsGrid}>
              {stats && (
                <>
                  {renderStatCard(
                    "Total Products", 
                    stats.products.total, 
                    <MaterialCommunityIcons name="shopping" size={28} color="#FF9800" />,
                    "#FF9800"
                  )}
                </>
              )}
            </View>
          </View>

          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Booking Statistics</Text>
            <View style={styles.statsGrid}>
              {stats && (
                <>
                  {renderStatCard(
                    "Total Bookings", 
                    stats.bookings.total, 
                    <FontAwesome5 name="calendar-check" size={24} color="#9C27B0" />,
                    "#9C27B0"
                  )}
                  {renderStatCard(
                    "Pending Bookings", 
                    stats.bookings.pending, 
                    <MaterialIcons name="pending-actions" size={28} color="#FFC107" />,
                    "#FFC107"
                  )}
                </>
              )}
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    backgroundColor: "#6B4EFF",
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  statsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
    marginLeft: 4,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    width: "48%",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderLeftWidth: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  statIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(0,0,0,0.05)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  statInfo: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 14,
    color: "#666",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#ff4444",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#6B4EFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});