import { useEffect, useRef, useState, useCallback } from 'react';
import { SensorData } from '@/lib/types';

export interface SensorIssue {
  sensor: 'temperature' | 'humidity' | 'ammonia' | 'water';
  type: 'stuck' | 'spike' | 'disconnected' | 'invalid';
  message: { bn: string; en: string };
  detectedAt: Date;
}

interface SensorReading {
  value: number;
  timestamp: number;
}

const STUCK_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const SPIKE_THRESHOLD_TEMP = 8; // 8°C jump
const SPIKE_WINDOW_MS = 5000; // 5 seconds
const AMMONIA_ZERO_TIMEOUT_MS = 15 * 60 * 1000; // 15 min of zero = disconnected

export function useSensorValidation(sensorData: SensorData) {
  const [issues, setIssues] = useState<SensorIssue[]>([]);
  
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

  const checkStuck = useCallback((
    currentValue: number,
    prevValue: React.MutableRefObject<number | null>,
    lastChange: React.MutableRefObject<number>,
    sensor: SensorIssue['sensor']
  ): SensorIssue | null => {
    const now = Date.now();
    
    // Check if value changed
    if (prevValue.current !== null && Math.abs(currentValue - prevValue.current) > 0.1) {
      lastChange.current = now;
    }
    prevValue.current = currentValue;
    
    // Check if stuck for too long
    if (now - lastChange.current >= STUCK_TIMEOUT_MS) {
      const sensorNames = {
        temperature: { bn: 'তাপমাত্রা', en: 'Temperature' },
        humidity: { bn: 'আর্দ্রতা', en: 'Humidity' },
        ammonia: { bn: 'অ্যামোনিয়া', en: 'Ammonia' },
        water: { bn: 'পানি', en: 'Water' }
      };
      return {
        sensor,
        type: 'stuck',
        message: {
          bn: `⚠️ ${sensorNames[sensor].bn} সেন্সর স্থির - ১০+ মিনিট একই রিডিং`,
          en: `⚠️ ${sensorNames[sensor].en} sensor stuck - same reading 10+ min`
        },
        detectedAt: new Date()
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
          message: {
            bn: `🚨 অবাস্তব রিডিং - ${diff.toFixed(1)}°সি পরিবর্তন ৫ সেকেন্ডে`,
            en: `🚨 Invalid reading - ${diff.toFixed(1)}°C change in 5 sec`
          },
          detectedAt: new Date()
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
          message: {
            bn: '🔌 অ্যামোনিয়া সেন্সর সংযোগ বিচ্ছিন্ন মনে হচ্ছে',
            en: '🔌 Ammonia sensor appears disconnected'
          },
          detectedAt: new Date()
        };
      }
    } else {
      ammoniaZeroStart.current = null;
    }
    return null;
  }, []);

  useEffect(() => {
    const newIssues: SensorIssue[] = [];
    const now = Date.now();
    
    // Add readings to history
    addReading(tempHistory, sensorData.temperature);
    addReading(humidityHistory, sensorData.humidity);
    addReading(ammoniaHistory, sensorData.ammonia);
    addReading(waterHistory, sensorData.waterUsage);
    
    // Check temperature stuck
    const tempStuck = checkStuck(sensorData.temperature, prevTemp, lastTempChange, 'temperature');
    if (tempStuck) newIssues.push(tempStuck);
    
    // Check temperature spike
    const tempSpike = checkSpike(tempHistory.current, sensorData.temperature, SPIKE_THRESHOLD_TEMP, 'temperature');
    if (tempSpike) newIssues.push(tempSpike);
    
    // Check humidity stuck
    const humidityStuck = checkStuck(sensorData.humidity, prevHumidity, lastHumidityChange, 'humidity');
    if (humidityStuck) newIssues.push(humidityStuck);
    
    // Check ammonia stuck
    const ammoniaStuck = checkStuck(sensorData.ammonia, prevAmmonia, lastAmmoniaChange, 'ammonia');
    if (ammoniaStuck) newIssues.push(ammoniaStuck);
    
    // Check ammonia disconnected
    const ammoniaDisconnected = checkAmmoniaDisconnected(sensorData.ammonia);
    if (ammoniaDisconnected) newIssues.push(ammoniaDisconnected);
    
    // Check water stuck
    const waterStuck = checkStuck(sensorData.waterUsage, prevWater, lastWaterChange, 'water');
    if (waterStuck) newIssues.push(waterStuck);
    
    setIssues(newIssues);
  }, [sensorData, addReading, checkStuck, checkSpike, checkAmmoniaDisconnected]);

  return {
    issues,
    hasIssues: issues.length > 0,
    getIssuesBySensor: (sensor: SensorIssue['sensor']) => 
      issues.filter(i => i.sensor === sensor),
  };
}
