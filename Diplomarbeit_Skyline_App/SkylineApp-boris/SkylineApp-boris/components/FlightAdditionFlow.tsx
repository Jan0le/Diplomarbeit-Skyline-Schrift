import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import Animated, { FadeInDown, FadeInLeft, FadeInRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Typography } from '@/constants/DesignTokens';
import AppModal from './AppModal';

interface FlightAdditionFlowProps {
  visible: boolean;
  onClose: () => void;
}

export default function FlightAdditionFlow({ visible, onClose }: FlightAdditionFlowProps) {
  const [currentStep, setCurrentStep] = useState<'method' | 'manual' | 'import' | 'preview'>('method');
  const insets = useSafeAreaInsets();

  const handleMethodSelect = (method: 'manual' | 'import') => {
    if (method === 'manual') {
      // Navigate to manual flight creation
      onClose();
      router.push('/add-flight-manual');
    } else {
      // Navigate to document import
      onClose();
      router.push('/add-flight-import');
    }
  };

  const renderMethodSelection = () => (
    <ScrollView 
      style={styles.scrollContainer}
      contentContainerStyle={[styles.container, { paddingTop: Math.max(insets.top, 20) }]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.header}>
        <View style={styles.iconContainer}>
          <MaterialIcons name="flight-takeoff" size={48} color="#ff1900" />
        </View>
        <Text style={styles.title}>Add Your Flight</Text>
        <Text style={styles.subtitle}>
          Choose how you&apos;d like to add your flight information
        </Text>
      </Animated.View>

      <View style={styles.optionsContainer}>
        {/* Manual Input Option */}
        <Animated.View entering={FadeInLeft.delay(200).springify()}>
          <Pressable
            style={({ pressed }) => [
              styles.optionCard,
              pressed && styles.optionCardPressed
            ]}
            onPress={() => handleMethodSelect('manual')}
          >
            <LinearGradient
              colors={['rgba(30,30,30,0.98)', 'rgba(20,20,20,0.95)']}
              style={styles.optionGradient}
            >
              <View style={styles.optionIcon}>
                <MaterialIcons name="edit" size={32} color="#ff1900" />
              </View>
              <Text style={styles.optionTitle}>Manual Input</Text>
              <Text style={styles.optionDescription}>
                Enter flight details manually with our guided form
              </Text>
              <View style={styles.optionFeatures}>
                <View style={styles.feature}>
                  <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                  <Text style={styles.featureText}>Airport search</Text>
                </View>
                <View style={styles.feature}>
                  <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                  <Text style={styles.featureText}>Date picker</Text>
                </View>
                <View style={styles.feature}>
                  <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                  <Text style={styles.featureText}>Notes & photos</Text>
                </View>
              </View>
              <View style={styles.optionButton}>
                <Text style={styles.optionButtonText}>Get Started</Text>
                <MaterialIcons name="arrow-forward" size={20} color="#fff" />
              </View>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {/* Document Import Option */}
        <Animated.View entering={FadeInRight.delay(300).springify()}>
          <Pressable
            style={({ pressed }) => [
              styles.optionCard,
              pressed && styles.optionCardPressed
            ]}
            onPress={() => handleMethodSelect('import')}
          >
            <LinearGradient
              colors={['rgba(30,30,30,0.98)', 'rgba(20,20,20,0.95)']}
              style={styles.optionGradient}
            >
              <View style={styles.optionIcon}>
                <MaterialIcons name="document-scanner" size={32} color="#ff1900" />
              </View>
              <Text style={styles.optionTitle}>Import Document</Text>
              <Text style={styles.optionDescription}>
                Scan boarding pass, ticket, or confirmation email
              </Text>
              <View style={styles.optionFeatures}>
                <View style={styles.feature}>
                  <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                  <Text style={styles.featureText}>OCR scanning</Text>
                </View>
                <View style={styles.feature}>
                  <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                  <Text style={styles.featureText}>Auto-fill data</Text>
                </View>
                <View style={styles.feature}>
                  <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                  <Text style={styles.featureText}>Quick & accurate</Text>
                </View>
              </View>
              <View style={styles.optionButton}>
                <Text style={styles.optionButtonText}>Scan Document</Text>
                <MaterialIcons name="camera-alt" size={20} color="#fff" />
              </View>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
    </ScrollView>
  );

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title=""
      subtitle=""
      animationType="slide"
      presentationStyle="fullScreen"
    >
      {renderMethodSelection()}
    </AppModal>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,25,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontFamily: Typography.fontFamily.display,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  optionsContainer: {
    gap: 16,
    marginBottom: 20,
  },
  optionCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  optionCardPressed: {
    transform: [{ scale: 0.98 }],
  },
  optionGradient: {
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  optionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,25,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  optionTitle: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.display,
    color: Colors.text.primary,
    marginBottom: 6,
  },
  optionDescription: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.secondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  optionFeatures: {
    gap: 8,
    marginBottom: 24,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: 'rgba(255,255,255,0.8)',
    marginLeft: 8,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ff1900',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  optionButtonText: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.display,
    color: '#fff',
  },
  helpSection: {
    marginTop: 24,
  },
  helpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,25,0,0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,25,0,0.2)',
  },
  helpText: {
    flex: 1,
    marginLeft: 12,
  },
  helpTitle: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.display,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  helpDescription: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.secondary,
    lineHeight: 16,
  },
});
