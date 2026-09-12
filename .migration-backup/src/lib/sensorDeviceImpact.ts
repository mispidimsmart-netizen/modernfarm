/**
 * Pure domain logic for the Sensor ↔ Device impact report.
 * No React / no Supabase — safe to unit test.
 */
export type SensorKey = 'temperature' | 'humidity' | 'ammonia' | 'water_usage' | 'light_lux';
export type DeviceKey = 'fan' | 'heater' | 'fogger' | 'sprinkler' | 'ceiling_fan' | 'light' | 'alarm';

export const SENSOR_META: Record<SensorKey, { bn: string; en: string; color: string; unit: string }> = {
  temperature: { bn: 'তাপমাত্রা', en: 'Temperature', color: 'hsl(var(--sensor-temperature, 14 90% 55%))', unit: '°C' },
  humidity:    { bn: 'আর্দ্রতা',   en: 'Humidity',    color: 'hsl(var(--sensor-humidity, 200 80% 55%))',     unit: '%' },
  ammonia:     { bn: 'অ্যামোনিয়া', en: 'Ammonia',     color: 'hsl(var(--sensor-ammonia, 280 70% 60%))',      unit: 'ppm' },
  water_usage: { bn: 'পানি',       en: 'Water',       color: 'hsl(var(--sensor-water, 190 80% 50%))',        unit: 'L' },
  light_lux:   { bn: 'আলো (LDR)',  en: 'Light (LDR)', color: 'hsl(45 95% 55%)',                              unit: 'lux' },
};

export const DEVICE_META: Record<DeviceKey, { bn: string; en: string; color: string }> = {
  fan:          { bn: 'ফ্যান',       en: 'Fan',         color: 'hsl(200 80% 55%)' },
  heater:       { bn: 'হিটার',       en: 'Heater',      color: 'hsl(14 90% 55%)' },
  fogger:       { bn: 'ফগার',        en: 'Fogger',      color: 'hsl(190 75% 50%)' },
  sprinkler:    { bn: 'স্প্রিংকলার', en: 'Sprinkler',   color: 'hsl(160 70% 45%)' },
  ceiling_fan:  { bn: 'সিলিং ফ্যান',  en: 'Ceiling Fan', color: 'hsl(220 70% 60%)' },
  light:        { bn: 'লাইট',         en: 'Light',       color: 'hsl(45 95% 55%)' },
  alarm:        { bn: 'অ্যালার্ম',     en: 'Alarm',       color: 'hsl(0 80% 55%)' },
};

export const ALL_SENSORS: SensorKey[] = ['temperature', 'humidity', 'ammonia', 'water_usage', 'light_lux'];
export const ALL_DEVICES: DeviceKey[] = ['fan', 'heater', 'fogger', 'sprinkler', 'ceiling_fan', 'light', 'alarm'];

/** Environment status label derived from sensors + heat stress index. */
export function statusFromSensors(t: number, h: number, nh3: number, hsi: number) {
  if (nh3 > 25 || t > 35 || hsi > 85) return { en: 'CRITICAL', bn: 'জরুরি', reason: 'উচ্চ তাপ/অ্যামোনিয়া/HSI' };
  if (t > 32 || nh3 > 20 || hsi > 78) return { en: 'WARNING', bn: 'সতর্ক', reason: 'তাপ বা গ্যাস বেশি' };
  if (t < 18) return { en: 'COLD', bn: 'ঠান্ডা', reason: 'তাপমাত্রা কম, হিটার দরকার' };
  if (h > 85) return { en: 'HUMID', bn: 'আর্দ্রতা বেশি', reason: 'বায়ুচলাচল প্রয়োজন' };
  return { en: 'NORMAL', bn: 'স্বাভাবিক', reason: 'সব ঠিক আছে' };
}

export interface DeviceCommandRow {
  command_type: string;
  command_value: unknown;
  created_at: string;
}

/** Build per-device chronological on/off timelines from command history. */
export function buildDeviceTimeline(
  commands: DeviceCommandRow[],
): Record<string, { ts: number; on: boolean }[]> {
  const timeline: Record<string, { ts: number; on: boolean }[]> = {};
  ALL_DEVICES.forEach((d) => (timeline[d] = []));

  const sorted = [...commands].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  for (const cmd of sorted) {
    const key = cmd.command_type as DeviceKey;
    if (!ALL_DEVICES.includes(key)) continue;
    timeline[key].push({ ts: new Date(cmd.created_at).getTime(), on: !!cmd.command_value });
  }
  return timeline;
}

/** Device state at a point in time — last command at or before the timestamp wins. */
export function getDeviceStateAt(timeline: { ts: number; on: boolean }[], timestamp: number): boolean {
  let state = false;
  for (const entry of timeline) {
    if (entry.ts > timestamp) break;
    state = entry.on;
  }
  return state;
}
