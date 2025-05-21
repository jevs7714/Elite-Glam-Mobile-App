import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { bookingService, Booking } from '../../services/booking.service';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STATUS_COLORS = {
  pending: '#FFA500',
  confirmed: '#4CAF50',
  rejected: '#F44336',
  cancelled: '#F44336',
  completed: '#2196F3'
} as const;

const STATUS_ICONS = {
  pending: 'schedule' as const,
  confirmed: 'check-circle' as const,
  rejected: 'close' as const,
  cancelled: 'cancel' as const,
  completed: 'done-all' as const
} as const;

export default function BookingDetailsScreen() {
  const { id } = useLocalSearchParams();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{
    id: string;
    text: string;
    sender: string;
    receiver: string;
    timestamp: string;
    bookingId: string;
  }>>([]);
  const [currentUser, setCurrentUser] = useState<string>('');

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          const { username } = JSON.parse(userData);
          setCurrentUser(username);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
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
      console.log('Fetched booking data:', {
        status: data.status,
        rejectionMessage: data.rejectionMessage,
        fullData: data
      });
      
      if (data.status === 'cancelled') {
        Alert.alert(
          'Booking Cancelled',
          'This booking has been cancelled and is no longer available.',
          [
            { 
              text: 'OK', 
              onPress: () => router.back() 
            }
          ]
        );
        return;
      }
      
      setBooking(data);
    } catch (error: any) {
      console.error('Error fetching booking details:', error);
      Alert.alert(
        'Error',
        'Failed to load booking details. Please try again later.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!booking) return;
    
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel and delete this booking? This action cannot be undone.',
      [
        { 
          text: 'No, Keep Booking',
          style: 'cancel'
        },
        { 
          text: 'Yes, Cancel & Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              await bookingService.cancelBooking(booking.id);
              await bookingService.deleteBooking(booking.id);
              Alert.alert(
                'Success',
                'The booking has been cancelled and deleted successfully.',
                [
                  { 
                    text: 'OK', 
                    onPress: () => router.back() 
                  }
                ]
              );
            } catch (error: any) {
              console.error('Error cancelling booking:', error);
              let errorMessage = 'Failed to cancel booking. Please try again later.';
              
              if (error.response?.status === 404) {
                errorMessage = 'Booking not found. It may have been already deleted.';
              } else if (error.response?.status === 403) {
                errorMessage = 'You do not have permission to cancel this booking.';
              }
              
              Alert.alert('Error', errorMessage);
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleConfirmBooking = async () => {
    if (!booking) return;
    
    try {
      setActionLoading(true);
      await bookingService.updateBookingStatus(booking.id, 'confirmed');
      Alert.alert('Success', 'Booking has been confirmed successfully');
      fetchBookingDetails(); // Refresh booking details
    } catch (error: any) {
      console.error('Error confirming booking:', error);
      Alert.alert('Error', 'Failed to confirm booking. Please try again later.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectBooking = async () => {
    if (!booking) return;
    
    try {
      setActionLoading(true);
      await bookingService.updateBookingStatus(booking.id, 'rejected');
      Alert.alert('Success', 'Booking has been rejected');
      fetchBookingDetails(); // Refresh booking details
    } catch (error: any) {
      console.error('Error rejecting booking:', error);
      Alert.alert('Error', 'Failed to reject booking. Please try again later.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (message.trim() === '' || !booking || !booking.ownerUsername) return;

    const newMessage = {
      id: Date.now().toString(),
      text: message.trim(),
      sender: currentUser,
      receiver: booking.ownerUsername,
      timestamp: new Date().toISOString(),
      bookingId: booking.id,
    };

    try {
      // Here you would typically send the message to your backend
      // await messageService.sendMessage(newMessage);
      
      setMessages(prev => [...prev, newMessage]);
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  const handleMessageButtonPress = () => {
    Alert.alert(
      'Coming Soon',
      'The messaging feature is currently under development. Please check back later!',
      [{ text: 'OK' }]
    );
  };

  const handleSubmitRating = async () => {
    if (!booking || rating === 0) return;
    
    try {
      setActionLoading(true);
      await bookingService.submitRating(booking.id, {
        rating,
        comment: comment.trim(),
      });
      Alert.alert('Success', 'Thank you for your rating!');
      setIsRatingOpen(false);
      setRating(0);
      setComment('');
      fetchBookingDetails();
    } catch (error: any) {
      console.error('Error submitting rating:', error);
      Alert.alert('Error', 'Failed to submit rating. Please try again later.');
    } finally {
      setActionLoading(false);
    }
  };

  const renderChatDrawer = () => {
    if (!isChatOpen || !booking) return null;

    return (
      <View style={styles.chatDrawer}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatHeaderTitle}>Chat with {booking.ownerUsername}</Text>
          <TouchableOpacity onPress={() => setIsChatOpen(false)}>
            <MaterialIcons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.messagesContainer}>
          {messages.map(msg => (
            <View
              key={msg.id}
              style={[
                styles.messageBubble,
                msg.sender === currentUser ? styles.sentMessage : styles.receivedMessage,
              ]}
            >
              <Text style={[
                styles.messageText,
                msg.sender === currentUser ? styles.sentMessageText : styles.receivedMessageText
              ]}>
                {msg.text}
              </Text>
              <Text style={[
                styles.messageTime,
                msg.sender === currentUser ? styles.sentMessageTime : styles.receivedMessageTime
              ]}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          ))}
        </ScrollView>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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

  const renderRatingDrawer = () => {
    if (!isRatingOpen) return null;

    return (
      <View style={styles.drawerContainer}>
        <View style={styles.drawerContent}>
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerTitle}>Rate Your Experience</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsRatingOpen(false)}
            >
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.ratingContainer}>
            <Text style={styles.ratingLabel}>Your Rating</Text>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  style={styles.starButton}
                >
                  <MaterialIcons
                    name={star <= rating ? "star" : "star-border"}
                    size={32}
                    color="#FFD700"
                  />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.ratingValue}>{rating.toFixed(1)}</Text>
          </View>

          <View style={styles.commentContainer}>
            <Text style={styles.commentLabel}>Your Comment (Optional)</Text>
            <TextInput
              style={styles.commentInput}
              multiline
              numberOfLines={4}
              placeholder="Share your experience..."
              value={comment}
              onChangeText={setComment}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, rating === 0 && styles.submitButtonDisabled]}
            onPress={handleSubmitRating}
            disabled={rating === 0 || actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Rating</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6B4EFF" />
        <Text style={styles.loadingText}>Loading booking details...</Text>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Booking not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Determine which action buttons to show based on booking status
  const renderActionButtons = () => {
    if (booking.status === 'cancelled') {
      return null;
    }

    if (booking.status === 'rejected') {
      return (
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.disabledButton]}
            disabled={true}
          >
            <MaterialIcons name="close" size={20} color="#999" />
            <Text style={styles.disabledButtonText}>Booking Rejected</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={handleCancelBooking}
            disabled={actionLoading}
          >
            <MaterialIcons name="cancel" size={20} color="white" />
            <Text style={styles.actionButtonText}>Cancel Booking</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // If the booking is pending, show cancel button
    if (booking.status === 'pending') {
    return (
      <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={handleCancelBooking}
            disabled={actionLoading}
          >
            <MaterialIcons name="cancel" size={20} color="white" />
            <Text style={styles.actionButtonText}>Cancel Booking</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // If the booking is confirmed, show message, rate and cancel options
    if (booking.status === 'confirmed') {
      return (
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.messageButton]}
            onPress={handleMessageButtonPress}
          >
            <MaterialIcons name="chat" size={20} color="white" />
            <Text style={styles.actionButtonText}>Message Seller</Text>
          </TouchableOpacity>

          {booking.productId ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.rateButton]}
            onPress={() => {
              router.push({
                pathname: '/(store)/product-details',
                params: { 
                  id: booking.productId,
                  fromBooking: 'true'
                }
              });
            }}
          >
            <MaterialIcons name="star" size={20} color="white" />
            <Text style={styles.actionButtonText}>Rate Service</Text>
          </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, styles.disabledButton]}
              disabled={true}
            >
              <MaterialIcons name="star" size={20} color="#999" />
              <Text style={styles.disabledButtonText}>Product Unavailable</Text>
            </TouchableOpacity>
          )}
        
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={handleCancelBooking}
            disabled={actionLoading}
          >
            <MaterialIcons name="cancel" size={20} color="white" />
            <Text style={styles.actionButtonText}>Cancel Booking</Text>
          </TouchableOpacity>
      </View>
    );
    }

    // For any other status, show cancel button
    return (
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.cancelButton]}
          onPress={handleCancelBooking}
          disabled={actionLoading}
        >
          <MaterialIcons name="cancel" size={20} color="white" />
          <Text style={styles.actionButtonText}>Cancel Booking</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={{
          paddingBottom: Platform.OS === 'ios' ? 100 : 80
        }}
      >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#333" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Booking Details</Text>
      </View>

      <View style={styles.statusContainer}>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[booking.status] }]}>
          <MaterialIcons
            name={STATUS_ICONS[booking.status]}
            size={20}
            color="white"
          />
          <Text style={styles.statusText}>
            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
          </Text>
        </View>
        {booking.status === 'rejected' && (
          <View style={styles.rejectionMessageContainer}>
            <MaterialIcons name="info" size={20} color="#F44336" />
            <Text style={styles.rejectionMessageText}>
              {booking.rejectionMessage ? `Rejection Reason: ${booking.rejectionMessage}` : 'This booking has been rejected by the seller.'}
            </Text>
          </View>
        )}
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
          <Text style={styles.infoText}>{booking.date}</Text>
        </View>
        <View style={styles.infoRow}>
          <MaterialIcons name="access-time" size={20} color="#666" />
            <Text style={styles.infoLabel}>Event Time:</Text>
            <Text style={styles.infoText}>{booking.time}{booking.eventTimePeriod ? ` ${booking.eventTimePeriod}` : ''}</Text>
        </View>
          {booking.eventType && (
            <View style={styles.infoRow}>
              <MaterialIcons name="celebration" size={20} color="#666" />
              <Text style={styles.infoLabel}>Event Type:</Text>
              <Text style={styles.infoText}>{booking.eventType}</Text>
            </View>
          )}
          {booking.fittingTime && (
            <View style={styles.infoRow}>
              <MaterialIcons name="watch-later" size={20} color="#666" />
              <Text style={styles.infoLabel}>Arrival Time:</Text>
              <Text style={styles.infoText}>{booking.fittingTime}{booking.fittingTimePeriod ? ` ${booking.fittingTimePeriod}` : ''}</Text>
            </View>
          )}
          {booking.eventLocation && (
            <View style={styles.infoRow}>
              <MaterialIcons name="location-on" size={20} color="#666" />
              <Text style={styles.infoLabel}>Event Location:</Text>
              <Text style={styles.infoText}>{booking.eventLocation}</Text>
            </View>
          )}
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
            <Text style={{ color: '#F44336', fontWeight: 'bold', marginBottom: 12 }}>Product Deleted</Text>
          )}
        <View style={styles.infoRow}>
          <MaterialIcons name="spa" size={20} color="#666" />
            <Text style={styles.infoLabel}>Service:</Text>
            <Text style={styles.infoText}>{booking.serviceName || 'Product Deleted'}</Text>
        </View>
        <View style={styles.infoRow}>
          <MaterialIcons name="tag" size={20} color="#666" />
            <Text style={styles.infoLabel}>Product ID:</Text>
            <Text style={styles.infoText}>{booking.productId || 'Not available'}</Text>
        </View>
            <View style={styles.infoRow}>
              <MaterialIcons name="person" size={20} color="#666" />
            <Text style={styles.infoLabel}>Owner:</Text>
            <Text style={styles.infoText}>{booking.ownerUsername || 'Unknown'}</Text>
            </View>
        <View style={styles.infoRow}>
          <MaterialIcons name="attach-money" size={20} color="#666" />
            <Text style={styles.infoLabel}>Price:</Text>
          <Text style={styles.infoText}>${booking.price}</Text>
        </View>
          {booking.sellerLocation && (
            <View style={styles.infoRow}>
              <MaterialIcons name="store" size={20} color="#666" />
              <Text style={styles.infoLabel}>Product Owner Location:</Text>
            </View>
          )}
          {booking.sellerLocation && (
            <View style={styles.infoRow}>
              <Text style={styles.locationValue}>{booking.sellerLocation}</Text>
            </View>
          )}
      </View>

      {booking.notes && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Additional Notes</Text>
          <View style={styles.notesContainer}>
            <MaterialIcons name="notes" size={20} color="#666" />
            <Text style={styles.notesText}>{booking.notes}</Text>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      {renderActionButtons()}
    </ScrollView>
      {renderChatDrawer()}
      {renderRatingDrawer()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statusContainer: {
    padding: 16,
    backgroundColor: 'white',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
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
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    flex: 1,
    flexWrap: 'wrap',
  },
  infoLabel: {
    fontSize: 15,
    color: '#888',
    marginLeft: 8,
    marginRight: 4,
    minWidth: 90,
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notesText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 16,
  },
  actionButtonsContainer: {
    padding: 16,
    marginBottom: Platform.OS === 'ios' ? 34 : 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  cancelButton: {
    backgroundColor: '#F44336',
  },
  disabledButton: {
    backgroundColor: '#E0E0E0',
  },
  disabledButtonText: {
    color: '#999',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  locationValue: {
    fontSize: 14,
    color: '#666',
    marginLeft: 36, // icon (20) + label margin (8) + label minWidth (90) / 2
    marginTop: -8,
    marginBottom: 8,
    flex: 1,
  },
  productImage: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    marginBottom: 12,
    backgroundColor: '#eee',
  },
  messageButton: {
    backgroundColor: '#6B46C1',
    marginRight: 8,
  },
  chatDrawer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  chatHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  sentMessage: {
    backgroundColor: '#6B46C1',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  receivedMessage: {
    backgroundColor: '#f0f0f0',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    color: '#333',
  },
  messageTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: 'white',
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
  },
  sendButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
  },
  sentMessageText: {
    color: 'white',
  },
  receivedMessageText: {
    color: '#333',
  },
  sentMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  receivedMessageTime: {
    color: '#666',
  },
  drawerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    height: '100%',
    justifyContent: 'flex-end',
  },
  drawerContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  ratingContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  ratingLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  starButton: {
    padding: 5,
  },
  ratingValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  commentContainer: {
    marginBottom: 20,
  },
  commentLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#7E57C2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  rateButton: {
    backgroundColor: '#FFD700',
  },
  rejectionMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    marginHorizontal: 16,
    width: '100%',
  },
  rejectionMessageText: {
    color: '#D32F2F',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
}); 