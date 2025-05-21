# Elite Glam Mobile App Documentation

## Overview
Elite Glam is a mobile application built with React Native and Expo, designed to provide a platform for fashion rental and sales. The app allows users to browse, rent, and purchase fashion items while providing store owners with tools to manage their inventory and bookings.

## Features

### User Features
- **Authentication**
  - User registration and login
  - Profile management
  - Photo upload and management
  - Secure token-based authentication

- **Product Browsing**
  - Browse products by categories
  - Search functionality
  - Product details view
  - Product ratings and reviews
  - Image gallery support

- **Booking System**
  - Product booking
  - Booking status tracking
  - Booking history
  - Booking management (cancel, reschedule)

- **Store Management**
  - Product listing
  - Inventory management
  - Order tracking
  - Sales analytics

### Technical Features
- Cross-platform support (iOS & Android)
- Offline capability
- Image caching
- Real-time updates
- Push notifications
- Secure data storage

## Technical Stack

### Frontend
- React Native
- Expo
- TypeScript
- React Navigation
- AsyncStorage
- Axios for API calls

### Backend Integration
- RESTful API integration
- Firebase Authentication
- ImageKit for image management

## Project Structure
```
elite-glam-frontend/
├── app/
│   ├── (auth)/           # Authentication screens
│   ├── (store)/          # Store management screens
│   ├── (tabs)/           # Main app tabs
│   └── _layout.tsx       # Root layout
├── assets/               # Static assets
├── components/           # Reusable components
├── config/              # Configuration files
├── services/            # API services
└── utils/               # Utility functions
```

## Setup and Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS development)
- Android Studio (for Android development)

### Installation Steps
1. Clone the repository
   ```bash
   git clone [repository-url]
   ```

2. Install dependencies
   ```bash
   cd elite-glam-frontend
   npm install
   ```

3. Set up environment variables
   - Create a `.env` file in the root directory
   - Add required environment variables:
     ```
     EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
     EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
     EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
     EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
     EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
     EXPO_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
     EXPO_PUBLIC_API_URL=your_api_url
     ```

4. Start the development server
   ```bash
   npm start
   ```

## API Integration

### Base URLs
- Development:
  - Android: `http://10.0.2.2:3001`
  - iOS: `http://localhost:3001`
  - Web: `http://localhost:3001`
- Production: `https://elite-glam-backend.onrender.com`

### Key Endpoints
- Authentication: `/auth/*`
- Products: `/products/*`
- Bookings: `/bookings/*`
- Ratings: `/ratings/*`

## Device Compatibility

### Supported Platforms
- iOS 13.0 and above
- Android 8.0 (API level 26) and above

### Screen Sizes
- Optimized for various screen sizes
- Supports both portrait and landscape orientations
- Adaptive layouts for different device types

## Performance Considerations
- Image optimization
- Lazy loading
- Caching strategies
- Network request optimization

## Security Features
- Secure token storage
- API request encryption
- Input validation
- Error handling

## Testing
- Unit tests
- Integration tests
- UI/UX testing
- Cross-platform testing

## Deployment
1. Build the app
   ```bash
   expo build:android  # For Android
   expo build:ios      # For iOS
   ```

2. Submit to app stores
   - Google Play Store
   - Apple App Store

## Contributing
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License
[Your License Information]

## Support
For support, email [support@eliteglam.com] or create an issue in the repository.
