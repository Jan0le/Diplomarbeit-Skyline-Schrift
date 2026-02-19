import { Text, TextProps, StyleSheet } from 'react-native';
import { Typography } from '@/constants/DesignTokens';

/**
 * Default Text component that automatically applies Nexa-ExtraLight font
 * Use this instead of React Native's Text for consistent font usage
 */
export function DefaultText({ style, ...props }: TextProps) {
  return (
    <Text
      style={[
        styles.default,
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontFamily: Typography.fontFamily.regular,
  },
});

export default DefaultText;

