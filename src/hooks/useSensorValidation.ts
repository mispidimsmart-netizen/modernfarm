import { useEffect, useRef, useState, useCallback } from 'react';
import { SensorData } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface SensorIssue {
  sensor: 'temperature' | 'humidity' | 'ammonia' | 'water';
  type: 'stuck' | 'spike' | 'disconnected' | 'invalid';
  severity: 'info' | 'warning' | 'danger';
  message: { bn: string; en: string };
  detectedAt: Date;
  shouldIgnoreSensor: boolean;
}

interface SensorReading {
  value: number;
  timestamp: number;
}

// === SENSOR HEALTH THRESHOLDS ===
const TEMP_STUCK_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const HUMIDITY_STUCK_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes (per spec)
const AMMONIA_STUCK_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const SPIKE_THRESHOLD_TEMP = 8; // 8°C jump in 5 seconds = invalid
const SPIKE_WINDOW_MS = 5000; // 5 seconds
const AMMONIA_ZERO_TIMEOUT_MS = 15 * 60 * 1000; // 15 min of zero = disconnected
const AMMONIA_SPIKE_THRESHOLD = 25; // ppm spike to ignore
const AMMONIA_SPIKE_WINDOW_MS = 10000; // 10 seconds for ammonia spike detection

export function useSensorValidation(sensorData: SensorData) {
  const { user } = useAuth();
  const [issues, setIssues] = useState<SensorIssue[]>([]);
  const [ignoredSensors, setIgnoredSensors] = useState<Set<string>>(new Set());
  
  // History refs for each sensor
  const tempHistory = useRef<SensorReading[]>([]);
  const humidityHistory = useRef<SensorReading[]>([]);
  const ammoniaHistory = useRef<SensorReading[]>([]);
  const waterHistory = useRef<SensorReading[]>([]);
  
  // Last change timestamps
  const lastTempChange = useRef<number>(Date.now());
  const lastHumidityChange = useRef<number>(Date.now());
  const lastAmmoniaChange = useRef<number>(Date.now());
  const lastWaterChange = useRef<number>(Date.now());
  
  // Previous values for change detection
  const prevTemp = useRef<number | null>(null);
  const prevHumidity = useRef<number | null>(null);
  const prevAmmonia = useRef<number | null>(null);
  const prevWater = useRef<number | null>(null);
  
  // Track ammonia zero start time
  const ammoniaZeroStart = useRef<number | null>(null);
  
  // Alert tracking to prevent spam
  const lastAlertSent = useRef<Record<string, number>>({});

  const addReading = useCallback((
    history: React.MutableRefObject<SensorReading[]>,
    value: number,
    maxAge: number = 60000
  ) => {
    const now = Date.now();
    history.current.push({ value, timestamp: now });
    // Keep only readings within maxAge
    history.current = history.current.filter(r => now - r.timestamp <= maxAge);
  }, []);

  // Get sensor-specific timeout
  const getSensorTimeout = (sensor: SensorIssue['sensor']): number => {
    switch (sensor) {
      case 'humidity': return HUMIDITY_STUCK_TIMEOUT_MS;
      case 'temperature': return TEMP_STUCK_TIMEOUT_MS;
      case 'ammonia': return AMMONIA_STUCK_TIMEOUT_MS;
      default: return TEMP_STUCK_TIMEOUT_MS;
    }
  };

  const checkStuck = useCallback((
    currentValue: number,
    prevValue: React.MutableRefObject<number | null>,
    lastChange: React.MutableRefObject<number>,
    sensor: SensorIssue['sensor']
  ): SensorIssue | null => {
    const now = Date.now();
    const timeout = getSensorTimeout(sensor);
    
    // Check if value changed (threshold varies by sensor)
    const changeThreshold = sensor === 'humidity' ? 0.5 : 0.1;
    if (prevValue.current !== null && Math.abs(currentValue - prevValue.current) > changeThreshold) {
      lastChange.current = now;
    }
    prevValue.current = currentValue;
    
    // Check if stuck for too long
    if (now - lastChange.current >= timeout) {
      const sensorNames = {
        temperature: { bn: 'তাপমাত্রা', en: 'Temperature' },
        humidity: { bn: 'আর্দ্রতা', en: 'Humidity' },
        ammonia: { bn: 'অ্যামোনিয়া', en: 'Ammonia' },
        water: { bn: 'পানি', en: 'Water' }
      };
      const timeLabel = sensor === 'humidity' ? '২০+' : '১০+';
      const timeLabelEn = sensor === 'humidity' ? '20+' : '10+';
      
      return {
        sensor,
        type: 'stuck',
        severity: 'warning',
        message: {
          bn: `⚠️ ${sensorNames[sensor].bn} সেন্সর স্থির - ${timeLabel} মিনিট একই রিডিং`,
          en: `⚠️ ${sensorNames[sensor].en} sensor stuck - same reading ${timeLabelEn} min`
        },
        detectedAt: new Date(),
        shouldIgnoreSensor: true,
      };
    }
    return null;
  }, []);

  const checkSpike = useCallback((
    history: SensorReading[],
    currentValue: number,
    threshold: number,
    sensor: SensorIssue['sensor']
  ): SensorIssue | null => {
    const now = Date.now();
    const recentReadings = history.filter(r => now - r.timestamp <= SPIKE_WINDOW_MS);
    
    for (const reading of recentReadings) {
      const diff = Math.abs(currentValue - reading.value);
      if (diff >= threshold) {
        return {
          sensor,
          type: 'spike',
          severity: 'danger',
          message: {
            bn: `🚨 অবাস্তব রিডিং - ${diff.toFixed(1)}°সি পরিবর্তন ৫ সেকেন্ডে`,
            en: `🚨 Invalid reading - ${diff.toFixed(1)}°C change in 5 sec`
          },
          detectedAt: new Date(),
          shouldIgnoreSensor: true,
        };
      }
    }
    return null;
  }, []);

  // Check ammonia spike (sudden extreme jump - ignore and re-sample)
  const checkAmmoniaSpike = useCallback((ammonia: number): SensorIssue | null => {
    const now = Date.now();
    const recentReadings = ammoniaHistory.current.filter(r => now - r.timestamp <= AMMONIA_SPIKE_WINDOW_MS);
    
    if (recentReadings.length > 0) {
      const avgRecent = recentReadings.reduce((sum, r) => sum + r.value, 0) / recentReadings.length;
      const spike = ammonia - avgRecent;
      
      if (spike >= AMMONIA_SPIKE_THRESHOLD) {
        return {
          sensor: 'ammonia',
          type: 'spike',
          severity: 'warning',
          message: {
            bn: `⚠️ অ্যামোনিয়া স্পাইক (+${spike.toFixed(0)} ppm) - রি-স্যাম্পলিং`,
            en: `⚠️ Ammonia spike (+${spike.toFixed(0)} ppm) - re-sampling`
          },
          detectedAt: new Date(),
          shouldIgnoreSensor: true,
        };
      }
    }
    return null;
  }, []);

  const checkAmmoniaDisconnected = useCallback((ammonia: number): SensorIssue | null => {
    const now = Date.now();
    
    if (ammonia === 0 || ammonia < 0.1) {
      if (ammoniaZeroStart.current === null) {
        ammoniaZeroStart.current = now;
      } else if (now - ammoniaZeroStart.current >= AMMONIA_ZERO_TIMEOUT_MS) {
        return {
          sensor: 'ammonia',
          type: 'disconnected',
          severity: 'danger',
          message: {
            bn: '🔌 অ্যামোনিয়া সেন্সর সংযোগ বিচ্ছিন্ন মনে হচ্ছে',
            en: '🔌 Ammonia sensor appears disconnected'
          },
          detectedAt: new Date(),
          shouldIgnoreSensor: true,
        };
      }
    } else {
      ammoniaZeroStart.current = null;
    }
    return null;
  }, []);

  // Send alert to database (throttled)
  const sendSensorAlert = useCallback(async (issue: SensorIssue) => {
    if (!user) return;
    
    const alertKey = `${issue.sensor}-${issue.type}`;
    const now = Date.now();
    const lastSent = lastAlertSent.current[alertKey] || 0;
    
    // Only send once per 30 minutes per issue type
    if (now - lastSent < 30 * 60 * 1000) return;
    
    try {
      await supabase.from('alerts').insert({
        user_id: user.id,
        alert_type: 'system' as any,
        severity: issue.severity,
        message: `Sensor Issue: ${issue.message.en}`,
        message_bn: `সেন্সর সমস্যা: ${issue.message.bn}`,
      });
      
      lastAlertSent.current[alertKey] = now;
      console.log(`[SensorValidation] Alert sent: ${alertKey}`);
    } catch (error) {
      console.error('[SensorValidation] Failed to send alert:', error);
    }
  }, [user]);

  useEffect(() => {
    const newIssues: SensorIssue[] = [];
    const newIgnored = new Set<string>();
    
    // Add readings to history
    addReading(tempHistory, sensorData.temperature);
    addReading(humidityHistory, sensorData.humidity);
    addReading(ammoniaHistory, sensorData.ammonia);
    addReading(waterHistory, sensorData.waterUsage);
    
    // Check temperature stuck
    const tempStuck = checkStuck(sensorData.temperature, prevTemp, lastTempChange, 'temperature');
    if (tempStuck) {
      newIssues.push(tempStuck);
      newIgnored.add('temperature');
      sendSensorAlert(tempStuck);
    }
    
    // Check temperature spike
    const tempSpike = checkSpike(tempHistory.current, sensorData.temperature, SPIKE_THRESHOLD_TEMP, 'temperature');
    if (tempSpike) {
      newIssues.push(tempSpike);
      newIgnored.add('temperature');
      sendSensorAlert(tempSpike);
    }
    
    // Check humidity stuck (20 min per spec)
    const humidityStuck = checkStuck(sensorData.humidity, prevHumidity, lastHumidityChange, 'humidity');
    if (humidityStuck) {
      newIssues.push(humidityStuck);
      newIgnored.add('humidity');
      sendSensorAlert(humidityStuck);
    }
    
    // Check ammonia stuck
    const ammoniaStuck = checkStuck(sensorData.ammonia, prevAmmonia, lastAmmoniaChange, 'ammonia');
    if (ammoniaStuck) {
      newIssues.push(ammoniaStuck);
      newIgnored.add('ammonia');
      sendSensorAlert(ammoniaStuck);
    }
    
    // Check ammonia disconnected
    const ammoniaDisconnected = checkAmmoniaDisconnected(sensorData.ammonia);
    if (ammoniaDisconnected) {
      newIssues.push(ammoniaDisconnected);
      newIgnored.add('ammonia');
      sendSensorAlert(ammoniaDisconnected);
    }
    
    // Check ammonia spike (sudden extreme - ignore and re-sample)
    const ammoniaSpike = checkAmmoniaSpike(sensorData.ammonia);
    if (ammoniaSpike) {
      newIssues.push(ammoniaSpike);
      newIgnored.add('ammonia');
    }
    
    // Check water stuck
    const waterStuck = checkStuck(sensorData.waterUsage, prevWater, lastWaterChange, 'water');
    if (waterStuck) {
      newIssues.push(waterStuck);
      newIgnored.add('water');
    }
    
    setIssues(newIssues);
    setIgnoredSensors(newIgnored);
  }, [sensorData, addReading, checkStuck, checkSpike, checkAmmoniaDisconnected, checkAmmoniaSpike, sendSensorAlert]);

  return {
    issues,
    hasIssues: issues.length > 0,
    ignoredSensors,
    shouldIgnoreSensor: (sensor: string) => ignoredSensors.has(sensor),
    getIssuesBySensor: (sensor: SensorIssue['sensor']) => 
      issues.filter(i => i.sensor === sensor),
    getValidSensorData: () => ({
      temperature: ignoredSensors.has('temperature') ? null : sensorData.temperature,
      humidity: ignoredSensors.has('humidity') ? null : sensorData.humidity,
      ammonia: ignoredSensors.has('ammonia') ? null : sensorData.ammonia,
      waterUsage: ignoredSensors.has('water') ? null : sensorData.waterUsage,
    }),
  };
}
