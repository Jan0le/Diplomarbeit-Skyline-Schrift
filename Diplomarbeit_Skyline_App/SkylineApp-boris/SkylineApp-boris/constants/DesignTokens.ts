/**
 * 🎨 SKYLINE DESIGN SYSTEM
 * Zentrale Design-Tokens für konsistente UI/UX
 * 
 * Verwendung:
 * import { Colors, Typography, Spacing, Shadows } from '@/constants/DesignTokens';
 */

export const Colors = {
  // Primary Brand Colors
  primary: {
    main: '#FF1900',
    light: '#FF3B00',
    dark: '#CC1400',
    contrast: '#ffffff',
  },
  
  // Background Colors (Dark Mode First)
  background: {
    primary: '#1A1A1A',
    secondary: '#242424',
    tertiary: '#2F2F2F',
    card: '#242424',
    modal: '#1E1E1E',
  },
  
  // Text Colors
  text: {
    primary: '#FFFFFF',
    secondary: '#B3B3B3',
    tertiary: '#858585',
    disabled: '#5E5E5E',
    accent: '#FF1900',
  },
  
  // Status Colors
  status: {
    success: '#00B7FF',
    warning: '#FFC107',
    error: '#FF4444',
    info: '#00B7FF',
  },
  
  // Border & Divider Colors
  border: {
    primary: '#2F2F2F',
    secondary: '#363636',
    light: '#404040',
  },
  
  // Semantic Colors
  semantic: {
    flight: '#FF1900',
    airport: '#B3B3B3',
    time: '#FFFFFF',
    gate: '#FFB800',
  },
} as const;

export const Typography = {
  // Font Families
  fontFamily: {
    regular: 'Nexa-ExtraLight',
    monospace: 'Courier New',
    display: 'Nexa-Heavy',
  },
  
  // Font Sizes
  fontSize: {
    xs: 10,
    sm: 12,
    base: 14,
    lg: 16,
    xl: 18,
    '2xl': 20,
    '3xl': 24,
    '4xl': 28,
    '5xl': 32,
    '6xl': 36,
  },
  
  // Font Weights
  fontWeight: {
    light: '300' as const,
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  
  // Line Heights
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
    loose: 1.8,
  },
  
  // Letter Spacing
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1,
    widest: 2,
  },
} as const;

export const Spacing = {
  // Base spacing unit (4px)
  unit: 4,
  
  // Spacing scale
  xs: 4,   // 4px
  sm: 8,   // 8px
  md: 12,  // 12px
  lg: 16,  // 16px
  xl: 20,  // 20px
  '2xl': 24, // 24px
  '3xl': 32, // 32px
  '4xl': 40, // 40px
  '5xl': 48, // 48px
  '6xl': 64, // 64px
  
  // Component-specific spacing
  component: {
    cardPadding: 16,
    sectionMargin: 20,
    buttonPadding: 12,
    inputPadding: 14,
  },
} as const;

export const BorderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
  
  // Component-specific
  card: 12,
  button: 8,
  input: 6,
  modal: 16,
} as const;

export const IconSizes = {
  xs: 14,
  sm: 16,
  md: 18,
  lg: 20,
  xl: 22,
  '2xl': 24,
} as const;

export const Shadows = {
  // Elevation-based shadows
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  
  // Colored shadows for special effects
  primary: {
    shadowColor: '#FF1900',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  
  // Text shadows
  text: {
    sm: {
      textShadowColor: 'rgba(0, 0, 0, 0.5)',
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 2,
    },
    md: {
      textShadowColor: 'rgba(0, 0, 0, 0.7)',
      textShadowOffset: { width: 2, height: 2 },
      textShadowRadius: 4,
    },
  },
} as const;

export const Animation = {
  // Timing functions
  timing: {
    fast: 200,
    normal: 300,
    slow: 500,
    verySlow: 1000,
  },
  
  // Spring configurations
  spring: {
    gentle: {
      damping: 15,
      stiffness: 120,
    },
    bouncy: {
      damping: 10,
      stiffness: 150,
    },
    snappy: {
      damping: 20,
      stiffness: 200,
    },
  },
  
  // Easing curves
  easing: {
    easeOut: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    easeIn: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
    easeInOut: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
  },
} as const;

export const Layout = {
  // Screen dimensions helpers
  screen: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    maxWidth: 400,
  },
  
  // Common component sizes
  button: {
    height: {
      sm: 36,
      md: 44,
      lg: 52,
    },
    minWidth: 88,
  },
  
  input: {
    height: 48,
    borderWidth: 1,
  },
  
  card: {
    minHeight: 120,
    borderWidth: 1,
  },
} as const;

// Helper functions for consistent styling
export const getTextStyle = (size: keyof typeof Typography.fontSize, weight: keyof typeof Typography.fontWeight, isTitle: boolean = false) => ({
  fontSize: Typography.fontSize[size],
  fontFamily: isTitle ? Typography.fontFamily.display : Typography.fontFamily.regular,
  color: Colors.text.primary,
});

export const getCardStyle = (elevation: keyof typeof Shadows = 'md') => ({
  backgroundColor: Colors.background.card,
  borderRadius: BorderRadius.card,
  padding: Spacing.component.cardPadding,
  ...Shadows[elevation],
});

export const getButtonStyle = (variant: 'primary' | 'secondary' = 'primary') => ({
  height: Layout.button.height.md,
  borderRadius: BorderRadius.button,
  paddingHorizontal: Spacing.xl,
  backgroundColor: variant === 'primary' ? Colors.primary.main : Colors.background.secondary,
  ...Shadows.md,
});

// Export default theme object
export const Theme = {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  IconSizes,
  Shadows,
  Animation,
  Layout,
} as const;

export default Theme;
