export interface SensorData {
  temperature: number;
  humidity: number;
  ammonia: number;
  waterUsage: number;
  timestamp: Date;
}

export interface DeviceStatus {
  power: boolean;
  fan: boolean;
  light: boolean;
  alarm: boolean;
}

export interface AutomationRule {
  id: string;
  name: string;
  condition: {
    sensor: 'temperature' | 'humidity' | 'ammonia';
    operator: '>' | '<' | '>=' | '<=';
    value: number;
  };
  action: {
    device: 'fan' | 'light' | 'alarm';
    state: boolean;
  };
  enabled: boolean;
}

export interface LightingSchedule {
  startTime: string; // HH:MM format
  endTime: string;
  totalHours: number;
  manualOverride: boolean;
}

export interface Alert {
  id: string;
  type: 'temperature' | 'ammonia' | 'power' | 'water';
  severity: 'warning' | 'danger';
  message: string;
  messageBn: string;
  timestamp: Date;
  acknowledged: boolean;
}

export interface HistoricalData {
  timestamp: Date;
  temperature: number;
  humidity: number;
  ammonia: number;
  waterUsage: number;
}

export interface DailyReport {
  date: Date;
  avgTemperature: number;
  avgHumidity: number;
  totalWaterUsage: number;
  eggProduction: number;
}

export interface FarmSettings {
  temperatureMin: number;
  temperatureMax: number;
  humidityMin: number;
  humidityMax: number;
  ammoniaMax: number;
}

export interface User {
  id: string;
  phone: string;
  farmName: string;
}

export type StatusLevel = 'normal' | 'warning' | 'danger';
