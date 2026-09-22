import { useState, useCallback, lazy, Suspense } from 'react';
import { LayoutGroup } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';

import { useRealtimeSensorData, useRealtimeAlerts } from '@/hooks/useRealtimeSensorData';
import { useAmmoniaTrendDetection } from '@/hooks/useAmmoniaTrendDetection';
import { useHeatStressRiskPrediction } from '@/hooks/useHeatStressRiskPrediction';
import { useFoggerCooling } from '@/hooks/useFoggerCooling';
import { useCoolingEfficiency } from '@/hooks/useCoolingEfficiency';

import { Header } from '@/components/Header';
import { DashboardSnapshotBar } from '@/components/dashboard/DashboardSnapshotBar';
import { IndustrialKpiGrid } from '@/components/dashboard/IndustrialKpiGrid';
import { PendingInvitationsBanner } from '@/components/PendingInvitationsBanner';
import { BottomNav } from '@/components/BottomNav';
import { ShedSelector } from '@/components/shed/ShedSelector';
import { ShedManagementSheet } from '@/components/shed/ShedManagementSheet';

import { WeatherCard } from '@/components/weather/WeatherCard';

// SensorCharts is recharts-heavy and lives on the (non-default) Environment tab — lazy-load it
const SensorCharts = lazy(() =>
  import('@/components/dashboard/SensorCharts').then(m => ({ default: m.SensorCharts }))
);

import { AmmoniaTrendCard } from '@/components/dashboard/AmmoniaTrendCard';
import { HeatStressRiskCard } from '@/components/dashboard/HeatStressRiskCard';
import { CoolingEfficiencyCard } from '@/components/dashboard/CoolingEfficiencyCard';
import { InsideOutsideDeltaCard } from '@/components/dashboard/InsideOutsideDeltaCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Industrial Dashboard Components
import { EspConnectionBanner } from '@/components/dashboard/EspConnectionBanner';
import { FailedCommandsBanner } from '@/components/control/FailedCommandsBanner';
import { LightSensorCard } from '@/components/dashboard/LightSensorCard';
import { AirQualityCard } from '@/components/dashboard/AirQualityCard';
import { DeviceStatusSummary } from '@/components/dashboard/DeviceStatusSummary';


// Farmer-Friendly Assistant Components
import {
  ComfortIndicators, QuickControlFAB,
  TodayReadableSummary, FarmHealthScore,
  HourlyForecastCard
} from '@/components/assistant';
// Lazy-load below-the-fold SystemActivityCard — paints Summary tab faster
const SystemActivityCard = lazy(() =>
  import('@/components/assistant/SystemActivityCard').then(m => ({ default: m.SystemActivityCard }))
);

import { SevenDayForecastCard } from '@/components/assistant/SevenDayForecastCard';

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
} from '@/components/dashboard/TabSkeletons';

import { DashboardSnapshotProvider } from '@/context/DashboardSnapshotContext';
export function Dashboard() {
  const { language } = useAuth();
  const { sensorData } = useRealtimeSensorData();

  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>('summary');

  // Tab → query keys map: refetch relevant data when user switches tabs
  const TAB_QUERY_KEYS: Record<string, string[]> = {
    summary: ['device_health', 'today-summary', 'farm-health-score', 'weather_cache', 'flock-info', 'sensor_history', 'device_status'],
    environment: ['weather_cache', 'inside_outside_delta', 'heat-risk', 'ammonia-trend'],
  };



  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
    const keys = TAB_QUERY_KEYS[value] || [];
    keys.forEach((key) => {
      queryClient.refetchQueries({ queryKey: [key], type: 'active', stale: true });
    });
  }, [queryClient]);

  // Subscribe to realtime alerts
  useRealtimeAlerts();

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
      <DashboardSnapshotBar />

      <main className="page-container px-4">
        {/* ============ SHED SELECTOR ============ */}
        <div className="flex items-center gap-2 mb-3">
          <ShedSelector />
          <ShedManagementSheet />
        </div>

        {/* ============ 🔝 STICKY CRITICAL ZONE (always visible) ============ */}
        {/* S6.3 — aria-live so SR users hear new banners (alerts, failed commands)
            without having to navigate back to the top of the page. */}
        <section
          className="mb-3 space-y-1.5"
          aria-label={language === 'bn' ? 'গুরুত্বপূর্ণ তথ্য' : 'Critical information'}
          aria-live="polite"
        >
          {/* Org invitations awaiting response */}
          <PendingInvitationsBanner />
          {/* Setup / Manual / Emergency / Alert / Failed-command banners */}
          <SetupReminderBanner />
          <ManualModeWarningBanner />
          <FailedCommandsBanner />
          {/* Mobile: stack vertically. sm+: side-by-side 50/50 (or full-width if one).
              LayoutGroup → siblings smoothly slide-reflow when one mounts/unmounts.
              Each banner owns its own AnimatePresence for crossfade enter/exit. */}
          <LayoutGroup>
            <div className="flex flex-col gap-2 sm:grid sm:grid-flow-col sm:auto-cols-fr [&>*]:min-w-0">
              <EmergencyProtectionBanner />
              <AlertSummaryBanner />
            </div>
          </LayoutGroup>

          {/* Industrial KPI grid — 4 critical sensors at-a-glance (above-the-fold) */}
          <IndustrialKpiGrid />
        </section>

        {/* ============ 🗂️ MAIN TABS (2 sections) ============ */}
        <div className="mb-5">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <div className="sticky top-[calc(env(safe-area-inset-top)+56px)] z-30 -mx-4 px-4 py-2.5 bg-background/95 supports-[backdrop-filter]:bg-background/80 backdrop-blur-md border-b border-border/40 shadow-sm">
            <TabsList className="w-full grid grid-cols-2 h-12 rounded-2xl bg-muted/50 p-1 border border-border/50 gap-1">
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
            </TabsList>
            </div>

            {/* TAB 1: 🏠 সারসংক্ষেপ */}
            <TabsContent value="summary" className="mt-3 space-y-3">
              <TabLoadingWrapper
                queryKeys={TAB_QUERY_KEYS.summary}
                skeleton={<SummaryTabSkeleton />}
                loadingHint={{ bn: 'সারসংক্ষেপ লোড হচ্ছে…', en: 'Loading summary…' }}
              >
                {/* Connection: only the offline banner here (auto-hides when online).
                    Detailed device + signal info lives in Control → Device & System. */}
                <EspConnectionBanner />
                <FarmHealthScore />
                <InsideOutsideDeltaCard />
                <DeviceStatusSummary />
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    📈 {language === 'bn' ? 'সেন্সর ট্রেন্ড' : 'Sensor Trends'}
                  </p>
                  <Suspense fallback={<div className="h-48 rounded-xl bg-muted/40 animate-pulse" />}>
                    <SensorCharts />
                  </Suspense>
                </div>
                <TodayReadableSummary />
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    ⚡ {language === 'bn' ? 'আজকের কার্যক্রম' : "Today's Activity"}
                  </p>
                  <Suspense fallback={<div className="h-32 rounded-xl bg-muted/40 animate-pulse" />}>
                    <SystemActivityCard />
                  </Suspense>
                </div>
              </TabLoadingWrapper>

            </TabsContent>

            {/* TAB 2: 🌡️ পরিবেশ */}
            <TabsContent value="environment" className="mt-3 space-y-3">
              <TabLoadingWrapper
                queryKeys={TAB_QUERY_KEYS.environment}
                skeleton={<EnvironmentTabSkeleton />}
                loadingHint={{ bn: 'সেন্সর ও পরিবেশ ডেটা লোড হচ্ছে…', en: 'Loading environment data…' }}
              >
                {/* Weather + heat-stress prediction unified — both are outdoor/forecast context */}
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    🌤️ {language === 'bn' ? 'আবহাওয়া ও পূর্বাভাস' : 'Weather & Forecast'}
                  </p>
                  <div className="space-y-3">
                    <WeatherCard />
                    <HourlyForecastCard />
                    <SevenDayForecastCard />
                    <HeatStressRiskCard result={heatStressRiskResult} />
                  </div>
                </div>

                <ComfortIndicators />

                {/* Sensors moved here from Control → Lighting (they measure environment) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <AirQualityCard />
                  <LightSensorCard />
                </div>

                <AmmoniaTrendCard result={ammoniaTrendResult} />
                <CoolingEfficiencyCard result={coolingEfficiencyResult} />
              </TabLoadingWrapper>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Quick Control FAB */}
      <QuickControlFAB />

      <BottomNav />
    </div>
    </DashboardSnapshotProvider>
  );
}
