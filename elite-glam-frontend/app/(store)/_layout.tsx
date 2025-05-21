import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface HeaderProps {
  navigation: {
    goBack: () => void;
  };
  route: {
    name: string;
  };
}

export default function StoreLayout() {
  const router = useRouter();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        header: ({ navigation, route }: HeaderProps) => (
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{route.name}</Text>
            <View style={styles.rightButton} />
          </View>
        ),
        headerStyle: {
          backgroundColor: '#fff',
        },
      }}
    >
      <Stack.Screen name="dashboard" options={{ title: 'Store Dashboard' }} />
      <Stack.Screen name="post-product" options={{ title: 'Post Product' }} />
      <Stack.Screen name="product-details" options={{ title: 'Product Details' }} />
      <Stack.Screen name="confirm-booking" options={{ title: 'Confirm Booking' }} />
      <Stack.Screen name="orders" options={{ title: 'My Orders' }} />
      <Stack.Screen name="manage-products" options={{ title: 'Manage Products' }} />
      <Stack.Screen name="booking-status" options={{ title: 'Booking Status' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  rightButton: {
    width: 40,
    height: 40,
  },
}); 