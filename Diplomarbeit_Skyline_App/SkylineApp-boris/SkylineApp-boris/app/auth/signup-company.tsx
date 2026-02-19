import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../contexts/AuthContext';
import { validateEmail, validatePassword } from '../../utils/validation';
import { createCompanyForCurrentUser } from '../../services/companyService';

export default function SignupCompanyScreen() {
  const router = useRouter();
  const { signup, isLoading, refreshMemberships } = useAuth();
  
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleSignup = async () => {
    if (!name || !companyName || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      const firstError = Object.values(passwordValidation.errors)[0];
      Alert.alert('Error', firstError);
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    try {
      setCreating(true);
      await signup(name, email, password);
      await createCompanyForCurrentUser(companyName.trim());
      await refreshMemberships();
      router.replace('/(tabs)/home');
    } catch (error: any) {
      Alert.alert('Signup Failed', error.message || 'Please try again');
    } finally {
      setCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#212121', '#1a1a1a']}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back Button */}
          <Pressable
            onPress={() => {
              const canGoBack = typeof (router as any).canGoBack === 'function' && (router as any).canGoBack();
              if (canGoBack) router.back(); else router.replace('/(tabs)/home');
            }}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </Pressable>

          <Animated.View entering={FadeInUp.delay(100).springify()} style={styles.header}>
            <View style={styles.logoContainer}>
              <Image 
                source={require('../../assets/SkylineLOGOWHite.png')} 
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>Create Company Account</Text>
            <Text style={styles.subtitle}>We&apos;ll create your user and your company</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.form}>
            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="business" size={20} color="rgba(255, 255, 255, 0.5)" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Company Name"
                  placeholderTextColor="rgba(255, 255, 255, 0.3)"
                  value={companyName}
                  onChangeText={setCompanyName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="person" size={20} color="rgba(255, 255, 255, 0.5)" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  placeholderTextColor="rgba(255, 255, 255, 0.3)"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="email" size={20} color="rgba(255, 255, 255, 0.5)" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="rgba(255, 255, 255, 0.3)"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="lock" size={20} color="rgba(255, 255, 255, 0.5)" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="rgba(255, 255, 255, 0.3)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                  <MaterialIcons name={showPassword ? 'visibility' : 'visibility-off'} size={20} color="rgba(255, 255, 255, 0.5)" />
                </Pressable>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="lock" size={20} color="rgba(255, 255, 255, 0.5)" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  placeholderTextColor="rgba(255, 255, 255, 0.3)"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeButton}>
                  <MaterialIcons name={showConfirmPassword ? 'visibility' : 'visibility-off'} size={20} color="rgba(255, 255, 255, 0.5)" />
                </Pressable>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
              onPress={handleSignup}
              disabled={isLoading || creating}
            >
              <LinearGradient colors={["#ff3b00", "#ff1900"]} style={styles.buttonGradient}>
                {isLoading || creating ? (<ActivityIndicator color="#fff" />) : (<Text style={styles.buttonText}>Create Company & Sign Up</Text>)}
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#212121' },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingVertical: 20 },
  backButton: { alignSelf: 'flex-start', padding: 8, marginBottom: 8 },
  header: { alignItems: 'center', marginBottom: 16 },
  logoContainer: { width: 70, height: 70, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  logo: { width: 60, height: 60 },
  title: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 13, color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center' },
  form: { flex: 1 },
  inputContainer: { marginBottom: 12 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.15)', paddingHorizontal: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: 48, color: '#fff', fontSize: 15, fontWeight: '500' },
  eyeButton: { padding: 8 },
  button: { borderRadius: 24, overflow: 'hidden', marginBottom: 12, backgroundColor: '#ff1900', shadowColor: '#ff1900', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 12 },
  buttonPressed: { transform: [{ scale: 0.98 }] },
  buttonGradient: { paddingVertical: 14, paddingHorizontal: 40, alignItems: 'center', borderRadius: 24 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  loginContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  loginText: { color: 'rgba(255, 255, 255, 0.7)', fontSize: 13 },
  loginLink: { color: '#ff1900', fontSize: 13, fontWeight: '700' },
});


