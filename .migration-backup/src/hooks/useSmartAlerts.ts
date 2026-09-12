import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useAlerts } from './useFarmData';
import { useLiveSensorData } from './useSensorData';
import { useRealtimeSensorData } from './useRealtimeSensorData';
import { useNotificationSound } from './useNotificationSound';
import { useAuth } from '@/context/AuthContext';
import { useFarmType, getBroilerTempRangeByDays } from './useFarmType';
import { useActiveBatch } from './useBroilerData';
import { differenceInDays, parseISO } from 'date-fns';
import type { NotificationPriority } from './useNotificationPriority';
import { ALERT_TEMPLATES, getAlertTemplate, type AlertLevel } from '@/lib/alertTemplates';
import {
  ALERT_COOLDOWNS,
  REPEAT_INTERVALS,
  QUIET_HOURS,
  STALE_SUPPRESS_TYPES,
  isQuietHours,
  isCooldownElapsed,
  shouldPlaySound,
  groupAlerts,
  countAlertsByLevel,
  pickCriticalAlert,
  areAlertListsEquivalent,
  mapAlertLevelToPriority,
  type SmartAlert,
} from '@/lib/alertPolicy';

// Pure logic lives in src/lib/alertPolicy.ts and src/lib/alertTemplates.ts.
// Re-exported here so existing imports keep working.
export { ALERT_TEMPLATES, ALERT_COOLDOWNS, REPEAT_INTERVALS, QUIET_HOURS, isQuietHours };
export type { AlertLevel, SmartAlert, NotificationPriority };

export function useSmartAlerts() {
  const { data: rawAlerts = [] } = useAlerts();
  const sensorData = useLiveSensorData();
  const { hasRealData } = useRealtimeSensorData();
  const { playDangerAlarm, playWarningSound } = useNotificationSound();
  const { language } = useAuth();
  const { isBroiler, isLayer } = useFarmType();
  const { data: activeBatch } = useActiveBatch();
  
  const [smartAlerts, setSmartAlerts] = useState<SmartAlert[]>([]);
  const lastNotified = useRef<Map<string, number>>(new Map());
  const lastSoundPlayed = useRef<Map<AlertLevel, number>>(new Map());

  // Calculate broiler age
  const broilerAgeDays = useMemo(() => {
    if (!isBroiler || !activeBatch?.start_date) return 0;
    return differenceInDays(new Date(), parseISO(activeBatch.start_date));
  }, [isBroiler, activeBatch]);

  // Get broiler target temp range
  const broilerTempTarget = useMemo(() => {
    if (!isBroiler || broilerAgeDays <= 0) return null;
    return getBroilerTempRangeByDays(broilerAgeDays);
  }, [isBroiler, broilerAgeDays]);

  // Convert raw alerts to smart alerts
  const processAlerts = useCallback(() => {
    // When ESP32 is fully offline (no fresh data), suppress sensor-derived
    // alerts like "sensor_failure" / "no_ventilation" — they are stale and
    // misleading. The dedicated EspConnectionBanner already informs the user.
    const filteredAlerts = hasRealData
      ? rawAlerts
      : rawAlerts.filter((a) => !STALE_SUPPRESS_TYPES.has(a.alert_type));

    const processed: SmartAlert[] = filteredAlerts.map(alert => {
      const template = getAlertTemplate(alert.alert_type);
      const msgData = template.getMessage({
        temp: sensorData?.temperature,
        humidity: sensorData?.humidity,
        ppm: sensorData?.ammonia,
        target: broilerTempTarget?.targetTemp,
        age: broilerAgeDays,
      });
      const suggestion = template.getSuggestion();
      const level = (alert.severity as AlertLevel) || template.level;

      return {
        id: alert.id,
        type: alert.alert_type,
        level,
        title: template.title.en,
        titleBn: template.title.bn,
        message: msgData.en,
        messageBn: msgData.bn,
        suggestion: suggestion.en,
        suggestionBn: suggestion.bn,
        timestamp: new Date(alert.created_at),
        acknowledged: alert.acknowledged,
        acknowledgedAt: (alert as any).acknowledged_at ? new Date((alert as any).acknowledged_at) : undefined,
        acknowledgedBy: (alert as any).acknowledged_by ?? undefined,
        responseSeconds: (alert as any).response_seconds ?? undefined,
        priority: mapAlertLevelToPriority(level),
      };
    });

    // Add broiler-specific temperature alerts based on live sensor data
    // Skip when ESP32 is offline — sensorData would be stale.
    if (hasRealData && isBroiler && broilerTempTarget && sensorData?.temperature) {
      const temp = sensorData.temperature;
      const target = broilerTempTarget.targetTemp;
      const tolerance = 2; // 2°C tolerance

      // Check if too cold for broiler age — use stable synthetic id so React keys don't churn
      if (temp < target - tolerance) {
        const coldTemplate = ALERT_TEMPLATES['broiler_cold'];
        const coldMsg = coldTemplate.getMessage({ temp, target, age: broilerAgeDays });
        const coldSuggestion = coldTemplate.getSuggestion();

        processed.push({
          id: `synthetic_broiler_cold`,
          type: 'broiler_cold',
          level: coldTemplate.level as AlertLevel,
          title: coldTemplate.title.en,
          titleBn: coldTemplate.title.bn,
          message: coldMsg.en,
          messageBn: coldMsg.bn,
          suggestion: coldSuggestion.en,
          suggestionBn: coldSuggestion.bn,
          timestamp: new Date(),
          acknowledged: false,
          priority: mapAlertLevelToPriority(coldTemplate.level),
        });
      }

      // Check if too hot for broiler age
      if (temp > target + tolerance) {
        const hotTemplate = ALERT_TEMPLATES['broiler_hot'];
        const hotMsg = hotTemplate.getMessage({ temp, target, age: broilerAgeDays });
        const hotSuggestion = hotTemplate.getSuggestion();

        processed.push({
          id: `synthetic_broiler_hot`,
          type: 'broiler_hot',
          level: hotTemplate.level as AlertLevel,
          title: hotTemplate.title.en,
          titleBn: hotTemplate.title.bn,
          message: hotMsg.en,
          messageBn: hotMsg.bn,
          suggestion: hotSuggestion.en,
          suggestionBn: hotSuggestion.bn,
          timestamp: new Date(),
          acknowledged: false,
          priority: mapAlertLevelToPriority(hotTemplate.level),
        });
      }
    }

    return groupAlerts(processed);
  }, [rawAlerts, sensorData, isBroiler, broilerTempTarget, broilerAgeDays, hasRealData]);

  // Handle notifications with anti-spam
  const notify = useCallback((alert: SmartAlert) => {
    const now = Date.now();
    const lastTime = lastNotified.current.get(alert.type) || 0;

    if (!isCooldownElapsed(alert.level, lastTime, now)) return;

    const quietHours = isQuietHours();
    const lastSoundAt = lastSoundPlayed.current.get(alert.level) || 0;

    if (shouldPlaySound(alert.level, { lastSoundAt, now, quietHours })) {
      if (alert.level === 'danger') playDangerAlarm();
      else playWarningSound();
      lastSoundPlayed.current.set(alert.level, now);
    }

    lastNotified.current.set(alert.type, now);
  }, [playDangerAlarm, playWarningSound]);

  // Process and update alerts — guard against ref-only changes that would loop
  useEffect(() => {
    const processed = processAlerts();
    setSmartAlerts((prev) => {
      // Shallow-equality on id+acknowledged+level avoids resetting state when
      // upstream queries hand us a new array with identical content.
      if (areAlertListsEquivalent(prev, processed)) {
        return prev;
      }
      return processed;
    });

    // Notify for unacknowledged alerts
    processed.forEach(alert => {
      if (!alert.acknowledged) {
        notify(alert);
      }
    });
  }, [processAlerts, notify]);

  // Get active (unresolved) alerts
  const activeAlerts = smartAlerts.filter(a => !a.acknowledged);
  const resolvedAlerts = smartAlerts.filter(a => a.acknowledged);

  // Get alert counts by level
  const alertCounts = countAlertsByLevel(activeAlerts);

  // Get most critical alert
  const criticalAlert = pickCriticalAlert(activeAlerts);

  return {
    alerts: smartAlerts,
    activeAlerts,
    resolvedAlerts,
    alertCounts,
    criticalAlert,
    isQuietHours: isQuietHours(),
    language,
  };
}

export default useSmartAlerts;
