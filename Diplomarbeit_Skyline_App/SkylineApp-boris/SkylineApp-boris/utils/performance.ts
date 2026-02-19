/**
 * 🚀 PERFORMANCE UTILITIES
 * Optimierungen für bessere App-Performance
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InteractionManager, Platform } from 'react-native';

/**
 * Hook für Performance-optimierte Callbacks
 * Verhindert unnötige Re-Renders
 */
export const useStableCallback = <T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T => {
  return useCallback(callback, deps);
};

/**
 * Hook für Performance-optimierte Memoization
 * Für teure Berechnungen
 */
export const useStableMemo = <T>(
  factory: () => T,
  deps: React.DependencyList
): T => {
  return useMemo(factory, deps);
};

/**
 * Hook für verzögerte Ausführung nach Interaktionen
 * Verbessert die UI-Responsivität
 */
export const useInteractionManager = (callback: () => void, deps: React.DependencyList) => {
  useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => {
      callback();
    });
    
    return () => handle.cancel();
  }, deps);
};

/**
 * Hook für Debounced Values
 * Reduziert unnötige Updates
 */
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
};

/**
 * Hook für Previous Values
 * Nützlich für Animationen und Vergleiche
 */
export const usePrevious = <T>(value: T): T | undefined => {
  const ref = useRef<T | undefined>(undefined);
  
  useEffect(() => {
    ref.current = value;
  });
  
  return ref.current;
};

/**
 * Optimierte Array-Operationen
 */
export const ArrayUtils = {
  /**
   * Chunked Array Processing - verhindert UI-Blocking
   */
  processChunked: async <T, R>(
    array: T[],
    processor: (item: T, index: number) => R,
    chunkSize: number = 10
  ): Promise<R[]> => {
    const results: R[] = [];
    
    for (let i = 0; i < array.length; i += chunkSize) {
      const chunk = array.slice(i, i + chunkSize);
      const chunkResults = chunk.map((item, index) => processor(item, i + index));
      results.push(...chunkResults);
      
      // Yield control back to the main thread
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    return results;
  },
  
  /**
   * Stable Key Generator für FlatList
   */
  generateStableKey: (item: any, index: number): string => {
    if (item?.id) return String(item.id);
    if (item?.key) return String(item.key);
    return `item-${index}`;
  },
};

/**
 * Platform-spezifische Optimierungen
 */
export const PlatformUtils = {
  /**
   * Android-spezifische Optimierungen
   */
  isAndroid: Platform.OS === 'android',
  
  /**
   * iOS-spezifische Optimierungen
   */
  isIOS: Platform.OS === 'ios',
  
  /**
   * Optimierte Shadow-Props basierend auf Platform
   */
  getOptimizedShadow: (elevation: number = 4) => {
    if (Platform.OS === 'ios') {
      return {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: elevation / 2 },
        shadowOpacity: 0.1 + (elevation * 0.02),
        shadowRadius: elevation,
      };
    } else {
      return {
        elevation: elevation,
      };
    }
  },
};

/**
 * Memory Management Utilities
 */
export const MemoryUtils = {
  /**
   * Cleanup Function für Component Unmount
   */
  createCleanup: () => {
    const cleanupTasks: (() => void)[] = [];
    
    return {
      add: (task: () => void) => cleanupTasks.push(task),
      cleanup: () => cleanupTasks.forEach(task => task()),
    };
  },
  
  /**
   * WeakMap für Object Caching
   */
  createWeakCache: <K extends object, V>() => {
    const cache = new WeakMap<K, V>();
    
    return {
      get: (key: K) => cache.get(key),
      set: (key: K, value: V) => cache.set(key, value),
      has: (key: K) => cache.has(key),
    };
  },
};

/**
 * Animation Performance Utilities
 */
export const AnimationUtils = {
  /**
   * Optimierte Spring-Konfigurationen
   */
  springs: {
    gentle: { damping: 15, stiffness: 120 },
    bouncy: { damping: 10, stiffness: 150 },
    snappy: { damping: 20, stiffness: 200 },
  },
  
  /**
   * Timing-Konfigurationen
   */
  timings: {
    fast: 200,
    normal: 300,
    slow: 500,
  },
  
  /**
   * Performance-optimierte Interpolation
   */
  createInterpolation: (
    inputRange: number[],
    outputRange: number[]
  ) => {
    return {
      inputRange,
      outputRange,
      extrapolate: 'clamp' as const,
    };
  },
};

