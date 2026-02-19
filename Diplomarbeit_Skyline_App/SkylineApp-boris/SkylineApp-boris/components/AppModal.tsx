import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn, SlideInUp } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

interface AppModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  animationType?: 'slide' | 'fade';
  presentationStyle?: 'fullScreen' | 'pageSheet' | 'formSheet';
  keyboardAvoiding?: boolean;
}

export default function AppModal({
  visible,
  onClose,
  title,
  subtitle,
  children,
  showCloseButton = true,
  animationType = 'slide',
  presentationStyle = 'pageSheet',
  keyboardAvoiding = true
}: AppModalProps) {
  const insets = useSafeAreaInsets();
  
  const handleClose = () => {
    onClose();
  };

  const content = (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={['#000', '#1a1a1a']}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Header - only show if there's a title or if we need the close button without header box */}
      {(title || subtitle) ? (
        <Animated.View entering={SlideInUp.delay(100).springify()} style={styles.header}>
          <LinearGradient
            colors={['rgba(30,30,30,0.98)', 'rgba(20,20,20,0.95)']}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              <View style={styles.headerText}>
                <Text style={styles.title}>{title}</Text>
                {subtitle && (
                  <Text style={styles.subtitle}>{subtitle}</Text>
                )}
              </View>
              
              {showCloseButton && (
                <Pressable
                  style={({ pressed }) => [
                    styles.closeButton,
                    pressed && styles.closeButtonPressed
                  ]}
                  onPress={handleClose}
                >
                  <MaterialIcons name="close" size={24} color="rgba(255,255,255,0.7)" />
                </Pressable>
              )}
            </View>
          </LinearGradient>
        </Animated.View>
      ) : (
        // Floating close button when no title/subtitle
        showCloseButton && (
          <Animated.View 
            entering={SlideInUp.delay(100).springify()} 
            style={[styles.floatingCloseContainer, { top: Math.max(insets.top, 60) }]}
          >
            <Pressable
              style={({ pressed }) => [
                styles.floatingCloseButton,
                pressed && styles.closeButtonPressed
              ]}
              onPress={handleClose}
            >
              <MaterialIcons name="close" size={24} color="rgba(255,255,255,0.7)" />
            </Pressable>
          </Animated.View>
        )
      )}
      
      {/* Content */}
      <Animated.View entering={FadeIn.delay(200)} style={styles.content}>
        {children}
      </Animated.View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType={animationType}
      presentationStyle={presentationStyle}
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.safeArea}>
        {keyboardAvoiding ? (
          <KeyboardAvoidingView
            style={styles.keyboardContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            {content}
          </KeyboardAvoidingView>
        ) : (
          content
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  keyboardContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  headerGradient: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  headerText: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Nexa-Heavy',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Nexa-ExtraLight',
    color: 'rgba(255,255,255,0.7)',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonPressed: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    transform: [{ scale: 0.95 }],
  },
  floatingCloseContainer: {
    position: 'absolute',
    right: 20,
    zIndex: 1000,
  },
  floatingCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  content: {
    flex: 1,
  },
});
