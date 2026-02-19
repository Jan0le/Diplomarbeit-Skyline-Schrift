import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming
} from 'react-native-reanimated';

interface LoadingIndicatorProps {
  size?: 'small' | 'large';
  color?: string;
  message?: string;
  type?: 'spinner' | 'plane' | 'dots';
  style?: any;
}

export default function LoadingIndicator({
  size = 'small',
  color = '#ff1900',
  message,
  type = 'spinner',
  style,
}: LoadingIndicatorProps) {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);

  React.useEffect(() => {
    if (type === 'plane') {
      rotation.value = withRepeat(
        withTiming(360, { duration: 2000 }),
        -1,
        false
      );
    }
    
    if (type === 'dots') {
      scale.value = withRepeat(
        withTiming(1.2, { duration: 800 }),
        -1,
        true
      );
    }
  }, [type]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
    ],
  }));

  const renderIndicator = () => {
    switch (type) {
      case 'plane':
        return (
          <Animated.View style={animatedStyle}>
            <MaterialIcons 
              name="flight" 
              size={size === 'large' ? 32 : 24} 
              color={color} 
            />
          </Animated.View>
        );
        
      case 'dots':
        return (
          <View style={styles.dotsContainer}>
            {[0, 1, 2].map((index) => (
              <Animated.View
                key={index}
                style={[
                  styles.dot,
                  { backgroundColor: color },
                  animatedStyle,
                ]}
              />
            ))}
          </View>
        );
        
      default:
        return (
          <ActivityIndicator 
            size={size} 
            color={color} 
          />
        );
    }
  };

  return (
    <View style={[styles.container, style]}>
      {renderIndicator()}
      {message && (
        <Text style={[styles.message, { color }]}>
          {message}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
