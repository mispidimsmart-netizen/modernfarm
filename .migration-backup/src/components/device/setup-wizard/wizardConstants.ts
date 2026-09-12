import { Cpu, Cable, Radar, ClipboardCheck } from 'lucide-react';

export type HwVersion = 'v8' | 'v10';

export interface RelayRow {
  gpio: string;
  ch: string;
  use: string;
}

export interface SensorOption {
  id: string;
  name: string;
  pin: string;
  required?: boolean;
  recommended?: boolean;
  tier: string;
  note?: string;
}

export const RELAY_MAP_V10: RelayRow[] = [
  { gpio: 'GPIO 5', ch: 'IN1', use: '🌀 এক্সহস্ট ফ্যান' },
  { gpio: 'GPIO 18', ch: 'IN2', use: '🌀 সিলিং ফ্যান' },
  { gpio: 'GPIO 19', ch: 'IN3', use: '💡 লাইট' },
  { gpio: 'GPIO 21', ch: 'IN4', use: '🔥 হিটার' },
  { gpio: 'GPIO 22', ch: 'IN5', use: '💦 ফগার' },
  { gpio: 'GPIO 23', ch: 'IN6', use: '🔔 অ্যালার্ম' },
  { gpio: 'GPIO 25', ch: 'IN7', use: '🚿 স্প্রিংকলার' },
  { gpio: 'GPIO 26', ch: 'IN8', use: '💨 সার্কুলেশন ফ্যান' },
];

export const RELAY_MAP_V8: RelayRow[] = [
  { gpio: 'GPIO 14', ch: 'IN1', use: '🌀 ফ্যান' },
  { gpio: 'GPIO 27', ch: 'IN2', use: '💡 লাইট' },
  { gpio: 'GPIO 26', ch: 'IN3', use: '🔥 হিটার' },
  { gpio: 'GPIO 25', ch: 'IN4', use: '💦 ফগার' },
  { gpio: 'GPIO 33', ch: 'IN5', use: '🔔 অ্যালার্ম' },
  { gpio: 'GPIO 32', ch: 'IN6', use: '🚿 স্প্রিংকলার' },
];

export const SENSORS_V10: SensorOption[] = [
  { id: 'sht31', name: 'SHT31 (Temp+Humidity, ±0.2°C)', pin: 'SDA=16, SCL=17 (I²C 0x44)', recommended: true, tier: 'Tier 1' },
  { id: 'bh1750', name: 'BH1750 (Lux Light)', pin: 'SDA=16, SCL=17 (I²C 0x23)', recommended: true, tier: 'Tier 1' },
  { id: 'ze03', name: 'ZE03-NH3 (Ammonia ppm)', pin: 'RX=32, TX=4 (UART2)', tier: 'Tier 2' },
  { id: 'scd41', name: 'SCD41 (CO₂)', pin: 'SDA=16, SCL=17 (I²C 0x62)', tier: 'Tier 3' },
  { id: 'pms5003', name: 'PMS5003 (PM2.5/PM10)', pin: 'RX=13, TX=33 (UART1)', tier: 'Tier 3' },
  { id: 'dht22', name: 'DHT22 (Fallback Temp+Humidity)', pin: 'DATA=GPIO 4', tier: 'Fallback', note: 'SHT31 না থাকলে ব্যবহার হবে' },
  { id: 'mq135', name: 'MQ-135 (Fallback Ammonia)', pin: 'AO=GPIO 34', tier: 'Fallback', note: 'ZE03 না থাকলে' },
  { id: 'ldr', name: 'LDR (Fallback Light)', pin: 'AO=GPIO 35', tier: 'Fallback', note: 'BH1750 না থাকলে' },
];

export const SENSORS_V8: SensorOption[] = [
  { id: 'dht22', name: 'DHT22 (Temperature + Humidity)', pin: 'DATA=GPIO 4', required: true, tier: 'Required' },
  { id: 'mq135', name: 'MQ-135 (Ammonia / Air)', pin: 'AO=GPIO 34', recommended: true, tier: 'Recommended' },
  { id: 'ldr', name: 'LDR (Light Sensor)', pin: 'AO=GPIO 35', recommended: true, tier: 'Recommended' },
];

export const STEPS = [
  { key: 'version', label: 'কন্ট্রোলার সংস্করণ', icon: Cpu },
  { key: 'wiring', label: 'ওয়্যারিং', icon: Cable },
  { key: 'sensors', label: 'সেন্সর', icon: Radar },
  { key: 'summary', label: 'সারাংশ ও ডাউনলোড', icon: ClipboardCheck },
] as const;

export type StepKey = typeof STEPS[number]['key'];
