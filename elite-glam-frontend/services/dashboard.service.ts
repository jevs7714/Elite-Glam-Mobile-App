import { api } from './api';

export interface DashboardStats {
  users: {
    total: number;
    adminCount: number;
    customerCount: number;
    shopOwnerCount: number;
  };
  products: {
    total: number;
  };
  bookings: {
    total: number;
    pending: number;
  };
}

export const dashboardService = {
  async getDashboardStats(token: string): Promise<DashboardStats> {
    const response = await api.get('/users/dashboard/stats', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },
};