import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Dimensions,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialIcons, AntDesign } from "@expo/vector-icons";
import { bookingService } from "../../services/booking.service";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { productsService } from "../../services/products.service";
import { api } from "../../services/api";
import { API_URL } from "../../config/api.config";
import { cartService } from "../../services/cart.service";

const { width } = Dimensions.get("window");

// Calendar setup
const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface MarkedDates {
  [date: string]: boolean;
}

const ConfirmBooking = () => {
  const router = useRouter();
  const { productId, productName, productPrice } = useLocalSearchParams();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().getDate());
  const [eventDate, setEventDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [eventTime, setEventTime] = useState("16:58");
  const [eventTimePeriod, setEventTimePeriod] = useState("PM");
  const [eventType, setEventType] = useState("");
  const [otherEventType, setOtherEventType] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const eventOptions = [
    "Wedding",
    "Birthday",
    "Debut",
    "Corporate Event",
    "Others",
  ];
  const [fittingTime, setFittingTime] = useState("10:00");
  const [fittingTimePeriod, setFittingTimePeriod] = useState("AM");
  const [eventLocation, setEventLocation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sellerLocation, setSellerLocation] = useState(
    "Location not available"
  );
  const [productImage, setProductImage] = useState<string | undefined>(
    undefined
  );
  const [ownerUsername, setOwnerUsername] = useState<string | undefined>(
    undefined
  );
  const [includeMakeup, setIncludeMakeup] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [availableQuantity, setAvailableQuantity] = useState<number>(0);
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1);
  const [isLoadingProduct, setIsLoadingProduct] = useState<boolean>(true);
  const [isAddingToCart, setIsAddingToCart] = useState<boolean>(false);

  // Parse the price from URL params or use default
  const basePrice = productPrice ? parseFloat(productPrice.toString()) : 5999;
  const makeupServicePrice = 1500; // Define the price for the makeup service

  const itemTotal = basePrice * selectedQuantity;
  const totalPrice = includeMakeup ? itemTotal + makeupServicePrice : itemTotal;
  const formattedPrice = totalPrice.toLocaleString();

  // Get current month and year
  const currentMonth = currentDate.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  // Generate calendar days
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const days = [];
    const rows = 6; // Always 6 rows for 42 cells
    const totalCells = rows * 7;
    for (let i = 0; i < totalCells; i++) {
      const dayNumber = i - firstDayOfMonth + 1;
      if (dayNumber > 0 && dayNumber <= daysInMonth) {
        days.push(dayNumber);
      } else {
        days.push(null);
      }
    }
    return days;
  };

  const days = getDaysInMonth();

  const handlePrevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1)
    );
  };

  const handleDateSelect = (day: number) => {
    const selectedDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day
    );
    const dateString = selectedDate.toISOString().split("T")[0];
    setSelectedDate(day);
    setEventDate(dateString);
  };

  const handleConfirmBooking = async () => {
    // Validate size selection
    if (!selectedSize) {
      Alert.alert(
        "Size Required",
        "Please select a size before confirming your booking."
      );
      return;
    }

    // Validate quantity selection
    if (selectedQuantity < 1 || selectedQuantity > availableQuantity) {
      Alert.alert(
        "Invalid Quantity",
        `Please select between 1 and ${availableQuantity} items.`
      );
      return;
    }

    if (availableQuantity === 0) {
      Alert.alert("Out of Stock", "This product is currently out of stock.");
      return;
    }

    if (isLoadingProduct) {
      Alert.alert("Loading", "Please wait while we load product information.");
      return;
    }

    try {
      setIsSubmitting(true);

      // Get user data from storage
      const userDataStr = await AsyncStorage.getItem("userData");
      if (!userDataStr) {
        throw new Error("User data not found");
      }
      const userData = JSON.parse(userDataStr);

      if (!ownerUsername) {
        throw new Error("Product owner information is missing");
      }

      // Get product data
      const productData = await productsService.getProductById(
        productId.toString()
      );
      if (!productData || !productData.userId) {
        throw new Error("Product data or owner information not found");
      }

      // Check if there's enough stock
      if (productData.quantity < selectedQuantity) {
        throw new Error(
          `Only ${productData.quantity} items available. Please reduce your quantity.`
        );
      }

      // Create booking data
      const bookingData = {
        customerName: userData.username,
        serviceName: productName as string,
        productId: productId as string,
        date: eventDate,
        time: eventTime,
        status: "pending" as const,
        price: totalPrice,
        notes: "", // Empty notes field since we're using eventLocation
        createdAt: new Date(),
        updatedAt: new Date(),
        uid: userData.uid,
        ownerUid: productData.userId,
        ownerUsername,
        sellerLocation,
        productImage,
        eventTimePeriod,
        eventType: eventType === "Others" ? otherEventType : eventType,
        fittingTime,
        fittingTimePeriod,
        eventLocation,
        includeMakeup,
        quantity: selectedQuantity,
        selectedSize,
      };

      console.log("Creating booking with data:", {
        eventLocation,
        eventType,
        fittingTime,
        fittingTimePeriod,
        eventTimePeriod,
        time: eventTime,
        date: eventDate,
      });

      // Submit booking using the api instance
      const response = await api.post("/bookings", bookingData);
      console.log("Booking created response:", response);

      // Update product quantity after successful booking
      try {
        const newQuantity = productData.quantity - selectedQuantity;
        console.log(
          `Attempting to update product quantity from ${productData.quantity} to ${newQuantity}`
        );

        await productsService.updateProductQuantity(
          productId.toString(),
          newQuantity
        );
        console.log(
          `Product quantity updated successfully from ${productData.quantity} to ${newQuantity}`
        );

        // Update local state to reflect new quantity
        setAvailableQuantity(newQuantity);
      } catch (quantityError: any) {
        console.error("Failed to update product quantity:", quantityError);
        console.error("Quantity update error details:", {
          message: quantityError.message,
          status: quantityError.response?.status,
          data: quantityError.response?.data,
        });

        // Show a warning but don't fail the booking
        Alert.alert(
          "Warning",
          "Your booking was successful, but there was an issue updating the product quantity. Please contact support if you encounter any issues.",
          [{ text: "OK" }]
        );
      }

      Alert.alert(
        "Success",
        "Your booking has been confirmed! You can check its status in the Booking Status screen.",
        [
          {
            text: "View Booking",
            onPress: () => router.push("/booking-status"),
          },
          {
            text: "Continue Shopping",
            onPress: () => router.push("/(tabs)"),
            style: "cancel",
          },
        ]
      );
    } catch (error: any) {
      console.error("Error creating booking:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to create booking. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddToCart = async () => {
    // Validate size selection
    if (!selectedSize) {
      Alert.alert(
        "Size Required",
        "Please select a size before adding to cart."
      );
      return;
    }

    // Validate quantity selection
    if (selectedQuantity < 1 || selectedQuantity > availableQuantity) {
      Alert.alert(
        "Invalid Quantity",
        `Please select between 1 and ${availableQuantity} items.`
      );
      return;
    }

    if (availableQuantity === 0) {
      Alert.alert("Out of Stock", "This product is currently out of stock.");
      return;
    }

    if (isLoadingProduct) {
      Alert.alert("Loading", "Please wait while we load product information.");
      return;
    }

    try {
      setIsAddingToCart(true);

      // Get user data from storage
      const userDataStr = await AsyncStorage.getItem("userData");
      if (!userDataStr) {
        throw new Error("User data not found");
      }
      const userData = JSON.parse(userDataStr);

      if (!ownerUsername) {
        throw new Error("Product owner information is missing");
      }

      // Get product data
      const productData = await productsService.getProductById(
        productId.toString()
      );
      if (!productData || !productData.userId) {
        throw new Error("Product data or owner information not found");
      }

      // Check if there's enough stock
      if (productData.quantity < selectedQuantity) {
        throw new Error(
          `Only ${productData.quantity} items available. Please reduce your quantity.`
        );
      }

      const makeupServicePrice = 1500;
      const itemTotal = basePrice * selectedQuantity;
      const totalPrice = includeMakeup
        ? itemTotal + makeupServicePrice
        : itemTotal;

      // Create cart item data
      const cartItemData = {
        productId: productId as string,
        productName: productName as string,
        productPrice: basePrice,
        productImage,
        quantity: selectedQuantity,
        selectedSize,

        // Booking details
        eventDate,
        eventTime,
        eventTimePeriod,
        eventType: eventType === "Others" ? otherEventType : eventType,
        otherEventType: eventType === "Others" ? otherEventType : undefined,
        eventLocation,
        fittingTime,
        fittingTimePeriod,
        includeMakeup,

        // Seller information
        ownerUsername,
        ownerUid: productData.userId,
        sellerLocation,

        // Calculated totals
        itemTotal,
        totalPrice,
      };

      console.log("Adding to cart with data:", cartItemData);

      // Add to cart using the cart service
      await cartService.addToCart(cartItemData);

      Alert.alert(
        "Success",
        "Item added to cart! You can complete the booking later from My Cart.",
        [
          {
            text: "View Cart",
            onPress: () => router.push("/(store)/my-cart"),
          },
          {
            text: "Continue Shopping",
            onPress: () => router.push("/(tabs)"),
            style: "cancel",
          },
        ]
      );
    } catch (error: any) {
      console.error("Error adding to cart:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to add item to cart. Please try again."
      );
    } finally {
      setIsAddingToCart(false);
    }
  };

  useEffect(() => {
    const fetchSellerLocation = async () => {
      try {
        setIsLoadingProduct(true);
        if (productId) {
          console.log("Fetching product data for ID:", productId);
          // Get the product details to get seller's ID and image
          const productData = await productsService.getProductById(
            productId.toString()
          );
          console.log("Fetched product:", productData);

          // Set available quantity
          const quantity = productData?.quantity || 0;
          setAvailableQuantity(quantity);
          console.log("Product quantity loaded:", quantity);

          if (productData?.image) {
            setProductImage(productData.image);
          }

          if (productData?.userId) {
            console.log(
              "Fetching seller data for user ID:",
              productData.userId
            );
            // Get the token for authentication
            const token = await AsyncStorage.getItem("userToken");
            if (!token) {
              throw new Error("No authentication token found");
            }

            // Fetch seller's profile to get their current location and username
            const response = await api.get(`/users/${productData.userId}`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });
            console.log("Fetched seller data:", response.data);

            if (response.data?.profile?.address) {
              const { street, city, state, country } =
                response.data.profile.address;
              const location = [street, city, state, country]
                .filter(Boolean)
                .join(", ");
              setSellerLocation(location || "Location not available");
            }

            if (response.data?.username) {
              console.log("Setting owner username:", response.data.username);
              setOwnerUsername(response.data.username);
            } else {
              console.error("No username found in seller data");
              throw new Error("Seller username not found");
            }
          } else {
            console.error("No userId found in product data");
            throw new Error("Product owner information is missing");
          }
        }
      } catch (error) {
        console.error("Error fetching seller location:", error);
        setSellerLocation("Location not available");
        setAvailableQuantity(0); // Set to 0 on error to prevent booking
        // Don't set ownerUsername on error to trigger the validation in handleConfirmBooking
      } finally {
        setIsLoadingProduct(false);
      }
    };

    fetchSellerLocation();
  }, [productId]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color="#666" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirm Booking</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Product Information (New Section) */}
        {productName && (
          <View style={styles.productInfoContainer}>
            <Text style={styles.sectionTitle}>Product</Text>
            <Text style={styles.productName}>{productName}</Text>

            <View style={styles.sizeSelectorContainer}>
              <View style={styles.sizeSelectorHeader}>
                <Ionicons name="shirt-outline" size={22} color="#4A5568" />
                <Text style={styles.sizeSelectorTitle}>Select Size</Text>
              </View>
              <View style={styles.sizeOptionsContainer}>
                {["S", "M", "L", "XL"].map((size) => (
                  <TouchableOpacity
                    key={size}
                    style={[
                      styles.sizeOption,
                      selectedSize === size && styles.sizeOptionSelected,
                    ]}
                    onPress={() => setSelectedSize(size)}
                  >
                    <Text
                      style={[
                        styles.sizeOptionText,
                        selectedSize === size && styles.sizeOptionTextSelected,
                      ]}
                    >
                      {size}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Quantity Selector */}
            <View style={styles.quantitySelectorContainer}>
              <View style={styles.quantitySelectorHeader}>
                <MaterialIcons name="inventory" size={22} color="#4A5568" />
                <Text style={styles.quantitySelectorTitle}>Quantity</Text>
              </View>
              <View style={styles.quantityControls}>
                <TouchableOpacity
                  style={[
                    styles.quantityButton,
                    selectedQuantity <= 1 && styles.quantityButtonDisabled,
                  ]}
                  onPress={() =>
                    setSelectedQuantity(Math.max(1, selectedQuantity - 1))
                  }
                  disabled={selectedQuantity <= 1}
                >
                  <AntDesign
                    name="minus"
                    size={18}
                    color={selectedQuantity <= 1 ? "#ccc" : "#4A5568"}
                  />
                </TouchableOpacity>

                <View style={styles.quantityDisplay}>
                  <Text style={styles.quantityValue}>{selectedQuantity}</Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.quantityButton,
                    (selectedQuantity >= availableQuantity ||
                      availableQuantity <= 0 ||
                      isLoadingProduct) &&
                      styles.quantityButtonDisabled,
                  ]}
                  onPress={() =>
                    setSelectedQuantity(
                      Math.min(availableQuantity, selectedQuantity + 1)
                    )
                  }
                  disabled={
                    selectedQuantity >= availableQuantity ||
                    availableQuantity <= 0 ||
                    isLoadingProduct
                  }
                >
                  <AntDesign
                    name="plus"
                    size={18}
                    color={
                      selectedQuantity >= availableQuantity ||
                      availableQuantity <= 0 ||
                      isLoadingProduct
                        ? "#ccc"
                        : "#4A5568"
                    }
                  />
                </TouchableOpacity>
              </View>
              {isLoadingProduct ? (
                <Text style={styles.availabilityText}>
                  Loading availability...
                </Text>
              ) : (
                <>
                  <Text style={styles.availabilityText}>
                    Available: {availableQuantity}{" "}
                    {availableQuantity === 1 ? "item" : "items"}
                  </Text>
                  {availableQuantity === 0 && (
                    <Text style={styles.outOfStockText}>Out of Stock</Text>
                  )}
                </>
              )}
            </View>
          </View>
        )}

        {/* Calendar Section */}
        <View style={styles.calendarContainer}>
          <Text style={styles.sectionTitle}>Select Fitting Date</Text>

          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={handlePrevMonth}>
              <MaterialIcons name="chevron-left" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.monthText}>
              {currentDate.toLocaleString("default", {
                month: "long",
                year: "numeric",
              })}
            </Text>
            <TouchableOpacity onPress={handleNextMonth}>
              <MaterialIcons name="chevron-right" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Calendar Days Header */}
          <View style={styles.daysHeader}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
              (day, index) => (
                <Text key={index} style={styles.dayHeaderText}>
                  {day}
                </Text>
              )
            )}
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendarGrid}>
            {days.map((day, index) => {
              if (day === null) {
                return <View key={index} style={styles.emptyDay} />;
              }

              const isSelected = day === selectedDate;

              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.dayCell, isSelected && styles.selectedDay]}
                  onPress={() => handleDateSelect(day)}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isSelected && styles.selectedDayText,
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Fitting Time Selection */}
          <View style={styles.fittingTimeContainer}>
            <Text style={styles.fittingTimeLabel}>
              Preferred Time of Arrival
            </Text>
            <View style={styles.fittingTimeInputContainer}>
              <TextInput
                style={styles.fittingTimeInput}
                value={fittingTime}
                onChangeText={setFittingTime}
                placeholder="HH:MM"
                placeholderTextColor="#999"
              />
              <View style={styles.timePeriodContainer}>
                <TouchableOpacity
                  style={[
                    styles.timePeriodButton,
                    fittingTimePeriod === "AM" && styles.timePeriodButtonActive,
                  ]}
                  onPress={() => setFittingTimePeriod("AM")}
                >
                  <Text
                    style={[
                      styles.timePeriodText,
                      fittingTimePeriod === "AM" && styles.timePeriodTextActive,
                    ]}
                  >
                    AM
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.timePeriodButton,
                    fittingTimePeriod === "PM" && styles.timePeriodButtonActive,
                  ]}
                  onPress={() => setFittingTimePeriod("PM")}
                >
                  <Text
                    style={[
                      styles.timePeriodText,
                      fittingTimePeriod === "PM" && styles.timePeriodTextActive,
                    ]}
                  >
                    PM
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Event Details */}
        <View style={styles.eventDetailsContainer}>
          <Text style={styles.sectionTitle}>Event Details</Text>

          <View style={styles.eventDetailRow}>
            <Text style={styles.eventDetailLabel}>Type of Event</Text>
            <View style={styles.eventTypeInputContainer}>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setIsDropdownOpen(true)}
              >
                <Text style={styles.dropdownButtonText}>
                  {eventType || "Select an event type"}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>

              {eventType === "Others" && (
                <TextInput
                  style={styles.eventTypeInput}
                  placeholder="Please specify your event"
                  placeholderTextColor="#999"
                  value={otherEventType}
                  onChangeText={setOtherEventType}
                />
              )}
            </View>
          </View>

          <Modal
            transparent={true}
            visible={isDropdownOpen}
            animationType="fade"
            onRequestClose={() => setIsDropdownOpen(false)}
          >
            <TouchableWithoutFeedback onPress={() => setIsDropdownOpen(false)}>
              <View style={styles.modalOverlay}>
                <View style={styles.dropdownContainer}>
                  {eventOptions.map((option, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.dropdownOption}
                      onPress={() => {
                        setEventType(option);
                        setIsDropdownOpen(false);
                      }}
                    >
                      <Text style={styles.dropdownOptionText}>{option}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </Modal>

          <View style={styles.eventDetailRow}>
            <Text style={styles.eventDetailLabel}>Date of Event</Text>
            <View style={styles.eventDateInputContainer}>
              <TextInput
                style={styles.eventDateInput}
                value={eventDate}
                onChangeText={setEventDate}
              />
              <Ionicons name="calendar" size={20} color="#666" />
            </View>
          </View>

          <View style={styles.eventDetailRow}>
            <Text style={styles.eventDetailLabel}>Time of Event</Text>
            <View style={styles.eventTimeInputContainer}>
              <TextInput
                style={styles.eventTimeInput}
                value={eventTime}
                onChangeText={setEventTime}
                placeholder="HH:MM"
                placeholderTextColor="#999"
              />
              <View style={styles.timePeriodContainer}>
                <TouchableOpacity
                  style={[
                    styles.timePeriodButton,
                    eventTimePeriod === "AM" && styles.timePeriodButtonActive,
                  ]}
                  onPress={() => setEventTimePeriod("AM")}
                >
                  <Text
                    style={[
                      styles.timePeriodText,
                      eventTimePeriod === "AM" && styles.timePeriodTextActive,
                    ]}
                  >
                    AM
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.timePeriodButton,
                    eventTimePeriod === "PM" && styles.timePeriodButtonActive,
                  ]}
                  onPress={() => setEventTimePeriod("PM")}
                >
                  <Text
                    style={[
                      styles.timePeriodText,
                      eventTimePeriod === "PM" && styles.timePeriodTextActive,
                    ]}
                  >
                    PM
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.eventDetailRow}>
            <Text style={styles.eventDetailLabel}>Event Location</Text>
            <View style={styles.eventLocationInputContainer}>
              <TextInput
                style={styles.eventLocationInput}
                placeholder="Enter event location"
                placeholderTextColor="#999"
                value={eventLocation}
                onChangeText={setEventLocation}
              />
              <Ionicons name="location-outline" size={20} color="#666" />
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.makeupServiceContainer}
          onPress={() => setIncludeMakeup(!includeMakeup)}
        >
          <View style={styles.makeupServiceContent}>
            <Ionicons name="color-palette-outline" size={24} color="#6B46C1" />
            <View style={styles.makeupServiceTextContainer}>
              <Text style={styles.makeupServiceTitle}>Add Makeup Service</Text>
              <Text style={styles.makeupServicePrice}>
                + ₱{makeupServicePrice.toLocaleString()}
              </Text>
            </View>
          </View>
          <Ionicons
            name={includeMakeup ? "checkmark-circle" : "ellipse-outline"}
            size={24}
            color={includeMakeup ? "#6B46C1" : "#ccc"}
          />
        </TouchableOpacity>

        {/* Booking Summary */}
        <View style={styles.summaryContainer}>
          <Text style={styles.sectionTitle}>Booking Summary</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Service</Text>
            <Text style={styles.summaryValue}>{productName}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Size</Text>
            <Text style={styles.summaryValue}>
              {selectedSize || "Not selected"}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Quantity</Text>
            <Text style={styles.summaryValue}>
              {selectedQuantity} {selectedQuantity === 1 ? "item" : "items"}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Price per item</Text>
            <Text style={styles.summaryValue}>
              ₱{basePrice.toLocaleString()}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>
              ₱{itemTotal.toLocaleString()}
            </Text>
          </View>

          {includeMakeup && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Makeup Service</Text>
              <Text style={styles.summaryValue}>
                ₱{makeupServicePrice.toLocaleString()}
              </Text>
            </View>
          )}

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Product ID</Text>
            <Text style={styles.summaryValue}>{productId}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Event Type</Text>
            <Text style={styles.summaryValue}>
              {eventType || "Not specified"}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Fitting Date</Text>
            <Text style={styles.summaryValue}>
              {new Date(eventDate).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Preferred Time of Arrival</Text>
            <Text style={styles.summaryValue}>
              {fittingTime} {fittingTimePeriod}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Event Date</Text>
            <Text style={styles.summaryValue}>
              {new Date(eventDate).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Event Time</Text>
            <Text style={styles.summaryValue}>
              {eventTime} {eventTimePeriod}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Event Location</Text>
            <Text style={styles.summaryValue}>
              {eventLocation || "Not specified"}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Product Owner Location</Text>
            <Text style={styles.summaryValue}>{sellerLocation}</Text>
          </View>

          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>₱{formattedPrice}</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            {/* Add to Cart Button */}
            <TouchableOpacity
              style={[
                styles.addToCartButton,
                (isAddingToCart ||
                  availableQuantity === 0 ||
                  isLoadingProduct) &&
                  styles.addToCartButtonDisabled,
              ]}
              onPress={handleAddToCart}
              disabled={
                isAddingToCart || availableQuantity === 0 || isLoadingProduct
              }
            >
              {isAddingToCart ? (
                <ActivityIndicator color="#6B46C1" size="small" />
              ) : (
                <Text style={styles.addToCartButtonText}>
                  {isLoadingProduct
                    ? "Loading..."
                    : availableQuantity === 0
                    ? "Out of Stock"
                    : "Add to Cart"}
                </Text>
              )}
            </TouchableOpacity>

            {/* Confirm Booking Button */}
            <TouchableOpacity
              style={[
                styles.confirmButton,
                (isSubmitting || availableQuantity === 0 || isLoadingProduct) &&
                  styles.confirmButtonDisabled,
              ]}
              onPress={handleConfirmBooking}
              disabled={
                isSubmitting || availableQuantity === 0 || isLoadingProduct
              }
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.confirmButtonText}>
                  {isLoadingProduct
                    ? "Loading..."
                    : availableQuantity === 0
                    ? "Out of Stock"
                    : "Confirm Booking"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f8f8",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === "ios" ? 60 : 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6B46C1",
  },
  content: {
    flex: 1,
  },
  productInfoContainer: {
    backgroundColor: "#fff",
    paddingVertical: 8,
    paddingHorizontal: 4,
    // Ensure enough space for all content
  },
  dropdownButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 15,
    height: 50,
    backgroundColor: "#FFF",
  },
  dropdownButtonText: {
    fontSize: 16,
    color: "#333",
  },
  eventTypeInput: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    color: "#333",
    height: 50,
    marginTop: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  dropdownContainer: {
    backgroundColor: "#FFF",
    borderRadius: 8,
    padding: 10,
    width: width * 0.8,
    maxHeight: 300,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  dropdownOption: {
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  dropdownOptionText: {
    fontSize: 16,
    color: "#333",
  },
  productName: {
    fontSize: 16,
    paddingHorizontal: 8,
    fontWeight: "500",
    color: "#333",
  },
  calendarContainer: {
    backgroundColor: "#fff",
    paddingVertical: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    marginBottom: 16,
  },
  monthText: {
    fontSize: 16,
    fontWeight: "500",
  },
  daysHeader: {
    flexDirection: "row",
  },
  dayHeaderText: {
    fontSize: 14,
    color: "#666",
    width: width / 7,
    textAlign: "center",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: width / 7,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
  },
  dayText: {
    fontSize: 14,
  },
  selectedDay: {
    backgroundColor: "#6B46C1",
  },
  selectedDayText: {
    color: "#fff",
    fontWeight: "600",
  },
  eventDetailsContainer: {
    backgroundColor: "#fff",
    padding: 16,
  },
  eventDetailRow: {
    marginBottom: 20,
    zIndex: 1, // Ensure dropdown appears above other elements
  },
  makeupServiceContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F3E8FF",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#DCDCDC",
  },
  makeupServiceContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  makeupServiceTextContainer: {
    marginLeft: 12,
  },
  makeupServiceTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  makeupServicePrice: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  eventDetailLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  eventTypeInputContainer: {
    // This now acts as a simple container for the dropdown button
    // and the conditional 'Others' text input.
  },
  eventDateInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
    paddingHorizontal: 12,
    height: 44,
  },
  eventDateInput: {
    flex: 1,
    height: 40,
  },
  eventTimeInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
    paddingHorizontal: 12,
    height: 44,
  },
  eventTimeInput: {
    flex: 1,
    height: 40,
  },
  eventLocationInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
    paddingHorizontal: 12,
    height: 44,
  },
  eventLocationInput: {
    flex: 1,
    height: 40,
  },
  summaryContainer: {
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: Platform.OS === "ios" ? 100 : 80,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  summaryLabel: {
    fontSize: 14,
    color: "#666",
  },
  summaryValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
    textAlign: "right",
    flex: 1,
    marginLeft: 16,
  },
  totalRow: {
    borderBottomWidth: 0,
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#6B46C1",
  },
  sizeSelectorContainer: {
    marginTop: 16,
    backgroundColor: "#F7FAFC",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sizeSelectorHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sizeSelectorTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2D3748",
    marginLeft: 8,
  },
  sizeOptionsContainer: {
    flexDirection: "row",
    gap: 12,
  },
  sizeOption: {
    minWidth: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CBD5E0",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
  },
  sizeOptionSelected: {
    backgroundColor: "#E9D8FD",
    borderColor: "#9F7AEA",
  },
  sizeOptionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4A5568",
  },
  sizeOptionTextSelected: {
    color: "#6B46C1",
  },
  fittingTimeContainer: {
    marginTop: 16,
    paddingTop: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  fittingTimeLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  fittingTimeInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
    paddingHorizontal: 12,
    height: 44,
  },
  fittingTimeInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  timePeriodContainer: {
    flexDirection: "row",
    marginLeft: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
    overflow: "hidden",
  },
  timePeriodButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#fff",
  },
  timePeriodButtonActive: {
    backgroundColor: "#6B46C1",
  },
  timePeriodText: {
    fontSize: 12,
    color: "#666",
  },
  timePeriodTextActive: {
    color: "#fff",
    fontWeight: "500",
  },
  confirmButton: {
    flex: 1,
    backgroundColor: "#7E57C2",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  confirmButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  emptyDay: {
    width: width / 7,
    height: 40,
  },
  quantitySelectorContainer: {
    marginTop: 16,
    backgroundColor: "#F7FAFC",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  quantitySelectorHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  quantitySelectorTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2D3748",
    marginLeft: 8,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E0",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 16,
  },
  quantityButtonDisabled: {
    backgroundColor: "#F7FAFC",
    borderColor: "#E2E8F0",
  },
  quantityDisplay: {
    minWidth: 60,
    height: 40,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E0",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  quantityValue: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2D3748",
  },
  availabilityText: {
    fontSize: 14,
    color: "#4A5568",
    textAlign: "center",
    marginTop: 4,
  },
  outOfStockText: {
    fontSize: 14,
    color: "#E53E3E",
    textAlign: "center",
    marginTop: 4,
    fontWeight: "600",
  },
  actionButtonsContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "ios" ? 40 : 30,
    backgroundColor: '#fff',
  },
  addToCartButton: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#7E57C2",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  addToCartButtonText: {
    color: "#7E57C2",
    fontWeight: "600",
    fontSize: 16,
  },
  addToCartButtonDisabled: {
    opacity: 0.7,
    borderColor: "#ccc",
  },
});

export default ConfirmBooking;
