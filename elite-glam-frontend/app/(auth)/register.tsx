import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native'
import React, { useState } from 'react'
import FormField from '../../components/FormField'
import { router, Href } from 'expo-router'
import { authService } from '../../services/api'

interface FormData {
  username: string
  email: string
  password: string
  passwordConfirm: string
  firstName: string
  lastName: string
}

interface FormErrors {
  username?: string
  email?: string
  password?: string
  passwordConfirm?: string
  firstName?: string
  lastName?: string
  general?: string
}

interface PasswordValidation {
  isValid: boolean
  errors: string[]
}

const validatePassword = (password: string): PasswordValidation => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('At least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('One uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('One lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('One number');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('One special character (!@#$%^&*(),.?":{}|<>)');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

const Register = () => {
  const [formData, setFormData] = useState<FormData>({
    username: '',
    email: '',
    password: '',
    passwordConfirm: '',
    firstName: '',
    lastName: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [passwordRequirements, setPasswordRequirements] = useState<string[]>([])

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required'
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required'
    }

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required'
    } else if (formData.username.length < 2) {
      newErrors.username = 'Username must be at least 2 characters long'
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid'
    }
    
    const passwordValidation = validatePassword(formData.password);
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (!passwordValidation.isValid) {
      newErrors.password = `Password requirements missing: ${passwordValidation.errors.join(', ')}`
    }

    if (!formData.passwordConfirm) {
      newErrors.passwordConfirm = 'Please confirm your password'
    } else if (formData.password !== formData.passwordConfirm) {
      newErrors.passwordConfirm = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (field: keyof FormData) => (text: string) => {
    setFormData(prev => ({ ...prev, [field]: text }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
    
    // Update password requirements as user types
    if (field === 'password') {
      const { errors } = validatePassword(text);
      setPasswordRequirements(errors);
    }
  }

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsLoading(true);

    try {
      console.log('Form validation passed, sending registration data:', {
        ...formData,
        password: '***',
        passwordConfirm: '***'
      });
      
      const registrationData = formData; // Pass the whole formData to include passwordConfirm
      const response = await authService.register(registrationData);
      console.log('Registration successful:', response);
      
      setErrors({});
      alert('Registration successful! Please log in.');
      router.push('/login' as Href<any>);
    } catch (error: any) {
      // Enhanced error logging
      console.error('Registration error details:', {
        message: error.message,
        response: {
          data: error.response?.data,
          status: error.response?.status,
          statusText: error.response?.statusText,
          headers: error.response?.headers,
        },
        requestData: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers,
          data: {
            ...error.config?.data,
            password: '[REDACTED]',
            passwordConfirm: '[REDACTED]'
          }
        }
      });

      // Show more detailed error message
      let errorMessage = 'Registration failed. ';
      
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMessage += error.response.data;
        } else if (error.response.data.message) {
          errorMessage += error.response.data.message;
        } else if (error.response.data.error) {
          errorMessage += error.response.data.error;
        }
      } else {
        errorMessage += error.message || 'Please try again.';
      }

      console.log('Setting error message:', errorMessage);
      setErrors({
        general: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Sign up now</Text>
      <Text style={styles.subtitle}>Please fill the details and create account</Text>

      {errors.general && (
        <Text style={styles.generalError}>{errors.general}</Text>
      )}

      <View style={styles.form}>
        <FormField
          label="First Name"
          value={formData.firstName}
          onChangeText={handleChange('firstName')}
          error={errors.firstName}
          autoCapitalize="words"
        />
        
        <FormField
          label="Last Name"
          value={formData.lastName}
          onChangeText={handleChange('lastName')}
          error={errors.lastName}
          autoCapitalize="words"
        />

        <FormField
          label="Username"
          value={formData.username}
          onChangeText={handleChange('username')}
          error={errors.username}
          autoCapitalize="none"
        />
        
        <FormField
          label="Email Address"
          value={formData.email}
          onChangeText={handleChange('email')}
          keyboardType="email-address"
          error={errors.email}
          autoCapitalize="none"
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

        {passwordRequirements.length > 0 && (
          <View style={styles.requirementsContainer}>
            <Text style={styles.requirementsTitle}>Password must have:</Text>
            {passwordRequirements.map((req, index) => (
              <Text key={index} style={styles.requirement}>• {req}</Text>
            ))}
          </View>
        )}

        <FormField
          label="Confirm Password"
          value={formData.passwordConfirm}
          onChangeText={handleChange('passwordConfirm')}
          secureTextEntry={!showPassword}
          showPassword={showPassword}
          togglePassword={() => setShowPassword(!showPassword)}
          error={errors.passwordConfirm}
        />

        <TouchableOpacity 
          style={[styles.signUpButton, isLoading && styles.signUpButtonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.signUpText}>Sign Up</Text>
          )}
        </TouchableOpacity>

        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/login' as Href<any>)}>
            <Text style={styles.loginLink}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#6B4EFF',
    marginTop: 40,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    marginBottom: 30,
  },
  form: {
    gap: 16,
  },
  passwordHint: {
    fontSize: 14,
    color: '#666',
    marginTop: -8,
  },
  signUpButton: {
    backgroundColor: '#6B4EFF',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  signUpText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  loginText: {
    color: '#666',
    fontSize: 16,
  },
  loginLink: {
    color: '#6B4EFF',
    fontSize: 16,
  },
  signUpButtonDisabled: {
    opacity: 0.7,
  },
  generalError: {
    color: '#ff4444',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  requirementsContainer: {
    marginTop: -8,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  requirementsTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  requirement: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
})

export default Register 