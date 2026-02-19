import { MaterialIcons } from '@expo/vector-icons';
import { router, Tabs, usePathname } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, useColorScheme, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Memoize LogoTitle to prevent recreation on every render
const LogoTitle = memo(() => (
  <Image
    source={require('../../assets/SkylineLOGOWHite.png')}
    style={{ width: 120, height: 40, resizeMode: 'contain' }}
  />
));
LogoTitle.displayName = 'LogoTitle';

// Move tabs array outside component to prevent recreation
const TABS = [
  { name: 'home', icon: 'home', route: 'home' },
  { name: 'map', icon: 'map', route: 'map' },
  { name: 'profile', icon: 'person', route: 'profile' },
  { name: 'settings', icon: 'settings', route: 'settings' },
] as const;

// Floating Custom Tab Bar - Memoized to prevent unnecessary re-renders
const FloatingCustomTabBar = memo(() => {
  const pathname = usePathname();
  const translateX = useSharedValue(0);
  const [tabWidthPx, setTabWidthPx] = useState(0);
  const insets = useSafeAreaInsets();
  
  // Memoize active index calculation
  const activeIndex = useMemo(() => {
    return Math.max(0, TABS.findIndex(tab => pathname.endsWith(tab.route)));
  }, [pathname]);
  
  const getIndicatorPosition = useCallback((index: number, width: number) => {
    const indicatorWidth = 44;
    const indicatorHalfWidth = indicatorWidth / 2;
    const containerPaddingLeft = 16;
    const tabCenter = (index + 0.5) * width;
    return containerPaddingLeft + tabCenter - indicatorHalfWidth - 1;
  }, []);

  const animateIndicatorToIndex = useCallback((index: number) => {
    if (index < 0 || tabWidthPx <= 0) return;
    const position = getIndicatorPosition(index, tabWidthPx);
    translateX.value = withSpring(position, {
      damping: 20,
      stiffness: 300,
      mass: 0.8,
    });
  }, [getIndicatorPosition, tabWidthPx, translateX]);

  useEffect(() => {
    if (tabWidthPx > 0) {
      requestAnimationFrame(() => {
        animateIndicatorToIndex(activeIndex);
      });
    }
  }, [activeIndex, animateIndicatorToIndex, tabWidthPx]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const handleTabPress = useCallback((route: (typeof TABS)[number]['route']) => {
    // Find the index of the pressed tab
    const pressedIndex = TABS.findIndex(tab => tab.route === route);
    
    // Immediately update indicator position for the pressed tab
    if (pressedIndex >= 0 && tabWidthPx > 0) {
      const position = getIndicatorPosition(pressedIndex, tabWidthPx);
      translateX.value = withSpring(position, {
        damping: 20,
        stiffness: 300,
        mass: 0.8,
      });
    }
    
    // Use imported router instead of require
    router.push(`/(tabs)/${route}`);
  }, [getIndicatorPosition, tabWidthPx, translateX]);

  // Memoize onLayout handler to prevent recreation
  const handleLayout = useCallback((event: any) => {
    const { width } = event.nativeEvent.layout;
    // The rounded container has paddingHorizontal: 16px
    // So the available space for tabs is: containerWidth - (16px * 2) = containerWidth - 32px
    const containerInternalPadding = 32; // 16px on each side
    const availableWidth = width - containerInternalPadding;
    const exactTabWidth = availableWidth / TABS.length;
    setTabWidthPx(exactTabWidth);
    
    // Set initial position immediately when layout is measured
    const currentActiveIndex = Math.max(0, TABS.findIndex(tab => pathname.endsWith(tab.route)));
    const initialPosition = getIndicatorPosition(currentActiveIndex, exactTabWidth);
    translateX.value = initialPosition;
  }, [getIndicatorPosition, pathname, translateX]);

  return (
    <View style={{ 
      position: 'absolute',
      bottom: insets.bottom + 20,
      left: 20,
      right: 20,
      alignItems: 'center',
    }}>
      {/* Floating rounded container */}
      <View 
        style={{
          backgroundColor: 'rgba(20, 20, 20, 0.95)',
          borderRadius: 25,
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.1)',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3,
          shadowRadius: 20,
          elevation: 10,
          flexDirection: 'row',
          position: 'relative',
        }}
        onLayout={handleLayout}
      >
        {/* Sliding Indicator */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 12,
              left: 0, // Dynamic positioning handled by translateX
              width: 44,
              height: 48,
              backgroundColor: '#ff1900',
              borderRadius: 12,
              zIndex: 1,
            },
            animatedStyle,
          ]}
        />
        
        {/* Tab Icons */}
        {TABS.map((tab) => {
          const isActive = pathname.endsWith(tab.route);
          return (
            <Pressable
              key={tab.name}
              onPress={() => handleTabPress(tab.route)}
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 12,
                zIndex: 2,
              }}
            >
              <MaterialIcons 
                name={tab.icon as keyof typeof MaterialIcons.glyphMap} 
                size={isActive ? 26 : 22} 
                color={isActive ? '#ffffff' : 'rgba(255,255,255,0.5)'} 
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
});
FloatingCustomTabBar.displayName = 'FloatingCustomTabBar';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        animation: 'fade',
        tabBarStyle: {
          display: 'none', // Hide the default tab bar completely
        },
        tabBarActiveTintColor: '#ff1900',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.5)',
        headerStyle: {
          backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#ffffff',
        },
        headerTintColor: colorScheme === 'dark' ? '#000000' : '#000000',
        headerTitle: LogoTitle, // Setze das Logo als Header-Title
        headerTitleAlign: 'center',
        headerShown: false,
        tabBarShowLabel: false,
        tabBarItemStyle: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 4,
          paddingHorizontal: 8,
        },
      }}
      tabBar={() => <FloatingCustomTabBar />}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
        }}
      />
    </Tabs>
  );
}
