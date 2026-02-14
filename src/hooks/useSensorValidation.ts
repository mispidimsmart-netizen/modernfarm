import { useEffect, useRef, useState, useCallback } from 'react';
import { SensorData } from '@/lib/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface SensorIssue {
  sensor: 'temperature' | 'humidity' | 'ammonia' | 'water';
  type: 'stuck' | 'spike' | 'disconnected' | 'invalid' | 'out_of_range';
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
const TEMP_STUCK_TIMEOUT_MS = 10 * 60 * 1000;
const HUMIDITY_STUCK_TIMEOUT_MS = 20 * 60 * 1000;
const AMMONIA_STUCK_TIMEOUT_MS = 10 * 60 * 1000;
const SPIKE_THRESHOLD_TEMP = 8;
const SPIKE_WINDOW_MS = 5000;
const AMMONIA_ZERO_TIMEOUT_MS = 15 * 60 * 1000;
const AMMONIA_SPIKE_THRESHOLD = 25;
const AMMONIA_SPIKE_WINDOW_MS = 10000;

// === OUT OF RANGE THRESHOLDS ===
const VALID_RANGES: Record<string, { min: number; max: number; unit: string }> = {
  temperature: { min: -10, max: 60, unit: '°C' },
  humidity: { min: 0, max: 100, unit: '%' },
  ammonia: { min: 0, max: 200, unit: 'ppm' },
  water: { min: 0, max: 500, unit: 'L/h' },
};

// === SAFE MODE DURATION ===
const SAFE_MODE_DURATION_MS = 10 * 60 * 1000; // 10 minutes

export function useSensorValidation(sensorData: SensorData) {
  const { user } = useAuth();
  const [issues, setIssues] = useState<SensorIssue[]>([]);
  const [ignoredSensors, setIgnoredSensors] = useState<Set<string>>(new Set());
  const [safeModeActive, setSafeModeActive] = useState(false);
  const [safeModeUntil, setSafeModeUntil] = useState<Date | null>(null);

  // History refs
  const tempHistory = useRef<SensorReading[]>([]);
  const humidityHistory = useRef<SensorReading[]>([]);
  const ammoniaHistory = useRef<SensorReading[]>([]);
  const waterHistory = useRef<SensorReading[]>([]);

  // Last change timestamps
  const lastTempChange = useRef<number>(Date.now());
  const lastHumidityChange = useRef<number>(Date.now());
  const lastAmmoniaChange = useRef<number>(Date.now());
  const lastWaterChange = useRef<number>(Date.now());

  // Previous values
  const prevTemp = useRef<number | null>(null);
  const prevHumidity = useRef<number | null>(null);
  const prevAmmonia = useRef<number | null>(null);
  const prevWater = useRef<number | null>(null);

  const ammoniaZeroStart = useRef<number | null>(null);
  const lastAlertSent = useRef<Record<string, number>>({});
  const lastIncidentLogged = useRef<Record<string, number>>({});
  const safeModeTriggeredRef = useRef(false);

  const addReading = useCallback((
    history: React.MutableRefObject<SensorReading[]>,
    value: number,
    maxAge: number = 60000
  ) => {
    const now = Date.now();
    history.current.push({ value, timestamp: now });
    history.current = history.current.filter(r => now - r.timestamp <= maxAge);
  }, []);

  const getSensorTimeout = (sensor: SensorIssue['sensor']): number => {
    switch (sensor) {
      case 'humidity': return HUMIDITY_STUCK_TIMEOUT_MS;
      case 'temperature': return TEMP_STUCK_TIMEOUT_MS;
      case 'ammonia': return AMMONIA_STUCK_TIMEOUT_MS;
      default: return TEMP_STUCK_TIMEOUT_MS;
    }
  };

  // === OUT OF RANGE CHECK ===
  const checkOutOfRange = useCallback((
    value: number,
    sensor: SensorIssue['sensor']
  ): SensorIssue | null => {
    const range = VALID_RANGES[sensor];
    if (!range) return null;

    if (value < range.min || value > range.max) {
      const sensorNames = {
        temperature: { bn: 'তাপমাত্রা', en: 'Temperature' },
        humidity: { bn: 'আর্দ্রতা', en: 'Humidity' },
        ammonia: { bn: 'অ্যামোনিয়া', en: 'Ammonia' },
        water: { bn: 'পানি', en: 'Water' },
      };
      return {
        sensor,
        type: 'out_of_range',
        severity: 'danger',
        message: {
          bn: `🚨 ${sensorNames[sensor].bn} সীমার বাইরে: ${value}${range.unit} (${range.min}-${range.max})`,
          en: `🚨 ${sensorNames[sensor].en} out of range: ${value}${range.unit} (${range.min}-${range.max})`,
        },
        detectedAt: new Date(),
        shouldIgnoreSensor: true,
      };
    }
    return null;
  }, []);

  const checkStuck = useCallback((
    currentValue: number,
    prevValue: React.MutableRefObject<number | null>,
    lastChange: React.MutableRefObject<number>,
    sensor: SensorIssue['sensor']
  ): SensorIssue | null => {
    const now = Date.now();
    const timeout = getSensorTimeout(sensor);

    const changeThreshold = sensor === 'humidity' ? 0.5 : 0.1;
    if (prevValue.current !== null && Math.abs(currentValue - prevValue.current) > changeThreshold) {
      lastChange.current = now;
    }
    prevValue.current = currentValue;

    if (now - lastChange.current >= timeout) {
      const sensorNames = {
        temperature: { bn: 'তাপমাত্রা', en: 'Temperature' },
        humidity: { bn: 'আর্দ্রতা', en: 'Humidity' },
        ammonia: { bn: 'অ্যামোনিয়া', en: 'Ammonia' },
        water: { bn: 'পানি', en: 'Water' },
      };
      const timeLabel = sensor === 'humidity' ? '২০+' : '১০+';
      const timeLabelEn = sensor === 'humidity' ? '20+' : '10+';

      return {
        sensor,
        type: 'stuck',
        severity: 'warning',
        message: {
          bn: `⚠️ ${sensorNames[sensor].bn} সেন্সর স্থির - ${timeLabel} মিনিট একই রিডিং`,
          en: `⚠️ ${sensorNames[sensor].en} sensor stuck - same reading ${timeLabelEn} min`,
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
            en: `🚨 Invalid reading - ${diff.toFixed(1)}°C change in 5 sec`,
          },
          detectedAt: new Date(),
          shouldIgnoreSensor: true,
        };
      }
    }
    return null;
  }, []);

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
            en: `⚠️ Ammonia spike (+${spike.toFixed(0)} ppm) - re-sampling`,
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
            en: '🔌 Ammonia sensor appears disconnected',
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

  // === SEND ALERT TO DB (throttled) ===
  const sendSensorAlert = useCallback(async (issue: SensorIssue) => {
    if (!user) return;

    const alertKey = `${issue.sensor}-${issue.type}`;
    const now = Date.now();
    const lastSent = lastAlertSent.current[alertKey] || 0;

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

  // === LOG INCIDENT TO AUDIT LOG ===
  const logIncident = useCallback(async (issue: SensorIssue) => {
    if (!user) return;

    const incidentKey = `${issue.sensor}-${issue.type}`;
    const now = Date.now();
    const lastLogged = lastIncidentLogged.current[incidentKey] || 0;

    // Log once per 15 minutes per issue type
    if (now - lastLogged < 15 * 60 * 1000) return;

    try {
      await (supabase.from('farm_audit_logs') as any).insert({
        user_id: user.id,
        user_email: user.email || '',
        action_type: 'sensor_anomaly_detected',
        action_category: 'safety',
        target_entity: issue.sensor,
        severity: issue.severity === 'danger' ? 'critical' : 'warning',
        source: 'sensor_validation',
        metadata: {
          issue_type: issue.type,
          sensor: issue.sensor,
          message_en: issue.message.en,
          detected_at: issue.detectedAt.toISOString(),
          safe_mode_triggered: issue.severity === 'danger',
        },
      });

      lastIncidentLogged.current[incidentKey] = now;
      console.log(`[SensorValidation] Incident logged: ${incidentKey}`);
    } catch (error) {
      console.error('[SensorValidation] Failed to log incident:', error);
    }
  }, [user]);

  // === ACTIVATE SAFE MODE ===
  const activateSafeMode = useCallback(async (reason: string) => {
    if (safeModeTriggeredRef.current) return;
    safeModeTriggeredRef.current = true;

    const until = new Date(Date.now() + SAFE_MODE_DURATION_MS);
    setSafeModeActive(true);
    setSafeModeUntil(until);

    console.log(`[SensorValidation] SAFE MODE ACTIVATED: ${reason} — until ${until.toISOString()}`);

    if (!user) return;

    try {
      // Update device_health safe_mode_until
      await supabase
        .from('device_health')
        .update({ safe_mode_until: until.toISOString() } as any)
        .eq('user_id', user.id);

      // Log to audit
      await (supabase.from('farm_audit_logs') as any).insert({
        user_id: user.id,
        user_email: user.email || '',
        action_type: 'safe_mode_activated',
        action_category: 'safety',
        severity: 'critical',
        source: 'sensor_validation',
        metadata: {
          reason,
          safe_mode_until: until.toISOString(),
          duration_minutes: SAFE_MODE_DURATION_MS / 60000,
        },
      });
    } catch (error) {
      console.error('[SensorValidation] Failed to activate safe mode:', error);
    }
  }, [user]);

  // === CHECK SAFE MODE EXPIRY ===
  useEffect(() => {
    if (!safeModeActive || !safeModeUntil) return;

    const checkExpiry = () => {
      if (new Date() >= safeModeUntil) {
        setSafeModeActive(false);
        setSafeModeUntil(null);
        safeModeTriggeredRef.current = false;
        console.log('[SensorValidation] Safe mode expired, resuming normal operations');
      }
    };

    const interval = setInterval(checkExpiry, 10000);
    return () => clearInterval(interval);
  }, [safeModeActive, safeModeUntil]);

  // === MAIN VALIDATION LOOP ===
  useEffect(() => {
    const newIssues: SensorIssue[] = [];
    const newIgnored = new Set<string>();
    let dangerDetected = false;

    // Add readings to history
    addReading(tempHistory, sensorData.temperature);
    addReading(humidityHistory, sensorData.humidity);
    addReading(ammoniaHistory, sensorData.ammonia);
    addReading(waterHistory, sensorData.waterUsage);

    // --- Out of Range checks ---
    const tempOOR = checkOutOfRange(sensorData.temperature, 'temperature');
    if (tempOOR) { newIssues.push(tempOOR); newIgnored.add('temperature'); dangerDetected = true; }

    const humidityOOR = checkOutOfRange(sensorData.humidity, 'humidity');
    if (humidityOOR) { newIssues.push(humidityOOR); newIgnored.add('humidity'); dangerDetected = true; }

    const ammoniaOOR = checkOutOfRange(sensorData.ammonia, 'ammonia');
    if (ammoniaOOR) { newIssues.push(ammoniaOOR); newIgnored.add('ammonia'); dangerDetected = true; }

    const waterOOR = checkOutOfRange(sensorData.waterUsage, 'water');
    if (waterOOR) { newIssues.push(waterOOR); newIgnored.add('water'); }

    // --- Stuck checks ---
    const tempStuck = checkStuck(sensorData.temperature, prevTemp, lastTempChange, 'temperature');
    if (tempStuck) { newIssues.push(tempStuck); newIgnored.add('temperature'); sendSensorAlert(tempStuck); logIncident(tempStuck); }

    const tempSpike = checkSpike(tempHistory.current, sensorData.temperature, SPIKE_THRESHOLD_TEMP, 'temperature');
    if (tempSpike) { newIssues.push(tempSpike); newIgnored.add('temperature'); dangerDetected = true; sendSensorAlert(tempSpike); logIncident(tempSpike); }

    const humidityStuck = checkStuck(sensorData.humidity, prevHumidity, lastHumidityChange, 'humidity');
    if (humidityStuck) { newIssues.push(humidityStuck); newIgnored.add('humidity'); sendSensorAlert(humidityStuck); logIncident(humidityStuck); }

    const ammoniaStuck = checkStuck(sensorData.ammonia, prevAmmonia, lastAmmoniaChange, 'ammonia');
    if (ammoniaStuck) { newIssues.push(ammoniaStuck); newIgnored.add('ammonia'); sendSensorAlert(ammoniaStuck); logIncident(ammoniaStuck); }

    const ammoniaDisconnected = checkAmmoniaDisconnected(sensorData.ammonia);
    if (ammoniaDisconnected) { newIssues.push(ammoniaDisconnected); newIgnored.add('ammonia'); dangerDetected = true; sendSensorAlert(ammoniaDisconnected); logIncident(ammoniaDisconnected); }

    const ammoniaSpike = checkAmmoniaSpike(sensorData.ammonia);
    if (ammoniaSpike) { newIssues.push(ammoniaSpike); newIgnored.add('ammonia'); }

    const waterStuck = checkStuck(sensorData.waterUsage, prevWater, lastWaterChange, 'water');
    if (waterStuck) { newIssues.push(waterStuck); newIgnored.add('water'); }

    // --- Send alerts & log for OOR issues ---
    for (const issue of newIssues) {
      if (issue.type === 'out_of_range') {
        sendSensorAlert(issue);
        logIncident(issue);
      }
    }

    // --- SAFE MODE: Trigger on any danger-level anomaly ---
    if (dangerDetected && !safeModeTriggeredRef.current) {
      const dangerIssues = newIssues.filter(i => i.severity === 'danger');
      const reason = dangerIssues.map(i => `${i.sensor}:${i.type}`).join(', ');
      activateSafeMode(reason);
    }

    setIssues(newIssues);
    setIgnoredSensors(newIgnored);
  }, [sensorData, addReading, checkStuck, checkSpike, checkOutOfRange, checkAmmoniaDisconnected, checkAmmoniaSpike, sendSensorAlert, logIncident, activateSafeMode]);

  return {
    issues,
    hasIssues: issues.length > 0,
    ignoredSensors,
    safeModeActive,
    safeModeUntil,
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
