import { useAuth } from '@/context/AuthContext';

import { useAutomationMode } from '@/hooks/useAutomationMode';
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

import { SensorCharts } from '@/components/dashboard/SensorCharts';

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
import { LightSensorCard } from '@/components/dashboard/LightSensorCard';
import { SensorFreshnessBadge } from '@/components/dashboard/SensorFreshnessBadge';
import { DeviceConnectionStatus } from '@/components/dashboard/DeviceConnectionStatus';
import { LightStatusPanel } from '@/components/lighting/LightStatusPanel';
import { LightActionHistory } from '@/components/lighting/LightActionHistory';

// Farmer-Friendly Assistant Components
import { 
  ComfortIndicators, AdvisoryAssistant, QuickControlFAB,
  SystemActivityCard, TodayReadableSummary, FarmHealthScore,
  HourlyForecastCard
} from '@/components/assistant';
import { QuickSensorDisplay } from '@/components/assistant/QuickSensorDisplay';
import { LayerBatchCard } from '@/components/farm/LayerBatchCard';
import { BroilerDashboardWidget } from '@/components/broiler/BroilerDashboardWidget';

// Smart Alert Banner
import { AlertSummaryBanner } from '@/components/alerts';

// Emergency Protection
import { EmergencyProtectionBanner } from '@/components/emergency/EmergencyProtectionBanner';
import { SetupReminderBanner } from '@/components/setup/SetupReminderBanner';
import { ManualModeWarningBanner } from '@/components/dashboard/ManualModeWarningBanner';
export function Dashboard() {
  const { language } = useAuth();
  const { sensorData, isConnected, hasRealData } = useRealtimeSensorData();
  const statusLevels = useRealtimeStatusLevels(sensorData);
  const { status: deviceStatus, manualOverride } = useRealtimeDeviceStatus();
  
  const { data: automationMode } = useAutomationMode();
  const isManualMode = automationMode === 'MANUAL';
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

        {/* ============ 🔝 STICKY CRITICAL ZONE (always visible) ============ */}
        <div className="sticky top-0 z-20 -mx-4 px-4 py-2 bg-background/95 backdrop-blur-md border-b border-border/40 mb-3 space-y-2">
          {/* Setup / Manual / Emergency / Alert banners */}
          <SetupReminderBanner />
          <ManualModeWarningBanner />
          <EmergencyProtectionBanner />
          <AlertSummaryBanner />

          {/* Quick sensor strip — temp / humidity / ammonia */}
          <QuickSensorDisplay />

          {/* Farm Health Score */}
          <FarmHealthScore />
        </div>

        {/* ============ 🗂️ MAIN TABS (4 sections) ============ */}
        <div className="mb-5">
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="w-full grid grid-cols-4 h-12 rounded-2xl bg-muted/50 p-1 border border-border/50 gap-1">
              <TabsTrigger 
                value="summary" 
                className="rounded-xl text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md flex flex-col gap-0.5 h-full"
              >
                <span className="text-base leading-none">🏠</span>
                <span className="leading-none">{language === 'bn' ? 'সারসংক্ষেপ' : 'Summary'}</span>
              </TabsTrigger>
              <TabsTrigger 
                value="environment" 
                className="rounded-xl text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md flex flex-col gap-0.5 h-full"
              >
                <span className="text-base leading-none">🌡️</span>
                <span className="leading-none">{language === 'bn' ? 'পরিবেশ' : 'Env'}</span>
              </TabsTrigger>
              <TabsTrigger 
                value="control" 
                className="rounded-xl text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md flex flex-col gap-0.5 h-full"
              >
                <span className="text-base leading-none">⚡</span>
                <span className="leading-none">{language === 'bn' ? 'নিয়ন্ত্রণ' : 'Control'}</span>
              </TabsTrigger>
              <TabsTrigger 
                value="flock" 
                className="rounded-xl text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md flex flex-col gap-0.5 h-full"
              >
                <span className="text-base leading-none">🐔</span>
                <span className="leading-none">{language === 'bn' ? 'ফ্লক' : 'Flock'}</span>
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: 🏠 সারসংক্ষেপ */}
            <TabsContent value="summary" className="mt-3 space-y-3">
              <DeviceConnectionStatus deviceHealth={deviceHealth} language={language} />
              <IndustrialHeroStatus />
              <ComfortIndicators />
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  🌤️ {language === 'bn' ? 'আবহাওয়া' : 'Weather'}
                </p>
                <WeatherCard />
              </div>
              <TodayReadableSummary />
            </TabsContent>

            {/* TAB 2: 🌡️ পরিবেশ */}
            <TabsContent value="environment" className="mt-3 space-y-3">
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    📡 {language === 'bn' ? 'লাইভ সেন্সর' : 'Live Sensors'}
                  </p>
                  <SensorFreshnessBadge timestamp={sensorData.timestamp} compact />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <SensorCard type="temperature" value={sensorData.temperature} unit={translations.units.celsius[language]} label={translations.sensors.temperature[language]} status={statusLevels.temperature} />
                  <SensorCard type="humidity" value={sensorData.humidity} unit={translations.units.percent[language]} label={translations.sensors.humidity[language]} status={statusLevels.humidity} />
                  <SensorCard type="ammonia" value={sensorData.ammonia} unit={translations.units.ppm[language]} label={translations.sensors.ammonia[language]} status={statusLevels.ammonia} />
                  <SensorCard type="water" value={sensorData.waterUsage} unit={translations.units.litersPerHour[language]} label={translations.sensors.water[language]} status={statusLevels.water} />
                </div>
              </div>
              <CoreMetricsRow />
              <InsideOutsideDeltaCard />
              <SensorCharts />
              <HourlyForecastCard />
              <AmmoniaTrendCard result={ammoniaTrendResult} />
              <CoolingEfficiencyCard result={coolingEfficiencyResult} />
              {isLayer && <HeatStressRiskCard result={heatStressRiskResult} />}
            </TabsContent>

            {/* TAB 3: ⚡ নিয়ন্ত্রণ ও অটোমেশন */}
            <TabsContent value="control" className="mt-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <CurrentActionPanel />
                <AdvisoryAssistant />
              </div>

              <LightStatusPanel />
              <LightActionHistory />
              <LightSensorCard />

              <section>
                <h3 className="text-sm font-bold text-muted-foreground mb-2 flex items-center gap-2">
                  {isManualMode ? '✋' : '⚙️'} {language === 'bn' 
                    ? (isManualMode ? 'সিস্টেম স্ট্যাটাস' : 'অটোমেশন ও সেফটি') 
                    : (isManualMode ? 'System Status' : 'Automation & Safety')}
                </h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {!isManualMode && <HeatStressStatusCard hsiResult={hsiResult} temperature={sensorData.temperature} humidity={sensorData.humidity} />}
                    <SystemModeCard />
                  </div>
                  {!isManualMode && <AutomationStatusCard />}

                  {isBroiler && (
                    <>
                      {!isManualMode && <BroilerAgeAutoModeCard enabled={true} />}
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

                  {isLayer && !isManualMode && (
                    <FanSpeedCard temperature={sensorData.temperature} fanSpeed={fanSpeedResult?.speed || 'OFF'} message={fanSpeedResult?.message[language] || (language === 'bn' ? 'অপেক্ষা করুন...' : 'Loading...')} />
                  )}
                </div>
              </section>

              <section>
                <h3 className="text-sm font-bold text-muted-foreground mb-2 flex items-center gap-2">
                  🔧 {language === 'bn' ? 'ডিভাইস ও সিস্টেম' : 'Device & System'}
                </h3>
                <div className="space-y-3">
                  <SensorHealthCard />
                  <PowerOutageCard />
                </div>
              </section>

              <div className={`rounded-xl border px-4 py-2 text-center ${
                isManualMode
                  ? 'bg-amber-500/10 border-amber-500/20'
                  : 'bg-primary/5 border-primary/20'
              }`}>
                <p className={`text-xs font-medium ${isManualMode ? 'text-amber-700 dark:text-amber-400' : 'text-primary'}`}>
                  {isManualMode
                    ? (language === 'bn' 
                        ? '✋ ম্যানুয়াল মোড — আপনি ডিভাইস নিয়ন্ত্রণ করছেন (সেফটি সক্রিয়)'
                        : '✋ Manual Mode — You control devices (Safety active)')
                    : (language === 'bn' 
                        ? '🤖 অটোমেশন সিস্টেম আপনার খামার পর্যবেক্ষণ করছে'
                        : '🤖 Automation system is monitoring your farm')
                  }
                </p>
              </div>
            </TabsContent>

            {/* TAB 4: 🐔 ফ্লক / ব্যাচ */}
            <TabsContent value="flock" className="mt-3 space-y-3">
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  ⚡ {language === 'bn' ? 'আজকের কার্যক্রম' : "Today's Activity"}
                </p>
                <SystemActivityCard />
              </div>

              {isLayer && <LayerBatchCard />}
              {isBroiler && <BroilerDashboardWidget onBatchClick={() => {}} onWeightClick={() => {}} onFeedClick={() => {}} />}

              {isLayer && layerWaterAnomalyResult && <WaterAnomalyCard result={layerWaterAnomalyResult} />}
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
