import { useMemo } from 'react';
import { useWeatherCache } from './useWeather';
import { useRealtimeSensorData } from './useRealtimeSensorData';

export interface InsideOutsideDelta {
  insideTemp: number;
  outsideTemp: number | null;
  delta: number | null; // positive = inside hotter, negative = inside cooler
  recommendation: {
    type: 'open_curtain' | 'reduce_cooling' | 'avoid_ventilation' | 'prefer_fogger' | 'normal';
    message: { bn: string; en: string };
  };
  shouldModifyVentilation: boolean;
}

// Delta thresholds
const CURTAIN_OPEN_DELTA = 3; // If outside is 3°C+ cooler, recommend curtain open
const HOT_OUTSIDE_THRESHOLD = 0; // If outside is hotter than inside

/**
 * Hook to compare inside temperature vs outside (weather) temperature
 * and provide ventilation recommendations based on delta
 */
export function useInsideOutsideDelta(): InsideOutsideDelta {
  const { sensorData } = useRealtimeSensorData();
  const { data: weather } = useWeatherCache();
  
  return useMemo(() => {
    const insideTemp = sensorData.temperature;
    const outsideTemp = weather?.temperature ?? null;
    
    // If no outside temp available, return normal recommendation
    if (outsideTemp === null) {
      return {
        insideTemp,
        outsideTemp: null,
        delta: null,
        recommendation: {
          type: 'normal',
          message: {
            bn: 'বাইরের তাপমাত্রা তথ্য নেই',
            en: 'Outside temperature data unavailable'
          }
        },
        shouldModifyVentilation: false,
      };
    }
    
    // Delta: positive = inside hotter, negative = inside cooler
    const delta = insideTemp - outsideTemp;
    
    // === RECOMMENDATION LOGIC ===
    
    // Case 1: Outside is significantly cooler (delta >= 3)
    // Recommend: Open curtain, reduce aggressive cooling
    if (delta >= CURTAIN_OPEN_DELTA) {
      return {
        insideTemp,
        outsideTemp,
        delta,
        recommendation: {
          type: 'open_curtain',
          message: {
            bn: `🌬️ বাইরে ${Math.abs(delta).toFixed(1)}°C ঠান্ডা — পর্দা খুলুন, ফগার কমান`,
            en: `🌬️ Outside ${Math.abs(delta).toFixed(1)}°C cooler — open curtain, reduce fogger`
          }
        },
        shouldModifyVentilation: true,
      };
    }
    
    // Case 2: Outside is hotter than inside (delta < 0)
    // Recommend: Avoid ventilation-only cooling, prefer fogger
    if (delta < HOT_OUTSIDE_THRESHOLD && outsideTemp > insideTemp) {
      return {
        insideTemp,
        outsideTemp,
        delta,
        recommendation: {
          type: 'prefer_fogger',
          message: {
            bn: `🔥 বাইরে ${Math.abs(delta).toFixed(1)}°C বেশি গরম — ভেন্টিলেশন বন্ধ, ফগার চালু`,
            en: `🔥 Outside ${Math.abs(delta).toFixed(1)}°C hotter — skip ventilation, use fogger`
          }
        },
        shouldModifyVentilation: true,
      };
    }
    
    // Case 3: Small delta, normal operation
    return {
      insideTemp,
      outsideTemp,
      delta,
      recommendation: {
        type: 'normal',
        message: {
          bn: `✅ ভিতর-বাহির তাপমাত্রা কাছাকাছি (${delta > 0 ? '+' : ''}${delta.toFixed(1)}°C)`,
          en: `✅ Inside-outside temp similar (${delta > 0 ? '+' : ''}${delta.toFixed(1)}°C)`
        }
      },
      shouldModifyVentilation: false,
    };
  }, [sensorData.temperature, weather?.temperature]);
}

/**
 * Get ventilation modification based on inside-outside delta
 * Returns multiplier for fan/fogger intensity
 */
export function getVentilationModifier(delta: number | null): {
  fanMultiplier: number;
  foggerMultiplier: number;
  curtainRecommendation: 'open' | 'close' | 'no_change';
} {
  if (delta === null) {
    return { fanMultiplier: 1, foggerMultiplier: 1, curtainRecommendation: 'no_change' };
  }
  
  // Outside significantly cooler - reduce cooling, open curtain
  if (delta >= CURTAIN_OPEN_DELTA) {
    return {
      fanMultiplier: 0.7, // Reduce fan intensity
      foggerMultiplier: 0.5, // Significantly reduce fogger
      curtainRecommendation: 'open',
    };
  }
  
  // Outside hotter - avoid ventilation, prefer fogger
  if (delta < 0) {
    return {
      fanMultiplier: 0.5, // Reduce fan (bringing in hot air)
      foggerMultiplier: 1.2, // Increase fogger
      curtainRecommendation: 'close',
    };
  }
  
  return { fanMultiplier: 1, foggerMultiplier: 1, curtainRecommendation: 'no_change' };
}
