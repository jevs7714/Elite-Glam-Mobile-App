import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import {
  notificationsService,
  Notification,
} from "../../services/notifications.service";

interface NotificationItemProps {
  notification: Notification;
  onPress: (notification: Notification) => void;
  onMarkAsRead: (notificationId: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onPress,
  onMarkAsRead,
}) => {
  const getIconName = (type: string) => {
    switch (type) {
      case "booking_accepted":
        return "check-circle";
      case "booking_rejected":
        return "cancel";
      case "new_booking":
        return "event";
      case "booking_cancelled":
        return "event-busy";
      default:
        return "notifications";
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case "booking_accepted":
        return "#4CAF50";
      case "booking_rejected":
        return "#F44336";
      case "new_booking":
        return "#2196F3";
      case "booking_cancelled":
        return "#FF9800";
      default:
        return "#7E57C2";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !notification.isRead && styles.unreadItem,
      ]}
      onPress={() => {
        if (!notification.isRead) {
          onMarkAsRead(notification.id);
        }
        onPress(notification);
      }}
    >
      <View style={styles.notificationContent}>
        <View style={styles.iconContainer}>
          <MaterialIcons
            name={getIconName(notification.type)}
            size={24}
            color={getIconColor(notification.type)}
          />
          {!notification.isRead && <View style={styles.unreadDot} />}
        </View>

        <View style={styles.textContainer}>
          <Text
            style={[styles.title, !notification.isRead && styles.unreadText]}
          >
            {notification.title}
          </Text>
          <Text style={styles.message} numberOfLines={2}>
            {notification.message}
          </Text>
          <Text style={styles.timestamp}>
            {formatDate(notification.createdAt)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadNotifications = async (showLoading = true) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      }
      setIsRefreshing(true);

      const data = await notificationsService.getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error("Error loading notifications:", error);
      Alert.alert("Error", "Failed to load notifications. Please try again.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadNotifications();
    }, [])
  );

  const handleNotificationPress = (notification: Notification) => {
    // Navigate based on notification type and user role
    if (notification.relatedBookingId) {
      try {
        switch (notification.type) {
          case "new_booking":
            // Seller received a new booking request - go to order details for management
            console.log(
              "Navigating to order details for new booking:",
              notification.relatedBookingId
            );
            router.push(
              `/(store)/order-details?id=${notification.relatedBookingId}`
            );
            break;
          case "booking_accepted":
          case "booking_rejected":
            // Customer received booking response - go to booking details
            console.log(
              "Navigating to booking details for customer:",
              notification.relatedBookingId
            );
            router.push(
              `/(store)/booking-details?id=${notification.relatedBookingId}`
            );
            break;
          case "booking_cancelled":
            // Seller received cancellation - go to order details for management
            console.log(
              "Navigating to order details for cancellation:",
              notification.relatedBookingId
            );
            router.push(
              `/(store)/order-details?id=${notification.relatedBookingId}`
            );
            break;
          default:
            // Fallback to booking status
            console.log("Fallback navigation to booking status");
            router.push(`/(store)/booking-status`);
            break;
        }
      } catch (error) {
        console.error("Error navigating from notification:", error);
        Alert.alert(
          "Error",
          "Failed to navigate to booking details. Please try again."
        );
      }
    } else {
      // No related booking ID, just show a message
      Alert.alert("Info", "This notification has no related booking to view.");
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationsService.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, isRead: true } : notif
        )
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsService.markAllAsRead();
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, isRead: true }))
      );
      Alert.alert("Success", "All notifications marked as read");
    } catch (error) {
      console.error("Error marking all as read:", error);
      Alert.alert("Error", "Failed to mark all notifications as read");
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7E57C2" />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {notifications.length > 0 && unreadCount > 0 && (
        <View style={styles.header}>
          <Text style={styles.headerText}>
            {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
          </Text>
          <TouchableOpacity
            onPress={handleMarkAllAsRead}
            style={styles.markAllButton}
          >
            <Text style={styles.markAllText}>Mark all as read</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationItem
            notification={item}
            onPress={handleNotificationPress}
            onMarkAsRead={handleMarkAsRead}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadNotifications(false)}
            colors={["#7E57C2"]}
            tintColor="#7E57C2"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="notifications-none" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No notifications yet</Text>
            <Text style={styles.emptySubtext}>
              You'll receive notifications when there are updates to your
              bookings
            </Text>
          </View>
        }
        contentContainerStyle={
          notifications.length === 0 ? styles.emptyList : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#7E57C2",
    borderRadius: 16,
  },
  markAllText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  notificationItem: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  unreadItem: {
    borderLeftWidth: 4,
    borderLeftColor: "#7E57C2",
  },
  notificationContent: {
    flexDirection: "row",
    padding: 16,
  },
  iconContainer: {
    position: "relative",
    marginRight: 12,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 2,
  },
  unreadDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF4444",
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  unreadText: {
    fontWeight: "700",
  },
  message: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 8,
  },
  timestamp: {
    fontSize: 12,
    color: "#999",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#999",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#ccc",
    textAlign: "center",
    lineHeight: 20,
  },
});
