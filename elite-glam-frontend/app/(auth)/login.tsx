import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
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
  role: string
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
        role: response.user.role,
      };
      
      // Store the token and user data
      await AsyncStorage.setItem('userToken', response.token)
      await AsyncStorage.setItem('userData', JSON.stringify(userData))
      
      // Redirect to home with a parameter to trigger a refresh
      router.replace({ pathname: '/(tabs)', params: { loginSuccess: 'true' } } as Href<any>)
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardAvoidingContainer}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
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

            <TouchableOpacity 
              style={styles.forgotPassword}
              onPress={() => router.push('/(auth)/forgot-password' as Href<any>)}
            >
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
              <TouchableOpacity onPress={() => router.push('/(auth)/register' as Href<any>)}>
                <Text style={styles.registerLink}>Sign up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  keyboardAvoidingContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: 'white',
    alignItems: 'center',
  },
  logo: {
    width: 180,
    height: 90,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 25,
    textAlign: 'center',
  },
  form: {
    width: '100%',
    marginTop: 24,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
    width: '100%',
  },
  errorText: {
    color: '#B71C1C',
    marginLeft: 8,
    fontSize: 14,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#7E57C2',
    fontSize: 14,
  },
  signInButton: {
    backgroundColor: '#7E57C2',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  signInButtonDisabled: {
    backgroundColor: '#B092DD',
  },
  signInText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  registerText: {
    fontSize: 14,
    color: '#666',
  },
  registerLink: {
    fontSize: 14,
    color: '#7E57C2',
    fontWeight: 'bold',
  },
})

export default Login 