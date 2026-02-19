import { useAppSettings } from '@/hooks/useAppSettings';
import { FadeInDown } from 'react-native-reanimated';

export function useReduceMotion(): boolean {
  const { reduceAnimations } = useAppSettings();
  return !!reduceAnimations;
}

export function useFadeInDownOrNone(delayMs: number = 0) {
  const reduceMotion = useReduceMotion();
  if (reduceMotion) return undefined;
  return FadeInDown.delay(delayMs).springify();
}


