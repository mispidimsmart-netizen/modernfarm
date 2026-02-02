import { motion } from 'framer-motion';
import { Power, Zap, RefreshCw } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { translations } from '@/lib/translations';
import { SensorCard } from '@/components/SensorCard';
import { StatusBadge } from '@/components/StatusBadge';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { StatusLevel } from '@/lib/types';

export function Dashboard() {
  const { language, sensorData, deviceStatus, farmSettings, manualOverride } = useApp();

  // Calculate status levels
  const getTemperatureStatus = (): StatusLevel => {
    if (sensorData.temperature > farmSettings.temperatureMax + 5) return 'danger';
    if (sensorData.temperature > farmSettings.temperatureMax || sensorData.temperature < farmSettings.temperatureMin) return 'warning';
    return 'normal';
  };

  const getHumidityStatus = (): StatusLevel => {
    if (sensorData.humidity > farmSettings.humidityMax + 10 || sensorData.humidity < farmSettings.humidityMin - 10) return 'danger';
    if (sensorData.humidity > farmSettings.humidityMax || sensorData.humidity < farmSettings.humidityMin) return 'warning';
    return 'normal';
  };

  const getAmmoniaStatus = (): StatusLevel => {
    if (sensorData.ammonia > farmSettings.ammoniaMax + 10) return 'danger';
    if (sensorData.ammonia > farmSettings.ammoniaMax) return 'warning';
    return 'normal';
  };

  const getWaterStatus = (): StatusLevel => {
    if (sensorData.waterUsage < 10) return 'danger';
    if (sensorData.waterUsage < 20) return 'warning';
    return 'normal';
  };

  const statusText = {
    bn: { normal: 'স্বাভাবিক', warning: 'সতর্কতা', danger: 'বিপদ' },
    en: { normal: 'Normal', warning: 'Warning', danger: 'Danger' },
  };

  const overallStatus: StatusLevel = 
    getTemperatureStatus() === 'danger' || getAmmoniaStatus() === 'danger' ? 'danger' :
    getTemperatureStatus() === 'warning' || getHumidityStatus() === 'warning' || getAmmoniaStatus() === 'warning' ? 'warning' :
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
            status={getTemperatureStatus()}
          />
          <SensorCard
            type="humidity"
            value={sensorData.humidity}
            unit={translations.units.percent[language]}
            label={translations.sensors.humidity[language]}
            status={getHumidityStatus()}
          />
          <SensorCard
            type="ammonia"
            value={sensorData.ammonia}
            unit={translations.units.ppm[language]}
            label={translations.sensors.ammonia[language]}
            status={getAmmoniaStatus()}
          />
          <SensorCard
            type="water"
            value={sensorData.waterUsage}
            unit={translations.units.litersPerHour[language]}
            label={translations.sensors.water[language]}
            status={getWaterStatus()}
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
              { key: 'power', icon: Power, status: deviceStatus.power },
              { key: 'fan', icon: Zap, status: deviceStatus.fan },
              { key: 'light', icon: Zap, status: deviceStatus.light },
              { key: 'alarm', icon: Zap, status: deviceStatus.alarm },
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
