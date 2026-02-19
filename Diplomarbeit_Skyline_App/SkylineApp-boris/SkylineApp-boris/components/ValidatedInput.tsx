import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
    StyleSheet,
    Text,
    TextInput,
    TextInputProps,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface ValidatedInputProps extends TextInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  icon?: string;
  required?: boolean;
  containerStyle?: any;
  inputStyle?: any;
}

export default function ValidatedInput({
  label,
  value,
  onChangeText,
  error,
  icon,
  required = false,
  containerStyle,
  inputStyle,
  ...textInputProps
}: ValidatedInputProps) {
  const hasError = !!error;

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Label */}
      <View style={styles.labelContainer}>
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
        {icon && (
          <MaterialIcons 
            name={icon as any} 
            size={18} 
            color={hasError ? '#ff4444' : '#ff1900'} 
          />
        )}
      </View>

      {/* Input Container */}
      <LinearGradient
        colors={hasError 
          ? ['rgba(255,68,68,0.1)', 'rgba(255,68,68,0.05)']
          : ['rgba(30,30,30,0.98)', 'rgba(20,20,20,0.95)']
        }
        style={[
          styles.inputContainer,
          hasError && styles.inputContainerError
        ]}
      >
        <TextInput
          style={[
            styles.input,
            hasError && styles.inputError,
            inputStyle
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor="rgba(255,255,255,0.4)"
          {...textInputProps}
        />
      </LinearGradient>

      {/* Error Message */}
      {hasError && (
        <Animated.View 
          entering={FadeInDown.delay(100).springify()}
          style={styles.errorContainer}
        >
          <MaterialIcons name="error-outline" size={16} color="#ff4444" />
          <Text style={styles.errorText}>{error}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Nexa-ExtraLight',
    color: '#fff',
  },
  required: {
    color: '#ff4444',
    fontFamily: 'Nexa-ExtraLight',
  },
  inputContainer: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  inputContainerError: {
    borderColor: 'rgba(255,68,68,0.5)',
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'Nexa-ExtraLight',
    color: '#fff',
    backgroundColor: 'transparent',
  },
  inputError: {
    color: '#ff4444',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Nexa-ExtraLight',
    color: '#ff4444',
    marginLeft: 6,
    flex: 1,
  },
});
