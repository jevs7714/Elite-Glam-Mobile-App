import { api } from "./api";

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type:
    | "booking_accepted"
    | "booking_rejected"
    | "new_booking"
    | "booking_cancelled";
  isRead: boolean;
  relatedBookingId?: string;
  relatedProductId?: string;
  createdAt: string;
  updatedAt: string;
  data?: any;
}

export interface NotificationResponse {
  count: number;
}

class NotificationsService {
  async getNotifications(): Promise<Notification[]> {
    try {
      const response = await api.get("/notifications");
      return response.data;
    } catch (error) {
      console.error("Error fetching notifications:", error);
      throw error;
    }
  }

  async getUnreadCount(): Promise<number> {
    try {
      const response = await api.get<NotificationResponse>(
        "/notifications/unread-count"
      );
      return response.data.count;
    } catch (error) {
      console.error("Error fetching unread count:", error);
      throw error;
    }
  }

  async markAsRead(notificationId: string): Promise<void> {
    try {
      await api.patch(`/notifications/${notificationId}/read`);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      throw error;
    }
  }

  async markAllAsRead(): Promise<void> {
    try {
      await api.patch("/notifications/mark-all-read");
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      throw error;
    }
  }
}

export const notificationsService = new NotificationsService();