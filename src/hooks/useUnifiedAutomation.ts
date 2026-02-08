/**
 * Unified Automation Controller
 * 
 * Combines all 7 automation modules with priority ordering:
 * Safety > Heating > Cooling > Ventilation > Lighting > Advisory
 * 
 * This is the main hook that orchestrates all automation modules.
 */

import { useMemo } from 'react';
import { useMinimumVentilation, MinVentStatus } from './useMinimumVentilation';
import { useHeaterControl, HeaterStatus } from './useHeaterControl';
import { useFoggerCooling, FoggerStatus } from './useFoggerCooling';
import { useBroilerAirflow, AirflowStatus } from './useBroilerAirflow';
import { useCurtainAdvisory, CurtainAdvisoryStatus } from './useCurtainAdvisory';
import { useEnhancedWaterAnalytics, WaterAnalyticsStatus } from './useEnhancedWaterAnalytics';
import { useAdvancedAutomationSettings } from './useAdvancedAutomation';
import { useFarmType } from './useFarmType';
import { useLightingCurve } from './useLightingCurve';

export interface AutomationPriority {
  priority: number;
  name: string;
  nameBn: string;
  active: boolean;
  status: 'normal' | 'active' | 'warning' | 'danger';
}

export interface UnifiedAutomationStatus {
  // Module statuses
  minVent: MinVentStatus | null;
  heater: HeaterStatus | null;
  fogger: FoggerStatus | null;
  airflow: AirflowStatus | null;
  lighting: { 
    isOn: boolean; 
    brightness: number; 
    phase: string;
    message: { bn: string; en: string };
  } | null;
  curtain: CurtainAdvisoryStatus | null;
  water: WaterAnalyticsStatus | null;
  
  // Priority list
  priorities: AutomationPriority[];
  
  // Overall system status
  systemMode: 'AUTO' | 'MANUAL' | 'FAIL_SAFE';
  activeModules: string[];
  warningModules: string[];
  dangerModules: string[];
}

interface UseUnifiedAutomationProps {
  temperature: number | null;
  humidity: number | null;
  ammonia: number | null;
  waterFlow: number | null;
  fanSpeed: 'OFF' | 'LOW' | 'MEDIUM' | 'HIGH';
  enabled?: boolean;
  onDeviceChange?: (device: string, value: boolean) => void;
}

export function useUnifiedAutomation({
  temperature,
  humidity,
  ammonia,
  waterFlow,
  fanSpeed,
  enabled = true,
  onDeviceChange,
}: UseUnifiedAutomationProps): UnifiedAutomationStatus {
  const { data: settings } = useAdvancedAutomationSettings();
  const { isBroiler, isLayer } = useFarmType();
  const { currentState: lightingState } = useLightingCurve();

  // Module 1: Minimum Ventilation
  const minVentStatus = useMinimumVentilation({
    temperature,
    ammonia,
    enabled: enabled && isLayer, // Primarily for Layer farms
    onExhaustFanChange: (on) => onDeviceChange?.('exhaust_fan', on),
    onCeilingFanChange: (on) => onDeviceChange?.('circulation_fan', on),
  });

  // Module 2: Heater Control
  const heaterStatus = useHeaterControl({
    temperature,
    enabled,
    onHeaterChange: (on) => onDeviceChange?.('heater', on),
  });

  // Module 3: Fogger Cooling
  const foggerStatus = useFoggerCooling({
    temperature,
    humidity,
    enabled,
    onFoggerChange: (on) => onDeviceChange?.('fogger', on),
    onExhaustFanChange: (on) => onDeviceChange?.('exhaust_fan', on),
  });

  // Module 4: Broiler Airflow
  const airflowStatus = useBroilerAirflow({
    enabled: enabled && isBroiler, // Only for Broiler farms
    onCirculationFanChange: (on) => onDeviceChange?.('circulation_fan', on),
  });

  // Module 5: Lighting (uses existing hook)
  const lightingStatus = useMemo(() => {
    if (!lightingState) return null;
    const phase = lightingState.phase;
    return {
      isOn: lightingState.brightness > 0,
      brightness: lightingState.brightness,
      phase,
      message: {
        bn: phase === 'on' 
          ? `💡 আলো চালু (${lightingState.brightness}%)` 
          : phase === 'fade-in'
          ? '🌅 আলো বাড়ছে'
          : phase === 'fade-out'
          ? '🌆 আলো কমছে'
          : '🌙 আলো বন্ধ',
        en: phase === 'on'
          ? `💡 Light ON (${lightingState.brightness}%)`
          : phase === 'fade-in'
          ? '🌅 Light fading in'
          : phase === 'fade-out'
          ? '🌆 Light fading out'
          : '🌙 Light OFF',
      },
    };
  }, [lightingState]);

  // Module 6: Curtain Advisory
  const curtainStatus = useCurtainAdvisory({
    insideTemp: temperature,
    fanSpeed,
    enabled,
  });

  // Module 7: Water Analytics
  const waterStatus = useEnhancedWaterAnalytics({
    currentWaterFlow: waterFlow,
    enabled,
  });

  // Build priority list
  const priorities = useMemo((): AutomationPriority[] => {
    return [
      {
        priority: 1,
        name: 'Safety',
        nameBn: 'নিরাপত্তা',
        active: ammonia !== null && ammonia > 25,
        status: ammonia !== null && ammonia > 25 ? 'danger' : 'normal',
      },
      {
        priority: 2,
        name: 'Heating',
        nameBn: 'হিটিং',
        active: heaterStatus?.isOn ?? false,
        status: heaterStatus?.isOn ? 'active' : 'normal',
      },
      {
        priority: 3,
        name: 'Cooling',
        nameBn: 'কুলিং',
        active: foggerStatus?.isActive ?? false,
        status: foggerStatus?.isActive ? 'active' : 'normal',
      },
      {
        priority: 4,
        name: 'Ventilation',
        nameBn: 'ভেন্টিলেশন',
        active: minVentStatus?.isActive || airflowStatus?.isOn,
        status: minVentStatus?.ammoniaOverride ? 'warning' : 
                (minVentStatus?.isActive || airflowStatus?.isOn) ? 'active' : 'normal',
      },
      {
        priority: 5,
        name: 'Lighting',
        nameBn: 'আলো',
        active: lightingStatus?.isOn ?? false,
        status: lightingStatus?.isOn ? 'active' : 'normal',
      },
      {
        priority: 6,
        name: 'Advisory',
        nameBn: 'পরামর্শ',
        active: curtainStatus?.recommendedAction !== 'none',
        status: curtainStatus?.recommendedAction !== 'none' ? 'warning' : 'normal',
      },
    ];
  }, [ammonia, heaterStatus, foggerStatus, minVentStatus, airflowStatus, lightingStatus, curtainStatus]);

  // Calculate active/warning/danger module lists
  const { activeModules, warningModules, dangerModules } = useMemo(() => {
    const active: string[] = [];
    const warning: string[] = [];
    const danger: string[] = [];

    priorities.forEach(p => {
      if (p.status === 'danger') danger.push(p.name);
      else if (p.status === 'warning') warning.push(p.name);
      else if (p.active) active.push(p.name);
    });

    if (waterStatus?.alertType === 'zero_flow') danger.push('Water');
    else if (waterStatus?.alertType !== 'none') warning.push('Water');

    return { activeModules: active, warningModules: warning, dangerModules: danger };
  }, [priorities, waterStatus]);

  return {
    minVent: minVentStatus,
    heater: heaterStatus,
    fogger: foggerStatus,
    airflow: airflowStatus,
    lighting: lightingStatus,
    curtain: curtainStatus,
    water: waterStatus,
    priorities,
    systemMode: 'AUTO',
    activeModules,
    warningModules,
    dangerModules,
  };
}
