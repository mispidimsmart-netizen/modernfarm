import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { RefreshCw, BarChart3, Settings, ChevronRight, Wifi, WifiOff, Cpu, Calendar, Cloud } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useFarmSettings } from '@/hooks/useFarmData';
import { useRealtimeSensorData, useRealtimeStatusLevels, useRealtimeDeviceStatus, useRealtimeAlerts } from '@/hooks/useRealtimeSensorData';
import { useAllDeviceHealth } from '@/hooks/useDeviceHealth';
import { useHeatStressAutomation } from '@/hooks/useHeatStressAutomation';
import { useFanSpeedAutomation } from '@/hooks/useFanSpeedAutomation';
import { useSelectedShed } from '@/hooks/useSheds';
import { translations } from '@/lib/translations';
import { SensorCard } from '@/components/SensorCard';
import { StatusBadge } from '@/components/StatusBadge';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { ShedSelector } from '@/components/shed/ShedSelector';
import { ShedManagementSheet } from '@/components/shed/ShedManagementSheet';
import { DeviceManagementSheet } from '@/components/device/DeviceManagementSheet';
import { WeatherCard } from '@/components/weather/WeatherCard';
import { ScheduleSheet } from '@/components/schedule/ScheduleSheet';
import { WeatherSettingsSheet } from '@/components/weather/WeatherSettingsSheet';
import { FarmSummaryCards } from '@/components/dashboard/FarmSummaryCards';
import { SensorCharts } from '@/components/dashboard/SensorCharts';
import { HeatStressCard } from '@/components/dashboard/HeatStressCard';
import { FanSpeedCard } from '@/components/dashboard/FanSpeedCard';
import { StatusLevel } from '@/lib/types';
import { Button } from '@/components/ui/button';

export function Dashboard() {
  const { language } = useAuth();
  const { sensorData, isConnected } = useRealtimeSensorData();
  const statusLevels = useRealtimeStatusLevels(sensorData);
  const { status: deviceStatus, manualOverride } = useRealtimeDeviceStatus();
  const { data: farmSettings } = useFarmSettings();
  const { data: deviceHealth } = useAllDeviceHealth();
  const { selectedShedId } = useSelectedShed();
  
  // Subscribe to realtime alerts
  useRealtimeAlerts();
  
  // Heat Stress Index automation
  const hsiResult = useHeatStressAutomation({
    temperature: sensorData.temperature,
    humidity: sensorData.humidity,
    shedId: selectedShedId,
    enabled: true,
  });

  // Fan Speed automation based on temperature
  const fanSpeedResult = useFanSpeedAutomation({
    temperature: sensorData.temperature,
    shedId: selectedShedId,
    enabled: !manualOverride, // Only auto-control when not in manual override
  });

  // Count online devices
  const onlineDeviceCount = deviceHealth?.filter(d => d.is_online).length || 0;
  const totalDeviceCount = deviceHealth?.length || 0;

  const statusText = {
    bn: { normal: 'স্বাভাবিক', warning: 'সতর্কতা', danger: 'বিপদ' },
    en: { normal: 'Normal', warning: 'Warning', danger: 'Danger' },
  };

  const overallStatus: StatusLevel = 
    statusLevels.temperature === 'danger' || statusLevels.ammonia === 'danger' ? 'danger' :
    statusLevels.temperature === 'warning' || statusLevels.humidity === 'warning' || statusLevels.ammonia === 'warning' ? 'warning' :
    'normal';

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="page-container px-4">
        {/* Shed Selector & Management */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex flex-wrap items-center gap-2"
        >
          <ShedSelector />
          <div className="flex gap-2">
            <ShedManagementSheet />
            <DeviceManagementSheet />
          </div>
        </motion.div>

        {/* Status Overview */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 flex items-center justify-between rounded-2xl bg-card p-4 shadow-card"
        >
          <div>
            <p className="text-sm text-muted-foreground">
              {translations.dashboard.liveStatus[language]}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <StatusBadge 
                status={overallStatus} 
                label={statusText[language][overallStatus]} 
              />
              {manualOverride && (
                <span className="flex items-center gap-1 rounded-full bg-secondary/20 px-2 py-0.5 text-xs font-medium text-secondary">
                  <RefreshCw size={10} />
                  {translations.controls.manualOverride[language]}
                </span>
              )}
              {isConnected ? (
                <span className="flex items-center gap-1 rounded-full bg-status-normal/20 px-2 py-0.5 text-xs font-medium text-status-normal">
                  <Wifi size={10} />
                  {language === 'bn' ? 'লাইভ' : 'Live'}
                </span>
              ) : (
                <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  <WifiOff size={10} />
                  {language === 'bn' ? 'অফলাইন' : 'Offline'}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">
              {translations.dashboard.lastUpdate[language]}
            </p>
            <p className="text-sm font-medium">
              {sensorData.timestamp.toLocaleTimeString(language === 'bn' ? 'bn-BD' : 'en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </motion.div>

        {/* Sensor Cards Grid */}
        <div className="grid grid-cols-2 gap-4">
          <SensorCard
            type="temperature"
            value={sensorData.temperature}
            unit={translations.units.celsius[language]}
            label={translations.sensors.temperature[language]}
            status={statusLevels.temperature}
          />
          <SensorCard
            type="humidity"
            value={sensorData.humidity}
            unit={translations.units.percent[language]}
            label={translations.sensors.humidity[language]}
            status={statusLevels.humidity}
          />
          <SensorCard
            type="ammonia"
            value={sensorData.ammonia}
            unit={translations.units.ppm[language]}
            label={translations.sensors.ammonia[language]}
            status={statusLevels.ammonia}
          />
          <SensorCard
            type="water"
            value={sensorData.waterUsage}
            unit={translations.units.litersPerHour[language]}
            label={translations.sensors.water[language]}
            status={statusLevels.water}
          />
        </div>

        {/* Farm Summary Cards */}
        <div className="mt-6">
          <FarmSummaryCards />
        </div>

        {/* Sensor Charts */}
        <div className="mt-6">
          <SensorCharts />
        </div>

        {/* Fan Speed Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.11 }}
          className="mt-6"
        >
          <h2 className="section-title">
            {language === 'bn' ? 'ফ্যান কন্ট্রোল' : 'Fan Control'}
          </h2>
          <FanSpeedCard 
            temperature={sensorData.temperature}
            fanSpeed={fanSpeedResult?.speed || 'OFF'}
            message={fanSpeedResult?.message[language] || (language === 'bn' ? 'অপেক্ষা করুন...' : 'Loading...')}
          />
        </motion.div>

        {/* Heat Stress Index Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="mt-6"
        >
          <h2 className="section-title">
            {language === 'bn' ? 'হিট স্ট্রেস মনিটরিং' : 'Heat Stress Monitoring'}
          </h2>
          <HeatStressCard 
            hsiResult={hsiResult}
            temperature={sensorData.temperature}
            humidity={sensorData.humidity}
          />
        </motion.div>

        {/* Weather Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-6"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="section-title mb-0">
              {language === 'bn' ? 'আবহাওয়া' : 'Weather'}
            </h2>
            <WeatherSettingsSheet
              trigger={
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                  <Settings className="h-3.5 w-3.5" />
                  {language === 'bn' ? 'সেটিংস' : 'Settings'}
                </Button>
              }
            />
          </div>
          <WeatherCard />
        </motion.div>

        {/* Quick Device Status */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="section-title mb-0">
              {language === 'bn' ? 'ডিভাইস স্ট্যাটাস' : 'Device Status'}
            </h2>
            {totalDeviceCount > 0 && (
              <span className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs">
                <Cpu className="h-3.5 w-3.5" />
                <span className={onlineDeviceCount === totalDeviceCount ? 'text-status-normal' : 'text-status-warning'}>
                  {onlineDeviceCount}/{totalDeviceCount}
                </span>
                {language === 'bn' ? 'অনলাইন' : 'online'}
              </span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[
              { key: 'power', status: deviceStatus.power },
              { key: 'fan', status: deviceStatus.fan },
              { key: 'light', status: deviceStatus.light },
              { key: 'alarm', status: deviceStatus.alarm },
            ].map(({ key, status }) => (
              <div
                key={key}
                className={`flex flex-col items-center gap-2 rounded-xl p-3 ${
                  status ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                }`}
              >
                <div className={`h-3 w-3 rounded-full ${status ? 'bg-status-normal' : 'bg-status-off'}`} />
                <span className="text-xs font-medium">
                  {translations.sensors[key as keyof typeof translations.sensors][language]}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Quick Links */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 grid grid-cols-2 gap-3"
        >
          <Link
            to="/reports"
            className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-card transition-transform active:scale-[0.98]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BarChart3 size={20} />
            </div>
            <div className="flex-1">
              <p className="font-medium">{translations.reports.title[language]}</p>
            </div>
            <ChevronRight size={18} className="text-muted-foreground" />
          </Link>
          <ScheduleSheet
            trigger={
              <div className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-card transition-transform active:scale-[0.98] cursor-pointer">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                  <Calendar size={20} />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{language === 'bn' ? 'শিডিউল' : 'Schedule'}</p>
                </div>
                <ChevronRight size={18} className="text-muted-foreground" />
              </div>
            }
          />
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
}
