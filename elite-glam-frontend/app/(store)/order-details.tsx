import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  Animated,
  SafeAreaView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, router, useFocusEffect } from "expo-router";
import { bookingService, Booking } from "../../services/booking.service";
import { productsService } from "../../services/products.service";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const STATUS_COLORS = {
  pending: "#FFA500",
  confirmed: "#4CAF50",
  rejected: "#F44336",
  cancelled: "#F44336",
  completed: "#2196F3",
} as const;

const STATUS_ICONS = {
  pending: "schedule" as const,
  confirmed: "check-circle" as const,
  rejected: "close" as const,
  cancelled: "cancel" as const,
  completed: "done-all" as const,
} as const;

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams();
  const [booking, setBooking] = useState<Booking | null>(null);

  // Helper to compute late fee: ₱100 per day overdue beyond a 1-day grace period
  const calcLateFee = (dueDateStr: string): number => {
    const due = new Date(dueDateStr);
    // Zero out time portion for accurate day comparison
    due.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Calculate difference in days
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // Apply 1-day grace period, then ₱100 per day
    const daysOverdue = diffDays > 1 ? diffDays - 1 : 0;
    return daysOverdue * 100;
  };
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionMessage, setRejectionMessage] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<
    Array<{
      id: string;
      text: string;
      sender: string;
      receiver: string;
      timestamp: string;
      bookingId: string;
    }>
  >([]);
  const [currentUser, setCurrentUser] = useState<string>("");
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userData = await AsyncStorage.getItem("userData");
        if (userData) {
          const { username } = JSON.parse(userData);
          setCurrentUser(username);
        }
      } catch (error) {
        console.error("Error loading user data:", error);
      }
    };
    loadUserData();
  }, []);

  useEffect(() => {
    fetchBookingDetails();
  }, [id]);

  useFocusEffect(
    React.useCallback(() => {
      fetchBookingDetails();
    }, [id])
  );

  const fetchBookingDetails = async () => {
    try {
      const data = await bookingService.getBookingById(id as string);
      console.log("Fetched booking data:", {
        fittingTime: data.fittingTime,
        fittingTimePeriod: data.fittingTimePeriod,
        eventLocation: data.eventLocation,
        eventType: data.eventType,
        notes: data.notes,
      });
      if (data.status === "cancelled") {
        Alert.alert(
          "Order Cancelled",
          "This order has been cancelled and is no longer available.",
          [{ text: "OK", onPress: () => router.back() }]
        );
        return;
      }
      setBooking(data);
    } catch (error: any) {
      console.error("Error fetching order details:", error);
      Alert.alert(
        "Error",
        "Failed to load order details. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!booking) return;
    Alert.alert(
      "Cancel Order",
      "Are you sure you want to cancel this order? This will restore the reserved items to inventory.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              setActionLoading(true);

              // Restore the product quantity since the booking is being cancelled
              if (booking.productId && booking.quantity) {
                try {
                  console.log(
                    `Restoring quantity for cancelled booking ${booking.productId}: +${booking.quantity}`
                  );

                  // Get current product data
                  const productData = await productsService.getProductById(
                    booking.productId
                  );
                  if (productData) {
                    const newQuantity = productData.quantity + booking.quantity;
                    console.log(
                      `Updating product quantity from ${productData.quantity} to ${newQuantity}`
                    );

                    await productsService.updateProductQuantity(
                      booking.productId,
                      newQuantity
                    );
                    console.log(
                      `Successfully restored ${booking.quantity} items to product ${booking.productId}`
                    );
                  } else {
                    console.warn("Product not found, cannot restore quantity");
                  }
                } catch (quantityError: any) {
                  console.error(
                    "Failed to restore product quantity:",
                    quantityError
                  );
                  // Show warning but don't fail the cancellation
                  Alert.alert(
                    "Warning",
                    "Order cancelled successfully, but there was an issue restoring the product quantity. Please check the inventory manually.",
                    [{ text: "OK" }]
                  );
                }
              }

              await bookingService.cancelBooking(booking.id);
              Alert.alert(
                "Order Cancelled",
                "Your order has been cancelled and the reserved items have been returned to inventory.",
                [{ text: "OK", onPress: () => router.back() }]
              );
            } catch (error: any) {
              console.error("Error cancelling order:", error);
              Alert.alert(
                "Error",
                "Failed to cancel order. Please try again later."
              );
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleConfirmBooking = async () => {
    if (!booking) return;
    try {
      setActionLoading(true);
      await bookingService.updateBookingStatus(booking.id, "confirmed");
      Alert.alert("Success", "Order has been confirmed successfully");
      fetchBookingDetails();
    } catch (error: any) {
      console.error("Error confirming order:", error);
      Alert.alert("Error", "Failed to confirm order. Please try again later.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectBooking = async (rejectionMessage: string) => {
    if (!booking) return;
    try {
      setActionLoading(true);
      await bookingService.updateBookingStatus(
        booking.id,
        "rejected",
        rejectionMessage
      );
      Alert.alert("Success", "Order has been rejected");
      setIsRejectModalOpen(false);
      setRejectionMessage("");
      fetchBookingDetails();
    } catch (error: any) {
      console.error("Error rejecting order:", error);
      Alert.alert("Error", "Failed to reject order. Please try again later.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteBooking = async () => {
    if (!booking) return;

    Alert.alert(
      "Complete Order",
      "Are you sure you want to mark this order as completed? This will restore the rented items to inventory.",
      [
        {
          text: "No",
          style: "cancel",
        },
        {
          text: "Yes, Complete",
          onPress: async () => {
            try {
              setActionLoading(true);

              // First, restore the product quantity since items are being returned
              if (booking.productId && booking.quantity) {
                try {
                  console.log(
                    `Restoring quantity for product ${booking.productId}: +${booking.quantity}`
                  );

                  // Get current product data
                  const productData = await productsService.getProductById(
                    booking.productId
                  );
                  if (productData) {
                    const newQuantity = productData.quantity + booking.quantity;
                    console.log(
                      `Updating product quantity from ${productData.quantity} to ${newQuantity}`
                    );

                    await productsService.updateProductQuantity(
                      booking.productId,
                      newQuantity
                    );
                    console.log(
                      `Successfully restored ${booking.quantity} items to product ${booking.productId}`
                    );
                  } else {
                    console.warn("Product not found, cannot restore quantity");
                  }
                } catch (quantityError: any) {
                  console.error(
                    "Failed to restore product quantity:",
                    quantityError
                  );
                  // Show warning but don't fail the completion
                  Alert.alert(
                    "Warning",
                    "Order completed successfully, but there was an issue restoring the product quantity. Please check the inventory manually.",
                    [{ text: "OK" }]
                  );
                }
              }

              // Then update booking status (this will automatically create the notification)
              await bookingService.updateBookingStatus(booking.id, "completed");
              await bookingService.deleteBooking(booking.id);

              Alert.alert(
                "Success",
                "The order has been completed and the rented items have been returned to inventory.",
                [
                  {
                    text: "OK",
                    onPress: () => router.back(),
                  },
                ]
              );
            } catch (error: any) {
              console.error("Error completing order:", error);
              Alert.alert(
                "Error",
                "Failed to complete order. Please try again later."
              );
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteBooking = async () => {
    if (!booking) return;

    Alert.alert(
      "Delete Order",
      "Are you sure you want to delete this rejected order? This action cannot be undone.",
      [
        {
          text: "No",
          style: "cancel",
        },
        {
          text: "Yes, Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setActionLoading(true);
              await bookingService.deleteBooking(booking.id);
              Alert.alert(
                "Success",
                "The order has been deleted successfully.",
                [
                  {
                    text: "OK",
                    onPress: () => router.back(),
                  },
                ]
              );
            } catch (error: any) {
              console.error("Error deleting order:", error);
              Alert.alert(
                "Error",
                "Failed to delete order. Please try again later."
              );
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleSendMessage = async () => {
    if (message.trim() === "" || !booking) return;

    const newMessage = {
      id: Date.now().toString(),
      text: message.trim(),
      sender: currentUser,
      receiver: booking.customerName,
      timestamp: new Date().toISOString(),
      bookingId: booking.id,
    };

    try {
      setMessages((prev) => [...prev, newMessage]);
      setMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", "Failed to send message. Please try again.");
    }
  };

  const handleMessageButtonPress = () => {
    Alert.alert(
      "Coming Soon",
      "The messaging feature is currently under development. Please check back later!",
      [{ text: "OK" }]
    );
  };

  const renderChatDrawer = () => {
    if (!isChatOpen) return null;

    return (
      <View style={styles.chatDrawer}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatHeaderTitle}>
            Chat with {booking?.customerName}
          </Text>
          <TouchableOpacity onPress={() => setIsChatOpen(false)}>
            <MaterialIcons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.messagesContainer}>
          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.messageBubble,
                msg.sender === currentUser
                  ? styles.sentMessage
                  : styles.receivedMessage,
              ]}
            >
              <Text style={styles.messageText}>{msg.text}</Text>
              <Text style={styles.messageTime}>
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          ))}
        </ScrollView>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.inputContainer}
        >
          <TextInput
            style={styles.messageInput}
            value={message}
            onChangeText={setMessage}
            placeholder="Type a message..."
            placeholderTextColor="#999"
            multiline
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleSendMessage}
          >
            <MaterialIcons name="send" size={24} color="#6B46C1" />
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </View>
    );
  };

  const renderRejectModal = () => {
    if (!isRejectModalOpen) return null;

    return (
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Reject Order</Text>
            <TouchableOpacity onPress={() => setIsRejectModalOpen(false)}>
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalLabel}>
            Please provide a reason for rejecting this order:
          </Text>
          <TextInput
            style={styles.modalInput}
            value={rejectionMessage}
            onChangeText={setRejectionMessage}
            placeholder="Enter rejection reason..."
            multiline
            numberOfLines={4}
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelModalButton]}
              onPress={() => {
                setIsRejectModalOpen(false);
                setRejectionMessage("");
              }}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modalButton,
                styles.rejectModalButton,
                !rejectionMessage.trim() && styles.disabledButton,
              ]}
              onPress={() => {
                if (rejectionMessage.trim()) {
                  handleRejectBooking(rejectionMessage);
                }
              }}
              disabled={!rejectionMessage.trim() || actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.modalButtonText}>Reject Order</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderActionButtons = () => {
    if (!booking) return null;

    if (booking.status === "cancelled") {
      return null;
    }

    if (booking.status === "rejected") {
      return (
        <View style={styles.actionButtonsWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.actionButtonsContainer}
          >
            <TouchableOpacity
              style={[styles.actionButton, styles.disabledButton]}
              disabled={true}
            >
              <MaterialIcons name="close" size={20} color="#999" />
              <Text style={styles.disabledButtonText}>Order Rejected</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={handleDeleteBooking}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <MaterialIcons name="delete" size={20} color="white" />
                  <Text style={styles.actionButtonText}>Delete Order</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
          <View style={styles.scrollOverlay} pointerEvents="none" />
          <MaterialIcons
            name="chevron-right"
            size={24}
            color="#666"
            style={styles.scrollIcon}
          />
        </View>
      );
    }

    if (booking.status === "pending") {
      return (
        <View style={styles.actionButtonsWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.actionButtonsContainer}
          >
            <TouchableOpacity
              style={[styles.actionButton, styles.confirmButton]}
              onPress={() => {
                Alert.alert(
                  "Confirm Order",
                  "Are you sure you want to accept this order?",
                  [
                    {
                      text: "No",
                      style: "cancel",
                    },
                    {
                      text: "Yes",
                      onPress: handleConfirmBooking,
                    },
                  ]
                );
              }}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <MaterialIcons name="check-circle" size={20} color="white" />
                  <Text style={styles.actionButtonText}>Confirm Order</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => setIsRejectModalOpen(true)}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <MaterialIcons name="close" size={20} color="white" />
                  <Text style={styles.actionButtonText}>Reject Order</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
          <View style={styles.scrollOverlay} pointerEvents="none" />
          <MaterialIcons
            name="chevron-right"
            size={24}
            color="#666"
            style={styles.scrollIcon}
          />
        </View>
      );
    }

    if (booking.status === "confirmed") {
      return (
        <View style={styles.actionButtonsWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.actionButtonsContainer}
          >
            <TouchableOpacity
              style={[styles.actionButton, styles.messageButton]}
              onPress={handleMessageButtonPress}
            >
              <MaterialIcons name="chat" size={20} color="white" />
              <Text style={styles.actionButtonText}>Message Customer</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.completeButton]}
              onPress={handleCompleteBooking}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <MaterialIcons name="done-all" size={20} color="white" />
                  <Text style={styles.actionButtonText}>Complete Order</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
          <View style={styles.scrollOverlay} pointerEvents="none" />
          <MaterialIcons
            name="chevron-right"
            size={24}
            color="#666"
            style={styles.scrollIcon}
          />
        </View>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6B4EFF" />
        <Text style={styles.loadingText}>Loading order details...</Text>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Order not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#333" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Order Details</Text>
        </View>
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: STATUS_COLORS[booking.status] },
            ]}
          >
            <MaterialIcons
              name={STATUS_ICONS[booking.status]}
              size={20}
              color="white"
            />
            <Text style={styles.statusText}>
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </Text>
          </View>
        </View>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <View style={styles.infoRow}>
            <MaterialIcons name="person" size={20} color="#666" />
            <Text style={styles.infoLabel}>Customer:</Text>
            <Text style={styles.infoText}>{booking.customerName}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons name="event" size={20} color="#666" />
            <Text style={styles.infoLabel}>Fitting Date:</Text>
            <Text style={styles.infoText}>
              {new Date(booking.date).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons name="event" size={20} color="#666" />
            <Text style={styles.infoLabel}>Event Date:</Text>
            <Text style={styles.infoText}>
              {new Date(booking.date).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons name="access-time" size={20} color="#666" />
            <Text style={styles.infoLabel}>Event Time:</Text>
            <Text style={styles.infoText}>
              {booking.time} {booking.eventTimePeriod}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons name="watch-later" size={20} color="#666" />
            <Text style={styles.infoLabel}>Time of Arrival:</Text>
            <Text style={styles.infoText}>
              {booking.fittingTime && booking.fittingTimePeriod
                ? `${booking.fittingTime} ${booking.fittingTimePeriod}`
                : "Not specified"}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons name="location-on" size={20} color="#666" />
            <Text style={styles.infoLabel}>Event Location:</Text>
            <Text style={styles.infoText}>
              {booking.eventLocation || "Not specified"}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons name="celebration" size={20} color="#666" />
            <Text style={styles.infoLabel}>Event Type:</Text>
            <Text style={styles.infoText}>
              {booking.eventType || "Not specified"}
            </Text>
          </View>
        </View>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Service Details</Text>
          {booking.productImage ? (
            <Image
              source={{ uri: booking.productImage }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <Text
              style={{ color: "#F44336", fontWeight: "bold", marginBottom: 12 }}
            >
              Product Deleted
            </Text>
          )}
          <View style={styles.infoRow}>
            <MaterialIcons name="spa" size={20} color="#666" />
            <Text style={styles.infoLabel}>Service:</Text>
            <Text style={styles.infoText}>
              {booking.serviceName || "Product Deleted"}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons name="attach-money" size={20} color="#666" />
            <Text style={styles.infoLabel}>Price:</Text>
            <Text style={styles.infoText}>₱{booking.price}</Text>
          </View>
          
          {/* Show late fee to shop owner if customer has held it past the grace period */}
          {booking.status === "confirmed" && calcLateFee(booking.date) > 0 && (
            <View style={styles.infoRow}>
              <MaterialIcons name="warning" size={20} color="#F44336" />
              <Text style={styles.infoLabel}>Late Fee:</Text>
              <Text style={[styles.infoText, { color: "#F44336", fontWeight: "600" }]}>
                ₱{calcLateFee(booking.date)} ({Math.floor((calcLateFee(booking.date) / 100))} day{Math.floor((calcLateFee(booking.date) / 100)) !== 1 ? 's' : ''} overdue)
              </Text>
            </View>
          )}
          
          {/* Show total amount if there's a late fee */}
          {booking.status === "confirmed" && calcLateFee(booking.date) > 0 && (
            <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: "#e0e0e0", paddingTop: 12, marginTop: 8 }]}>
              <MaterialIcons name="attach-money" size={20} color="#333" />
              <Text style={[styles.infoLabel, { fontWeight: "600" }]}>Total Amount:</Text>
              <Text style={[styles.infoText, { fontWeight: "700", color: "#333" }]}>
                ₱{booking.price + calcLateFee(booking.date)}
              </Text>
            </View>
          )}
          {booking.ownerUsername && (
            <View style={styles.infoRow}>
              <MaterialIcons name="person" size={20} color="#666" />
              <Text style={styles.infoLabel}>Product Owner:</Text>
              <Text style={styles.infoText}>{booking.ownerUsername}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <MaterialIcons name="store" size={20} color="#666" />
            <Text style={styles.infoLabel}>Product Owner Location:</Text>
            <Text style={styles.infoText}>{booking.sellerLocation}</Text>
          </View>
        </View>
        {booking.notes && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Additional Notes</Text>
            <View style={styles.notesContainer}>
              <MaterialIcons name="notes" size={20} color="#666" />
              <View style={styles.notesContent}>
                <View style={styles.noteItem}>
                  <Text style={styles.notesLabel}>Event Location:</Text>
                  <Text style={styles.notesText}>
                    {booking.eventLocation || "Not specified"}
                  </Text>
                </View>
                <View style={styles.noteItem}>
                  <Text style={styles.notesLabel}>Special Requests:</Text>
                  <Text style={styles.notesText}>{booking.notes}</Text>
                </View>
                <View style={styles.noteItem}>
                  <Text style={styles.notesLabel}>Additional Information:</Text>
                  <Text style={styles.notesText}>
                    {`Event Type: ${booking.eventType || "Not specified"}\n`}
                    {`Fitting Time: ${booking.fittingTime || "Not specified"} ${
                      booking.fittingTimePeriod || ""
                    }\n`}
                    {`Event Time: ${booking.time || "Not specified"} ${
                      booking.eventTimePeriod || ""
                    }`}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
        {renderActionButtons()}
      </ScrollView>
      {renderChatDrawer()}
      {renderRejectModal()}
      <View style={[styles.bottomSafeArea, { height: insets.bottom }]} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: "#333",
    marginLeft: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  statusContainer: {
    padding: 16,
    backgroundColor: "white",
    alignItems: "center",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    margin: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    color: "#333",
    marginLeft: 12,
    flex: 1,
    flexWrap: "wrap",
  },
  infoLabel: {
    fontSize: 15,
    color: "#888",
    marginLeft: 8,
    marginRight: 4,
    minWidth: 90,
  },
  notesContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  notesContent: {
    flex: 1,
    marginLeft: 12,
  },
  noteItem: {
    marginBottom: 16,
  },
  notesLabel: {
    fontSize: 15,
    color: "#888",
    marginBottom: 4,
    fontWeight: "500",
  },
  notesText: {
    fontSize: 16,
    color: "#333",
    lineHeight: 22,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
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
    backgroundColor: "#f5f5f5",
  },
  errorText: {
    fontSize: 18,
    color: "#666",
    marginBottom: 16,
  },
  actionButtonsWrapper: {
    position: "relative",
    marginBottom: 24,
    paddingBottom: Platform.OS === "ios" ? 0 : 16,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    padding: 16,
    gap: 8,
  },
  scrollOverlay: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 40,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    zIndex: 1,
  },
  scrollIcon: {
    position: "absolute",
    right: 8,
    top: "50%",
    transform: [{ translateY: -12 }],
    opacity: 0.7,
    zIndex: 2,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 160,
  },
  actionButtonText: {
    color: "white",
    marginLeft: 4,
    fontSize: 14,
    fontWeight: "500",
  },
  disabledButton: {
    backgroundColor: "#999",
  },
  disabledButtonText: {
    color: "#fff",
  },
  productImage: {
    width: "100%",
    height: 180,
    borderRadius: 8,
    marginBottom: 12,
  },
  locationValue: {
    fontSize: 16,
    color: "#333",
    marginLeft: 12,
    flex: 1,
    flexWrap: "wrap",
  },
  chatDrawer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "70%",
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  chatHeaderTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  messageBubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  sentMessage: {
    backgroundColor: "#6B46C1",
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  receivedMessage: {
    backgroundColor: "#f0f0f0",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    color: "#333",
  },
  messageTime: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    alignSelf: "flex-end",
  },
  inputContainer: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    backgroundColor: "white",
  },
  messageInput: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
  },
  sendButton: {
    justifyContent: "center",
    alignItems: "center",
    width: 40,
    height: 40,
  },
  messageButton: {
    backgroundColor: "#6B46C1",
    marginRight: 8,
  },
  cancelButton: {
    backgroundColor: "#F44336",
  },
  confirmButton: {
    backgroundColor: "#4CAF50",
  },
  rejectButton: {
    backgroundColor: "#F44336",
  },
  completeButton: {
    backgroundColor: "#2196F3",
  },
  deleteButton: {
    backgroundColor: "#DC3545",
  },
  bottomSafeArea: {
    backgroundColor: "#f5f5f5",
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    width: "90%",
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  modalLabel: {
    fontSize: 16,
    color: "#666",
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
  },
  cancelModalButton: {
    backgroundColor: "#f0f0f0",
  },
  rejectModalButton: {
    backgroundColor: "#F44336",
  },
  modalButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
