import { BorderRadius, Colors, Shadows, Spacing } from '@/constants/DesignTokens';
import React, { memo } from 'react';
import {
    StyleSheet,
    View,
    type StyleProp,
    type ViewStyle,
} from 'react-native';

type SpacingKey = Exclude<keyof typeof Spacing, 'unit' | 'component'>;

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: SpacingKey;
  style?: StyleProp<ViewStyle>;
}

/**
 * 🃏 CARD COMPONENT
 * Konsistente Card-Implementierung für Content-Container
 */
export const Card: React.FC<CardProps> = memo(({
  children,
  variant = 'default',
  padding = 'lg',
  style,
}) => {
  const cardStyle = [
    styles.base,
    styles[variant],
    { padding: Spacing[padding] },
    style,
  ];

  return (
    <View style={cardStyle}>
      {children}
    </View>
  );
});

Card.displayName = 'Card';

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.background.card,
    borderRadius: BorderRadius.card,
  },
  
  // Variants
  default: {
    ...Shadows.sm,
  },
  elevated: {
    ...Shadows.lg,
  },
  outlined: {
    borderWidth: 1,
    borderColor: Colors.border.primary,
    ...Shadows.sm,
  },
});

export default Card;
