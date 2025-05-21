import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import React, { useState } from 'react';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

const services = [
  { id: 1, name: 'Haircut & Styling', duration: '60 min', price: '$50' },
  { id: 2, name: 'Manicure', duration: '45 min', price: '$35' },
  { id: 3, name: 'Pedicure', duration: '45 min', price: '$40' },
  { id: 4, name: 'Facial Treatment', duration: '60 min', price: '$75' },
  { id: 5, name: 'Hair Coloring', duration: '120 min', price: '$120' },
];

export default function NewAppointmentScreen() {
  const [selectedService, setSelectedService] = useState<number | null>(null);

  const handleServiceSelect = (serviceId: number) => {
    setSelectedService(serviceId);
  };

  const handleContinue = () => {
    if (selectedService) {
      router.push({
        pathname: '/appointments/datetime',
        params: { serviceId: selectedService }
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book Appointment</Text>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>Select a Service</Text>
        
        {services.map((service) => (
          <TouchableOpacity
            key={service.id}
            style={[
              styles.serviceCard,
              selectedService === service.id && styles.selectedCard
            ]}
            onPress={() => handleServiceSelect(service.id)}
          >
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName}>{service.name}</Text>
              <Text style={styles.serviceDetails}>
                {service.duration} • {service.price}
              </Text>
            </View>
            {selectedService === service.id && (
              <MaterialIcons name="check-circle" size={24} color="#7E57C2" />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            !selectedService && styles.continueButtonDisabled
          ]}
          onPress={handleContinue}
          disabled={!selectedService}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#7E57C2',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  serviceCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedCard: {
    borderColor: '#7E57C2',
    borderWidth: 2,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  serviceDetails: {
    fontSize: 14,
    color: '#666',
  },
  footer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  continueButton: {
    backgroundColor: '#7E57C2',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 