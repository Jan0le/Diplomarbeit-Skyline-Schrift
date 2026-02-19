import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignupChoiceScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#212121', '#1a1a1a']}
        style={StyleSheet.absoluteFill}
      />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo/Header */}
          <Animated.View 
            entering={FadeInUp.delay(100).springify()}
            style={styles.header}
          >
            <View style={styles.logoContainer}>
              <Image 
                source={require('../../assets/SkylineLOGOWHite.png')} 
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Choose how you want to get started</Text>
          </Animated.View>

        {/* Choices */}
          <Animated.View 
            entering={FadeInDown.delay(200).springify()}
          style={{ gap: 16 }}
        >
            <Pressable
              style={({ pressed }) => [
                styles.button,
              styles.primaryButton,
                pressed && styles.buttonPressed,
              ]}
            onPress={() => router.push('/auth/signup-company')}
            >
            <LinearGradient colors={["#ff3b00", "#ff1900"]} style={styles.buttonGradient}>
              <Text style={styles.buttonText}>Create a Company (Owner)</Text>
              </LinearGradient>
            </Pressable>

              <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.secondaryButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => router.push('/auth/signup-user')}
              >
                <LinearGradient colors={["rgba(120,120,120,0.25)", "rgba(80,80,80,0.2)"]} style={styles.buttonGradient}>
              <Text style={styles.buttonText}>Sign up as User (Worker)</Text>
                </LinearGradient>
              </Pressable>

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <Pressable onPress={() => router.push('/auth/login')}>
                <Text style={styles.loginLink}>Log In</Text>
              </Pressable>
            </View>
          </Animated.View>
        </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#212121',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoContainer: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logo: {
    width: 70,
    height: 70,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Nexa-Heavy',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Nexa-ExtraLight',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  button: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#ff1900',
    shadowColor: '#ff1900',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  primaryButton: {
    backgroundColor: '#ff1900',
  },
  secondaryButton: {
    backgroundColor: 'rgba(80,80,80,0.15)',
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
  },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
    borderRadius: 24,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Nexa-ExtraLight',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  loginText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  loginLink: {
    color: '#ff1900',
    fontSize: 14,
    fontFamily: 'Nexa-ExtraLight',
  },
});