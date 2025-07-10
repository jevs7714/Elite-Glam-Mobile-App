import { Stack, useRouter, useSegments } from "expo-router";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LoadingScreen from "../components/LoadingScreen"; // Import the new loading screen
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

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
        const token = await AsyncStorage.getItem("userToken"); // Replace 'userToken' with your actual token key
        const currentSegment = segments[0] || "";

        if (token) {
          // User is authenticated
          if (currentSegment === "(auth)") {
            // If authenticated user is on an auth screen (e.g., login/register after token is set),
            // redirect to main app content.
            navRouter.replace("/(tabs)");
          }
          // Otherwise, allow navigation to other authenticated routes like (store) or (tabs) itself.
        } else {
          // User is not authenticated
          if (currentSegment !== "(auth)") {
            // If unauthenticated user is NOT on an auth screen, redirect to login.
            navRouter.replace("/(auth)/login"); // Ensure this is your login screen path
          }
          // Otherwise, if unauthenticated user IS on an auth screen (login/register), allow them to stay.
        }
      } catch (e) {
        console.error("Failed to check auth status:", e);
        // Fallback to auth screen on error
        const currentSegmentOnError = segments[0] || "";
        if (currentSegmentOnError !== "(auth)") {
          navRouter.replace("/(auth)/login");
        }
      } finally {
        setAuthChecked(true);
      }
    };

    if (fontsLoaded) {
      checkAuthStatus();
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
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(store)" options={{ headerShown: false }} />
        </Stack>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
