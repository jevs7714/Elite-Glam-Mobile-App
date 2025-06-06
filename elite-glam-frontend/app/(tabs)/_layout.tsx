import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { TouchableOpacity, Platform } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

export default function TabsLayout() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['bottom', 'left', 'right']}>
        <Tabs
          screenOptions={{
            headerStyle: {
              backgroundColor: '#7E57C2',
            },
            headerTintColor: '#fff',
            tabBarActiveTintColor: '#7E57C2',
            tabBarInactiveTintColor: '#666',
            tabBarStyle: {
              height: 60,
              paddingBottom: Platform.OS === 'android' ? 24 : 16,
              paddingTop: 8,
              backgroundColor: '#fff',
              elevation: 20,
              zIndex: 100,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              borderTopWidth: 0.5,
              borderTopColor: '#eee',
            },
            tabBarLabelStyle: {
              fontSize: 12,
            },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: 'Home',
              tabBarIcon: ({ color, size }) => (
                <MaterialIcons name="home" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="rent-later"
            options={{
              title: 'Rent Later',
              headerTitle: 'Rent Later List',
              tabBarIcon: ({ color, size }) => (
                <MaterialIcons name="shopping-cart" size={size} color={color} />
              )
            }}
          />
          <Tabs.Screen
            name="search"
            options={{
              title: 'Search',
              tabBarIcon: ({ color, size }) => (
                <MaterialIcons name="search" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: 'Profile',
              tabBarIcon: ({ color, size }) => (
                <MaterialIcons name="person" size={size} color={color} />
              ),
            }}
          />
           <Tabs.Screen
        name="edit-profile"
        options={{
          title: 'Edit Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="edit" size={size} color={color} />
          ),
          href: null,
        }}
      />
      <Tabs.Screen
        name="choose-photo"
        options={{
          title: 'Choose Photo',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="photo-camera" size={size} color={color} />
          ),
          href: null,
        }}
      />
        </Tabs>
      </SafeAreaView>
    </SafeAreaProvider>
  );
} 