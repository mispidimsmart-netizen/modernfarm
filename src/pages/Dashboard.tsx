import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
import { SafetyEngineStatusCard } from '@/components/dashboard/SafetyEngineStatusCard';
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
import { EspConnectionBanner } from '@/components/dashboard/EspConnectionBanner';
import { CurrentActionPanel } from '@/components/dashboard/CurrentActionPanel';
import { CoreMetricsRow } from '@/components/dashboard/CoreMetricsRow';
import { LightSensorCard } from '@/components/dashboard/LightSensorCard';
import { SensorFreshnessBadge } from '@/components/dashboard/SensorFreshnessBadge';
import { DeviceConnectionStatus } from '@/components/dashboard/DeviceConnectionStatus';
import { ConnectionQualityCard } from '@/components/control/ConnectionQualityCard';
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
import { TabLoadingWrapper } from '@/components/dashboard/TabLoadingWrapper';
import {
  SummaryTabSkeleton,
  EnvironmentTabSkeleton,
  ControlTabSkeleton,
  FlockTabSkeleton,
  SystemStatusCardsSkeleton,
} from '@/components/dashboard/TabSkeletons';
import { useIsFetching } from '@tanstack/react-query';
import { DashboardSnapshotProvider } from '@/context/DashboardSnapshotContext';
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
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>('summary');

  // Tab → query keys map: refetch relevant data when user switches tabs
  const TAB_QUERY_KEYS: Record<string, string[]> = {
    summary: ['device_health', 'today-summary', 'farm-health-score', 'weather_cache', 'flock-info'],
    environment: ['sensor_history', 'weather_cache', 'inside_outside_delta', 'heat-risk', 'ammonia-trend'],
    control: ['device_health', 'automation-status', 'safety_status', 'light-status', 'light-action-history', 'power-outages', 'sensor-health'],
    flock: ['today-summary', 'layer-batch-active', 'layer-batches', 'broiler-batch-active', 'broiler-batches', 'water-anomaly', 'flock-info'],
  };

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
    // Show cached data instantly. Only background-refetch queries that are
    // already stale — never force a full reload that triggers Skeletons.
    const keys = TAB_QUERY_KEYS[value] || [];
    keys.forEach((key) => {
      queryClient.refetchQueries({
        queryKey: [key],
        type: 'active',
        stale: true,
      });
    });
  }, [queryClient]);

  // Track fetching state for System Status section cards (consistent skeleton on update)
  const systemStatusFetching = useIsFetching({
    predicate: (q) => {
      const k = q.queryKey?.[0];
      return typeof k === 'string' && [
        'automation-status',
        'safety_status',
        'device_health',
        'broiler-batch-active',
        'broiler-environment',
        'heat-stress',
        'fan-speed',
      ].includes(k);
    },
  });

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
    <DashboardSnapshotProvider>
    <div className="min-h-screen bg-background">
      <Header />

      <main className="page-container px-4">
        {/* ============ SHED SELECTOR ============ */}
        <div className="flex items-center gap-2 mb-3">
          <ShedSelector />
          <ShedManagementSheet />
        </div>

        {/* ============ 🔝 STICKY CRITICAL ZONE (always visible) ============ */}
        <div className="mb-3 space-y-2">
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
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <div className="sticky top-[calc(env(safe-area-inset-top)+56px)] z-30 -mx-4 px-4 py-2.5 bg-background/95 supports-[backdrop-filter]:bg-background/80 backdrop-blur-md border-b border-border/40 shadow-sm">
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
            </div>

            {/* TAB 1: 🏠 সারসংক্ষেপ */}
            <TabsContent value="summary" className="mt-3 space-y-3">
              <TabLoadingWrapper
                queryKeys={TAB_QUERY_KEYS.summary}
                skeleton={<SummaryTabSkeleton />}
                loadingHint={{ bn: 'সারসংক্ষেপ লোড হচ্ছে…', en: 'Loading summary…' }}
              >
                <DeviceConnectionStatus deviceHealth={deviceHealth} language={language} />
                <ConnectionQualityCard />
                <EspConnectionBanner />
                <IndustrialHeroStatus />
                <ComfortIndicators />
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    🌤️ {language === 'bn' ? 'আবহাওয়া' : 'Weather'}
                  </p>
                  <WeatherCard />
                </div>
                <TodayReadableSummary />
              </TabLoadingWrapper>
            </TabsContent>

            {/* TAB 2: 🌡️ পরিবেশ */}
            <TabsContent value="environment" className="mt-3 space-y-3">
              <TabLoadingWrapper
                queryKeys={TAB_QUERY_KEYS.environment}
                skeleton={<EnvironmentTabSkeleton />}
                loadingHint={{ bn: 'সেন্সর ও পরিবেশ ডেটা লোড হচ্ছে…', en: 'Loading environment data…' }}
              >
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      📡 {language === 'bn' ? 'লাইভ সেন্সর' : 'Live Sensors'}
                    </p>
                    <SensorFreshnessBadge timestamp={sensorData.timestamp} compact />
                  </div>
                  {hasRealData ? (
                    <div className="grid grid-cols-2 gap-2.5">
                      <SensorCard type="temperature" value={sensorData.temperature} unit={translations.units.celsius[language]} label={translations.sensors.temperature[language]} status={statusLevels.temperature} />
                      <SensorCard type="humidity" value={sensorData.humidity} unit={translations.units.percent[language]} label={translations.sensors.humidity[language]} status={statusLevels.humidity} />
                      <SensorCard type="ammonia" value={sensorData.ammonia} unit={translations.units.ppm[language]} label={translations.sensors.ammonia[language]} status={statusLevels.ammonia} />
                      <SensorCard type="water" value={sensorData.waterUsage} unit={translations.units.litersPerHour[language]} label={translations.sensors.water[language]} status={statusLevels.water} />
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center">
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        📡 {language === 'bn' ? 'কোনো লাইভ সেন্সর ডেটা নেই' : 'No live sensor data'}
                      </p>
                      <p className="text-xs text-muted-foreground/80">
                        {language === 'bn'
                          ? 'ESP32 ডিভাইস কানেক্ট হলে এখানে রিয়েল-টাইম ডেটা দেখানো হবে'
                          : 'Real-time data will appear here once your ESP32 connects'}
                      </p>
                    </div>
                  )}
                </div>
                <CoreMetricsRow />
                <InsideOutsideDeltaCard />
                <SensorCharts />
                <HourlyForecastCard />
                <AmmoniaTrendCard result={ammoniaTrendResult} />
                <CoolingEfficiencyCard result={coolingEfficiencyResult} />
                {isLayer && <HeatStressRiskCard result={heatStressRiskResult} />}
              </TabLoadingWrapper>
            </TabsContent>

            {/* TAB 3: ⚡ নিয়ন্ত্রণ ও অটোমেশন */}
            <TabsContent value="control" className="mt-3 space-y-3">
              <TabLoadingWrapper
                queryKeys={TAB_QUERY_KEYS.control}
                skeleton={<ControlTabSkeleton />}
                loadingHint={{ bn: 'নিয়ন্ত্রণ ও অটোমেশন স্ট্যাটাস লোড হচ্ছে…', en: 'Loading controls & automation…' }}
              >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="min-w-0"><CurrentActionPanel /></div>
                <div className="min-w-0"><AdvisoryAssistant /></div>
              </div>

              <LightStatusPanel />
              <LightActionHistory />
              <LightSensorCard />

              <section className="min-w-0">
                <h3 className="text-sm font-bold text-muted-foreground mb-2 flex items-center gap-2">
                  {isManualMode ? '✋' : '⚙️'} {language === 'bn'
                    ? (isManualMode ? 'সিস্টেম স্ট্যাটাস' : 'অটোমেশন ও সেফটি')
                    : (isManualMode ? 'System Status' : 'Automation & Safety')}
                </h3>
                <div className="space-y-3">
                  {systemStatusFetching > 0 ? (
                    <SystemStatusCardsSkeleton
                      showHeatStress={!isManualMode}
                      showAutomation={!isManualMode}
                      showBroiler={isBroiler}
                      showFanSpeed={isLayer && !isManualMode}
                    />
                  ) : (
                    <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {!isManualMode && (
                      <div className="min-w-0">
                        <HeatStressStatusCard hsiResult={hsiResult} temperature={sensorData.temperature} humidity={sensorData.humidity} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <SystemModeCard />
                    </div>
                    <div className="min-w-0">
                      <SafetyEngineStatusCard />
                    </div>
                  </div>
                  {!isManualMode && (
                    <div className="min-w-0">
                      <AutomationStatusCard />
                    </div>
                  )}

                  {isBroiler && (
                    <div className="space-y-3 min-w-0">
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
                    </div>
                  )}

                  {isLayer && !isManualMode && (
                    <div className="min-w-0">
                      <FanSpeedCard temperature={sensorData.temperature} fanSpeed={fanSpeedResult?.speed || 'OFF'} message={fanSpeedResult?.message[language] || (language === 'bn' ? 'অপেক্ষা করুন...' : 'Loading...')} />
                    </div>
                  )}
                    </>
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
              </TabLoadingWrapper>
            </TabsContent>

            {/* TAB 4: 🐔 ফ্লক / ব্যাচ */}
            <TabsContent value="flock" className="mt-3 space-y-3">
              <TabLoadingWrapper
                queryKeys={TAB_QUERY_KEYS.flock}
                isEmpty={!isLayer && !isBroiler}
                emptyIcon="🐔"
                emptyTitle={{ bn: 'কোনো সক্রিয় ব্যাচ নেই', en: 'No active batch' }}
                emptyHint={{
                  bn: 'একটি লেয়ার বা ব্রয়লার ব্যাচ যোগ করলে এখানে তথ্য দেখা যাবে',
                  en: 'Add a layer or broiler batch to see flock data here',
                }}
                skeleton={<FlockTabSkeleton />}
                loadingHint={{ bn: 'ব্যাচ ও ফ্লক তথ্য লোড হচ্ছে…', en: 'Loading flock & batch info…' }}
              >
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
              </TabLoadingWrapper>
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
