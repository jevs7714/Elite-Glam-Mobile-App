import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

// List of services offered
const services = [
  {
    id: 1,
    name: 'Haircut & Styling',
    description: 'Professional haircut and styling service',
    duration: '1 hour',
    price: 50,
  },
  {
    id: 2,
    name: 'Hair Coloring',
    description: 'Full hair coloring service with premium products',
    duration: '2 hours',
    price: 80,
  },
  {
    id: 3,
    name: 'Hair Treatment',
    description: 'Deep conditioning and repair treatment',
    duration: '1.5 hours',
    price: 60,
  },
  {
    id: 4,
    name: 'Manicure',
    description: 'Basic manicure service',
    duration: '45 minutes',
    price: 30,
  },
  {
    id: 5,
    name: 'Pedicure',
    description: 'Basic pedicure service',
    duration: '1 hour',
    price: 40,
  },
  {
    id: 6,
    name: 'Facial',
    description: 'Basic facial treatment',
    duration: '1 hour',
    price: 50,
  },
];

export default function Services() {
  const handleBookService = (serviceId: number) => {
    router.push({
      pathname: '/appointments/new',
      params: { serviceId }
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="spa" size={32} color="#7E57C2" />
        <Text style={styles.title}>Our Services</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {services.map((service) => (
          <TouchableOpacity
            key={service.id}
            style={styles.serviceCard}
            onPress={() => handleBookService(service.id)}
          >
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName}>{service.name}</Text>
              <Text style={styles.serviceDescription}>{service.description}</Text>
              <View style={styles.serviceDetails}>
                <Text style={styles.serviceDuration}>
                  <MaterialIcons name="schedule" size={16} color="#666" /> {service.duration}
                </Text>
                <Text style={styles.servicePrice}>${service.price}</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#7E57C2" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  scrollView: {
    flex: 1,
    padding: 15,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  serviceDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  serviceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceDuration: {
    fontSize: 14,
    color: '#666',
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#7E57C2',
  },
}); 