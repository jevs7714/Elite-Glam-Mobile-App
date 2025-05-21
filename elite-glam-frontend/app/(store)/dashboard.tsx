import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, Platform, Dimensions } from 'react-native';
import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
          <Text style={styles.storeName}>Store Dashboard</Text>
        <Text style={styles.welcomeText}>Welcome to your store management</Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.addProductButton]}
            onPress={() => router.push('/(store)/post-product')}
          >
            <View style={[styles.actionIconContainer, styles.addProductIcon]}>
              <MaterialIcons name="add-box" size={32} color="#fff" />
            </View>
            <View style={styles.actionContent}>
              <Text style={[styles.actionText, styles.addProductText]}>Add Product</Text>
              <Text style={styles.actionDescription}>Create new product listings</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#2E7D32" style={styles.chevron} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.ordersButton]}
            onPress={() => router.push('/(store)/orders')}
          >
            <View style={[styles.actionIconContainer, styles.ordersIcon]}>
              <MaterialIcons name="list-alt" size={32} color="#fff" />
            </View>
            <View style={styles.actionContent}>
              <Text style={[styles.actionText, styles.ordersText]}>View Orders</Text>
              <Text style={styles.actionDescription}>Manage customer orders</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#1565C0" style={styles.chevron} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.manageButton]}
            onPress={() => router.push('/(store)/manage-products')}
          >
            <View style={[styles.actionIconContainer, styles.manageIcon]}>
              <MaterialIcons name="inventory" size={32} color="#fff" />
            </View>
            <View style={styles.actionContent}>
              <Text style={[styles.actionText, styles.manageText]}>Manage Products</Text>
              <Text style={styles.actionDescription}>Edit or remove products</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#7B1FA2" style={styles.chevron} />
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#7E57C2',
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  storeName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
  },
  welcomeText: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    marginTop: 4,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: -20,
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  actionGrid: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 12,
    color: '#666',
  },
  chevron: {
    marginLeft: 8,
  },
  addProductButton: {
    backgroundColor: '#E8F5E9',
  },
  addProductIcon: {
    backgroundColor: '#4CAF50',
  },
  addProductText: {
    color: '#2E7D32',
  },
  ordersButton: {
    backgroundColor: '#E3F2FD',
  },
  ordersIcon: {
    backgroundColor: '#2196F3',
  },
  ordersText: {
    color: '#1565C0',
  },
  manageButton: {
    backgroundColor: '#F3E5F5',
  },
  manageIcon: {
    backgroundColor: '#9C27B0',
  },
  manageText: {
    color: '#7B1FA2',
  },
}); 