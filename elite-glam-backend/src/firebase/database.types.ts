// Define types for our database collections
export interface UserRecord {
  uid: string; // Firebase Auth UID
  username: string;
  email: string;
  role?: 'admin' | 'customer' | 'shop_owner'; // User role
  createdAt: Date;
  updatedAt: Date;
  shopName?: string; // Added for shop owners
  location?: string; // Added for shop owners
  profile?: {
    firstName?: string;
    lastName?: string;
    photoURL?: string;
    bio?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
      phoneNumber?: string;
    };
  };
}

// Type for creating a new user (includes password)
export interface CreateUserInput {
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'customer' | 'shop_owner'; // Add role here
  firstName?: string; // For customers
  lastName?: string; // For customers
  shopName?: string; // For shop owners
  location?: string; // For shop owners
}

// Type for user response (excludes sensitive data)
export interface UserResponse {
  uid: string;
  username: string;
  email: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    photoURL?: string;
  };
}

// Type for authentication response (includes custom token)
export interface AuthResponse extends UserRecord {
  customToken: string;
}
