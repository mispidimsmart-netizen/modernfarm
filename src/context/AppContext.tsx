import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language } from '@/lib/translations';
import { 
  SensorData, 
  DeviceStatus, 
  AutomationRule, 
  LightingSchedule, 
  Alert,
  User,
  FarmSettings
} from '@/lib/types';

interface AppContextType {
  // Language
  language: Language;
  setLanguage: (lang: Language) => void;
  
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  login: (phone: string, password: string) => Promise<boolean>;
  logout: () => void;
  
  // Sensor Data
  sensorData: SensorData;
  
  // Device Status
  deviceStatus: DeviceStatus;
  setDeviceStatus: (status: Partial<DeviceStatus>) => void;
  
  // Manual Override
  manualOverride: boolean;
  setManualOverride: (override: boolean) => void;
  
  // Automation Rules
  automationRules: AutomationRule[];
  addAutomationRule: (rule: Omit<AutomationRule, 'id'>) => void;
  updateAutomationRule: (id: string, rule: Partial<AutomationRule>) => void;
  deleteAutomationRule: (id: string) => void;
  
  // Lighting Schedule
  lightingSchedule: LightingSchedule;
  setLightingSchedule: (schedule: Partial<LightingSchedule>) => void;
  
  // Alerts
  alerts: Alert[];
  acknowledgeAlert: (id: string) => void;
  
  // Settings
  farmSettings: FarmSettings;
  setFarmSettings: (settings: Partial<FarmSettings>) => void;
  
  // Connection Status
  isConnected: boolean;
}

const defaultSensorData: SensorData = {
  temperature: 28.5,
  humidity: 65,
  ammonia: 12,
  waterUsage: 45,
  timestamp: new Date(),
};

const defaultDeviceStatus: DeviceStatus = {
  power: true,
  fan: true,
  light: true,
  alarm: false,
};

const defaultLightingSchedule: LightingSchedule = {
  startTime: '05:00',
  endTime: '21:00',
  totalHours: 16,
  manualOverride: false,
};

const defaultFarmSettings: FarmSettings = {
  temperatureMin: 18,
  temperatureMax: 32,
  humidityMin: 40,
  humidityMax: 80,
  ammoniaMax: 25,
};

const defaultRules: AutomationRule[] = [
  {
    id: '1',
    name: 'High Temperature Fan',
    condition: { sensor: 'temperature', operator: '>', value: 30 },
    action: { device: 'fan', state: true },
    enabled: true,
  },
  {
    id: '2',
    name: 'High Ammonia Alarm',
    condition: { sensor: 'ammonia', operator: '>', value: 20 },
    action: { device: 'alarm', state: true },
    enabled: true,
  },
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('bn');
  const [user, setUser] = useState<User | null>(null);
  const [sensorData, setSensorData] = useState<SensorData>(defaultSensorData);
  const [deviceStatus, setDeviceStatusState] = useState<DeviceStatus>(defaultDeviceStatus);
  const [manualOverride, setManualOverride] = useState(false);
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>(defaultRules);
  const [lightingSchedule, setLightingScheduleState] = useState<LightingSchedule>(defaultLightingSchedule);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [farmSettings, setFarmSettingsState] = useState<FarmSettings>(defaultFarmSettings);
  const [isConnected, setIsConnected] = useState(true);

  // Simulate live sensor data updates
  useEffect(() => {
    const interval = setInterval(() => {
      setSensorData(prev => ({
        temperature: Math.max(15, Math.min(40, prev.temperature + (Math.random() - 0.5) * 0.5)),
        humidity: Math.max(30, Math.min(95, prev.humidity + (Math.random() - 0.5) * 2)),
        ammonia: Math.max(0, Math.min(50, prev.ammonia + (Math.random() - 0.5) * 1)),
        waterUsage: Math.max(0, Math.min(100, prev.waterUsage + (Math.random() - 0.5) * 5)),
        timestamp: new Date(),
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Check for alerts based on sensor data
  useEffect(() => {
    const newAlerts: Alert[] = [];

    if (sensorData.temperature > farmSettings.temperatureMax) {
      const existingAlert = alerts.find(a => a.type === 'temperature' && !a.acknowledged);
      if (!existingAlert) {
        newAlerts.push({
          id: `temp-${Date.now()}`,
          type: 'temperature',
          severity: sensorData.temperature > farmSettings.temperatureMax + 5 ? 'danger' : 'warning',
          message: `High temperature: ${sensorData.temperature.toFixed(1)}°C`,
          messageBn: `উচ্চ তাপমাত্রা: ${sensorData.temperature.toFixed(1)}°সে`,
          timestamp: new Date(),
          acknowledged: false,
        });
      }
    }

    if (sensorData.ammonia > farmSettings.ammoniaMax) {
      const existingAlert = alerts.find(a => a.type === 'ammonia' && !a.acknowledged);
      if (!existingAlert) {
        newAlerts.push({
          id: `ammonia-${Date.now()}`,
          type: 'ammonia',
          severity: sensorData.ammonia > farmSettings.ammoniaMax + 10 ? 'danger' : 'warning',
          message: `High ammonia level: ${sensorData.ammonia.toFixed(0)} ppm`,
          messageBn: `উচ্চ অ্যামোনিয়া মাত্রা: ${sensorData.ammonia.toFixed(0)} পিপিএম`,
          timestamp: new Date(),
          acknowledged: false,
        });
      }
    }

    if (newAlerts.length > 0) {
      setAlerts(prev => [...newAlerts, ...prev].slice(0, 50));
    }
  }, [sensorData, farmSettings, alerts]);

  const login = async (phone: string, password: string): Promise<boolean> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simple validation (in real app, this would be server-side)
    if (phone.length >= 10 && password.length >= 4) {
      setUser({
        id: '1',
        phone,
        farmName: 'আমার লেয়ার ফার্ম',
      });
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
  };

  const setDeviceStatus = (status: Partial<DeviceStatus>) => {
    setDeviceStatusState(prev => ({ ...prev, ...status }));
  };

  const addAutomationRule = (rule: Omit<AutomationRule, 'id'>) => {
    setAutomationRules(prev => [...prev, { ...rule, id: Date.now().toString() }]);
  };

  const updateAutomationRule = (id: string, rule: Partial<AutomationRule>) => {
    setAutomationRules(prev => 
      prev.map(r => r.id === id ? { ...r, ...rule } : r)
    );
  };

  const deleteAutomationRule = (id: string) => {
    setAutomationRules(prev => prev.filter(r => r.id !== id));
  };

  const setLightingSchedule = (schedule: Partial<LightingSchedule>) => {
    setLightingScheduleState(prev => ({ ...prev, ...schedule }));
  };

  const acknowledgeAlert = (id: string) => {
    setAlerts(prev => 
      prev.map(a => a.id === id ? { ...a, acknowledged: true } : a)
    );
  };

  const setFarmSettings = (settings: Partial<FarmSettings>) => {
    setFarmSettingsState(prev => ({ ...prev, ...settings }));
  };

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        user,
        isAuthenticated: !!user,
        login,
        logout,
        sensorData,
        deviceStatus,
        setDeviceStatus,
        manualOverride,
        setManualOverride,
        automationRules,
        addAutomationRule,
        updateAutomationRule,
        deleteAutomationRule,
        lightingSchedule,
        setLightingSchedule,
        alerts,
        acknowledgeAlert,
        farmSettings,
        setFarmSettings,
        isConnected,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
