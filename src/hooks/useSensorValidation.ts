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
const TEMP_STUCK_TIMEOUT_MS = 2 * 60 * 1000;      // 2 min — per spec: identical reading for 2 minutes
const HUMIDITY_STUCK_TIMEOUT_MS = 2 * 60 * 1000;   // 2 min — per spec
const AMMONIA_STUCK_TIMEOUT_MS = 2 * 60 * 1000;    // 2 min — per spec
const SPIKE_THRESHOLD_TEMP = 8;
const SPIKE_WINDOW_MS = 5000;
const AMMONIA_ZERO_TIMEOUT_MS = 15 * 60 * 1000;
const AMMONIA_SPIKE_THRESHOLD = 25;
const AMMONIA_SPIKE_WINDOW_MS = 10000;

// === SENSOR DRIFT DETECTION (contradicts physical effect) ===
const DRIFT_EVALUATION_WINDOW_MS = 10 * 60 * 1000; // 10 min window
const DRIFT_DEVICE_ACTIVE_THRESHOLD_MS = 6 * 60 * 1000; // 6 min active within window
const DRIFT_HEATER_EXPECTED_RISE = 0.8; // °C expected after 6 min heater
const DRIFT_FAN_EXPECTED_DROP = 0.5;    // °C expected after 6 min fan

// === SENSOR FREEZE DETECTION (while devices running) ===
const FREEZE_CHANGE_THRESHOLD = 0.2;  // °C — less than this = frozen
const FREEZE_TIMEOUT_MS = 120 * 1000; // 120 seconds


// === SENSOR TIMEOUT THRESHOLD ===
const SENSOR_TIMEOUT_MS = 25 * 1000; // 25 seconds — triggers survival mode

// === SURVIVAL MODE CONFIG (per spec) ===
const SURVIVAL_FAN_ON_MS = 40 * 1000;    // 40s ON
const SURVIVAL_FAN_OFF_MS = 20 * 1000;   // 20s OFF
const SURVIVAL_HEATER_DUTY_ON_MS = 12 * 1000;  // ~10% duty (12s ON)
const SURVIVAL_HEATER_DUTY_OFF_MS = 108 * 1000; // (108s OFF) = 10% of 120s cycle
const MOTOR_MAX_RUNTIME_MS = 2 * 60 * 1000;     // 2 min max continuous motor runtime
const HEATER_COOLDOWN_MS = 2 * 60 * 1000;       // 2 min heater cooldown
const WATCHDOG_FREEZE_MS = 10 * 1000;            // 10s freeze detection

// === OUT OF RANGE THRESHOLDS ===
const VALID_RANGES: Record<string, { min: number; max: number; unit: string }> = {
  temperature: { min: -10, max: 60, unit: '°C' },
  humidity: { min: 0, max: 100, unit: '%' },
  ammonia: { min: 0, max: 200, unit: 'ppm' },
  water: { min: 0, max: 500, unit: 'L/h' },
};

// === SAFE MODE DURATION ===
const SAFE_MODE_DURATION_MS = 10 * 60 * 1000; // 10 minutes

// === ENVIRONMENTAL PLAUSIBILITY MODEL ===
const PLAUSIBILITY_WINDOW_MS = 20 * 60 * 1000;        // 20-minute evaluation window
const PLAUSIBILITY_CHECK_INTERVAL_MS = 60 * 1000;     // check every 60s
const PLAUSIBILITY_HEATER_EXPECTED_RATE = 0.06;        // °C/min expected rise while heater ON
const PLAUSIBILITY_FAN_EXPECTED_RATE = 0.04;           // °C/min expected drop while fan ON
const PLAUSIBILITY_TOLERANCE = 0.5;                    // allow 50% shortfall before flagging
const HEATER_AUTHORITY_DEGRADED_PERCENT = 60;          // reduce heater to 60% duty when degraded

export interface SensorValidationOptions {
  devicesRunning?: boolean; // true if fans/heaters are currently ON
  heaterOn?: boolean;       // true if heater relay is ON
  fanOn?: boolean;          // true if exhaust fan relay is ON
}

export interface PlausibilityStatus {
  isDegraded: boolean;
  heaterAuthorityPercent: number;  // 100 = full, 60 = degraded
  expectedTempChange: number;
  actualTempChange: number;
  degradedSince: Date | null;
  reason: string | null;
}

export function useSensorValidation(sensorData: SensorData, options?: SensorValidationOptions) {
  const { user } = useAuth();
  const [issues, setIssues] = useState<SensorIssue[]>([]);
  const [ignoredSensors, setIgnoredSensors] = useState<Set<string>>(new Set());
  const [safeModeActive, setSafeModeActive] = useState(false);
  const [safeModeUntil, setSafeModeUntil] = useState<Date | null>(null);
  const [survivalMode, setSurvivalMode] = useState(false);
  const [survivalFanOn, setSurvivalFanOn] = useState(true);
  const [survivalHeaterOn, setSurvivalHeaterOn] = useState(false);
  const [plausibility, setPlausibility] = useState<PlausibilityStatus>({
    isDegraded: false,
    heaterAuthorityPercent: 100,
    expectedTempChange: 0,
    actualTempChange: 0,
    degradedSince: null,
    reason: null,
  });

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

  // Freeze detection refs: track max delta while devices running
  const freezeWindowStart = useRef<number>(Date.now());
  const freezeBaseTemp = useRef<number | null>(null);
  const freezeMaxDelta = useRef<number>(0);
  const safeModeTriggeredRef = useRef(false);

  // Drift detection refs
  const driftHeaterOnAccum = useRef<number>(0);  // ms heater ON in window
  const driftFanOnAccum = useRef<number>(0);     // ms fan ON in window
  const driftWindowStart = useRef<number>(Date.now());
  const driftTempAtWindowStart = useRef<number | null>(null);
  const driftLastTickAt = useRef<number>(Date.now());
  const driftAlertSent = useRef<boolean>(false);

  // Plausibility model refs
  const plausHeaterAccum = useRef<number>(0);    // ms heater ON in 20min window
  const plausFanAccum = useRef<number>(0);       // ms fan ON in 20min window
  const plausWindowStart = useRef<number>(Date.now());
  const plausTempAtStart = useRef<number | null>(null);
  const plausLastTick = useRef<number>(Date.now());
  const plausDegradedSince = useRef<Date | null>(null);
  const plausAlertSent = useRef<boolean>(false);

  const lastSensorUpdateTime = useRef<number>(Date.now());
  const prevSensorDataRef = useRef<string>('');
  const survivalModeTriggeredRef = useRef(false);
  const motorStartTimeRef = useRef<number | null>(null);
  const heaterCooldownUntilRef = useRef<number>(0);
  const lastLoopTickRef = useRef<number>(Date.now());

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
      const timeLabel = '২+';
      const timeLabelEn = '2+';

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

  // === SENSOR TIMEOUT → SURVIVAL MODE ===
  useEffect(() => {
    const sensorFingerprint = `${sensorData.temperature}-${sensorData.humidity}-${sensorData.ammonia}-${sensorData.waterUsage}`;
    if (sensorFingerprint !== prevSensorDataRef.current) {
      prevSensorDataRef.current = sensorFingerprint;
      lastSensorUpdateTime.current = Date.now();

      // Exit survival mode when fresh data arrives
      if (survivalModeTriggeredRef.current) {
        survivalModeTriggeredRef.current = false;
        setSurvivalMode(false);
        console.log('[SensorValidation] Fresh sensor data — exiting survival mode');
      }
    }
  }, [sensorData]);

  // === CHECK SENSOR TIMEOUT PERIODICALLY ===
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - lastSensorUpdateTime.current;

      if (elapsed >= SENSOR_TIMEOUT_MS && !survivalModeTriggeredRef.current) {
        survivalModeTriggeredRef.current = true;
        setSurvivalMode(true);
        console.log(`[SensorValidation] SURVIVAL MODE: No sensor update for ${(elapsed / 1000).toFixed(0)}s`);

        // Log incident
        if (user) {
          (supabase.from('farm_audit_logs') as any).insert({
            user_id: user.id,
            user_email: user.email || '',
            action_type: 'survival_mode_activated',
            action_category: 'safety',
            severity: 'critical',
            source: 'sensor_validation',
            metadata: {
              timeout_seconds: elapsed / 1000,
              threshold_seconds: SENSOR_TIMEOUT_MS / 1000,
              fan_cycle: `${SURVIVAL_FAN_ON_MS / 1000}s ON / ${SURVIVAL_FAN_OFF_MS / 1000}s OFF`,
              heater_duty: `${SURVIVAL_HEATER_DUTY_ON_MS / 1000}s ON / ${SURVIVAL_HEATER_DUTY_OFF_MS / 1000}s OFF`,
            },
          }).then(() => console.log('[SensorValidation] Survival mode incident logged'));
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [user]);

  // === SURVIVAL MODE: Fan cycling (40s ON / 20s OFF) with 2min max runtime ===
  useEffect(() => {
    if (!survivalMode) {
      motorStartTimeRef.current = null;
      return;
    }

    setSurvivalFanOn(true);
    motorStartTimeRef.current = Date.now();
    let fanOn = true;

    const tick = () => {
      // Motor max runtime guard: force OFF after 2 min continuous
      if (fanOn && motorStartTimeRef.current) {
        const runtime = Date.now() - motorStartTimeRef.current;
        if (runtime >= MOTOR_MAX_RUNTIME_MS) {
          fanOn = false;
          setSurvivalFanOn(false);
          motorStartTimeRef.current = null;
          console.log('[Survival] Motor max runtime reached — forced OFF');
          return;
        }
      }

      fanOn = !fanOn;
      setSurvivalFanOn(fanOn);
      if (fanOn) {
        motorStartTimeRef.current = Date.now();
      }
    };

    // Precise cycling: 40s ON, 20s OFF
    const interval = setInterval(tick, fanOn ? SURVIVAL_FAN_ON_MS : SURVIVAL_FAN_OFF_MS);

    return () => clearInterval(interval);
  }, [survivalMode]);

  // === SURVIVAL MODE: Heater 10% duty cycle with 2min cooldown ===
  useEffect(() => {
    if (!survivalMode) return;

    setSurvivalHeaterOn(false);
    let heaterOn = false;

    const toggleHeater = () => {
      const now = Date.now();
      if (!heaterOn && now < heaterCooldownUntilRef.current) {
        // Still in cooldown — skip ON
        return;
      }
      heaterOn = !heaterOn;
      setSurvivalHeaterOn(heaterOn);
      if (!heaterOn) {
        // Heater just turned OFF — start cooldown
        heaterCooldownUntilRef.current = now + HEATER_COOLDOWN_MS;
      }
    };

    const startTimeout = setTimeout(() => {
      toggleHeater();
      const interval = setInterval(toggleHeater, heaterOn ? SURVIVAL_HEATER_DUTY_ON_MS : SURVIVAL_HEATER_DUTY_OFF_MS);
      return () => clearInterval(interval);
    }, 5000);

    return () => clearTimeout(startTimeout);
  }, [survivalMode]);

  // === WATCHDOG: Detect 10s main loop freeze ===
  useEffect(() => {
    if (!survivalMode) return;

    const watchdog = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastLoopTickRef.current;
      if (elapsed >= WATCHDOG_FREEZE_MS) {
        console.error(`[Watchdog] Main loop frozen for ${(elapsed / 1000).toFixed(0)}s — resetting survival cycle`);
        // Force reset survival state
        setSurvivalFanOn(true);
        setSurvivalHeaterOn(false);
        motorStartTimeRef.current = Date.now();
      }
      lastLoopTickRef.current = now;
    }, 5000);

    return () => clearInterval(watchdog);
  }, [survivalMode]);

  // === MAIN VALIDATION LOOP ===
  useEffect(() => {
    const newIssues: SensorIssue[] = [];
    const newIgnored = new Set<string>();
    let dangerDetected = false;

    // --- SENSOR TIMEOUT CHECK: ignore last reading if > 25s stale ---
    const sensorAge = Date.now() - lastSensorUpdateTime.current;
    if (sensorAge >= SENSOR_TIMEOUT_MS) {
      const timeoutIssue: SensorIssue = {
        sensor: 'temperature',
        type: 'disconnected',
        severity: 'danger',
        message: {
          bn: `🚨 সেন্সর টাইমআউট — ${(sensorAge / 1000).toFixed(0)}সে. ধরে কোনো ডাটা নেই। সারভাইভাল মোড সক্রিয়।`,
          en: `🚨 Sensor timeout — no data for ${(sensorAge / 1000).toFixed(0)}s. Survival mode active.`,
        },
        detectedAt: new Date(),
        shouldIgnoreSensor: true,
      };
      newIssues.push(timeoutIssue);
      newIgnored.add('temperature');
      newIgnored.add('humidity');
      newIgnored.add('ammonia');
      newIgnored.add('water');
      dangerDetected = true;

      // All sensors ignored — skip further validation
      setIssues(newIssues);
      setIgnoredSensors(newIgnored);
      return;
    }

    // Add readings to history
    addReading(tempHistory, sensorData.temperature);
    addReading(humidityHistory, sensorData.humidity);
    addReading(ammoniaHistory, sensorData.ammonia);
    addReading(waterHistory, sensorData.waterUsage);

    // --- SENSOR FREEZE CHECK (while devices running) ---
    const devicesRunning = options?.devicesRunning ?? false;
    if (devicesRunning) {
      const now = Date.now();
      if (freezeBaseTemp.current === null) {
        freezeBaseTemp.current = sensorData.temperature;
        freezeWindowStart.current = now;
        freezeMaxDelta.current = 0;
      } else {
        const delta = Math.abs(sensorData.temperature - freezeBaseTemp.current);
        freezeMaxDelta.current = Math.max(freezeMaxDelta.current, delta);
      }

      const elapsed = now - freezeWindowStart.current;
      if (elapsed >= FREEZE_TIMEOUT_MS) {
        if (freezeMaxDelta.current < FREEZE_CHANGE_THRESHOLD) {
          // Sensor is DEAD — frozen value while devices are active
          const freezeIssue: SensorIssue = {
            sensor: 'temperature',
            type: 'stuck',
            severity: 'danger',
            message: {
              bn: `🚨 সেন্সর ফ্রোজেন — ${FREEZE_TIMEOUT_MS / 1000}সে. ধরে <${FREEZE_CHANGE_THRESHOLD}°সি পরিবর্তন (ডিভাইস চলছে)। সেন্সর মৃত।`,
              en: `🚨 Sensor FROZEN — <${FREEZE_CHANGE_THRESHOLD}°C change in ${FREEZE_TIMEOUT_MS / 1000}s while devices running. Sensor DEAD.`,
            },
            detectedAt: new Date(),
            shouldIgnoreSensor: true,
          };
          newIssues.push(freezeIssue);
          newIgnored.add('temperature');
          dangerDetected = true;
          sendSensorAlert(freezeIssue);
          logIncident(freezeIssue);
          console.error(`[SensorValidation] SENSOR FREEZE DETECTED: temp stuck at ${sensorData.temperature}°C for ${FREEZE_TIMEOUT_MS / 1000}s while devices running`);
        }
        // Reset window regardless
        freezeBaseTemp.current = sensorData.temperature;
        freezeWindowStart.current = now;
        freezeMaxDelta.current = 0;
      }
    } else {
      // Devices not running — reset freeze tracking
      freezeBaseTemp.current = null;
      freezeMaxDelta.current = 0;
      freezeWindowStart.current = Date.now();
    }

    // --- SENSOR DRIFT REALITY CHECK ---
    // Detect sensor that contradicts physical effect of heater/fan
    {
      const now = Date.now();
      const tickDelta = now - driftLastTickAt.current;
      driftLastTickAt.current = now;

      // Accumulate device ON time
      if (options?.heaterOn) driftHeaterOnAccum.current += tickDelta;
      if (options?.fanOn) driftFanOnAccum.current += tickDelta;

      // Set baseline at window start
      if (driftTempAtWindowStart.current === null) {
        driftTempAtWindowStart.current = sensorData.temperature;
        driftWindowStart.current = now;
      }

      const windowElapsed = now - driftWindowStart.current;

      if (windowElapsed >= DRIFT_EVALUATION_WINDOW_MS) {
        const tempChange = sensorData.temperature - (driftTempAtWindowStart.current ?? sensorData.temperature);
        const heaterOnTime = driftHeaterOnAccum.current;
        const fanOnTime = driftFanOnAccum.current;

        let driftDetected = false;
        let driftReason = '';

        // Heater ON >6min but temp didn't rise 0.8°C
        if (heaterOnTime >= DRIFT_DEVICE_ACTIVE_THRESHOLD_MS && tempChange < DRIFT_HEATER_EXPECTED_RISE) {
          driftDetected = true;
          driftReason = `Heater ON ${(heaterOnTime / 60000).toFixed(1)}min but temp only rose ${tempChange.toFixed(2)}°C (expected ≥${DRIFT_HEATER_EXPECTED_RISE}°C)`;
        }

        // Fan ON >6min but temp didn't drop 0.5°C
        if (fanOnTime >= DRIFT_DEVICE_ACTIVE_THRESHOLD_MS && (-tempChange) < DRIFT_FAN_EXPECTED_DROP) {
          driftDetected = true;
          driftReason = `Fan ON ${(fanOnTime / 60000).toFixed(1)}min but temp only dropped ${(-tempChange).toFixed(2)}°C (expected ≥${DRIFT_FAN_EXPECTED_DROP}°C)`;
        }

        if (driftDetected && !driftAlertSent.current) {
          driftAlertSent.current = true;
          const driftIssue: SensorIssue = {
            sensor: 'temperature',
            type: 'invalid',
            severity: 'danger',
            message: {
              bn: `🚨 সেন্সর ড্রিফট — ${driftReason}। সেন্সর বিশ্বাসযোগ্য নয়, সারভাইভাল মোড সক্রিয়।`,
              en: `🚨 Sensor DRIFT — ${driftReason}. Sensor unreliable, survival mode active.`,
            },
            detectedAt: new Date(),
            shouldIgnoreSensor: true,
          };
          newIssues.push(driftIssue);
          newIgnored.add('temperature');
          dangerDetected = true;
          sendSensorAlert(driftIssue);
          logIncident(driftIssue);
          console.error(`[SensorValidation] SENSOR DRIFT DETECTED: ${driftReason}`);

          // Create LIFE_THREATENING emergency event
          if (user) {
            (supabase.from('emergency_events') as any).insert({
              user_id: user.id,
              trigger_type: 'sensor_offline',
              priority: 'LIFE_THREATENING',
              title: '🔴 Sensor drift: readings contradict physical reality',
              title_bn: '🔴 সেন্সর ড্রিফট: রিডিং বাস্তবতার সাথে মেলে না',
              description: driftReason,
              description_bn: driftReason,
              actions_taken: ['force_ventilation', 'disable_heater', 'notify_owner', 'call_webhook'],
              sensor_snapshot: {
                temp_at_start: driftTempAtWindowStart.current,
                temp_at_end: sensorData.temperature,
                temp_change: tempChange,
                heater_on_ms: heaterOnTime,
                fan_on_ms: fanOnTime,
              },
              source: 'sensor_validation',
            }).then(() => console.log('[SensorValidation] Drift LIFE_THREATENING event created'));
          }
        }

        // Reset window
        driftHeaterOnAccum.current = 0;
        driftFanOnAccum.current = 0;
        driftWindowStart.current = now;
        driftTempAtWindowStart.current = sensorData.temperature;
        // Reset alert flag after one clean window
        if (!driftDetected) driftAlertSent.current = false;
      }
    }

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

  // === ENVIRONMENTAL PLAUSIBILITY VALIDATION (20-min physical model) ===
  useEffect(() => {
    const now = Date.now();
    const tickDelta = now - plausLastTick.current;
    plausLastTick.current = now;

    // Accumulate device ON time
    if (options?.heaterOn) plausHeaterAccum.current += tickDelta;
    if (options?.fanOn) plausFanAccum.current += tickDelta;

    // Set baseline at window start
    if (plausTempAtStart.current === null) {
      plausTempAtStart.current = sensorData.temperature;
      plausWindowStart.current = now;
    }

    const windowElapsed = now - plausWindowStart.current;
    if (windowElapsed < PLAUSIBILITY_WINDOW_MS) return;

    // Evaluate plausibility
    const actualChange = sensorData.temperature - (plausTempAtStart.current ?? sensorData.temperature);
    const heaterMinutes = plausHeaterAccum.current / 60000;
    const fanMinutes = plausFanAccum.current / 60000;

    // Expected change from physical model
    const expectedHeaterRise = heaterMinutes * PLAUSIBILITY_HEATER_EXPECTED_RATE;
    const expectedFanDrop = fanMinutes * PLAUSIBILITY_FAN_EXPECTED_RATE;
    const expectedNetChange = expectedHeaterRise - expectedFanDrop;

    let degraded = false;
    let reason = '';

    // Only evaluate if devices ran enough to expect measurable change
    const totalDeviceMinutes = heaterMinutes + fanMinutes;
    if (totalDeviceMinutes >= 6) {
      const expectedMagnitude = Math.abs(expectedNetChange);
      const actualInExpectedDirection = expectedNetChange >= 0 ? actualChange : -actualChange;
      const expectedWithTolerance = expectedMagnitude * PLAUSIBILITY_TOLERANCE;

      if (actualInExpectedDirection < expectedWithTolerance && expectedMagnitude > 0.3) {
        degraded = true;
        reason = `Physical model mismatch: expected ${expectedNetChange >= 0 ? '+' : ''}${expectedNetChange.toFixed(1)}°C over 20min (heater ${heaterMinutes.toFixed(0)}min, fan ${fanMinutes.toFixed(0)}min), actual ${actualChange >= 0 ? '+' : ''}${actualChange.toFixed(1)}°C`;
      }
    }

    if (degraded) {
      const degradedSince = plausDegradedSince.current || new Date();
      plausDegradedSince.current = degradedSince;

      setPlausibility({
        isDegraded: true,
        heaterAuthorityPercent: HEATER_AUTHORITY_DEGRADED_PERCENT,
        expectedTempChange: expectedNetChange,
        actualTempChange: actualChange,
        degradedSince,
        reason,
      });

      // Send maintenance warning once per degradation episode
      if (!plausAlertSent.current && user) {
        plausAlertSent.current = true;

        // Alert
        supabase.from('alerts').insert({
          user_id: user.id,
          alert_type: 'system' as any,
          severity: 'warning' as any,
          message: `⚠️ Sensor degraded: ${reason}. Heater authority reduced to ${HEATER_AUTHORITY_DEGRADED_PERCENT}%. Maintenance recommended.`,
          message_bn: `⚠️ সেন্সর অবনতি: পরিবেশগত প্রতিক্রিয়া প্রত্যাশার চেয়ে ধীর। হিটার ক্ষমতা ${HEATER_AUTHORITY_DEGRADED_PERCENT}%-এ হ্রাস। রক্ষণাবেক্ষণ প্রয়োজন।`,
        }).then(() => console.log('[Plausibility] Maintenance warning sent'));

        // Audit log
        (supabase.from('farm_audit_logs') as any).insert({
          user_id: user.id,
          user_email: user.email || '',
          action_type: 'sensor_plausibility_degraded',
          action_category: 'safety',
          severity: 'warning',
          source: 'sensor_validation',
          metadata: {
            expected_change: expectedNetChange,
            actual_change: actualChange,
            heater_minutes: heaterMinutes,
            fan_minutes: fanMinutes,
            heater_authority_percent: HEATER_AUTHORITY_DEGRADED_PERCENT,
            reason,
          },
        }).then(() => console.log('[Plausibility] Degradation incident logged'));
      }
    } else {
      // Clear degradation if model passes
      if (plausDegradedSince.current) {
        console.log('[Plausibility] Sensor plausibility restored');
      }
      plausDegradedSince.current = null;
      plausAlertSent.current = false;
      setPlausibility({
        isDegraded: false,
        heaterAuthorityPercent: 100,
        expectedTempChange: expectedNetChange,
        actualTempChange: actualChange,
        degradedSince: null,
        reason: null,
      });
    }

    // Reset window
    plausHeaterAccum.current = 0;
    plausFanAccum.current = 0;
    plausWindowStart.current = now;
    plausTempAtStart.current = sensorData.temperature;
  }, [sensorData, options?.heaterOn, options?.fanOn, user]);

  return {
    issues,
    hasIssues: issues.length > 0,
    ignoredSensors,
    safeModeActive,
    safeModeUntil,
    survivalMode,
    survivalFanOn,
    survivalHeaterOn,
    plausibility,
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
