import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { v4 as uuidv4 } from 'uuid';
import { Timestamp } from 'firebase-admin/firestore';

export interface Notification {
  id: string;
  userId: string; // The user who will receive the notification
  title: string;
  message: string;
  type:
    | 'booking_accepted'
    | 'booking_rejected'
    | 'new_booking'
    | 'booking_cancelled'
    | 'booking_completed';
  isRead: boolean;
  relatedBookingId?: string;
  relatedProductId?: string;
  createdAt: Date;
  updatedAt: Date;
  data?: any; // Additional data for the notification
}

interface NotificationData {
  userId: string;
  title: string;
  message: string;
  type:
    | 'booking_accepted'
    | 'booking_rejected'
    | 'new_booking'
    | 'booking_cancelled'
    | 'booking_completed';
  isRead: boolean;
  relatedBookingId?: string;
  relatedProductId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  data?: any;
}

@Injectable()
export class NotificationsService {
  private readonly collection = 'notifications';

  constructor(private readonly firebaseService: FirebaseService) {}

  async createNotification(
    userId: string,
    title: string,
    message: string,
    type: Notification['type'],
    relatedBookingId?: string,
    relatedProductId?: string,
    additionalData?: any,
  ): Promise<Notification> {
    try {
      const id = uuidv4();
      const now = new Date();

      // Create notification object, excluding undefined values
      const notification: any = {
        id,
        userId,
        title,
        message,
        type,
        isRead: false,
        createdAt: now,
        updatedAt: now,
      };

      // Only add optional fields if they have values
      if (relatedBookingId !== undefined) {
        notification.relatedBookingId = relatedBookingId;
      }
      if (relatedProductId !== undefined) {
        notification.relatedProductId = relatedProductId;
      }
      if (additionalData !== undefined) {
        notification.data = additionalData;
      }

      console.log('Creating notification:', {
        id,
        userId,
        type,
        title,
      });

      await this.firebaseService.addDocument(this.collection, notification);
      return notification as Notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw new InternalServerErrorException('Failed to create notification');
    }
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    try {
      console.log(`Fetching notifications for user: ${userId}`);
      const notificationsRef = await this.firebaseService.getCollection(
        this.collection,
      );

      const snapshot = await notificationsRef
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(50) // Limit to last 50 notifications
        .get();

      const notifications = snapshot.docs.map((doc) => {
        const data = doc.data() as NotificationData;
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
        } as Notification;
      });

      console.log(
        `Found ${notifications.length} notifications for user: ${userId}`,
      );
      return notifications;
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      throw new InternalServerErrorException('Failed to fetch notifications');
    }
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      const doc = await this.firebaseService.getDocument(
        this.collection,
        notificationId,
      );
      const data = await doc.get();

      if (!data.exists) {
        throw new Error(`Notification with ID ${notificationId} not found`);
      }

      const notificationData = data.data() as NotificationData;
      if (notificationData.userId !== userId) {
        throw new Error(
          'You do not have permission to update this notification',
        );
      }

      await this.firebaseService.updateDocument(
        this.collection,
        notificationId,
        {
          isRead: true,
          updatedAt: new Date(),
        },
      );

      console.log(
        `Marked notification ${notificationId} as read for user ${userId}`,
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw new InternalServerErrorException(
        'Failed to mark notification as read',
      );
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    try {
      const notificationsRef = await this.firebaseService.getCollection(
        this.collection,
      );

      const snapshot = await notificationsRef
        .where('userId', '==', userId)
        .where('isRead', '==', false)
        .get();

      const batch = this.firebaseService.db.batch();

      snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, {
          isRead: true,
          updatedAt: new Date(),
        });
      });

      await batch.commit();
      console.log(`Marked all notifications as read for user ${userId}`);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw new InternalServerErrorException(
        'Failed to mark all notifications as read',
      );
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    try {
      const notificationsRef = await this.firebaseService.getCollection(
        this.collection,
      );

      const snapshot = await notificationsRef
        .where('userId', '==', userId)
        .where('isRead', '==', false)
        .get();

      return snapshot.size;
    } catch (error) {
      console.error('Error getting unread count:', error);
      throw new InternalServerErrorException('Failed to get unread count');
    }
  }

  // Notification creation helpers for specific booking events
  async notifyBookingAccepted(
    customerId: string,
    bookingId: string,
    serviceName: string,
    productId: string, // Added productId
  ): Promise<void> {
    await this.createNotification(
      customerId,
      'Booking Confirmed! 🎉',
      `Your booking for "${serviceName}" has been accepted by the seller.`,
      'booking_accepted',
      bookingId,
      productId, // Pass productId here
    );
  }

  async notifyBookingRejected(
    customerId: string,
    bookingId: string,
    serviceName: string,
    reason?: string,
    productId?: string,
  ): Promise<void> {
    const message = reason
      ? `Your booking for "${serviceName}" was declined. Reason: ${reason}`
      : `Your booking for "${serviceName}" was declined by the seller.`;

    await this.createNotification(
      customerId,
      'Booking Declined',
      message,
      'booking_rejected',
      bookingId,
      productId,
    );
  }

  async notifyNewBooking(
    sellerId: string,
    bookingId: string,
    serviceName: string,
    customerName: string,
    productId?: string,
  ): Promise<void> {
    await this.createNotification(
      sellerId,
      'New Booking Request! 📅',
      `${customerName} wants to rent your "${serviceName}". Please review and respond.`,
      'new_booking',
      bookingId,
      productId,
    );
  }

  async notifyBookingCancelled(
    sellerId: string,
    bookingId: string,
    serviceName: string,
    customerName: string,
    productId?: string,
  ): Promise<void> {
    await this.createNotification(
      sellerId,
      'Booking Cancelled',
      `${customerName} has cancelled their booking for "${serviceName}".`,
      'booking_cancelled',
      bookingId,
      productId,
    );
  }

  async notifyBookingCompleted(
    customerId: string,
    bookingId: string,
    serviceName: string,
    productId?: string,
  ): Promise<void> {
    await this.createNotification(
      customerId,
      'Order Completed! ✅',
      `Your order for "${serviceName}" has been completed successfully. The rented items have been returned and are now available in inventory. Thank you for choosing Elite Glam!`,
      'booking_completed',
      bookingId,
      productId,
    );
  }
}
