import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import FormField from "../../components/FormField";
import { router, Href } from "expo-router";
import { authService } from "../../services/api";

interface FormData {
  username: string;
  email: string;
  password: string;
  passwordConfirm: string;
  firstName: string;
  lastName: string;
  role: "customer" | "shop_owner"; // Added role
}

interface FormErrors {
  username?: string;
  email?: string;
  password?: string;
  passwordConfirm?: string;
  firstName?: string;
  lastName?: string;
  role?: string; // Added role error
  general?: string;
}

interface PasswordValidation {
  isValid: boolean;
  errors: string[];
}

const validatePassword = (password: string): PasswordValidation => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("At least 8 characters long");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("One uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("One lowercase letter");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("One number");
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('One special character (!@#$%^&*(),.?":{}|<>)');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

const Register = () => {
  const [formData, setFormData] = useState<FormData>({
    username: "",
    email: "",
    password: "",
    passwordConfirm: "",
    firstName: "",
    lastName: "",
    role: "customer", // Default role
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordRequirements, setPasswordRequirements] = useState<string[]>(
    []
  );

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.role) {
      newErrors.role = "Please select a role";
    }

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    } else if (formData.username.length < 2) {
      newErrors.username = "Username must be at least 2 characters long";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }

    const passwordValidation = validatePassword(formData.password);
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (!passwordValidation.isValid) {
      newErrors.password = `Password requirements missing: ${passwordValidation.errors.join(
        ", "
      )}`;
    }

    if (!formData.passwordConfirm) {
      newErrors.passwordConfirm = "Please confirm your password";
    } else if (formData.password !== formData.passwordConfirm) {
      newErrors.passwordConfirm = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: keyof FormData) => (text: string) => {
    setFormData((prev) => ({ ...prev, [field]: text }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }

    // Update password requirements as user types
    if (field === "password") {
      const { errors } = validatePassword(text);
      setPasswordRequirements(errors);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsLoading(true);

    try {
      console.log("Form validation passed, sending registration data:", {
        ...formData,
        password: "***",
        passwordConfirm: "***",
      });

      const registrationData = formData; // Pass the whole formData to include passwordConfirm
      const response = await authService.register(registrationData);
      console.log("Registration successful:", response);

      setErrors({});
      alert("Registration successful! Please log in.");
      router.push("/login" as Href<any>);
    } catch (error: any) {
      // Enhanced error logging
      console.error("Registration error details:", {
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
            password: "[REDACTED]",
            passwordConfirm: "[REDACTED]",
          },
        },
      });

      // Show more detailed error message
      let errorMessage = "Registration failed. ";

      if (error.response?.data) {
        if (typeof error.response.data === "string") {
          errorMessage += error.response.data;
        } else if (error.response.data.message) {
          errorMessage += error.response.data.message;
        } else if (error.response.data.error) {
          errorMessage += error.response.data.error;
        }
      } else {
        errorMessage += error.message || "Please try again.";
      }

      console.log("Setting error message:", errorMessage);
      setErrors({
        general: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.keyboardAvoidingContainer}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.innerContainer}>
          <Image
            source={require("../../assets/images/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />

          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join Elite Glam today!</Text>

          {errors.general && (
            <View style={styles.errorContainer}>
              <MaterialIcons name="error-outline" size={20} color="#B71C1C" />
              <Text style={styles.errorText}>{errors.general}</Text>
            </View>
          )}

          <View style={styles.form}>
            {/* Role Selection */}
            <View style={styles.roleSelectionContainer}>
              <Text style={styles.roleLabel}>I am a:</Text>
              <View style={styles.roleOptionsContainer}>
                <TouchableOpacity
                  style={[
                    styles.roleOptionButton,
                    formData.role === "customer" && styles.roleOptionButtonSelected,
                  ]}
                  onPress={() => handleChange("role")("customer")}
                >
                  <Text
                    style={[
                      styles.roleOptionText,
                      formData.role === "customer" &&
                        styles.roleOptionTextSelected,
                    ]}
                  >
                    Customer
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.roleOptionButton,
                    formData.role === "shop_owner" &&
                      styles.roleOptionButtonSelected,
                  ]}
                  onPress={() => handleChange("role")("shop_owner")}
                >
                  <Text
                    style={[
                      styles.roleOptionText,
                      formData.role === "shop_owner" &&
                        styles.roleOptionTextSelected,
                    ]}
                  >
                    Shop Owner
                  </Text>
                </TouchableOpacity>
              </View>
              {errors.role && <Text style={styles.roleErrorText}>{errors.role}</Text>}
            </View>

            <FormField
              label="First Name"
              value={formData.firstName}
              onChangeText={handleChange("firstName")}
              error={errors.firstName}
              autoCapitalize="words"
            />

            <FormField
              label="Last Name"
              value={formData.lastName}
              onChangeText={handleChange("lastName")}
              error={errors.lastName}
              autoCapitalize="words"
            />

            <FormField
              label="Username"
              value={formData.username}
              onChangeText={handleChange("username")}
              error={errors.username}
              autoCapitalize="none"
            />

            <FormField
              label="Email Address"
              value={formData.email}
              onChangeText={handleChange("email")}
              keyboardType="email-address"
              error={errors.email}
              autoCapitalize="none"
            />

            <FormField
              label="Password"
              value={formData.password}
              onChangeText={handleChange("password")}
              secureTextEntry={!showPassword}
              showPassword={showPassword}
              togglePassword={() => setShowPassword(!showPassword)}
              error={errors.password}
            />

            {passwordRequirements.length > 0 &&
              formData.password.length > 0 && (
                <View style={styles.passwordRequirementsContainer}>
                  <Text style={styles.passwordRequirementsTitle}>
                    Password must contain:
                  </Text>
                  {passwordRequirements.map((req, index) => (
                    <View key={index} style={styles.requirementItem}>
                      <MaterialIcons
                        name="close"
                        size={16}
                        color="#D32F2F"
                        style={styles.requirementIcon}
                      />
                      <Text style={styles.requirementText}>{req}</Text>
                    </View>
                  ))}
                </View>
              )}
            {/* Display message when all password requirements are met */}
            {!passwordRequirements.length &&
              formData.password.length > 0 &&
              !errors.password && (
                <View
                  style={[
                    styles.passwordRequirementsContainer,
                    styles.passwordRequirementsMet,
                  ]}
                >
                  <MaterialIcons
                    name="check-circle"
                    size={16}
                    color="#388E3C"
                    style={styles.requirementIcon}
                  />
                  <Text
                    style={[styles.requirementText, styles.requirementTextMet]}
                  >
                    Password meets all requirements!
                  </Text>
                </View>
              )}

            <FormField
              label="Confirm Password"
              value={formData.passwordConfirm}
              onChangeText={handleChange("passwordConfirm")}
              secureTextEntry={!showPassword}
              showPassword={showPassword}
              togglePassword={() => setShowPassword(!showPassword)}
              error={errors.passwordConfirm}
            />

            <TouchableOpacity
              style={[
                styles.signUpButton,
                isLoading && styles.signUpButtonDisabled,
              ]}
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
              <TouchableOpacity
                onPress={() => router.push("/(auth)/login" as Href<any>)}
              >
                <Text style={styles.loginLink}>Sign in</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingContainer: {
    flex: 1,
    backgroundColor: "white", // Match inner container background
  },
  scrollView: {
    // If you had styles for the ScrollView itself
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 20, // Add some vertical padding
  },
  innerContainer: {
    // Was 'container'
    paddingHorizontal: 24,
    backgroundColor: "white",
    alignItems: "center",
  },
  logo: {
    width: 180,
    height: 90,
    marginBottom: 20, // Adjusted spacing
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 25,
    textAlign: "center",
  },
  form: {
    width: "100%",
    gap: 16, // Keep the gap from original styles if desired for FormFields
  },
  errorContainer: {
    // General error styling
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFEBEE",
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    width: "100%",
  },
  errorText: {
    // General error text
    color: "#B71C1C",
    marginLeft: 8,
    fontSize: 14,
  },
  // Styles for Password Requirements Display
  passwordRequirementsContainer: {
    marginTop: 5, // Adjusted from -8 to give some space after password field
    marginBottom: 15,
    paddingLeft: 10, // Indent requirements slightly
    borderLeftWidth: 2,
    borderColor: "#FFCDD2", // Light red border for unmet
  },
  passwordRequirementsMet: {
    borderColor: "#C8E6C9", // Light green border for met
  },
  passwordRequirementsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#444",
    marginBottom: 5,
  },
  requirementItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },
  requirementIcon: {
    marginRight: 8,
  },
  requirementText: {
    fontSize: 13,
    color: "#D32F2F", // Red for unmet requirements
  },
  requirementTextMet: {
    color: "#388E3C", // Green for met requirements
  },
  // Button and Link Styles
  signUpButton: {
    backgroundColor: "#7E57C2", // Brand color
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10, // Add some top margin (original had 24, then 16)
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  signUpButtonDisabled: {
    backgroundColor: "#B092DD", // Lighter shade for disabled state
  },
  signUpText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20, // Consistent margin
  },
  loginText: {
    fontSize: 14,
    color: "#666",
  },
  loginLink: {
    fontSize: 14,
    color: "#7E57C2",
    fontWeight: "bold",
    // Removed textAlign and marginBottom as it's part of a flex row now
  },
  // Styles for Role Selection
  roleSelectionContainer: {
    marginBottom: 16, // Keep consistent spacing
  },
  roleLabel: {
    fontSize: 14,
    color: "#444",
    marginBottom: 8,
    fontWeight: "600",
  },
  roleOptionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  roleOptionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    alignItems: "center",
    marginHorizontal: 4, // Add some space between buttons
  },
  roleOptionButtonSelected: {
    backgroundColor: "#E8EAF6", // Light purple for selected
    borderColor: "#7E57C2",
  },
  roleOptionText: {
    fontSize: 14,
    color: "#333",
  },
  roleOptionTextSelected: {
    color: "#7E57C2",
    fontWeight: "bold",
  },
  roleErrorText: {
    color: "#B71C1C",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 2, // Align with FormField error text if possible
  },
});

export default Register;
