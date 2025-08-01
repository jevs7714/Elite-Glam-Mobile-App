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
  Alert,
} from 'react-native'
import React, { useState } from 'react'
import FormField from '../../components/FormField'
import { router, Href } from 'expo-router'
import { authService } from '../../services/api'
import { MaterialIcons } from '@expo/vector-icons'

interface ForgotPasswordData {
  email: string
  verificationCode: string
  newPassword: string
  confirmPassword: string
}

interface ForgotPasswordErrors {
  email?: string
  verificationCode?: string
  newPassword?: string
  confirmPassword?: string
  submit?: string
}

const ForgotPassword = () => {
  const [step, setStep] = useState<'email' | 'verification' | 'password'>('email')
  const [formData, setFormData] = useState<ForgotPasswordData>({
    email: '',
    verificationCode: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<ForgotPasswordErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)

  const validateEmail = (): boolean => {
    const newErrors: ForgotPasswordErrors = {}
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateVerificationCode = (): boolean => {
    const newErrors: ForgotPasswordErrors = {}
    
    if (!formData.verificationCode.trim()) {
      newErrors.verificationCode = 'Verification code is required'
    } else if (formData.verificationCode.length !== 6) {
      newErrors.verificationCode = 'Verification code must be 6 digits'
    } else if (!/^\d{6}$/.test(formData.verificationCode)) {
      newErrors.verificationCode = 'Verification code must contain only numbers'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validatePassword = (): boolean => {
    const newErrors: ForgotPasswordErrors = {}
    
    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required'
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters'
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (field: keyof ForgotPasswordData) => (text: string) => {
    setFormData(prev => ({ ...prev, [field]: text }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
    if (errors.submit) {
      setErrors(prev => ({ ...prev, submit: undefined }))
    }
  }

  const handleSendCode = async () => {
    if (!validateEmail()) return

    setIsLoading(true)
    try {
      await authService.sendPasswordResetCode(formData.email)
      setStep('verification')
      startResendTimer()
      Alert.alert(
        'Code Sent',
        'A 6-digit verification code has been sent to your email address.',
        [{ text: 'OK' }]
      )
    } catch (error: any) {
      console.error('Send code error:', error)
      if (error.response?.status === 404) {
        setErrors({ submit: 'Email address not found' })
      } else {
        setErrors({ submit: error.message || 'Failed to send verification code' })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyCode = async () => {
    if (!validateVerificationCode()) return

    setIsLoading(true)
    try {
      await authService.verifyPasswordResetCode(formData.email, formData.verificationCode)
      setStep('password')
    } catch (error: any) {
      console.error('Verify code error:', error)
      if (error.response?.status === 400) {
        setErrors({ submit: 'Invalid or expired verification code' })
      } else {
        setErrors({ submit: error.message || 'Failed to verify code' })
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!validatePassword()) return

    setIsLoading(true)
    try {
      await authService.resetPassword(
        formData.email,
        formData.verificationCode,
        formData.newPassword
      )
      Alert.alert(
        'Password Reset Successful',
        'Your password has been reset successfully. You can now login with your new password.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(auth)/login' as Href<any>)
          }
        ]
      )
    } catch (error: any) {
      console.error('Reset password error:', error)
      setErrors({ submit: error.message || 'Failed to reset password' })
    } finally {
      setIsLoading(false)
    }
  }

  const startResendTimer = () => {
    setResendTimer(60)
    const timer = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleResendCode = async () => {
    if (resendTimer > 0) return
    
    setIsLoading(true)
    try {
      await authService.sendPasswordResetCode(formData.email)
      startResendTimer()
      Alert.alert(
        'Code Resent',
        'A new verification code has been sent to your email address.',
        [{ text: 'OK' }]
      )
    } catch (error: any) {
      console.error('Resend code error:', error)
      setErrors({ submit: error.message || 'Failed to resend verification code' })
    } finally {
      setIsLoading(false)
    }
  }

  const renderEmailStep = () => (
    <View style={styles.form}>
      <Text style={styles.stepTitle}>Reset Your Password</Text>
      <Text style={styles.stepDescription}>
        Enter your email address and we'll send you a verification code to reset your password.
      </Text>

      <FormField
        label="Email Address"
        value={formData.email}
        onChangeText={handleChange('email')}
        keyboardType="email-address"
        autoCapitalize="none"
        error={errors.email}
      />

      <TouchableOpacity 
        style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
        onPress={handleSendCode}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>Send Verification Code</Text>
        )}
      </TouchableOpacity>
    </View>
  )

  const renderVerificationStep = () => (
    <View style={styles.form}>
      <Text style={styles.stepTitle}>Enter Verification Code</Text>
      <Text style={styles.stepDescription}>
        We've sent a 6-digit code to {formData.email}. Please enter it below.
      </Text>

      <FormField
        label="Verification Code"
        value={formData.verificationCode}
        onChangeText={handleChange('verificationCode')}
        keyboardType="numeric"
        maxLength={6}
        error={errors.verificationCode}
        placeholder="000000"
      />

      <TouchableOpacity 
        style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
        onPress={handleVerifyCode}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>Verify Code</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.secondaryButton, (resendTimer > 0 || isLoading) && styles.secondaryButtonDisabled]}
        onPress={handleResendCode}
        disabled={resendTimer > 0 || isLoading}
      >
        <Text style={[styles.secondaryButtonText, (resendTimer > 0 || isLoading) && styles.secondaryButtonTextDisabled]}>
          {resendTimer > 0 ? `Resend Code (${resendTimer}s)` : 'Resend Code'}
        </Text>
      </TouchableOpacity>
    </View>
  )

  const renderPasswordStep = () => (
    <View style={styles.form}>
      <Text style={styles.stepTitle}>Create New Password</Text>
      <Text style={styles.stepDescription}>
        Enter your new password. Make sure it's at least 6 characters long.
      </Text>

      <FormField
        label="New Password"
        value={formData.newPassword}
        onChangeText={handleChange('newPassword')}
        secureTextEntry={!showPassword}
        showPassword={showPassword}
        togglePassword={() => setShowPassword(!showPassword)}
        error={errors.newPassword}
      />

      <FormField
        label="Confirm New Password"
        value={formData.confirmPassword}
        onChangeText={handleChange('confirmPassword')}
        secureTextEntry={!showConfirmPassword}
        showPassword={showConfirmPassword}
        togglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
        error={errors.confirmPassword}
      />

      <TouchableOpacity 
        style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
        onPress={handleResetPassword}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>Reset Password</Text>
        )}
      </TouchableOpacity>
    </View>
  )

  return (
    <KeyboardAvoidingView 
      style={styles.keyboardAvoidingContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />

          {errors.submit && (
            <View style={styles.errorContainer}>
              <MaterialIcons name="error-outline" size={20} color="#ff4444" />
              <Text style={styles.errorText}>{errors.submit}</Text>
            </View>
          )}

          {step === 'email' && renderEmailStep()}
          {step === 'verification' && renderVerificationStep()}
          {step === 'password' && renderPasswordStep()}

          <View style={styles.backContainer}>
            <TouchableOpacity onPress={() => {
              if (step === 'email') {
                router.back()
              } else if (step === 'verification') {
                setStep('email')
              } else {
                setStep('verification')
              }
            }}>
              <Text style={styles.backText}>
                {step === 'email' ? 'Back to Login' : 'Back'}
              </Text>
            </TouchableOpacity>
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
  form: {
    width: '100%',
    marginTop: 24,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 25,
    textAlign: 'center',
    lineHeight: 20,
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
  primaryButton: {
    backgroundColor: '#7E57C2',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  primaryButtonDisabled: {
    backgroundColor: '#B092DD',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#7E57C2',
  },
  secondaryButtonDisabled: {
    borderColor: '#B092DD',
  },
  secondaryButtonText: {
    color: '#7E57C2',
    fontSize: 14,
    fontWeight: 'bold',
  },
  secondaryButtonTextDisabled: {
    color: '#B092DD',
  },
  backContainer: {
    marginTop: 20,
  },
  backText: {
    color: '#7E57C2',
    fontSize: 14,
    textAlign: 'center',
  },
})

export default ForgotPassword
