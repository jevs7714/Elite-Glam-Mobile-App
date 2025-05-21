import Constants from 'expo-constants';
import { api } from './api';
import { API_URL, API_CONFIG } from '../config/api.config';

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  images?: string[];
  category: string;
  condition?: string;
  sellerMessage?: string;
  rating?: number;
  userId?: string;
  sellerName?: string;
  rentAvailable?: boolean;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
  sellerPhoto?: string;
  sellerAddress?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

export const productsService = {
  async getAllProducts(userId?: string, page: number = 1, limit: number = 4): Promise<Product[]> {
    console.log('Fetching all products...'); // Debug log
    try {
      const url = `/products?userId=${userId}&page=${page}&limit=${limit}`;
      const response = await api.get(url);
      console.log('Response status:', response.status); // Debug log
      console.log('Fetched products:', response.data); // Debug log
      return response.data;
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  },

  async getProductsByPage(page: number, limit: number, category?: string): Promise<Product[]> {
    console.log(`Fetching products page ${page} with limit ${limit}${category ? ` for category ${category}` : ''}`); // Debug log
    try {
      let url = `/products?page=${page}&limit=${limit}`;
      if (category) {
        url += `&category=${category}`;
      }
      const response = await api.get(url);
      console.log('Response status:', response.status); // Debug log
      console.log('Fetched products:', response.data); // Debug log
      return response.data;
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  },

  async getProductById(id: string): Promise<Product> {
    console.log(`Fetching product with ID: ${id}`); // Debug log
    try {
      const response = await api.get(`/products/${id}`);
      console.log('Response status:', response.status); // Debug log
      console.log('Fetched product:', response.data); // Debug log
      return response.data;
    } catch (error) {
      console.error(`Error fetching product with ID ${id}:`, error);
      throw error;
    }
  },

  async createProduct(productData: FormData): Promise<Product> {
    console.log('Creating product with data:', productData); // Debug log
    try {
      const response = await api.post('/products', productData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log('Create response status:', response.status); // Debug log
      console.log('Created product:', response.data); // Debug log
      return response.data;
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  },

  async getUserProducts() {
    const response = await api.get('/products/user');
    return response.data;
  },

  async updateProduct(id: string, productData: Partial<Product>) {
    const response = await api.put(`/products/${id}`, productData);
    return response.data;
  },

  async deleteProduct(id: string) {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  },

  async searchProducts(query: string) {
    const response = await api.get(`/products/search?q=${encodeURIComponent(query)}`);
    return response.data;
  },

  async getProductsByCategory(category: string) {
    const response = await api.get(`/products/category/${category}`);
    return response.data;
  }
}; 