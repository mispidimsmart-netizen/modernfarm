import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from './use-toast';
import { useSendDeviceCommand } from './useDeviceCommands';

export type CalibrationStep = 
  | 'dimensions'
  | 'automation_defaults'
  | 'fan_direction'
  | 'temp_sensor'
  | 'ammonia_baseline'
  | 'heater_response'
  | 'water_flow'
  | 'complete';

export interface AutomationDefaults {
  temp_min: number;
  temp_max: number;
  humidity_min: number;
  humidity_max: number;
  ammonia_max: number;
  fan_low_temp_min: number;
  fan_low_temp_max: number;
  fan_medium_temp_min: number;
  fan_medium_temp_max: number;
  fan_high_temp_min: number;
  heater_on_temp: number;
  heater_off_temp: number;
}

export interface CalibrationData {
  id?: string;
  farm_length_meters?: number;
  farm_width_meters?: number;
  farm_height_meters?: number;
  air_volume_cubic_meters?: number;
  ventilation_baseline?: number;
  fan_direction_test_passed?: boolean;
  temp_sensor_test_passed?: boolean;
  temp_drop_rate?: number;
  temp_sensor_placement_status?: string;
  clean_air_nh3_ppm?: number;
  heater_test_passed?: boolean;
  heater_temp_rise?: number;
  water_flow_test_passed?: boolean;
  water_normal_pulse_pattern?: number;
  overall_status?: string;
  calibration_score?: number;
  wizard_completed?: boolean;
}

export function useCalibrationData(deviceTokenId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['device-calibration', user?.id, deviceTokenId],
    queryFn: async () => {
      if (!user) return null;

      let query = supabase
        .from('device_calibration')
        .select('*')
        .eq('user_id', user.id);

      if (deviceTokenId) {
        query = query.eq('device_token_id', deviceTokenId);
      }

      const { data, error } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useSaveCalibration() {
  const queryClient = useQueryClient();
  const { user, language } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CalibrationData & { device_token_id?: string; shed_id?: string }) => {
      if (!user) throw new Error('Not authenticated');

      const payload = {
        ...data,
        user_id: user.id,
        updated_at: new Date().toISOString(),
      };

      if (data.id) {
        // Update existing
        const { error } = await supabase
          .from('device_calibration')
          .update(payload)
          .eq('id', data.id);
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('device_calibration')
          .insert(payload);
        if (error) throw error;
      }

      return payload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['device-calibration'] });
    },
    onError: (error) => {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useCalibrationWizard(deviceTokenId?: string, shedId?: string) {
  const { user, language } = useAuth();
  const { toast } = useToast();
  const sendCommandMutation = useSendDeviceCommand();
  const { data: existingData, isLoading } = useCalibrationData(deviceTokenId);
  const saveCalibration = useSaveCalibration();

  // Helper to send device commands
  const sendCommand = async (commandType: 'fan' | 'light' | 'alarm' | 'heater' | 'exhaust_fan' | 'manual_override', value: boolean) => {
    const type = commandType === 'exhaust_fan' ? 'fan' : commandType;
    await sendCommandMutation.mutateAsync({ commandType: type as any, commandValue: value });
  };

  const [currentStep, setCurrentStep] = useState<CalibrationStep>('dimensions');
  const [calibrationData, setCalibrationData] = useState<CalibrationData>({});
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testProgress, setTestProgress] = useState(0);
  const [initialTemp, setInitialTemp] = useState<number | null>(null);
  const [initialNH3, setInitialNH3] = useState<number | null>(null);

  // Calculate air volume and ventilation baseline
  const calculateDimensions = useCallback((length: number, width: number, height: number) => {
    const airVolume = length * width * height;
    // Recommended air changes per minute for poultry: 1-2 for winter, 8-10 for summer
    // We'll use average baseline of 5 air changes per minute
    const ventilationBaseline = airVolume * 5;
    
    return {
      air_volume_cubic_meters: airVolume,
      ventilation_baseline: ventilationBaseline,
    };
  }, []);

  // Step 1: Save farm dimensions
  const saveDimensions = useCallback(async (length: number, width: number, height: number) => {
    const calculated = calculateDimensions(length, width, height);
    
    const data: CalibrationData = {
      ...calibrationData,
      id: existingData?.id,
      farm_length_meters: length,
      farm_width_meters: width,
      farm_height_meters: height,
      ...calculated,
    };

    await saveCalibration.mutateAsync({
      ...data,
      device_token_id: deviceTokenId,
      shed_id: shedId,
    });

    setCalibrationData(data);
    setCurrentStep('automation_defaults');

    toast({
      title: language === 'bn' ? '✅ মাত্রা সংরক্ষিত' : '✅ Dimensions saved',
      description: language === 'bn' 
        ? `বায়ু আয়তন: ${calculated.air_volume_cubic_meters.toFixed(1)} m³`
        : `Air volume: ${calculated.air_volume_cubic_meters.toFixed(1)} m³`,
    });
  }, [calibrationData, existingData, deviceTokenId, shedId, calculateDimensions, saveCalibration, toast, language]);

  // Step 1.5: Save automation defaults to farm_settings
  const saveAutomationDefaults = useCallback(async (defaults: AutomationDefaults) => {
    if (!user) return;

    try {
      // Update farm_settings with the defaults
      const { error } = await supabase
        .from('farm_settings')
        .update({
          temperature_min: defaults.temp_min,
          temperature_max: defaults.temp_max,
          humidity_min: defaults.humidity_min,
          humidity_max: defaults.humidity_max,
          ammonia_max: defaults.ammonia_max,
          fan_low_temp_min: defaults.fan_low_temp_min,
          fan_low_temp_max: defaults.fan_low_temp_max,
          fan_medium_temp_min: defaults.fan_medium_temp_min,
          fan_medium_temp_max: defaults.fan_medium_temp_max,
          fan_high_temp_min: defaults.fan_high_temp_min,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // Update advanced_automation_settings for heater
      const { error: heaterError } = await supabase
        .from('advanced_automation_settings')
        .upsert({
          user_id: user.id,
          shed_id: shedId,
          heater_on_temp: defaults.heater_on_temp,
          heater_off_temp: defaults.heater_off_temp,
          heater_enabled: true,
        }, { onConflict: 'user_id,shed_id' });

      if (heaterError) {
        // If upsert with composite key fails, try simple insert/update
        await supabase
          .from('advanced_automation_settings')
          .update({
            heater_on_temp: defaults.heater_on_temp,
            heater_off_temp: defaults.heater_off_temp,
            heater_enabled: true,
          })
          .eq('user_id', user.id);
      }

      toast({
        title: language === 'bn' ? '✅ অটোমেশন সেটিংস সংরক্ষিত' : '✅ Automation settings saved',
      });

      setCurrentStep('fan_direction');
    } catch (error: any) {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [user, shedId, toast, language]);

  // Step 2: Fan direction test
  const runFanDirectionTest = useCallback(async () => {
    setIsTestRunning(true);
    setTestProgress(0);

    // Turn on exhaust fan
    await sendCommand('exhaust_fan', true);

    // Run for 10 seconds
    for (let i = 0; i <= 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setTestProgress((i / 10) * 100);
    }

    // Turn off
    await sendCommand('exhaust_fan', false);
    setIsTestRunning(false);
  }, [sendCommand]);

  const saveFanDirectionResult = useCallback(async (passed: boolean) => {
    const data: CalibrationData = {
      ...calibrationData,
      id: existingData?.id || calibrationData.id,
      fan_direction_test_passed: passed,
    };

    await saveCalibration.mutateAsync({
      ...data,
      device_token_id: deviceTokenId,
      shed_id: shedId,
    });

    setCalibrationData(data);
    
    if (passed) {
      setCurrentStep('temp_sensor');
    } else {
      toast({
        title: language === 'bn' ? '⚠️ ফ্যান ওয়্যারিং পরিবর্তন করুন' : '⚠️ Reverse fan wiring',
        description: language === 'bn' 
          ? 'বাতাস অবশ্যই বাইরে যেতে হবে'
          : 'Air must flow OUTSIDE',
        variant: 'destructive',
      });
    }
  }, [calibrationData, existingData, deviceTokenId, shedId, saveCalibration, toast, language]);

  // Step 3: Temperature sensor placement test
  const runTempSensorTest = useCallback(async (currentTemp: number) => {
    setIsTestRunning(true);
    setTestProgress(0);
    setInitialTemp(currentTemp);

    toast({
      title: language === 'bn' ? '🚪 দরজা খুলুন' : '🚪 Open farm door',
      description: language === 'bn' 
        ? '২০ সেকেন্ডের জন্য খোলা রাখুন'
        : 'Keep open for 20 seconds',
    });

    // Wait 20 seconds
    for (let i = 0; i <= 20; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setTestProgress((i / 20) * 100);
    }

    setIsTestRunning(false);
  }, [toast, language]);

  const saveTempSensorResult = useCallback(async (finalTemp: number) => {
    if (initialTemp === null) return;

    const tempDrop = initialTemp - finalTemp;
    const dropRate = tempDrop / 20; // per second
    
    // If temp didn't change much (< 0.5°C in 20 seconds), sensor placement is suspicious
    const passed = Math.abs(tempDrop) >= 0.5;
    const status = passed ? 'good' : 'suspicious';

    const data: CalibrationData = {
      ...calibrationData,
      id: existingData?.id || calibrationData.id,
      temp_sensor_test_passed: passed,
      temp_drop_rate: dropRate,
      temp_sensor_placement_status: status,
    };

    await saveCalibration.mutateAsync({
      ...data,
      device_token_id: deviceTokenId,
      shed_id: shedId,
    });

    setCalibrationData(data);
    setCurrentStep('ammonia_baseline');

    if (!passed) {
      toast({
        title: language === 'bn' ? '⚠️ সেন্সর অবস্থান সন্দেহজনক' : '⚠️ Sensor placement suspicious',
        description: language === 'bn' 
          ? 'সেন্সর পাখি বা হিটারের খুব কাছে থাকতে পারে'
          : 'Sensor may be too close to birds or heater',
        variant: 'destructive',
      });
    }
  }, [initialTemp, calibrationData, existingData, deviceTokenId, shedId, saveCalibration, toast, language]);

  // Step 4: Ammonia baseline calibration
  const runAmmoniaCalibration = useCallback(async (currentNH3: number) => {
    setIsTestRunning(true);
    setTestProgress(0);
    setInitialNH3(currentNH3);

    toast({
      title: language === 'bn' ? '🌬️ বিশুদ্ধ বায়ু নিশ্চিত করুন' : '🌬️ Ensure fresh air',
      description: language === 'bn' 
        ? '৩০ সেকেন্ড স্যাম্পলিং...'
        : 'Sampling for 30 seconds...',
    });

    // Sample for 30 seconds
    let samples: number[] = [currentNH3];
    for (let i = 0; i <= 30; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setTestProgress((i / 30) * 100);
      // In real scenario, we'd get new readings
      samples.push(currentNH3);
    }

    setIsTestRunning(false);
    return samples;
  }, [toast, language]);

  const saveAmmoniaBaseline = useCallback(async (baselinePPM: number) => {
    const data: CalibrationData = {
      ...calibrationData,
      id: existingData?.id || calibrationData.id,
      clean_air_nh3_ppm: baselinePPM,
    };

    await saveCalibration.mutateAsync({
      ...data,
      device_token_id: deviceTokenId,
      shed_id: shedId,
    });

    setCalibrationData(data);
    setCurrentStep('heater_response');

    toast({
      title: language === 'bn' ? '✅ অ্যামোনিয়া বেসলাইন সেট' : '✅ Ammonia baseline set',
      description: `${baselinePPM.toFixed(1)} ppm`,
    });
  }, [calibrationData, existingData, deviceTokenId, shedId, saveCalibration, toast, language]);

  // Step 5: Heater response test
  const runHeaterTest = useCallback(async (currentTemp: number) => {
    setIsTestRunning(true);
    setTestProgress(0);
    setInitialTemp(currentTemp);

    // Turn on heater
    await sendCommand('heater', true);

    toast({
      title: language === 'bn' ? '🔥 হিটার টেস্ট চলছে' : '🔥 Heater test running',
      description: language === 'bn' 
        ? '৬০ সেকেন্ড অপেক্ষা করুন...'
        : 'Wait 60 seconds...',
    });

    // Run for 60 seconds
    for (let i = 0; i <= 60; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setTestProgress((i / 60) * 100);
    }

    // Turn off
    await sendCommand('heater', false);
    setIsTestRunning(false);
  }, [sendCommand, toast, language]);

  const saveHeaterResult = useCallback(async (finalTemp: number) => {
    if (initialTemp === null) return;

    const tempRise = finalTemp - initialTemp;
    const passed = tempRise >= 0.3; // At least 0.3°C rise

    const data: CalibrationData = {
      ...calibrationData,
      id: existingData?.id || calibrationData.id,
      heater_test_passed: passed,
      heater_temp_rise: tempRise,
    };

    await saveCalibration.mutateAsync({
      ...data,
      device_token_id: deviceTokenId,
      shed_id: shedId,
    });

    setCalibrationData(data);
    setCurrentStep('water_flow');

    if (!passed) {
      toast({
        title: language === 'bn' ? '⚠️ হিটার অকার্যকর' : '⚠️ Heater ineffective',
        description: language === 'bn' 
          ? 'হিটার কাজ করছে না বা সেন্সর দূরে'
          : 'Heater not working or sensor too far',
        variant: 'destructive',
      });
    }
  }, [initialTemp, calibrationData, existingData, deviceTokenId, shedId, saveCalibration, toast, language]);

  // Step 6: Water flow test
  const runWaterFlowTest = useCallback(async () => {
    setIsTestRunning(true);
    setTestProgress(0);

    toast({
      title: language === 'bn' ? '💧 ওয়াটার ফ্লো টেস্ট' : '💧 Water flow test',
      description: language === 'bn' 
        ? '৬০ সেকেন্ড পালস ডিটেকশন...'
        : 'Detecting pulses for 60 seconds...',
    });

    // Detect for 60 seconds
    for (let i = 0; i <= 60; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setTestProgress((i / 60) * 100);
    }

    setIsTestRunning(false);
  }, [toast, language]);

  const saveWaterFlowResult = useCallback(async (pulsePattern: number, passed: boolean) => {
    const data: CalibrationData = {
      ...calibrationData,
      id: existingData?.id || calibrationData.id,
      water_flow_test_passed: passed,
      water_normal_pulse_pattern: pulsePattern,
    };

    await saveCalibration.mutateAsync({
      ...data,
      device_token_id: deviceTokenId,
      shed_id: shedId,
    });

    setCalibrationData(data);
    setCurrentStep('complete');
  }, [calibrationData, existingData, deviceTokenId, shedId, saveCalibration]);

  // Complete wizard
  const completeWizard = useCallback(async () => {
    // Calculate score
    let score = 0;
    if (calibrationData.fan_direction_test_passed) score += 20;
    if (calibrationData.temp_sensor_test_passed) score += 20;
    if (calibrationData.clean_air_nh3_ppm !== undefined) score += 20;
    if (calibrationData.heater_test_passed) score += 20;
    if (calibrationData.water_flow_test_passed) score += 20;

    let status: string;
    if (score >= 80) status = 'good';
    else if (score >= 60) status = 'acceptable';
    else status = 'needs_fix';

    const data: CalibrationData = {
      ...calibrationData,
      id: existingData?.id || calibrationData.id,
      overall_status: status,
      calibration_score: score,
      wizard_completed: true,
    };

    await saveCalibration.mutateAsync({
      ...data,
      device_token_id: deviceTokenId,
      shed_id: shedId,
    });

    setCalibrationData(data);

    toast({
      title: language === 'bn' ? '🎉 ক্যালিব্রেশন সম্পন্ন!' : '🎉 Calibration complete!',
      description: language === 'bn' 
        ? `স্কোর: ${score}% (${status === 'good' ? 'ভালো' : status === 'acceptable' ? 'গ্রহণযোগ্য' : 'সংশোধন প্রয়োজন'})`
        : `Score: ${score}% (${status.replace('_', ' ')})`,
    });

    return { score, status };
  }, [calibrationData, existingData, deviceTokenId, shedId, saveCalibration, toast, language]);

  // Skip to step
  const goToStep = useCallback((step: CalibrationStep) => {
    setCurrentStep(step);
  }, []);

  // Reset wizard
  const resetWizard = useCallback(() => {
    setCurrentStep('dimensions');
    setCalibrationData({});
    setIsTestRunning(false);
    setTestProgress(0);
    setInitialTemp(null);
    setInitialNH3(null);
  }, []);

  return {
    currentStep,
    calibrationData: { ...existingData, ...calibrationData },
    isLoading,
    isTestRunning,
    testProgress,
    
    // Step handlers
    saveDimensions,
    saveAutomationDefaults,
    runFanDirectionTest,
    saveFanDirectionResult,
    runTempSensorTest,
    saveTempSensorResult,
    runAmmoniaCalibration,
    saveAmmoniaBaseline,
    runHeaterTest,
    saveHeaterResult,
    runWaterFlowTest,
    saveWaterFlowResult,
    completeWizard,
    
    // Navigation
    goToStep,
    resetWizard,
  };
}
