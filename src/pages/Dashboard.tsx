import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { RefreshCw, BarChart3, Settings, ChevronRight, Wifi, WifiOff, Cpu, Zap, Thermometer, Wind, Droplets, AlertTriangle } from 'lucide-react';
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
          className="relative mb-5 overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-primary/80 p-5 text-primary-foreground shadow-lg"
        >
          {/* Background pattern */}
          <div className="pointer-events-none absolute inset-0 opacity-10">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white" />
            <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-white" />
          </div>
          
          <div className="relative z-10">
            {/* Top Row: Status + Live Badge */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <StatusBadge 
                  status={overallStatus} 
                  label={statusText[language][overallStatus]}
                  className="bg-white/20 text-white border-white/30"
                />
                {manualOverride && (
                  <span className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium">
                    <RefreshCw size={10} />
                    {language === 'bn' ? 'ম্যানুয়াল' : 'Manual'}
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <span className="flex items-center gap-1 rounded-full bg-green-400/30 px-2.5 py-1 text-xs font-medium">
                    <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                    {language === 'bn' ? 'লাইভ' : 'LIVE'}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 rounded-full bg-red-400/30 px-2.5 py-1 text-xs font-medium">
                    <WifiOff size={12} />
                    {language === 'bn' ? 'অফলাইন' : 'Offline'}
                  </span>
                )}
              </div>
            </div>
            
            {/* Main Sensor Values - Big Numbers */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <Thermometer className="h-4 w-4 opacity-80" />
                </div>
                <p className="text-2xl font-bold">{sensorData.temperature.toFixed(1)}°</p>
                <p className="text-[10px] opacity-80">{language === 'bn' ? 'তাপমাত্রা' : 'Temp'}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <Droplets className="h-4 w-4 opacity-80" />
                </div>
                <p className="text-2xl font-bold">{sensorData.humidity.toFixed(0)}%</p>
                <p className="text-[10px] opacity-80">{language === 'bn' ? 'আর্দ্রতা' : 'Humidity'}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <Wind className="h-4 w-4 opacity-80" />
                </div>
                <p className="text-2xl font-bold">{sensorData.ammonia.toFixed(1)}</p>
                <p className="text-[10px] opacity-80">{language === 'bn' ? 'অ্যামোনিয়া' : 'NH₃ ppm'}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <Zap className="h-4 w-4 opacity-80" />
                </div>
                <p className="text-2xl font-bold">{hsiResult?.index?.toFixed(0) || '--'}</p>
                <p className="text-[10px] opacity-80">{language === 'bn' ? 'হিট ইনডেক্স' : 'HSI'}</p>
              </div>
            </div>
            
            {/* Bottom: Last Update + Device Count */}
            <div className="flex items-center justify-between text-xs opacity-80">
              <span>
                {language === 'bn' ? 'সর্বশেষ আপডেট: ' : 'Last: '}
                {sensorData.timestamp.toLocaleTimeString(language === 'bn' ? 'bn-BD' : 'en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              {totalDeviceCount > 0 && (
                <span className="flex items-center gap-1">
                  <Cpu className="h-3 w-3" />
                  {onlineDeviceCount}/{totalDeviceCount} {language === 'bn' ? 'ডিভাইস' : 'devices'}
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
            <h2 className="text-sm font-semibold text-muted-foreground">
              {language === 'bn' ? '⚡ ডিভাইস স্ট্যাটাস' : '⚡ Device Status'}
            </h2>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { key: 'power', icon: '🔌', status: deviceStatus.power },
              { key: 'fan', icon: '🌀', status: deviceStatus.fan },
              { key: 'light', icon: '💡', status: deviceStatus.light },
              { key: 'alarm', icon: '🔔', status: deviceStatus.alarm },
            ].map(({ key, icon, status }) => (
              <motion.div
                key={key}
                whileTap={{ scale: 0.95 }}
                className={`relative flex flex-col items-center gap-1.5 rounded-2xl p-3 transition-all ${
                  status 
                    ? 'bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 shadow-sm' 
                    : 'bg-muted/50 border border-transparent'
                }`}
              >
                <span className="text-xl">{icon}</span>
                <span className={`text-[10px] font-medium ${status ? 'text-primary' : 'text-muted-foreground'}`}>
                  {translations.sensors[key as keyof typeof translations.sensors][language]}
                </span>
                <span className={`absolute top-2 right-2 h-2 w-2 rounded-full ${status ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
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
            <TabsList className="w-full grid grid-cols-3 h-10 rounded-xl bg-muted/50">
              <TabsTrigger value="sensors" className="rounded-lg text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm">
                {language === 'bn' ? '📈 সেন্সর' : '📈 Sensors'}
              </TabsTrigger>
              <TabsTrigger value="controls" className="rounded-lg text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm">
                {language === 'bn' ? '🎛️ কন্ট্রোল' : '🎛️ Controls'}
              </TabsTrigger>
              <TabsTrigger value="alerts" className="rounded-lg text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm">
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
            <h2 className="text-sm font-semibold text-muted-foreground">
              {language === 'bn' ? '🌤️ আবহাওয়া' : '🌤️ Weather'}
            </h2>
            <WeatherSettingsSheet
              trigger={
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
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
          className="mb-5"
        >
          <Link
            to="/reports"
            className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-card to-muted/30 p-4 border border-border/50 shadow-sm transition-all active:scale-[0.98]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BarChart3 size={20} />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">{translations.reports.title[language]}</p>
              <p className="text-[10px] text-muted-foreground">
                {language === 'bn' ? 'বিস্তারিত রিপোর্ট' : 'Detailed reports'}
              </p>
            </div>
            <ChevronRight size={18} className="text-muted-foreground" />
          </Link>
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
}
