import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { api } from './api';

export type BookingStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed';

export interface Rating {
  rating: number;
  comment?: string;
}

export interface Booking {
  id: string;
  customerName: string;
  serviceName: string;
  productId?: string;
  date: string;
  time: string;
  status: BookingStatus;
  price: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  uid: string;        // ID of the customer who made the booking
  ownerUid: string;   // ID of the seller who owns the product
  ownerUsername: string;  // Username of the seller
  sellerLocation?: string;
  productImage?: string;
  eventTimePeriod?: string;
  eventType?: string;
  fittingTime?: string;
  fittingTimePeriod?: string;
  eventLocation?: string;
  rating?: Rating;
  rejectionMessage?: string;
  quantity?: number;  // Number of items being rented
  includeMakeup?: boolean;
  selectedSize?: string; // Selected size for the product
}

const checkAuth = async () => {
  const token = await AsyncStorage.getItem('userToken');
  if (!token) {
    throw new Error('No authentication token found');
  }
  
  // Validate token format
  if (token.split('.').length !== 3) {
    console.warn('Invalid token format detected in checkAuth');
    await AsyncStorage.removeItem('userToken');
    throw new Error('Invalid token format');
  }

  // Return clean token
  return token.replace('Bearer ', '');
};

export const bookingService = {
  async getAllBookings(): Promise<Booking[]> {
    try {
      const token = await checkAuth();
      
      // Get user data from AsyncStorage
      const userDataStr = await AsyncStorage.getItem('userData');
      if (!userDataStr) {
        throw new Error('No user data found');
      }
      
      const userData = JSON.parse(userDataStr);
      
      // Get bookings for the current user only
      const response = await api.get(`/bookings/user/${userData.uid}`);
        return response.data;
    } catch (error) {
      console.error('Error fetching bookings:', error);
      throw error;
    }
  },

  async getSellerBookings(): Promise<Booking[]> {
    try {
      const token = await checkAuth();
          
      // Get user data from AsyncStorage
      const userDataStr = await AsyncStorage.getItem('userData');
      if (!userDataStr) {
        console.error('No user data found in AsyncStorage');
        throw new Error('No user data found');
      }
      
      const userData = JSON.parse(userDataStr);
      console.log('Fetching seller bookings for user:', {
        uid: userData.uid,
        username: userData.username
      });

      if (!userData.uid) {
        console.error('User ID not found in user data:', userData);
        throw new Error('User ID not found in user data');
      }

      // Get bookings where the user is the seller
      const response = await api.get(`/bookings/seller/${userData.uid}`);
      console.log('Seller bookings response:', {
        status: response.status,
        dataLength: Array.isArray(response.data) ? response.data.length : 'not an array',
        data: response.data
      });

      if (!response.data || !Array.isArray(response.data)) {
        console.error('Invalid response format:', response.data);
        return [];
      }

      return response.data;
    } catch (error) {
      console.error('Error fetching seller bookings:', error);
      throw error;
    }
  },

  async getBookingById(id: string): Promise<Booking> {
    try {
      await checkAuth();
      const response = await api.get(`/bookings/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching booking details:', error);
      throw error;
    }
  },

  async updateBookingStatus(bookingId: string, status: BookingStatus, message?: string): Promise<void> {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) throw new Error('No token found');

      await api.patch(`/bookings/${bookingId}/status`, { status, message }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    } catch (error) {
      console.error('Error updating booking status:', error);
      throw error;
    }
  },

  async createBooking(bookingData: Omit<Booking, 'id'>): Promise<Booking> {
    try {
      const token = await checkAuth();
      
      // Get user data from AsyncStorage
      const userDataStr = await AsyncStorage.getItem('userData');
      if (!userDataStr) {
        throw new Error('No user data found');
      }
      
      const userData = JSON.parse(userDataStr);
      
      // Get the seller's UID using their username
      const sellerResponse = await api.get(`/users/username/${bookingData.ownerUsername}`);
      const sellerData = sellerResponse.data;
      
      if (!sellerData || !sellerData.uid) {
        throw new Error('Seller data not found');
      }

      console.log('Creating booking with data:', {
        customerUid: userData.uid,
        ownerUid: sellerData.uid,
        sellerUsername: bookingData.ownerUsername
      });

      // Ensure we have the customer's uid
      if (!userData.uid) {
        throw new Error('User ID not found');
      }

      // Create the booking with both uid and ownerUid
      const bookingWithIds = {
        ...bookingData,
        uid: userData.uid,  // Customer's Firebase UID
        ownerUid: sellerData.uid,  // Seller's Firebase UID
      };

      // Remove any old fields that might cause issues
      delete (bookingWithIds as any).userId;

      console.log('Creating booking with data:', bookingWithIds);
      const response = await api.post('/bookings', bookingWithIds);
      return response.data;
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  },

  async cancelBooking(id: string): Promise<Booking> {
    try {
      await checkAuth();
      const response = await api.post(`/bookings/${id}/cancel`);
      return response.data;
    } catch (error) {
      console.error('Error cancelling booking:', error);
      throw error;
    }
  },

  async getMyBookings(): Promise<Booking[]> {
    try {
      // Check authentication first
      const token = await checkAuth();
      
      console.log('Fetching my bookings from:', `${api.defaults.baseURL}/bookings?uid=me`);
      console.log('Request headers:', {
        ...api.defaults.headers,
        Authorization: `Bearer ${token}`
      });
      
      // Use query parameter approach instead of path parameter
      const response = await api.get('/bookings?uid=me');
      
      console.log('My bookings response:', {
        status: response.status,
        statusText: response.statusText,
        dataLength: Array.isArray(response.data) ? response.data.length : 'not an array'
      });
      
      if (!Array.isArray(response.data)) {
        throw new Error('Invalid response format: expected array of bookings');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching my bookings:', error);
      throw error;
    }
  },

  async deleteBooking(id: string): Promise<void> {
    try {
      await checkAuth();
      await api.delete(`/bookings/${id}`);
    } catch (error) {
      console.error('Error deleting booking:', error);
      throw error;
    }
  },

  async submitRating(id: string, ratingData: Rating): Promise<Booking> {
    try {
      await checkAuth();
      const response = await api.post(`/bookings/${id}/rate`, ratingData);
      return response.data;
    } catch (error) {
      console.error('Error submitting rating:', error);
      throw error;
    }
  }
}; 