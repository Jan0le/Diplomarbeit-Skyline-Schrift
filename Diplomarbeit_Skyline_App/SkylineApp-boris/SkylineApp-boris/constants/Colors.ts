/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const SKYLINE_RED = '#FF1900';
const SKYLINE_RED_LIGHT = '#FF3B00';
const SKYLINE_BACKGROUND = '#1A1A1A';
const SKYLINE_SECONDARY = '#242424';

export const Colors = {
  light: {
    text: '#111111',
    background: '#F5F5F5',
    tint: SKYLINE_RED,
    icon: '#6B6B6B',
    tabIconDefault: '#6B6B6B',
    tabIconSelected: SKYLINE_RED,
  },
  dark: {
    text: '#FFFFFF',
    background: SKYLINE_BACKGROUND,
    tint: SKYLINE_RED_LIGHT,
    icon: '#B3B3B3',
    tabIconDefault: '#5E5E5E',
    tabIconSelected: SKYLINE_RED_LIGHT,
  },
};
