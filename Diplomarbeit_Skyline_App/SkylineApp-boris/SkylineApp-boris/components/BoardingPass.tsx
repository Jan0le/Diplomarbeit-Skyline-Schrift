import { BorderRadius, Spacing } from '@/constants/DesignTokens';
import { MaterialIcons } from '@expo/vector-icons';
import React, { memo } from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  View
} from 'react-native';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
  Extrapolate,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

export interface BoardingPassData {
  flightNumber: string;
  airline: string;
  from: {
    code: string;
    city: string;
    time: string;
  };
  to: {
    code: string;
    city: string;
    time: string;
  };
  passenger: {
    name: string;
    seat: string;
  };
  gate: string;
  terminal: string;
  date: string;
  boardingTime: string;
  class: string;
}

interface BoardingPassProps {
  data: BoardingPassData;
  onDismiss: () => void;
  style?: any;
}

const BoardingPass: React.FC<BoardingPassProps> = memo(({ data, onDismiss, style }) => {
  // Animation shared values
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);
  
  // Tear-off animation values
  const topPartTranslateX = useSharedValue(0);
  const bottomPartTranslateX = useSharedValue(0);
  const bottomPartRotation = useSharedValue(0);
  const bottomPartOpacity = useSharedValue(1);
  const tearLineScale = useSharedValue(1);
  const tearLineOpacity = useSharedValue(1);
  
  // 3D Curl effects
  const bottomPartCurl = useSharedValue(0);
  const topPartCurl = useSharedValue(0);

  const playTearSound = () => {
    // Sound removed
  };

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      // Only move the bottom part during swipe
      translateX.value = 0; // Keep main card static
      bottomPartTranslateX.value = event.translationX;
      topPartTranslateX.value = 0; // Keep top part static
      
      // Dynamic tear effect based on swipe distance
      const progress = Math.min(Math.abs(event.translationX) / SWIPE_THRESHOLD, 1);
      
      // Tear line animation
      tearLineScale.value = 1 + progress * 0.2;
      tearLineOpacity.value = 1 - progress * 0.3;
      
      // 3D Curl effect while swiping
      bottomPartCurl.value = progress * 25;
      topPartCurl.value = progress * -10;
    })
    .onEnd((event) => {
      const shouldTear = event.translationX > SWIPE_THRESHOLD;
      
      if (shouldTear) {
        // DRAMATIC TEAR ANIMATION!
        runOnJS(playTearSound)();
        
        // Bottom part flies away with wild rotation
        bottomPartTranslateX.value = withTiming(SCREEN_WIDTH * 1.5, {
          duration: 800,
        });
        bottomPartRotation.value = withTiming(45, {
          duration: 800,
        });
        bottomPartOpacity.value = withTiming(0, {
          duration: 800,
        });
        
        // Tear line pulsates dramatically
        tearLineScale.value = withSpring(1.5, {
          damping: 8,
          stiffness: 100,
        });
        tearLineOpacity.value = withTiming(0, {
          duration: 600,
        });
        
        // 3D Curl - wie echtes Papier!
        bottomPartCurl.value = withSpring(45, {
          damping: 15,
          stiffness: 120,
        });
        topPartCurl.value = withSpring(-15, {
          damping: 15,
          stiffness: 120,
        });
        
        // Top part slides left and fades out after delay
        setTimeout(() => {
          topPartTranslateX.value = withTiming(-SCREEN_WIDTH, {
            duration: 600,
          });
          opacity.value = withTiming(0, {
            duration: 600,
          });
          
          setTimeout(() => {
            runOnJS(onDismiss)();
          }, 600);
        }, 400);
        
      } else {
        // Reset to original position with bounce
        translateX.value = withSpring(0, {
          damping: 10,
          stiffness: 150,
        });
        topPartTranslateX.value = withSpring(0, {
          damping: 10,
          stiffness: 150,
        });
        bottomPartTranslateX.value = withSpring(0, {
          damping: 10,
          stiffness: 150,
        });
        bottomPartRotation.value = withSpring(0, {
          damping: 10,
          stiffness: 150,
        });
        bottomPartOpacity.value = withSpring(1, {
          damping: 10,
          stiffness: 150,
        });
        tearLineScale.value = withSpring(1, {
          damping: 10,
          stiffness: 150,
        });
        tearLineOpacity.value = withSpring(1, {
          damping: 10,
          stiffness: 150,
        });
        scale.value = withSpring(1, {
          damping: 10,
          stiffness: 150,
        });
        opacity.value = withSpring(1, {
          damping: 10,
          stiffness: 150,
        });
        
        // Reset curl effects
        bottomPartCurl.value = withSpring(0, {
          damping: 15,
          stiffness: 120,
        });
        topPartCurl.value = withSpring(0, {
          damping: 15,
          stiffness: 120,
        });
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { scale: scale.value },
      ],
      opacity: opacity.value,
    };
  });

  const topPartStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: topPartTranslateX.value },
        { rotateX: `${topPartCurl.value}deg` },
      ],
    };
  });

  const bottomPartStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: bottomPartTranslateX.value },
        { rotate: `${bottomPartRotation.value}deg` },
        { rotateX: `${bottomPartCurl.value}deg` },
      ],
      opacity: bottomPartOpacity.value,
    };
  });

  const swipeIndicatorStyle = useAnimatedStyle(() => {
    const indicatorOpacity = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD * 0.5],
      [0.7, 0],
      Extrapolate.CLAMP
    );
    
    return {
      opacity: indicatorOpacity,
    };
  });

  const tearLineStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scaleX: tearLineScale.value },
      ],
      opacity: tearLineOpacity.value,
    };
  });

  return (
    <View style={[styles.container, style]}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.boardingPass, animatedStyle]}>
          {/* Swipe Indicator */}
          <Animated.View style={[styles.swipeIndicator, swipeIndicatorStyle]}>
            <MaterialIcons name="content-cut" size={20} color="#888888" />
            <Text style={styles.swipeText}>Tear here</Text>
          </Animated.View>

          {/* TOP PART */}
          <Animated.View style={[styles.topPart, topPartStyle]}>
            <View style={styles.header}>
              <Text style={styles.boardingPassTitle}>BOARDING PASS</Text>
              <Text style={styles.flightNumber}>{data.flightNumber}</Text>
            </View>

            <View style={styles.mainContent}>
              <View style={styles.routeContainer}>
                <View style={styles.routePoint}>
                  <Text style={styles.cityCodeLarge}>{data.from.code}</Text>
                  <Text style={styles.cityNameSmall}>{data.from.city}</Text>
                </View>
                
                <View style={styles.flightPath}>
                  <Text style={styles.flightDuration}>1h 10m</Text>
                  <MaterialIcons name="flight" size={20} color="#b0b0b0" />
                </View>
                
                <View style={styles.routePoint}>
                  <Text style={styles.cityCodeLarge}>{data.to.code}</Text>
                  <Text style={styles.cityNameSmall}>{data.to.city}</Text>
                </View>
              </View>
              
              <View style={styles.flightDetailsRow}>
                <View style={styles.flightDetail}>
                  <Text style={styles.detailLabel}>Flight No.</Text>
                  <Text style={styles.detailValue}>{data.flightNumber}</Text>
                </View>
                <View style={styles.flightDetail}>
                  <Text style={styles.detailLabel}>Distance</Text>
                  <Text style={styles.detailValue}>348 km</Text>
                </View>
                <View style={styles.flightDetail}>
                  <Text style={styles.detailLabel}>Date</Text>
                  <Text style={styles.detailValue}>{data.date}</Text>
                </View>
              </View>
              
              <View style={styles.boardingSection}>
                <Text style={styles.boardingLabel}>Boarding</Text>
                <Text style={styles.boardingTime}>{data.boardingTime}</Text>
              </View>
            </View>
          </Animated.View>

          {/* Tear Line */}
          <Animated.View style={[styles.decorativeElements, tearLineStyle]}>
            <View style={styles.tearLine}>
              {Array.from({ length: 35 }, (_, i) => {
                const isEven = i % 2 === 0;
                const variation = i % 4 === 0 ? 1.5 : 1;
                const yOffset = isEven ? -4 * variation : 4 * variation;
                const height = isEven ? 12 * variation : 8 * variation;

                return (
                  <View 
                    key={i} 
                    style={[
                      styles.tearPoint, 
                      { 
                        height: height,
                        transform: [{ translateY: yOffset }] 
                      }
                    ]} 
                  />
                );
              })}
            </View>
          </Animated.View>

          {/* BOTTOM PART */}
          <Animated.View style={[styles.bottomPart, bottomPartStyle]}>
            <View style={styles.barcodeSection}>
              <View style={styles.barcodeContainer}>
                {[3,1,1,1,2,1,1,2,1,1,1,1,2,2,1,3,1,1,3,1,2,1,1,2,3,1,1,1,2,2,2,1,1,3,1,1,2,2,1,1,3,1,1,1,2,3,1,1,1,2,1,2,2,1,1,3,1,1,2,1,3,1,1,2,1,2,2,1,1,3,1,1,3,1,2,1,1,2,1,3,1,1,2,2,1,1,3,1,1,1,2,3,3,1,1,1,2].map((width, i) => (
                  <View 
                    key={i} 
                    style={[
                      styles.barcodeLine, 
                      { 
                        width: width,
                        height: 45,
                        marginRight: 0.5
                      }
                    ]} 
                  />
                ))}
              </View>
              <Text style={styles.barcodeNumber}>123456789012345678901234567890</Text>
            </View>

            <View style={styles.footer}>
              <Text style={styles.airline}>{data.airline}</Text>
              <Text style={styles.class}>{data.class}</Text>
            </View>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
});

BoardingPass.displayName = 'BoardingPass';

export default BoardingPass;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: Spacing.xl,
  },
  boardingPass: {
    width: SCREEN_WIDTH * 0.9,
    backgroundColor: 'transparent',
    borderRadius: BorderRadius.card,
    overflow: 'hidden',
    perspective: '1000px',
  },
  swipeIndicator: {
    position: 'absolute',
    right: 20,
    top: '50%',
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    transform: [{ translateY: -15 }],
  },
  swipeText: {
    color: '#888888',
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '500',
  },
  topPart: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: '#333333',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  boardingPassTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  flightNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00d4ff',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  mainContent: {
    gap: 20,
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  routePoint: {
    alignItems: 'center',
    flex: 1,
  },
  cityCodeLarge: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  cityNameSmall: {
    fontSize: 12,
    color: '#b0b0b0',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  flightPath: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 0.8,
  },
  flightDuration: {
    fontSize: 14,
    color: '#b0b0b0',
    marginBottom: 4,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  flightDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  flightDetail: {
    alignItems: 'center',
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: '#888888',
    marginBottom: 4,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  detailValue: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  boardingSection: {
    alignItems: 'center',
  },
  boardingLabel: {
    fontSize: 11,
    color: '#888888',
    marginBottom: 4,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  boardingTime: {
    fontSize: 18,
    color: '#00d4ff',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  decorativeElements: {
    backgroundColor: 'transparent',
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tearLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  tearPoint: {
    width: 8,
    backgroundColor: '#444444',
    marginHorizontal: 1,
    borderRadius: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  bottomPart: {
    backgroundColor: '#0f0f0f',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: '#333333',
  },
  barcodeSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  barcodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '90%',
    paddingHorizontal: 10,
  },
  barcodeLine: {
    backgroundColor: '#ffffff',
    borderRadius: 0.5,
  },
  barcodeNumber: {
    fontSize: 12,
    color: '#b0b0b0',
    fontWeight: '500',
    letterSpacing: 2,
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#333333',
    marginTop: 8,
  },
  airline: {
    fontSize: 11,
    color: '#888888',
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  class: {
    fontSize: 11,
    color: '#888888',
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});