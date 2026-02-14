import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Settings, TrendingUp, Wallet, ChevronRight } from 'lucide-react';
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
import { BigFarmOverview } from '@/components/dashboard/BigFarmOverview';
import { BroilerTempStatusCard } from '@/components/broiler/BroilerTempStatusCard';
import { BroilerTempCurveCard } from '@/components/broiler/BroilerTempCurveCard';
import { BroilerAgeAutoModeCard } from '@/components/broiler/BroilerAgeAutoModeCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Industrial Dashboard Components
import { IndustrialHeroStatus } from '@/components/dashboard/IndustrialHeroStatus';
import { CurrentActionPanel } from '@/components/dashboard/CurrentActionPanel';
import { CoreMetricsRow } from '@/components/dashboard/CoreMetricsRow';

// Farmer-Friendly Assistant Components
import { 
  ComfortIndicators, AdvisoryAssistant, QuickControlFAB,
  HeroFarmBanner, SystemActivityCard, QuickSensorDisplay, TodayReadableSummary
} from '@/components/assistant';

// Smart Alert Banner
import { AlertSummaryBanner } from '@/components/alerts';

// Emergency Protection
import { EmergencyProtectionBanner } from '@/components/emergency/EmergencyProtectionBanner';

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
        {/* ============ SHED SELECTOR ============ */}
        <div className="flex items-center gap-2 mb-3">
          <ShedSelector />
          <ShedManagementSheet />
        </div>

        {/* ============ EMERGENCY PROTECTION BANNER ============ */}
        <EmergencyProtectionBanner />

        {/* ============ ALERT SUMMARY BANNER ============ */}
        <AlertSummaryBanner />

        {/* ============ 1. HERO STATUS (Largest element) ============ */}
        <div className="mb-3">
          <IndustrialHeroStatus />
        </div>

        {/* ============ 2. CURRENT ACTION PANEL ============ */}
        <div className="mb-3">
          <CurrentActionPanel />
        </div>

        {/* ============ 3. CORE METRICS ROW (3 items only) ============ */}
        <div className="mb-3">
          <CoreMetricsRow />
        </div>

        {/* ============ 4. PANIC PREVENTION STRIP ============ */}
        <div className="mb-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-4 py-2 text-center">
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
            {language === 'bn' 
              ? '✅ খামার সম্পূর্ণ অটোমেটিক চলছে — কিছু করার প্রয়োজন নেই'
              : '✅ Farm is fully automatic — no action needed'}
          </p>
        </div>

        {/* ============ 5. DETAILS BUTTON ============ */}
        <Link
          to="/alerts"
          className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3 mb-4 transition-colors hover:bg-muted/50"
        >
          <span className="text-sm font-semibold text-foreground">
            {language === 'bn' ? '📊 বিস্তারিত দেখুন' : '📊 View Details'}
          </span>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </Link>

        {/* ============ TABS (Home extras + Full Details) ============ */}
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
            
            {/* TAB: Home */}
            <TabsContent value="home" className="mt-4 space-y-4">
              {/* Advisory */}
              <AdvisoryAssistant />
              
              {/* Today Summary */}
              <TodayReadableSummary />
              
              {/* Weather */}
              <WeatherCard />
              
              {/* System Activity */}
              <SystemActivityCard />
              
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
              
              {/* Comfort Indicators */}
              <ComfortIndicators />
              
              {/* Inside-Outside Delta */}
              <InsideOutsideDeltaCard />
              
              {/* Full Hero Banner */}
              <HeroFarmBanner />
              
              {/* Quick Status Grid */}
              <div className="grid grid-cols-2 gap-3">
                <HeatStressStatusCard 
                  hsiResult={hsiResult}
                  temperature={sensorData.temperature}
                  humidity={sensorData.humidity}
                />
                <SystemModeCard />
              </div>
              
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
              
              {/* Quick Sensor Display */}
              <QuickSensorDisplay />
              
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
              
              {/* Sensor Health */}
              <SensorHealthCard />
              
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
