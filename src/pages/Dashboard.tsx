import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { RefreshCw, BarChart3, Settings, ChevronRight, Wifi, WifiOff, Cpu, Zap, Thermometer, Wind, Droplets, AlertTriangle, TrendingUp, Wallet } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useFarmSettings } from '@/hooks/useFarmData';
import { useRealtimeSensorData, useRealtimeStatusLevels, useRealtimeDeviceStatus, useRealtimeAlerts } from '@/hooks/useRealtimeSensorData';
import { useAllDeviceHealth } from '@/hooks/useDeviceHealth';
import { useHeatStressAutomation } from '@/hooks/useHeatStressAutomation';
import { useFanSpeedAutomation } from '@/hooks/useFanSpeedAutomation';
import { useWaterAnomalyDetection } from '@/hooks/useWaterAnomalyDetection';
import { useAmmoniaTrendDetection } from '@/hooks/useAmmoniaTrendDetection';
import { useHeatStressRiskPrediction } from '@/hooks/useHeatStressRiskPrediction';
import { useSelectedShed } from '@/hooks/useSheds';
import { translations } from '@/lib/translations';
import { SensorCard } from '@/components/SensorCard';
import { StatusBadge } from '@/components/StatusBadge';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { ShedSelector } from '@/components/shed/ShedSelector';
import { ShedManagementSheet } from '@/components/shed/ShedManagementSheet';

import { WeatherCard } from '@/components/weather/WeatherCard';
import { WeatherSettingsSheet } from '@/components/weather/WeatherSettingsSheet';
import { SensorCharts } from '@/components/dashboard/SensorCharts';
import { HeatStressCard } from '@/components/dashboard/HeatStressCard';
import { HeatStressStatusCard } from '@/components/dashboard/HeatStressStatusCard';
import { SystemModeCard } from '@/components/dashboard/SystemModeCard';
import { FanSpeedCard } from '@/components/dashboard/FanSpeedCard';
import { WaterAnomalyCard } from '@/components/dashboard/WaterAnomalyCard';
import { AmmoniaTrendCard } from '@/components/dashboard/AmmoniaTrendCard';
import { HeatStressRiskCard } from '@/components/dashboard/HeatStressRiskCard';
import { AutomationStatusCard } from '@/components/automation/AutomationStatusCard';
import { PowerOutageCard } from '@/components/device/PowerOutageCard';
import { SmartModeWidget } from '@/components/dashboard/SmartModeWidget';
import { BigFarmOverview } from '@/components/dashboard/BigFarmOverview';
import { StatusLevel } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
    enabled: !manualOverride,
  });

  // Water usage anomaly detection
  const waterAnomalyResult = useWaterAnomalyDetection(sensorData.waterUsage);

  // Ammonia rising trend detection
  const ammoniaTrendResult = useAmmoniaTrendDetection(sensorData.ammonia);

  // Tomorrow's heat stress risk prediction
  const heatStressRiskResult = useHeatStressRiskPrediction();
  
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
        {/* ============ SECTION 1: HERO STATUS CARD ============ */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-teal-700 via-emerald-700 to-teal-800 p-5 shadow-2xl"
        >
          {/* Animated Background Elements */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-400/15 blur-3xl" />
            <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-teal-400/10 blur-2xl" />
            <div className="absolute right-1/4 top-1/2 h-24 w-24 rounded-full bg-cyan-400/15 blur-2xl" />
          </div>
          
          <div className="relative z-10">
            {/* Top Row: Status + Live Badge */}
            <div className="flex items-center justify-between mb-5">
              <StatusBadge 
                status={overallStatus} 
                label={statusText[language][overallStatus]}
                className="bg-white/15 text-white border-white/20 backdrop-blur-sm shadow-lg px-4 py-1.5"
              />
              
              <div className="flex items-center gap-2">
                {manualOverride && (
                  <span className="flex items-center gap-1 rounded-full bg-amber-400/20 border border-amber-300/30 px-3 py-1 text-[10px] font-medium text-amber-100">
                    <RefreshCw size={10} />
                    {language === 'bn' ? 'ম্যানুয়াল' : 'Manual'}
                  </span>
                )}
                {isConnected ? (
                  <span className="flex items-center gap-1.5 rounded-full bg-emerald-400/20 border border-emerald-300/30 px-3 py-1.5 text-xs font-semibold shadow-lg">
                    <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
                    <span className="text-emerald-100">{language === 'bn' ? 'লাইভ' : 'LIVE'}</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 rounded-full bg-red-400/20 border border-red-300/30 px-3 py-1.5 text-xs font-semibold">
                    <WifiOff size={12} className="text-red-200" />
                    <span className="text-red-100">{language === 'bn' ? 'অফলাইন' : 'Offline'}</span>
                  </span>
                )}
              </div>
            </div>
            
            {/* Main Sensor Values - Premium Glass Cards */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { icon: Thermometer, value: sensorData.temperature.toFixed(1), unit: '°', label: language === 'bn' ? 'তাপমাত্রা' : 'Temp', iconBg: 'from-orange-400 to-red-500' },
                { icon: Droplets, value: sensorData.humidity.toFixed(0), unit: '%', label: language === 'bn' ? 'আর্দ্রতা' : 'Humidity', iconBg: 'from-sky-400 to-blue-500' },
                { icon: Wind, value: sensorData.ammonia.toFixed(1), unit: '', label: language === 'bn' ? 'অ্যামোনিয়া' : 'NH₃', iconBg: 'from-fuchsia-400 to-purple-500' },
                { icon: Zap, value: hsiResult?.index?.toFixed(0) || '--', unit: '', label: language === 'bn' ? 'হিট ইনডেক্স' : 'HSI', iconBg: 'from-amber-400 to-orange-500' },
              ].map(({ icon: Icon, value, unit, label, iconBg }, index) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06 }}
                  className="text-center rounded-2xl bg-white/8 backdrop-blur-sm border border-white/10 p-3 hover:bg-white/12 transition-colors"
                >
                  {/* Icon Container */}
                  <div className={`mx-auto w-11 h-11 rounded-xl bg-gradient-to-br ${iconBg} flex items-center justify-center mb-2 shadow-lg`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  
                  {/* Value */}
                  <p className="text-2xl font-bold text-white tracking-tight">
                    {value}<span className="text-base opacity-70">{unit}</span>
                  </p>
                  
                  {/* Label */}
                  <p className="text-[10px] text-white/60 font-medium uppercase tracking-wider mt-0.5">{label}</p>
                </motion.div>
              ))}
            </div>
            
            {/* Bottom: Last Update */}
            <div className="flex items-center justify-between text-xs px-3 py-2.5 rounded-xl bg-white/8 border border-white/10">
              <span className="flex items-center gap-2 text-white/70">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {language === 'bn' ? 'আপডেট: ' : 'Updated: '}
                <span className="text-white font-semibold">
                  {sensorData.timestamp.toLocaleTimeString(language === 'bn' ? 'bn-BD' : 'en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </span>
              {totalDeviceCount > 0 && (
                <span className="flex items-center gap-1.5 text-white/70">
                  <Cpu className="h-3.5 w-3.5 text-secondary" />
                  <span className="text-white font-semibold">{onlineDeviceCount}/{totalDeviceCount}</span>
                  {language === 'bn' ? 'ডিভাইস' : 'devices'}
                </span>
              )}
            </div>
          </div>
        </motion.div>

        {/* ============ SECTION 2: SHED SELECTOR (Multi-farm ready) ============ */}
        <BigFarmOverview />
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-5 flex items-center gap-2"
        >
          <ShedSelector />
          <ShedManagementSheet />
        </motion.div>

        {/* ============ SECTION 3: QUICK STATUS GRID ============ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="mb-5 grid grid-cols-2 gap-3"
        >
          <HeatStressStatusCard 
            hsiResult={hsiResult}
            temperature={sensorData.temperature}
            humidity={sensorData.humidity}
          />
          <SystemModeCard />
        </motion.div>

        {/* ============ SECTION 4: DEVICE STATUS QUICK VIEW ============ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-5"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              {language === 'bn' ? '⚡ ডিভাইস স্ট্যাটাস' : '⚡ Device Status'}
            </h2>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { key: 'power', icon: '🔌', status: deviceStatus.power, activeColor: 'from-emerald-500 to-green-600', glowColor: 'shadow-emerald-500/40' },
              { key: 'fan', icon: '🌀', status: deviceStatus.fan, activeColor: 'from-cyan-500 to-blue-600', glowColor: 'shadow-cyan-500/40' },
              { key: 'light', icon: '💡', status: deviceStatus.light, activeColor: 'from-amber-500 to-yellow-600', glowColor: 'shadow-amber-500/40' },
              { key: 'alarm', icon: '🔔', status: deviceStatus.alarm, activeColor: 'from-red-500 to-rose-600', glowColor: 'shadow-red-500/40' },
            ].map(({ key, icon, status, activeColor, glowColor }) => (
              <motion.div
                key={key}
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.02 }}
                className={`relative flex flex-col items-center gap-1.5 rounded-2xl p-3 transition-all backdrop-blur-sm ${
                  status 
                    ? `bg-gradient-to-br ${activeColor} border border-white/20 shadow-lg ${glowColor}` 
                    : 'bg-muted/30 border border-border/50 dark:bg-slate-800/50'
                }`}
              >
                <span className="text-2xl drop-shadow-lg">{icon}</span>
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${status ? 'text-white' : 'text-muted-foreground'}`}>
                  {translations.sensors[key as keyof typeof translations.sensors][language]}
                </span>
                <span className={`absolute top-2 right-2 h-2.5 w-2.5 rounded-full ${
                  status 
                    ? 'bg-white shadow-lg shadow-white/50 animate-pulse' 
                    : 'bg-muted-foreground/30'
                }`} />
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ============ SECTION 5: SMART MODE ============ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="mb-5"
        >
          <SmartModeWidget />
        </motion.div>

        {/* ============ SECTION 6: TABBED DETAILED VIEW ============ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="mb-5"
        >
          <Tabs defaultValue="sensors" className="w-full">
            <TabsList className="w-full grid grid-cols-3 h-12 rounded-2xl bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 p-1 border border-border/50 shadow-inner">
              <TabsTrigger 
                value="sensors" 
                className="rounded-xl text-xs font-semibold transition-all data-[state=active]:bg-gradient-to-br data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/30"
              >
                {language === 'bn' ? '📈 সেন্সর' : '📈 Sensors'}
              </TabsTrigger>
              <TabsTrigger 
                value="controls" 
                className="rounded-xl text-xs font-semibold transition-all data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/30"
              >
                {language === 'bn' ? '🎛️ কন্ট্রোল' : '🎛️ Controls'}
              </TabsTrigger>
              <TabsTrigger 
                value="alerts" 
                className="rounded-xl text-xs font-semibold transition-all data-[state=active]:bg-gradient-to-br data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-amber-500/30"
              >
                {language === 'bn' ? '⚠️ সতর্কতা' : '⚠️ Alerts'}
              </TabsTrigger>
            </TabsList>
            
            {/* TAB: Sensors */}
            <TabsContent value="sensors" className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
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
              <SensorCharts />
            </TabsContent>
            
            {/* TAB: Controls */}
            <TabsContent value="controls" className="mt-4 space-y-4">
              <FanSpeedCard 
                temperature={sensorData.temperature}
                fanSpeed={fanSpeedResult?.speed || 'OFF'}
                message={fanSpeedResult?.message[language] || (language === 'bn' ? 'অপেক্ষা করুন...' : 'Loading...')}
              />
              <HeatStressCard 
                hsiResult={hsiResult}
                temperature={sensorData.temperature}
                humidity={sensorData.humidity}
              />
              <AutomationStatusCard />
            </TabsContent>
            
            {/* TAB: Alerts & Predictions */}
            <TabsContent value="alerts" className="mt-4 space-y-4">
              <WaterAnomalyCard result={waterAnomalyResult} />
              <AmmoniaTrendCard result={ammoniaTrendResult} />
              <HeatStressRiskCard result={heatStressRiskResult} />
              <PowerOutageCard />
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* ============ SECTION 8: WEATHER ============ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="mb-5"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent">
              {language === 'bn' ? '🌤️ আবহাওয়া' : '🌤️ Weather'}
            </h2>
            <WeatherSettingsSheet
              trigger={
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs rounded-xl hover:bg-sky-500/10 hover:text-sky-500 transition-colors">
                  <Settings className="h-3.5 w-3.5" />
                </Button>
              }
            />
          </div>
          <WeatherCard />
        </motion.div>

        {/* ============ SECTION 9: QUICK LINKS ============ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="mb-5 grid grid-cols-2 gap-3"
        >
          {/* Overview Card */}
          <Link
            to="/reports?tab=overview"
            className="group relative flex flex-col items-center gap-3 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-cyan-500/10 dark:from-emerald-950/50 dark:via-teal-950/30 dark:to-cyan-950/50 p-5 border border-emerald-500/20 shadow-lg hover:shadow-xl hover:shadow-emerald-500/10 transition-all active:scale-[0.98] overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform">
              <TrendingUp size={26} />
            </div>
            <div className="text-center relative z-10">
              <p className="font-semibold text-sm text-foreground">{language === 'bn' ? 'ওভারভিউ' : 'Overview'}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {language === 'bn' ? 'সেন্সর চার্ট ও সারাংশ' : 'Sensor charts & summary'}
              </p>
            </div>
          </Link>
          
          {/* Cost Analytics Card */}
          <Link
            to="/reports?tab=costs"
            className="group relative flex flex-col items-center gap-3 rounded-3xl bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-fuchsia-500/10 dark:from-violet-950/50 dark:via-purple-950/30 dark:to-fuchsia-950/50 p-5 border border-violet-500/20 shadow-lg hover:shadow-xl hover:shadow-violet-500/10 transition-all active:scale-[0.98] overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/30 group-hover:scale-110 transition-transform">
              <Wallet size={26} />
            </div>
            <div className="text-center relative z-10">
              <p className="font-semibold text-sm text-foreground">{language === 'bn' ? 'খরচ বিশ্লেষণ' : 'Cost Analytics'}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {language === 'bn' ? 'আয়-ব্যয় হিসাব' : 'Income & expenses'}
              </p>
            </div>
          </Link>
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
}
