import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Settings } from 'lucide-react';
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
// BigFarmOverview removed from Details tab (duplicate of CoreMetricsRow)
import { BroilerTempStatusCard } from '@/components/broiler/BroilerTempStatusCard';
import { BroilerTempCurveCard } from '@/components/broiler/BroilerTempCurveCard';
import { BroilerAgeAutoModeCard } from '@/components/broiler/BroilerAgeAutoModeCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Industrial Dashboard Components
import { IndustrialHeroStatus } from '@/components/dashboard/IndustrialHeroStatus';
import { CurrentActionPanel } from '@/components/dashboard/CurrentActionPanel';
import { CoreMetricsRow } from '@/components/dashboard/CoreMetricsRow';
import { DeviceConnectionStatus } from '@/components/dashboard/DeviceConnectionStatus';

// Farmer-Friendly Assistant Components
import { 
  ComfortIndicators, AdvisoryAssistant, QuickControlFAB,
  SystemActivityCard, TodayReadableSummary
} from '@/components/assistant';

// Smart Alert Banner
import { AlertSummaryBanner } from '@/components/alerts';

// Emergency Protection
import { EmergencyProtectionBanner } from '@/components/emergency/EmergencyProtectionBanner';
import { SetupReminderBanner } from '@/components/setup/SetupReminderBanner';
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

        {/* ============ SETUP REMINDER ============ */}
        <SetupReminderBanner />

        {/* ============ EMERGENCY PROTECTION BANNER ============ */}
        <EmergencyProtectionBanner />

        {/* ============ ALERT SUMMARY BANNER ============ */}
        <AlertSummaryBanner />

        {/* ============ 1. HERO STATUS (Largest element) ============ */}
        <div className="mb-3">
          <IndustrialHeroStatus />
        </div>


        {/* ============ 3. CORE METRICS ROW (3 items only) ============ */}
        <div className="mb-3">
          <CoreMetricsRow />
        </div>



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
              {/* Device Online/Offline Status */}
              <DeviceConnectionStatus deviceHealth={deviceHealth} language={language} />

              {/* Key Sensor Readings */}
              <div className="grid grid-cols-2 gap-3">
                <SensorCard type="temperature" value={sensorData.temperature} unit={translations.units.celsius[language]} label={translations.sensors.temperature[language]} status={statusLevels.temperature} />
                <SensorCard type="humidity" value={sensorData.humidity} unit={translations.units.percent[language]} label={translations.sensors.humidity[language]} status={statusLevels.humidity} />
                <SensorCard type="ammonia" value={sensorData.ammonia} unit={translations.units.ppm[language]} label={translations.sensors.ammonia[language]} status={statusLevels.ammonia} />
                <SensorCard type="water" value={sensorData.waterUsage} unit={translations.units.litersPerHour[language]} label={translations.sensors.water[language]} status={statusLevels.water} />
              </div>

              {/* Weather */}
              <WeatherCard />

              {/* Current Action + Advisory side by side */}
              <div className="grid grid-cols-2 gap-3">
                <CurrentActionPanel />
                <AdvisoryAssistant />
              </div>
              
              {/* System Activity */}
              <SystemActivityCard />

              {/* Today Summary */}
              <TodayReadableSummary />

              {/* Panic Prevention Strip */}
              <div className="rounded-xl bg-primary/5 border border-primary/20 px-4 py-2 text-center">
                <p className="text-xs font-medium text-primary">
                  {language === 'bn' 
                    ? '🤖 অটোমেশন সিস্টেম আপনার খামার পর্যবেক্ষণ করছে'
                    : '🤖 Automation system is monitoring your farm'}
                </p>
              </div>
            </TabsContent>
            
            {/* TAB: Details (Technical/Graphs) */}
            <TabsContent value="details" className="mt-4 space-y-6">
              
              {/* ── GROUP 1: পরিবেশ (Environment) ── */}
              <section>
                <h3 className="text-sm font-bold text-muted-foreground mb-3 flex items-center gap-2">
                  🌡️ {language === 'bn' ? 'পরিবেশ পরিস্থিতি' : 'Environment'}
                </h3>
                <div className="space-y-3">
                  <ComfortIndicators />
                  <InsideOutsideDeltaCard />
                  <div className="grid grid-cols-2 gap-3">
                    <SensorCard type="temperature" value={sensorData.temperature} unit={translations.units.celsius[language]} label={translations.sensors.temperature[language]} status={statusLevels.temperature} />
                    <SensorCard type="humidity" value={sensorData.humidity} unit={translations.units.percent[language]} label={translations.sensors.humidity[language]} status={statusLevels.humidity} />
                    <SensorCard type="ammonia" value={sensorData.ammonia} unit={translations.units.ppm[language]} label={translations.sensors.ammonia[language]} status={statusLevels.ammonia} />
                    <SensorCard type="water" value={sensorData.waterUsage} unit={translations.units.litersPerHour[language]} label={translations.sensors.water[language]} status={statusLevels.water} />
                  </div>
                  <SensorCharts />
                </div>
              </section>

              {/* ── GROUP 2: অটোমেশন ও সেফটি ── */}
              <section>
                <h3 className="text-sm font-bold text-muted-foreground mb-3 flex items-center gap-2">
                  ⚙️ {language === 'bn' ? 'অটোমেশন ও সেফটি' : 'Automation & Safety'}
                </h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <HeatStressStatusCard hsiResult={hsiResult} temperature={sensorData.temperature} humidity={sensorData.humidity} />
                    <SystemModeCard />
                  </div>
                  <AutomationStatusCard />
                  
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
                      <FanSpeedCard temperature={sensorData.temperature} fanSpeed={fanSpeedResult?.speed || 'OFF'} message={fanSpeedResult?.message[language] || (language === 'bn' ? 'অপেক্ষা করুন...' : 'Loading...')} />
                      <HeatStressCard hsiResult={hsiResult} temperature={sensorData.temperature} humidity={sensorData.humidity} />
                    </>
                  )}
                </div>
              </section>

              {/* ── GROUP 3: সতর্কতা ও ট্রেন্ড ── */}
              <section>
                <h3 className="text-sm font-bold text-muted-foreground mb-3 flex items-center gap-2">
                  📈 {language === 'bn' ? 'ট্রেন্ড ও সতর্কতা' : 'Trends & Alerts'}
                </h3>
                <div className="space-y-3">
                  <AmmoniaTrendCard result={ammoniaTrendResult} />
                  <CoolingEfficiencyCard result={coolingEfficiencyResult} />
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
                  {isLayer && <HeatStressRiskCard result={heatStressRiskResult} />}
                </div>
              </section>

              {/* ── GROUP 4: ডিভাইস ও সিস্টেম ── */}
              <section>
                <h3 className="text-sm font-bold text-muted-foreground mb-3 flex items-center gap-2">
                  🔧 {language === 'bn' ? 'ডিভাইস ও সিস্টেম' : 'Device & System'}
                </h3>
                <div className="space-y-3">
                  <SensorHealthCard />
                  <PowerOutageCard />
                </div>
              </section>
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
