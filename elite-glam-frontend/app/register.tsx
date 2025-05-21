import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { authService } from '../services/api';
import { MaterialIcons } from '@expo/vector-icons';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleRegister = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');

      // Validate password match
      if (password !== passwordConfirm) {
        setErrorMessage('Passwords do not match');
        return;
      }

      // Validate password strength
      if (password.length < 8) {
        setErrorMessage('Password must be at least 8 characters long');
        return;
      }

      const userData = {
        username,
        email,
        password,
        passwordConfirm
      };

      await authService.register(userData);
      router.replace('/(auth)/login');
    } catch (error: any) {
      // Handle specific error cases
      if (error.response?.data?.message === 'Email already exists') {
        setErrorMessage('This email is already registered. Please use a different email or try logging in.');
      } else if (error.message.includes('Network Error')) {
        setErrorMessage('Unable to connect to the server. Please check your internet connection.');
      } else {
        setErrorMessage(`Registration failed: ${error.response?.data?.message || error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="spa" size={64} color="#7E57C2" />
        <Text style={styles.title}>Create Account</Text>
      </View>

      {errorMessage ? (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error" size={20} color="#D32F2F" />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          value={passwordConfirm}
          onChangeText={setPasswordConfirm}
          secureTextEntry
        />

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleRegister}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Register</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.linkButton}
          onPress={() => router.replace('/(auth)/login')}
        >
          <Text style={styles.linkText}>Already have an account? Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F5F5F5',
  },
  header: {
    alignItems: 'center',
    marginVertical: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  form: {
    gap: 15,
  },
  input: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#7E57C2',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkButton: {
    alignItems: 'center',
    marginTop: 15,
  },
  linkText: {
    color: '#7E57C2',
    fontSize: 14,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  errorText: {
    color: '#D32F2F',
    marginLeft: 10,
    flex: 1,
  },
}); 