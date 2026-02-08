import { useCallback } from 'react';

// Haptic feedback types
export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

// Storage key for user preference
const HAPTIC_STORAGE_KEY = 'farmeye-haptic-enabled';

// Vibration patterns in milliseconds
const HAPTIC_PATTERNS: Record<HapticType, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [10, 50, 10],
  warning: [20, 40, 20, 40],
  error: [50, 100, 50],
  selection: 5,
};

// Check if haptic is enabled from localStorage
function isHapticEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const saved = localStorage.getItem(HAPTIC_STORAGE_KEY);
  return saved !== 'false'; // Default to true
}

export function useHapticFeedback() {
  const isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  const trigger = useCallback((type: HapticType = 'light') => {
    if (!isSupported || !isHapticEnabled()) return;
    
    try {
      const pattern = HAPTIC_PATTERNS[type];
      navigator.vibrate(pattern);
    } catch (error) {
      // Silently fail if vibration is not available
      console.debug('Haptic feedback not available:', error);
    }
  }, [isSupported]);

  // Convenience methods
  const light = useCallback(() => trigger('light'), [trigger]);
  const medium = useCallback(() => trigger('medium'), [trigger]);
  const heavy = useCallback(() => trigger('heavy'), [trigger]);
  const success = useCallback(() => trigger('success'), [trigger]);
  const warning = useCallback(() => trigger('warning'), [trigger]);
  const error = useCallback(() => trigger('error'), [trigger]);
  const selection = useCallback(() => trigger('selection'), [trigger]);

  return {
    isSupported,
    trigger,
    light,
    medium,
    heavy,
    success,
    warning,
    error,
    selection,
  };
}

// Standalone function for use outside of React components
export function triggerHaptic(type: HapticType = 'light') {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator && isHapticEnabled()) {
    try {
      const pattern = HAPTIC_PATTERNS[type];
      navigator.vibrate(pattern);
    } catch (error) {
      // Silently fail
    }
  }
}
