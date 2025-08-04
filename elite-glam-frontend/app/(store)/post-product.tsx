import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  Image,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import React, { useState, useEffect } from "react";
import { useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { productsService } from "../../services/products.service";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";

const categories = ["Gown", "Dress", "Suit", "Sportswear", "Other"] as const;

type Category = (typeof categories)[number];

export default function PostProductScreen() {
  const params = useLocalSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedPreviewImageIndex, setSelectedPreviewImageIndex] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    description: "",
    category: "",
    quantity: "",
  });

  // Debug logging
  useEffect(() => {
    console.log("PostProductScreen mounted");
    console.log("Route params:", params);

    // If editing an existing product, populate the form
    if (params.id) {
      console.log("Editing existing product:", params.id);
      setFormData({
        name: (params.name as string) || "",
        price: (params.price as string) || "",
        description: (params.description as string) || "",
        category: (params.category as string) || "",
        quantity: (params.quantity as string) || "",
      });

      if (params.image) {
        setImages([params.image as string]);
      }
    }
  }, [params]);

  const pickImages = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          "Please grant permission to access your photo library"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: true,
        selectionLimit: 5, // Limit to 5 images
        quality: 0.8,
        allowsEditing: false, // Disable editing for multiple selection
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newImages = result.assets.map((asset) => asset.uri);
        setImages((prev) => {
          const combined = [...prev, ...newImages];
          return combined.slice(0, 5); // Ensure max 5 images
        });
      }
    } catch (error) {
      console.error("Error picking images:", error);
      Alert.alert("Error", "Failed to pick images");
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      const newImages = prev.filter((_, i) => i !== index);
      if (selectedImageIndex >= newImages.length && newImages.length > 0) {
        setSelectedImageIndex(newImages.length - 1);
      } else if (newImages.length === 0) {
        setSelectedImageIndex(0);
      }
      return newImages;
    });
  };

  const pickPreviewImages = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          "Please grant permission to access your photo library"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: true,
        selectionLimit: 5, // Limit to 5 preview images
        quality: 0.8,
        allowsEditing: false, // Disable editing for multiple selection
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newImages = result.assets.map((asset) => asset.uri);
        setPreviewImages((prev) => {
          const combined = [...prev, ...newImages];
          return combined.slice(0, 5); // Ensure max 5 images
        });
      }
    } catch (error) {
      console.error("Error picking preview images:", error);
      Alert.alert("Error", "Failed to pick preview images");
    }
  };

  const removePreviewImage = (index: number) => {
    setPreviewImages((prev) => {
      const newImages = prev.filter((_, i) => i !== index);
      if (selectedPreviewImageIndex >= newImages.length && newImages.length > 0) {
        setSelectedPreviewImageIndex(newImages.length - 1);
      } else if (newImages.length === 0) {
        setSelectedPreviewImageIndex(0);
      }
      return newImages;
    });
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert("Error", "Product name is required");
      return false;
    }
    if (
      !formData.price.trim() ||
      isNaN(Number(formData.price)) ||
      Number(formData.price) <= 0
    ) {
      Alert.alert("Error", "Please enter a valid price");
      return false;
    }
    if (!formData.category.trim()) {
      Alert.alert("Error", "Category is required");
      return false;
    }
    if (
      !formData.quantity.trim() ||
      isNaN(Number(formData.quantity)) ||
      Number(formData.quantity) < 0
    ) {
      Alert.alert("Error", "Please enter a valid quantity");
      return false;
    }
    if (!formData.description.trim()) {
      Alert.alert("Error", "Description is required");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setIsLoading(true);

      // Get current user data
      const userData = await AsyncStorage.getItem("userData");
      if (!userData) {
        throw new Error("User data not found");
      }
      const user = JSON.parse(userData);

      // Create form data for multipart/form-data
      const formDataToSend = new FormData();
      formDataToSend.append("name", formData.name.trim());
      formDataToSend.append("price", formData.price.toString());
      formDataToSend.append("description", formData.description.trim());
      formDataToSend.append("category", formData.category.trim());
      formDataToSend.append("quantity", formData.quantity.toString());
      formDataToSend.append("userId", user.uid);
      formDataToSend.append("rating", "0");

      // Add all images to the 'images' field
      if (images.length > 0) {
        images.forEach((imageUri) => {
          const filename = imageUri.split("/").pop();
          const match = /\.(\w+)$/.exec(filename || "");
          const type = match ? `image/${match[1]}` : "image";

          // All images go to the 'images' field
          formDataToSend.append("images", {
            uri: imageUri,
            name: filename,
            type,
          } as any);
        });
      }
      
      // Add preview images to the 'previewImages' field
      if (previewImages.length > 0) {
        previewImages.forEach((imageUri) => {
          const filename = imageUri.split("/").pop();
          const match = /\.(\w+)$/.exec(filename || "");
          const type = match ? `image/${match[1]}` : "image";

          // All preview images go to the 'previewImages' field
          formDataToSend.append("previewImages", {
            uri: imageUri,
            name: filename,
            type,
          } as any);
        });
      }

      console.log("Sending form data:", {
        name: formData.name.trim(),
        price: formData.price,
        description: formData.description.trim(),
        category: formData.category.trim(),
        quantity: formData.quantity,
        userId: user.uid,
        rating: "0",
        hasImages: images.length,
        imageCount: images.length,
        hasPreviewImages: previewImages.length,
        previewImageCount: previewImages.length,
      });

      const result = await productsService.createProduct(formDataToSend);
      console.log("Product created:", result);
      Alert.alert("Success", "Product created successfully", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error("Error creating product:", error);
      Alert.alert("Error", `Failed to create product: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <ScrollView
        style={styles.container}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add New Product</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Product Details Form */}
        <View style={styles.form}>
          {/* Image Upload */}
          <View style={styles.imageUploadContainer}>
            <Text style={styles.label}>Product Images ({images.length}/5)</Text>

            {/* Main Image Display */}
            <View style={styles.mainImageContainer}>
              <TouchableOpacity
                style={styles.imageUploadButton}
                onPress={pickImages}
                disabled={isLoading || images.length >= 5}
              >
                {images.length > 0 ? (
                  <Image
                    source={{ uri: images[selectedImageIndex] }}
                    style={styles.uploadedImage}
                  />
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <MaterialIcons
                      name="add-photo-alternate"
                      size={32}
                      color="#666"
                    />
                    <Text style={styles.uploadText}>Add Product Images</Text>
                    <Text style={styles.uploadSubText}>Up to 5 images</Text>
                  </View>
                )}
              </TouchableOpacity>

              {images.length > 0 && (
                <TouchableOpacity
                  style={styles.removeMainImageButton}
                  onPress={() => removeImage(selectedImageIndex)}
                  disabled={isLoading}
                >
                  <MaterialIcons name="close" size={20} color="#fff" />
                </TouchableOpacity>
              )}
            </View>

            {/* Image Thumbnails */}
            {images.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.thumbnailContainer}
                contentContainerStyle={styles.thumbnailContent}
              >
                {images.map((imageUri, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.thumbnailButton,
                      selectedImageIndex === index &&
                        styles.thumbnailButtonSelected,
                    ]}
                    onPress={() => setSelectedImageIndex(index)}
                    disabled={isLoading}
                  >
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.thumbnailImage}
                    />
                    {index === 0 && (
                      <View style={styles.primaryBadge}>
                        <Text style={styles.primaryBadgeText}>1st</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.removeThumbnailButton}
                      onPress={() => removeImage(index)}
                      disabled={isLoading}
                    >
                      <MaterialIcons name="close" size={12} color="#fff" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Add More Images Button */}
            {images.length > 0 && images.length < 5 && (
              <TouchableOpacity
                style={styles.addMoreButton}
                onPress={pickImages}
                disabled={isLoading}
              >
                <MaterialIcons name="add" size={20} color="#7E57C2" />
                <Text style={styles.addMoreText}>Add More Images</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.imageHelperText}>
              First image will be used as the main thumbnail
            </Text>
          </View>

          {/* Preview Images Section */}
          <View style={styles.imageUploadContainer}>
            <Text style={styles.label}>
              Preview Images ({previewImages.length}/5)
            </Text>
            <Text style={styles.previewHelperText}>
              These images will be shown in the product details page to demonstrate how the product looks when worn or used
            </Text>

            {/* Main Preview Image Display */}
            <View style={styles.mainImageContainer}>
              <TouchableOpacity
                style={[styles.imageUploadButton, styles.previewImageUploadButton]}
                onPress={pickPreviewImages}
                disabled={isLoading || previewImages.length >= 5}
              >
                {previewImages.length > 0 ? (
                  <Image
                    source={{ uri: previewImages[selectedPreviewImageIndex] }}
                    style={styles.uploadedImage}
                  />
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <MaterialIcons
                      name="photo-camera"
                      size={32}
                      color="#666"
                    />
                    <Text style={styles.uploadText}>Add Preview Images</Text>
                    <Text style={styles.uploadSubText}>Show how it looks when worn</Text>
                  </View>
                )}
              </TouchableOpacity>

              {previewImages.length > 0 && (
                <TouchableOpacity
                  style={styles.removeMainImageButton}
                  onPress={() => removePreviewImage(selectedPreviewImageIndex)}
                  disabled={isLoading}
                >
                  <MaterialIcons name="close" size={20} color="#fff" />
                </TouchableOpacity>
              )}
            </View>

            {/* Preview Image Thumbnails */}
            {previewImages.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.thumbnailContainer}
                contentContainerStyle={styles.thumbnailContent}
              >
                {previewImages.map((imageUri, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.thumbnailButton,
                      selectedPreviewImageIndex === index &&
                        styles.thumbnailButtonSelected,
                    ]}
                    onPress={() => setSelectedPreviewImageIndex(index)}
                    disabled={isLoading}
                  >
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.thumbnailImage}
                    />
                    <TouchableOpacity
                      style={styles.removeThumbnailButton}
                      onPress={() => removePreviewImage(index)}
                      disabled={isLoading}
                    >
                      <MaterialIcons name="close" size={12} color="#fff" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Add More Preview Images Button */}
            {previewImages.length > 0 && previewImages.length < 5 && (
              <TouchableOpacity
                style={[styles.addMoreButton, styles.previewAddMoreButton]}
                onPress={pickPreviewImages}
                disabled={isLoading}
              >
                <MaterialIcons name="add" size={20} color="#4CAF50" />
                <Text style={[styles.addMoreText, styles.previewAddMoreText]}>Add More Preview Images</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Product Name</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Enter product name"
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Price (PHP)</Text>
            <TextInput
              style={styles.input}
              value={formData.price}
              onChangeText={(text) => setFormData({ ...formData, price: text })}
              placeholder="Enter price"
              keyboardType="numeric"
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScrollContainer}
              keyboardShouldPersistTaps="always"
            >
              {categories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryChip,
                    formData.category === category &&
                      styles.categoryChipSelected,
                  ]}
                  onPress={() => {
                    Keyboard.dismiss();
                    setFormData({ ...formData, category });
                  }}
                  disabled={isLoading}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      formData.category === category &&
                        styles.categoryChipTextSelected,
                    ]}
                  >
                    {category}
                  </Text>
                  {formData.category === category && (
                    <MaterialIcons
                      name="check-circle"
                      size={16}
                      color="#fff"
                      style={styles.categoryCheckIcon}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            {!formData.category && (
              <Text style={styles.categoryHelperText}>
                Please select a category
              </Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Quantity</Text>
            <TextInput
              style={styles.input}
              value={formData.quantity}
              onChangeText={(text) =>
                setFormData({ ...formData, quantity: text })
              }
              placeholder="Enter quantity"
              keyboardType="numeric"
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(text) =>
                setFormData({ ...formData, description: text })
              }
              placeholder="Enter product description"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!isLoading}
            />
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            isLoading && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Post Product</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  form: {
    backgroundColor: "#fff",
    padding: 16,
    marginTop: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: "#333",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#333",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  submitButton: {
    backgroundColor: "#7E57C2",
    margin: 16,
    marginBottom: Platform.OS === "ios" ? 100 : 80,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  submitButtonDisabled: {
    backgroundColor: "#B39DDB",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  categoryScrollContainer: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    minHeight: 50,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 36,
  },
  categoryChipSelected: {
    backgroundColor: "#7E57C2",
    borderColor: "#7E57C2",
    elevation: 3,
    shadowColor: "#7E57C2",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  categoryChipText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  categoryChipTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },
  categoryCheckIcon: {
    marginLeft: 4,
  },
  categoryHelperText: {
    color: "#666",
    fontSize: 12,
    marginTop: 4,
    fontStyle: "italic",
  },
  imageUploadContainer: {
    marginBottom: 16,
  },
  imageUploadButton: {
    width: "100%",
    height: 200,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#ddd",
    borderStyle: "dashed",
  },
  previewImageUploadButton: {
    borderColor: "#4CAF50",
    borderStyle: "dashed",
  },
  uploadPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  uploadText: {
    marginTop: 8,
    fontSize: 16,
    color: "#666",
  },
  uploadSubText: {
    marginTop: 4,
    fontSize: 12,
    color: "#999",
  },
  uploadedImage: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
  mainImageContainer: {
    position: "relative",
    marginBottom: 12,
  },
  removeMainImageButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  thumbnailContainer: {
    marginBottom: 12,
  },
  thumbnailContent: {
    paddingHorizontal: 4,
  },
  thumbnailButton: {
    width: 60,
    height: 60,
    marginRight: 8,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
    position: "relative",
  },
  thumbnailButtonSelected: {
    borderColor: "#7E57C2",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  primaryBadge: {
    position: "absolute",
    top: 2,
    left: 2,
    backgroundColor: "#4CAF50",
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  primaryBadgeText: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "bold",
  },
  removeThumbnailButton: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  addMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: "#7E57C2",
    borderRadius: 8,
    backgroundColor: "#fff",
    marginBottom: 8,
  },
  addMoreText: {
    marginLeft: 8,
    color: "#7E57C2",
    fontSize: 14,
    fontWeight: "500",
  },
  imageHelperText: {
    color: "#666",
    fontSize: 12,
    fontStyle: "italic",
    textAlign: "center",
  },
  previewHelperText: {
    color: "#666",
    fontSize: 12,
    marginBottom: 8,
    fontStyle: "italic",
  },
  previewAddMoreButton: {
    borderColor: "#4CAF50",
  },
  previewAddMoreText: {
    color: "#4CAF50",
  },
});
