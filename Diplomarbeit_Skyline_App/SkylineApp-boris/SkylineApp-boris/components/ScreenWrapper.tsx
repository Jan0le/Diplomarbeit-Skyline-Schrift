import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import AppHeader from './AppHeader';

interface ScreenWrapperProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  showHeader?: boolean;
  showBackButton?: boolean;
  headerRightComponent?: React.ReactNode;
  onBackPress?: () => void;
  keyboardAvoiding?: boolean;
  style?: any;
}

export default function ScreenWrapper({
  children,
  title,
  subtitle,
  showHeader = true,
  showBackButton = false,
  headerRightComponent,
  onBackPress,
  keyboardAvoiding = false,
  style
}: ScreenWrapperProps) {
  
  const content = (
    <View style={[styles.container, style]}>
      {/* Background Gradient */}
      <LinearGradient
        colors={['rgba(255,25,0,0.05)', '#121212']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.8 }}
      />
      
      {/* Header */}
      {showHeader && title && (
        <AppHeader
          title={title}
          subtitle={subtitle}
          showBackButton={showBackButton}
          rightComponent={headerRightComponent}
          onBackPress={onBackPress}
        />
      )}
      
      {/* Content */}
      <Animated.View entering={FadeIn.delay(200)} style={styles.content}>
        {children}
      </Animated.View>
    </View>
  );

  if (keyboardAvoiding) {
    return (
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {content}
      </KeyboardAvoidingView>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
  },
});
