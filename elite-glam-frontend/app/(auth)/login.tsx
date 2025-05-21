import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native'
import React, { useState } from 'react'
import FormField from '../../components/FormField'
import { router, Href } from 'expo-router'
import { authService, api } from '../../services/api'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { MaterialIcons } from '@expo/vector-icons'

interface LoginData {
  email: string
  password: string
}

interface LoginErrors {
  email?: string
  password?: string
  submit?: string
}

interface UserData {
  uid: string
  username: string
  email: string
  profile: Record<string, any>
}

interface LoginResponse {
  user: UserData
  token: string
}

const Login = () => {
  const [formData, setFormData] = useState<LoginData>({
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState<LoginErrors>({})
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const validateForm = (): boolean => {
    const newErrors: LoginErrors = {}
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid'
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (field: keyof LoginData) => (text: string) => {
    setFormData(prev => ({ ...prev, [field]: text }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
    // Clear submit error when user starts typing
    if (errors.submit) {
      setErrors(prev => ({ ...prev, submit: undefined }))
    }
  }

  const createStore = async (userId: string, email: string) => {
    try {
      console.log('Creating store for user:', userId);
      const storeData = {
        name: 'My Store',
        description: 'Welcome to my store',
        userId: userId,
        address: '',
        phone: '',
        email: email,
      };
      
      const response = await api.post('/stores', storeData);
      console.log('Store created successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error creating store:', error);
      throw error;
    }
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsLoading(true)
    try {
      const response = await authService.login(formData.email, formData.password) as LoginResponse
      
      // Ensure user data includes uid and all necessary fields
      const userData: UserData = {
        uid: response.user.uid,
        username: response.user.username,
        email: response.user.email,
        profile: response.user.profile || {},
      };
      
      // Store the token and user data
      await AsyncStorage.setItem('userToken', response.token)
      await AsyncStorage.setItem('userData', JSON.stringify(userData))
      
      // Redirect to home
      router.replace('/(tabs)' as Href<any>)
    } catch (error: any) {
      console.error('Login error:', error)
      
      // Handle specific error messages
      if (error.response?.status === 401) {
        setErrors({ submit: 'Incorrect password' })
      } else if (error.response?.status === 404) {
        setErrors({ submit: 'Invalid email address' })
      } else if (error.message?.toLowerCase().includes('email')) {
        setErrors({ submit: 'Invalid email address' })
      } else if (error.message?.toLowerCase().includes('password')) {
        setErrors({ submit: 'Incorrect password' })
      } else {
        setErrors({ submit: 'Failed to login. Please try again.' })
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.subtitle}>Sign in to your account</Text>

      {errors.submit && (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={20} color="#ff4444" />
          <Text style={styles.errorText}>{errors.submit}</Text>
        </View>
      )}

      <View style={styles.form}>
        <FormField
          label="Email Address"
          value={formData.email}
          onChangeText={handleChange('email')}
          keyboardType="email-address"
          autoCapitalize="none"
          error={errors.email}
        />
        
        <FormField
          label="Password"
          value={formData.password}
          onChangeText={handleChange('password')}
          secureTextEntry={!showPassword}
          showPassword={showPassword}
          togglePassword={() => setShowPassword(!showPassword)}
          error={errors.password}
        />

        <TouchableOpacity style={styles.forgotPassword}>
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.signInButton, isLoading && styles.signInButtonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.signInText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/register' as Href<any>)}>
            <Text style={styles.registerLink}>Sign up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  form: {
    marginTop: 24,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  forgotPasswordText: {
    color: '#6B4EFF',
    fontSize: 14,
  },
  signInButton: {
    backgroundColor: '#7E57C2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  signInButtonDisabled: {
    opacity: 0.7,
  },
  signInText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  registerText: {
    color: '#666',
  },
  registerLink: {
    color: '#7E57C2',
  },
})

export default Login 