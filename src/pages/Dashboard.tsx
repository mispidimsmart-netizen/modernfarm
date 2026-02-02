import { motion } from 'framer-motion';
import { Power, Zap, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useFarmSettings } from '@/hooks/useFarmData';
import { useLiveSensorData, useStatusLevels, useDeviceControl } from '@/hooks/useSensorData';
import { translations } from '@/lib/translations';
import { SensorCard } from '@/components/SensorCard';
import { StatusBadge } from '@/components/StatusBadge';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { StatusLevel } from '@/lib/types';

export function Dashboard() {
  const { language } = useAuth();
  const sensorData = useLiveSensorData();
  const statusLevels = useStatusLevels(sensorData);
  const { status: deviceStatus, manualOverride } = useDeviceControl();
  const { data: farmSettings } = useFarmSettings();

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
        {/* Status Overview */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
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

        {/* Quick Device Status */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6"
        >
          <h2 className="section-title">
            {language === 'bn' ? 'ডিভাইস স্ট্যাটাস' : 'Device Status'}
          </h2>
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
      </main>

      <BottomNav />
    </div>
  );
}
