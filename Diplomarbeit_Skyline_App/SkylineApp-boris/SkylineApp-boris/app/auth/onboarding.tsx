import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  title: string;
  subtitle: string;
  image: any;
}

const slides: OnboardingSlide[] = [
  {
    id: '1',
    title: 'Track Your Flights',
    subtitle: 'Every journey matters',
    image: require('../../assets/images/onboarding1.png'),
  },
  {
    id: '2',
    title: 'Visualize Routes',
    subtitle: 'See the world you\'ve explored',
    image: require('../../assets/images/onboarding2.png'),
  },
  {
    id: '3',
    title: 'Analyze Travel',
    subtitle: 'Insights that inspire',
    image: require('../../assets/images/onboarding3.png'),
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageLoadingStates, setImageLoadingStates] = useState<boolean[]>([true, true, true]);
  const [preloadedImages, setPreloadedImages] = useState<boolean[]>([false, false, false]);
  const translateX = useSharedValue(0);

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    setCurrentIndex(index);
    translateX.value = offsetX;
  };

  const handleImageLoad = (index: number) => {
    setImageLoadingStates(prev => {
      const newStates = [...prev];
      newStates[index] = false;
      return newStates;
    });
    setPreloadedImages(prev => {
      const newStates = [...prev];
      newStates[index] = true;
      return newStates;
    });
  };

  // Preload images in background
  const preloadImage = (imageSource: any, index: number) => {
    Image.prefetch(Image.resolveAssetSource(imageSource).uri)
      .then(() => {
        setPreloadedImages(prev => {
          const newStates = [...prev];
          newStates[index] = true;
          return newStates;
        });
      })
      .catch(() => {});
  };

  // Preload all images on component mount
  useEffect(() => {
    slides.forEach((slide, index) => {
      preloadImage(slide.image, index);
    });
  }, []);

  // Preload next slide when current slide changes
  useEffect(() => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < slides.length && !preloadedImages[nextIndex]) {
      preloadImage(slides[nextIndex].image, nextIndex);
    }
    
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0 && !preloadedImages[prevIndex]) {
      preloadImage(slides[prevIndex].image, prevIndex);
    }
  }, [currentIndex]);

  const handleNext = async () => {
    if (currentIndex < slides.length - 1) {
      const nextIndex = currentIndex + 1;
      scrollViewRef.current?.scrollTo({
        x: nextIndex * SCREEN_WIDTH,
        animated: true,
      });
      setCurrentIndex(nextIndex);
    } else {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      // Mark as new user (no account yet)
      await AsyncStorage.setItem('hasAccount', 'false');
      router.replace('/auth');
    }
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    // Mark as new user (no account yet)
    await AsyncStorage.setItem('hasAccount', 'false');
    router.replace('/auth');
  };

  return (
    <View style={styles.container}>
      {/* Soft gradient background */}
      <LinearGradient
        colors={['#000000', '#0a0a0a', '#1a1a1a']}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Subtle background elements */}
      <View style={styles.backgroundElements}>
        <View style={[styles.blob, styles.blob1]} />
        <View style={[styles.blob, styles.blob2]} />
      </View>

      <SafeAreaView style={styles.safeArea}>
        {/* Minimal header */}
        <Animated.View 
          entering={FadeInDown.delay(200).springify()}
          style={styles.header}
        >
          <View style={styles.logoContainer}>
            <Image 
              source={require('../../assets/SkylineLOGOWHite.png')} 
              style={styles.headerLogo}
              resizeMode="contain"
            />
          </View>
          <Pressable onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </Animated.View>

        {/* Main content - Image focused */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={styles.scrollView}
        >
          {slides.map((slide, index) => (
            <View key={slide.id} style={styles.slide}>
              {/* Large image section - main focus */}
              <Animated.View 
                entering={FadeInUp.delay(300 + index * 100).springify()}
                style={styles.imageSection}
              >
                <View style={styles.imageContainer}>
                  {imageLoadingStates[index] && !preloadedImages[index] && (
                    <View style={styles.imageLoader}>
                      <ActivityIndicator size="large" color="#ff1900" />
                    </View>
                  )}
                  <Image 
                    source={slide.image} 
                    style={[styles.image, imageLoadingStates[index] && !preloadedImages[index] && styles.imageLoading]} 
                    resizeMode="cover"
                    onLoad={() => handleImageLoad(index)}
                    onLoadStart={() => {
                      if (!preloadedImages[index]) {
                        setImageLoadingStates(prev => {
                          const newStates = [...prev];
                          newStates[index] = true;
                          return newStates;
                        });
                      }
                    }}
                    fadeDuration={preloadedImages[index] ? 0 : 300}
                    progressiveRenderingEnabled={true}
                  />
                </View>
              </Animated.View>
            </View>
          ))}
        </ScrollView>

        {/* Bottom section - minimal */}
        <Animated.View 
          entering={FadeInDown.delay(600).springify()}
          style={styles.bottomSection}
        >
          {/* Clean pagination */}
          <View style={styles.pagination}>
            {slides.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  currentIndex === index && styles.activeDot,
                ]}
              />
            ))}
          </View>

          {/* Modern action button */}
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              pressed && styles.actionButtonPressed,
            ]}
            onPress={handleNext}
          >
            <LinearGradient
              colors={['#ff3b00', '#ff1900']}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.buttonText}>
                {currentIndex === slides.length - 1 ? 'Get Started' : 'Continue'}
              </Text>
              <MaterialIcons 
                name={currentIndex === slides.length - 1 ? 'rocket-launch' : 'arrow-forward'} 
                size={20} 
                color="#fff" 
                style={styles.buttonIcon}
              />
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  backgroundElements: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  blob: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 25, 0, 0.03)',
    borderRadius: 1000,
  },
  blob1: {
    width: 300,
    height: 300,
    top: -150,
    right: -100,
  },
  blob2: {
    width: 200,
    height: 200,
    bottom: 100,
    left: -50,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 10,
  },
  logoContainer: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerLogo: {
    width: 28,
    height: 28,
  },
  skipButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  skipText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 15,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
  imageSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  imageContainer: {
    width: '100%',
    height: '95%',
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#ff1900',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 20,
    position: 'relative',
    backgroundColor: '#0a0a0a',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
  },
  imageLoading: {
    opacity: 0,
  },
  imageLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
    borderRadius: 32,
    zIndex: 1,
  },
  preloadIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff1900',
    opacity: 0.7,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 20,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 6,
  },
  activeDot: {
    backgroundColor: '#ff1900',
    width: 24,
    height: 8,
    borderRadius: 4,
  },
  actionButton: {
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#ff1900',
    shadowColor: '#ff1900',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  actionButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 28,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  buttonIcon: {
    marginLeft: 8,
  },
});