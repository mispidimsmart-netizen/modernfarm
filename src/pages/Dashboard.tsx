import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Settings, TrendingUp, Wallet } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useFarmSettings } from '@/hooks/useFarmData';
import { useFarmType } from '@/hooks/useFarmType';
import { useRealtimeSensorData, useRealtimeStatusLevels, useRealtimeDeviceStatus, useRealtimeAlerts } from '@/hooks/useRealtimeSensorData';
import { useAllDeviceHealth } from '@/hooks/useDeviceHealth';
import { useHeatStressAutomation } from '@/hooks/useHeatStressAutomation';
import { useFanSpeedAutomation } from '@/hooks/useFanSpeedAutomation';
import { useBroilerEnvironment } from '@/hooks/useBroilerEnvironment';
import { useBroilerWaterMonitor } from '@/hooks/useBroilerWaterMonitor';
import { useWaterAnomalyDetection } from '@/hooks/useWaterAnomalyDetection';
import { useAmmoniaTrendDetection } from '@/hooks/useAmmoniaTrendDetection';
import { useHeatStressRiskPrediction } from '@/hooks/useHeatStressRiskPrediction';
import { useFoggerCooling } from '@/hooks/useFoggerCooling';
import { useCoolingEfficiency } from '@/hooks/useCoolingEfficiency';
import { useSelectedShed } from '@/hooks/useSheds';
import { translations } from '@/lib/translations';
import { SensorCard } from '@/components/SensorCard';
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
import { CoolingEfficiencyCard } from '@/components/dashboard/CoolingEfficiencyCard';
import { SensorHealthCard } from '@/components/dashboard/SensorHealthCard';
import { InsideOutsideDeltaCard } from '@/components/dashboard/InsideOutsideDeltaCard';
import { AutomationStatusCard } from '@/components/automation/AutomationStatusCard';
import { PowerOutageCard } from '@/components/device/PowerOutageCard';
import { SmartModeWidget } from '@/components/dashboard/SmartModeWidget';
import { BigFarmOverview } from '@/components/dashboard/BigFarmOverview';
import { BroilerTempStatusCard } from '@/components/broiler/BroilerTempStatusCard';
import { BroilerTempCurveCard } from '@/components/broiler/BroilerTempCurveCard';
import { BroilerAgeAutoModeCard } from '@/components/broiler/BroilerAgeAutoModeCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Farmer-Friendly Assistant Components
import { 
  ComfortIndicators, AdvisoryAssistant, QuickControlFAB,
  HeroFarmBanner, SystemActivityCard, QuickSensorDisplay, TodayReadableSummary
} from '@/components/assistant';

// Smart Alert Banner
import { AlertSummaryBanner } from '@/components/alerts';

export function Dashboard() {
  const { language } = useAuth();
  const { sensorData, isConnected } = useRealtimeSensorData();
  const statusLevels = useRealtimeStatusLevels(sensorData);
  const { status: deviceStatus, manualOverride } = useRealtimeDeviceStatus();
  const { data: farmSettings } = useFarmSettings();
  const { data: deviceHealth } = useAllDeviceHealth();
  const { selectedShedId } = useSelectedShed();
  const { isLayer, isBroiler } = useFarmType();
  
  // Subscribe to realtime alerts
  useRealtimeAlerts();
  
  // Layer: Heat Stress Index automation
  const hsiResult = useHeatStressAutomation({
    temperature: sensorData.temperature,
    humidity: sensorData.humidity,
    shedId: selectedShedId,
    enabled: isLayer,
  });

  // Layer: Fan Speed automation based on temperature
  const fanSpeedResult = useFanSpeedAutomation({
    temperature: sensorData.temperature,
    shedId: selectedShedId,
    enabled: isLayer && !manualOverride,
  });

  // Broiler: Complete environment automation
  const broilerEnvResult = useBroilerEnvironment({
    temperature: sensorData.temperature,
    humidity: sensorData.humidity,
    ammonia: sensorData.ammonia,
    shedId: selectedShedId,
    enabled: isBroiler,
  });

  // Water usage monitoring
  const layerWaterAnomalyResult = useWaterAnomalyDetection(isLayer ? sensorData.waterUsage : null);
  const broilerWaterResult = useBroilerWaterMonitor(isBroiler ? sensorData.waterUsage : null);

  // Ammonia rising trend detection
  const ammoniaTrendResult = useAmmoniaTrendDetection(sensorData.ammonia);

  // Tomorrow's heat stress risk prediction
  const heatStressRiskResult = useHeatStressRiskPrediction();

  // Fogger status for cooling efficiency detection
  const foggerStatus = useFoggerCooling({
    temperature: sensorData.temperature,
    humidity: sensorData.humidity,
    enabled: true,
  });

  // Cooling efficiency detection
  const coolingEfficiencyResult = useCoolingEfficiency({
    temperature: sensorData.temperature,
    foggerActive: foggerStatus.isActive,
    enabled: true,
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="page-container px-4">
        {/* ============ SECTION 0: SHED SELECTOR (TOP) ============ */}
        <div className="flex items-center gap-2 mb-4">
          <ShedSelector />
          <ShedManagementSheet />
        </div>

        {/* ============ SECTION 0.5: ALERT SUMMARY BANNER ============ */}
        <AlertSummaryBanner />

        {/* ============ SECTION 1: HERO FARM HEALTH BANNER ============ */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-4"
        >
          <HeroFarmBanner />
        </motion.div>

        {/* ============ SECTION 2: COMFORT METERS ============ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.02 }}
          className="mb-4"
        >
          <ComfortIndicators />
        </motion.div>

        {/* ============ SECTION 3: SUGGESTED ACTION CARD ============ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 }}
          className="mb-4"
        >
          <AdvisoryAssistant />
        </motion.div>

        {/* ============ SECTION 4: TODAY READABLE SUMMARY ============ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          className="mb-4"
        >
          <TodayReadableSummary />
        </motion.div>

        {/* ============ SECTION 5: QUICK REFERENCE SENSORS ============ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="mb-4"
        >
          <QuickSensorDisplay />
        </motion.div>

        {/* ============ SECTION 6: SYSTEM ACTIVITY LOG ============ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-4"
        >
          <SystemActivityCard />
        </motion.div>

        {/* ============ SECTION 7: TABS (Home + Details) ============ */}
        <div className="mb-5">
          <Tabs defaultValue="home" className="w-full">
            <TabsList className="w-full grid grid-cols-2 h-11 rounded-2xl bg-muted/50 p-1 border border-border/50">
              <TabsTrigger 
                value="home" 
                className="rounded-xl text-sm font-semibold transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
              >
                {language === 'bn' ? '🏠 হোম' : '🏠 Home'}
              </TabsTrigger>
              <TabsTrigger 
                value="details" 
                className="rounded-xl text-sm font-semibold transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
              >
                {language === 'bn' ? '📊 বিস্তারিত' : '📊 Details'}
              </TabsTrigger>
            </TabsList>
            
            {/* TAB: Home (Simple Assistant View) */}
            <TabsContent value="home" className="mt-4 space-y-4">
              {/* Weather */}
              <WeatherCard />
              
              {/* Quick Status Grid */}
              <div className="grid grid-cols-2 gap-3">
                <HeatStressStatusCard 
                  hsiResult={hsiResult}
                  temperature={sensorData.temperature}
                  humidity={sensorData.humidity}
                />
                <SystemModeCard />
              </div>
              
              {/* Smart Mode Widget */}
              <SmartModeWidget />
              
              {/* Quick Links */}
              <div className="grid grid-cols-2 gap-3">
                <Link
                  to="/reports?tab=overview"
                  className="flex flex-col items-center gap-2 rounded-2xl bg-primary/5 border border-primary/20 p-4 hover:bg-primary/10 transition-colors"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <TrendingUp size={24} />
                  </div>
                  <span className="text-sm font-medium">{language === 'bn' ? 'রিপোর্ট' : 'Reports'}</span>
                </Link>
                <Link
                  to="/reports?tab=costs"
                  className="flex flex-col items-center gap-2 rounded-2xl bg-secondary/50 border border-secondary p-4 hover:bg-secondary/70 transition-colors"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                    <Wallet size={24} />
                  </div>
                  <span className="text-sm font-medium">{language === 'bn' ? 'খরচ' : 'Costs'}</span>
                </Link>
              </div>
            </TabsContent>
            
            {/* TAB: Details (Technical/Graphs) */}
            <TabsContent value="details" className="mt-4 space-y-4">
              {/* Big Farm Overview */}
              <BigFarmOverview />
              
              {/* Technical Sensor Cards */}
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
              
              {/* Device Status */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { key: 'power', icon: '🔌', status: deviceStatus.power },
                  { key: 'fan', icon: '🌀', status: deviceStatus.fan },
                  { key: 'light', icon: '💡', status: deviceStatus.light },
                  { key: 'alarm', icon: '🔔', status: deviceStatus.alarm },
                ].map(({ key, icon, status }) => (
                  <div
                    key={key}
                    className={`flex flex-col items-center gap-1.5 rounded-xl p-3 border ${
                      status 
                        ? 'bg-primary/10 border-primary/30' 
                        : 'bg-muted/30 border-border/50'
                    }`}
                  >
                    <span className="text-2xl">{icon}</span>
                    <span className={`text-[10px] font-semibold uppercase ${status ? 'text-primary' : 'text-muted-foreground'}`}>
                      {translations.sensors[key as keyof typeof translations.sensors][language]}
                    </span>
                  </div>
                ))}
              </div>
              
              {/* Sensor Charts */}
              <SensorCharts />
              
              {/* Broiler Specific */}
              {isBroiler && (
                <>
                  <BroilerAgeAutoModeCard enabled={true} />
                  <BroilerTempStatusCard tempResult={broilerEnvResult ? {
                    currentTemp: broilerEnvResult.temperature.current,
                    targetMin: broilerEnvResult.temperature.targetMin,
                    targetMax: broilerEnvResult.temperature.targetMax,
                    ageWeeks: broilerEnvResult.ageWeeks,
                    ageDays: broilerEnvResult.ageDays,
                    level: broilerEnvResult.temperature.level === 'emergency' ? 'critical' : broilerEnvResult.temperature.level,
                    deviation: broilerEnvResult.temperature.deviation,
                    shouldActivateFan: broilerEnvResult.temperature.shouldActivateFan,
                    shouldActivateHeater: broilerEnvResult.temperature.shouldActivateHeater,
                    shouldAlert: broilerEnvResult.temperature.shouldAlarm,
                    message: broilerEnvResult.overallMessage,
                  } : null} />
                  <BroilerTempCurveCard currentTemp={sensorData.temperature ?? undefined} />
                </>
              )}
              
              {/* Layer Specific */}
              {isLayer && (
                <>
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
                </>
              )}
              
              {/* Automation Status */}
              <AutomationStatusCard />
              
              {/* Sensor Health & Alerts */}
              <SensorHealthCard />
              <InsideOutsideDeltaCard />
              
              {isLayer && <WaterAnomalyCard result={layerWaterAnomalyResult} />}
              {isBroiler && broilerWaterResult && (
                <WaterAnomalyCard result={{
                  todayUsage: broilerWaterResult.currentUsage,
                  last3DaysAvg: broilerWaterResult.avgLast6Hours,
                  percentChange: broilerWaterResult.percentChange,
                  isAnomaly: broilerWaterResult.isAnomaly,
                  threshold: broilerWaterResult.threshold,
                  message: broilerWaterResult.message,
                }} />
              )}
              
              <AmmoniaTrendCard result={ammoniaTrendResult} />
              <CoolingEfficiencyCard result={coolingEfficiencyResult} />
              {isLayer && <HeatStressRiskCard result={heatStressRiskResult} />}
              <PowerOutageCard />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Quick Control FAB */}
      <QuickControlFAB />

      <BottomNav />
    </div>
  );
}
