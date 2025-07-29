import React from "react";
import {
  View,
  Image,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
} from "react-native";

const LoadingScreen = () => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <Image
        source={require("../assets/images/logo.png")} // Path relative to this component
        style={styles.logo}
        resizeMode="contain"
      />
      <ActivityIndicator size="large" color="#FFFFFF" style={styles.spinner} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF", // White background to match app theme
  },
  logo: {
    width: 200, // You might want to adjust this based on your logo's aspect ratio
    height: 100, // You might want to adjust this based on your logo's aspect ratio
    marginBottom: 40,
  },
  spinner: {
    // Styles for spinner if needed, e.g., marginTop
  },
});

export default LoadingScreen;
