import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { TouchableOpacity, Platform, View, Text, Image, StyleSheet, Alert } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 30, // Adjust as needed
    height: 30, // Adjust as needed
    marginRight: 8,
  },
  brandText: {
    fontSize: 18, // Adjust as needed
    fontWeight: 'bold',
    color: '#fff', // Ensure text is white
  },
  brandE: { color: '#fff' }, // Specific styles if needed, otherwise parent brandText covers it
  brandLite: { color: '#fff' },
  brandG: { color: '#fff' },
  brandLam: { color: '#fff' },
  iconButton: {
    padding: 10,
  },
});

const CustomHeaderTitle = () => {
  return (
    <View style={styles.headerContainer}>
      <View style={styles.headerLeft}>
        <Image 
          source={require('../../assets/images/logo.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.brandText}>
          <Text style={styles.brandE}>E</Text>
          <Text style={styles.brandLite}>lite</Text>
          <Text style={styles.brandG}>G</Text>
          <Text style={styles.brandLam}>lam</Text>
        </Text>
      </View>
      <TouchableOpacity 
        style={styles.iconButton}
        onPress={() => Alert.alert(
          'Coming Soon',
          'Notifications feature is under development. Stay tuned!',
          [{ text: 'OK' }]
        )}
      >
        <MaterialIcons name="notifications" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

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
              headerTitle: () => <CustomHeaderTitle />,
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