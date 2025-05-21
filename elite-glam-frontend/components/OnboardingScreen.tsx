import { StyleSheet, Text, View, FlatList, Animated, TouchableOpacity, ViewToken, ImageSourcePropType } from 'react-native'
import React, { useRef, useState } from 'react'
import OnboardItem from './OnboardItem';
import Paginator from './Paginator';
import { router, Href } from 'expo-router';

interface OnboardingItem {
    id: number;
    title: string;
    subtitle: string;
    description: string;
    image: ImageSourcePropType;
}

const DATA: OnboardingItem[] = [
    {
      id: 1,
      title: "Look Stunning,",
      subtitle: "Rent Effortlessly!",
      description: "Find the perfect dress or suit for any special occasion with confidence",
      image: require('../assets/images/Gown.png'), // Update path as needed
    },
    {
      id: 2,
      title: "Browse Collections",
      subtitle: "Find Your Style",
      description: "Explore our wide range of designer dresses and formal wear",
      image: require('../assets/images/Suite.png'), // Update path as needed
    },
    {
      id: 3,
      title: "Easy Rental",
      subtitle: "Simple Returns",
      description: "Hassle-free booking and return process for your convenience",
      image: require('../assets/images/GownDes.png'), // Update path as needed
    },
];

const OnboardingScreen: React.FC = () => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollX = useRef(new Animated.Value(0)).current;
    const slidesRef = useRef<FlatList<OnboardingItem>>(null);

    const scrollToNextSlide = () => {
        if (currentIndex < DATA.length - 1) {
            slidesRef.current?.scrollToIndex({
                index: currentIndex + 1,
                animated: true
            });
            setCurrentIndex(currentIndex + 1);
        } else {
            router.replace('/(auth)/login' as Href<any>);
        }
    };

    const handleSkip = () => {
        router.replace('/(auth)/login' as Href<any>);
    };

    const viewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        setCurrentIndex(viewableItems[0]?.index ?? 0);
    }).current;

    const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

    return (
        <View style={styles.container}>
            <View style={{ flex: 3 }}>
                <FlatList
                    data={DATA}
                    renderItem={({ item }) => (
                        <OnboardItem
                            title={item.title}
                            subtitle={item.subtitle}
                            description={item.description}
                            image={item.image}
                        />
                    )}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    pagingEnabled
                    bounces={false}
                    keyExtractor={(item) => item.id.toString()}
                    onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
                        useNativeDriver: false,
                    })}
                    scrollEventThrottle={32}
                    onViewableItemsChanged={viewableItemsChanged}
                    viewabilityConfig={viewConfig}
                    ref={slidesRef}
                    scrollEnabled={false}
                />
            </View>
            <Paginator data={DATA} scrollX={scrollX} />
            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={styles.button}
                    onPress={scrollToNextSlide}
                >
                    <Text style={styles.buttonText}>
                        {currentIndex === DATA.length - 1 ? 'Get Started' : 'Next'}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.skipButton}
                    onPress={handleSkip}
                >
                    <Text style={styles.skipText}>Skip</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'white',
    },
    buttonContainer: {
        position: 'absolute',
        bottom: 20,
        alignItems: 'center',
    },
    button: {
        backgroundColor: '#6B3FA0',
        paddingVertical: 15,
        paddingHorizontal: 40,
        borderRadius: 25,
        marginBottom: 10,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    skipButton: {
        paddingVertical: 10,
    },
    skipText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '600',
    }
});

export default OnboardingScreen; 