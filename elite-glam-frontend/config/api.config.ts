import { Platform } from 'react-native';

type PlatformType = 'android' | 'ios' | 'web';

// API URLs for different environments
const API_URLS = {
  development: {
    android: 'http://10.0.2.2:3001',
    ios: 'http://localhost:3001',
    web: 'http://localhost:3001',
  },
  production: {
    android: 'https://elite-glam-mobile-app.onrender.com',
    ios: 'https://elite-glam-mobile-app.onrender.com',
    web: 'https://elite-glam-mobile-app.onrender.com',
  },
};

// Get the current environment
const ENV = __DEV__ ? 'development' : 'production';

// Get the current platform and ensure it's one of our supported platforms
const PLATFORM = (Platform.OS === 'android' || Platform.OS === 'ios' || Platform.OS === 'web') 
  ? Platform.OS 
  : 'web';

// Export the API URL based on environment and platform
export const API_URL = API_URLS[ENV][PLATFORM as PlatformType];

// Export other API-related configurations
export const API_CONFIG = {
  baseURL: API_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
}; 