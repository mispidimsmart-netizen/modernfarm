/**
 * Smart Lighting Curve Calculator for Layer Chickens
 * 
 * Implements gradual light increase/decrease to reduce stress
 * and improve egg laying consistency.
 * 
 * Morning: 0% → 100% (fade-in period)
 * Evening: 100% → 0% (fade-out period)
 */

export interface LightingCurveSettings {
  gradualEnabled: boolean;
  fadeInMinutes: number;
  fadeOutMinutes: number;
  minBrightness: number;
  maxBrightness: number;
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
}

export interface LightingState {
  brightness: number; // 0-100
  phase: 'off' | 'fade-in' | 'on' | 'fade-out';
  minutesRemaining: number;
  isActive: boolean;
  message: {
    bn: string;
    en: string;
  };
}

/**
 * Parse time string to minutes from midnight
 */
function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Get current time in minutes from midnight
 */
function getCurrentMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

/**
 * Calculate easing for smooth transitions
 * Using ease-in-out for natural light change
 */
function easeInOutQuad(t: number): number {
  return t < 0.5 
    ? 2 * t * t 
    : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * Calculate current lighting state based on schedule and curve settings
 */
export function calculateLightingState(settings: LightingCurveSettings): LightingState {
  const currentMinutes = getCurrentMinutes();
  const startMinutes = parseTimeToMinutes(settings.startTime);
  const endMinutes = parseTimeToMinutes(settings.endTime);
  
  const { fadeInMinutes, fadeOutMinutes, minBrightness, maxBrightness, gradualEnabled } = settings;
  
  // If gradual is disabled, use simple ON/OFF
  if (!gradualEnabled) {
    const isActive = currentMinutes >= startMinutes && currentMinutes < endMinutes;
    return {
      brightness: isActive ? maxBrightness : minBrightness,
      phase: isActive ? 'on' : 'off',
      minutesRemaining: 0,
      isActive,
      message: isActive 
        ? { bn: 'আলো চালু', en: 'Light ON' }
        : { bn: 'আলো বন্ধ', en: 'Light OFF' }
    };
  }
  
  // Calculate phase boundaries
  const fadeInEnd = startMinutes + fadeInMinutes;
  const fadeOutStart = endMinutes - fadeOutMinutes;
  
  // Before schedule starts (OFF)
  if (currentMinutes < startMinutes) {
    const minutesToStart = startMinutes - currentMinutes;
    return {
      brightness: minBrightness,
      phase: 'off',
      minutesRemaining: minutesToStart,
      isActive: false,
      message: {
        bn: `${minutesToStart} মিনিট পর আলো চালু হবে`,
        en: `Light starts in ${minutesToStart} min`
      }
    };
  }
  
  // Fade-in phase (Morning: 0% → 100%)
  if (currentMinutes >= startMinutes && currentMinutes < fadeInEnd) {
    const elapsed = currentMinutes - startMinutes;
    const progress = elapsed / fadeInMinutes;
    const easedProgress = easeInOutQuad(progress);
    const brightness = Math.round(minBrightness + (maxBrightness - minBrightness) * easedProgress);
    const remaining = fadeInMinutes - elapsed;
    
    return {
      brightness,
      phase: 'fade-in',
      minutesRemaining: remaining,
      isActive: true,
      message: {
        bn: `🌅 ধীরে বাড়ছে (${remaining} মিনিট বাকি)`,
        en: `🌅 Fading in (${remaining} min left)`
      }
    };
  }
  
  // Full ON phase
  if (currentMinutes >= fadeInEnd && currentMinutes < fadeOutStart) {
    const remaining = fadeOutStart - currentMinutes;
    return {
      brightness: maxBrightness,
      phase: 'on',
      minutesRemaining: remaining,
      isActive: true,
      message: {
        bn: `☀️ পূর্ণ আলো (${Math.floor(remaining / 60)}h ${remaining % 60}m)`,
        en: `☀️ Full brightness (${Math.floor(remaining / 60)}h ${remaining % 60}m)`
      }
    };
  }
  
  // Fade-out phase (Evening: 100% → 0%)
  if (currentMinutes >= fadeOutStart && currentMinutes < endMinutes) {
    const elapsed = currentMinutes - fadeOutStart;
    const progress = elapsed / fadeOutMinutes;
    const easedProgress = easeInOutQuad(progress);
    const brightness = Math.round(maxBrightness - (maxBrightness - minBrightness) * easedProgress);
    const remaining = fadeOutMinutes - elapsed;
    
    return {
      brightness,
      phase: 'fade-out',
      minutesRemaining: remaining,
      isActive: true,
      message: {
        bn: `🌙 ধীরে কমছে (${remaining} মিনিট বাকি)`,
        en: `🌙 Fading out (${remaining} min left)`
      }
    };
  }
  
  // After schedule ends (OFF)
  const minutesToStart = (24 * 60 - currentMinutes) + startMinutes;
  return {
    brightness: minBrightness,
    phase: 'off',
    minutesRemaining: minutesToStart,
    isActive: false,
    message: {
      bn: 'আলো বন্ধ - আগামীকাল সকালে চালু হবে',
      en: 'Light OFF - Starts tomorrow morning'
    }
  };
}

/**
 * Get phase icon and color
 */
export function getPhaseStyle(phase: LightingState['phase']): { icon: string; color: string; bgColor: string } {
  switch (phase) {
    case 'fade-in':
      return { 
        icon: '🌅', 
        color: 'text-orange-500', 
        bgColor: 'bg-orange-100 dark:bg-orange-900/30' 
      };
    case 'on':
      return { 
        icon: '☀️', 
        color: 'text-yellow-500', 
        bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' 
      };
    case 'fade-out':
      return { 
        icon: '🌙', 
        color: 'text-purple-500', 
        bgColor: 'bg-purple-100 dark:bg-purple-900/30' 
      };
    default:
      return { 
        icon: '🌑', 
        color: 'text-gray-500', 
        bgColor: 'bg-gray-100 dark:bg-gray-800' 
      };
  }
}

/**
 * Generate curve data points for visualization
 */
export function generateCurveData(settings: LightingCurveSettings): { time: string; brightness: number }[] {
  const data: { time: string; brightness: number }[] = [];
  const startMinutes = parseTimeToMinutes(settings.startTime);
  const endMinutes = parseTimeToMinutes(settings.endTime);
  const { fadeInMinutes, fadeOutMinutes, minBrightness, maxBrightness, gradualEnabled } = settings;
  
  // Generate data points every 15 minutes for 24 hours
  for (let minutes = 0; minutes < 24 * 60; minutes += 15) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const time = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    
    let brightness = minBrightness;
    
    if (!gradualEnabled) {
      brightness = (minutes >= startMinutes && minutes < endMinutes) ? maxBrightness : minBrightness;
    } else {
      const fadeInEnd = startMinutes + fadeInMinutes;
      const fadeOutStart = endMinutes - fadeOutMinutes;
      
      if (minutes >= startMinutes && minutes < fadeInEnd) {
        const progress = (minutes - startMinutes) / fadeInMinutes;
        brightness = Math.round(minBrightness + (maxBrightness - minBrightness) * easeInOutQuad(progress));
      } else if (minutes >= fadeInEnd && minutes < fadeOutStart) {
        brightness = maxBrightness;
      } else if (minutes >= fadeOutStart && minutes < endMinutes) {
        const progress = (minutes - fadeOutStart) / fadeOutMinutes;
        brightness = Math.round(maxBrightness - (maxBrightness - minBrightness) * easeInOutQuad(progress));
      }
    }
    
    data.push({ time, brightness });
  }
  
  return data;
}
