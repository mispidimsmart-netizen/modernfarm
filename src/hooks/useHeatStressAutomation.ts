/**
 * Heat Stress Automation — DISPLAY ONLY
 * 
 * HSI calculation and fan activation decisions run on
 * ESP32 firmware and backend safety-engine.
 * This hook provides display-only HSI data from safety_status.
 */

import { useMemo } from 'react';
import { calculateHSI, HeatStressResult, HSIThresholds, DEFAULT_HSI_THRESHOLDS } from '@/lib/heatStressIndex';
import { useFarmSettings } from '@/hooks/useFarmData';

interface UseHeatStressAutomationProps {
  temperature: number | null;
  humidity: number | null;
  shedId?: string | null;
  enabled?: boolean;
}

export function useHeatStressAutomation({
  temperature,
  humidity,
}: UseHeatStressAutomationProps) {
  const { data: farmSettings } = useFarmSettings();

  const thresholds: HSIThresholds = farmSettings ? {
    mild: Number(farmSettings.hsi_mild_threshold) || DEFAULT_HSI_THRESHOLDS.mild,
    moderate: Number(farmSettings.hsi_moderate_threshold) || DEFAULT_HSI_THRESHOLDS.moderate,
    severe: Number(farmSettings.hsi_severe_threshold) || DEFAULT_HSI_THRESHOLDS.severe,
    emergency: Number(farmSettings.hsi_emergency_threshold) || DEFAULT_HSI_THRESHOLDS.emergency,
  } : DEFAULT_HSI_THRESHOLDS;

  // Pure calculation for display — no side effects, no DB writes, no fan control
  return useMemo((): HeatStressResult | null => {
    if (temperature === null || humidity === null) return null;
    return calculateHSI(temperature, humidity, thresholds);
  }, [temperature, humidity, thresholds]);
}
