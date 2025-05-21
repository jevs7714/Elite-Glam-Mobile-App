import { api } from './api';

export interface Rating {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RatingInput {
  productId: string;
  rating: number;
  comment?: string;
}

export const ratingsService = {
  async createRating(ratingData: {
    productId: string;
    rating: number;
    comment?: string;
  }): Promise<{ data: Rating }> {
    try {
      const response = await api.post('/ratings', ratingData);
      return response;
    } catch (error) {
      console.error('Error creating rating:', error);
      throw error;
    }
  },

  async getProductRatings(productId: string): Promise<Rating[]> {
    try {
      const response = await api.get(`/ratings/product/${productId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching product ratings:', error);
      // Check if this is an index creation error
      if (error.response?.data?.message?.startsWith('INDEX_REQUIRED:')) {
        const indexLink = error.response.data.message.split(':')[1];
        console.log('Required index creation link:', indexLink);
        console.log('Please create the index using the link above');
        // You can also show this to the user in the UI if needed
        throw new Error(`Please create the required index using this link: ${indexLink}`);
      }
      throw error;
    }
  },

  async getProductAverageRating(productId: string): Promise<number> {
    try {
      const response = await api.get(`/ratings/product/${productId}/average`);
      return response.data.average;
    } catch (error) {
      console.error('Error fetching average rating:', error);
      throw error;
    }
  },

  async updateRating(id: string, ratingData: Partial<RatingInput>) {
    const response = await api.put(`/ratings/${id}`, ratingData);
    return response.data;
  },

  async deleteRating(id: string) {
    const response = await api.delete(`/ratings/${id}`);
    return response.data;
  }
}; 