import { Stack, useRouter, useSegments } from "expo-router";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from 'expo-font';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoadingScreen from '../components/LoadingScreen'; // Import the new loading screen

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    // Add any custom fonts here
  });
  const [authChecked, setAuthChecked] = useState(false);
  const navRouter = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken'); // Replace 'userToken' with your actual token key
        if (token) {
          // User is authenticated, navigate to main app content
          if (segments[0] !== '(tabs)') { // Avoid navigation loop if already in tabs
            navRouter.replace('/(tabs)');
          }
        } else {
          // User is not authenticated, navigate to login
          if (segments[0] !== '(auth)') { // Avoid navigation loop if already in auth
            navRouter.replace('/(auth)/login'); // Ensure this is your login screen path
          }
        }
      } catch (e) {
        console.error("Failed to check auth status:", e);
        // Fallback to auth screen on error
        if (segments[0] !== '(auth)') {
          navRouter.replace('/(auth)/login');
        }
      } finally {
        setAuthChecked(true);
      }
    };

    if (fontsLoaded) { // Check auth only after fonts are attempted to load or loaded
      checkAuthStatus();
    } else {
      // If fonts are not even attempted, we might delay auth check or handle differently
      // For now, this implies checkAuthStatus will run once fontsLoaded becomes true via the other useEffect
    }
  }, [fontsLoaded, navRouter, segments]); // Rerun if fontsLoaded changes, or router/segments instances change

  useEffect(() => {
    if (fontsLoaded && authChecked) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, authChecked]);

  if (!fontsLoaded || !authChecked) {
    return <LoadingScreen />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(store)" options={{ headerShown: false }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
