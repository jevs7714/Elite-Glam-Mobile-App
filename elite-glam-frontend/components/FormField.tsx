import React from 'react'
import { StyleSheet, Text, View, TextInput, TouchableOpacity, TextInputProps } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface FormFieldProps extends TextInputProps {
  label: string
  error?: string
  showPassword?: boolean
  togglePassword?: () => void
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  showPassword,
  togglePassword,
  secureTextEntry,
  ...props
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputContainer, error && styles.inputContainerError]}>
        <TextInput
          style={styles.input}
          placeholderTextColor="#999"
          {...props}
          secureTextEntry={secureTextEntry && !showPassword}
        />
        {togglePassword && (
          <TouchableOpacity onPress={togglePassword} style={styles.eyeIcon}>
            <Ionicons 
              name={showPassword ? "eye-off" : "eye"} 
              size={24} 
              color="#666" 
            />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  inputContainerError: {
    borderColor: '#ff4444',
  },
  input: {
    flex: 1,
    height: 50,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#333',
  },
  eyeIcon: {
    padding: 10,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 14,
    marginTop: 4,
  },
})

export default FormField 