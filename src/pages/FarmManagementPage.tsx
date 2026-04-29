import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, BarChart3, Calendar, ChevronRight, Layers, Info, ChevronDown, Plus, PackageOpen } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useFarmSummary } from '@/hooks/useFarmManagement';
import { useFarmType } from '@/hooks/useFarmType';
import { useActiveLayerBatch } from '@/hooks/useLayerBatch';
import { useActiveBatch as useActiveBroilerBatch } from '@/hooks/useBroilerData';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EggProductionSheet } from '@/components/farm/EggProductionSheet';
import { FeedManagementSheet } from '@/components/farm/FeedManagementSheet';
import { HealthSheet } from '@/components/farm/HealthSheet';
import { FinanceSheet } from '@/components/farm/FinanceSheet';
import { LayerBatchCard } from '@/components/farm/LayerBatchCard';
import { FarmSummaryCards } from '@/components/dashboard/FarmSummaryCards';
import { EggCorrelationCard } from '@/components/analytics/EggCorrelationCard';
import { QuickActionFAB } from '@/components/farm/QuickActionFAB';
import { TodayStatusBanner } from '@/components/farm/TodayStatusBanner';
import { FarmInputCards } from '@/components/farm/FarmInputCards';
import { FarmStatsHeader } from '@/components/farm/FarmStatsHeader';
import { ScheduleSheet } from '@/components/schedule/ScheduleSheet';
import { RecentEntryHistory } from '@/components/farm/RecentEntryHistory';
import { MortalityTrendChart } from '@/components/farm/MortalityTrendChart';
import { DailyExpenseSummary } from '@/components/farm/DailyExpenseSummary';
import { FinanceSummaryRange } from '@/components/farm/FinanceSummaryRange';
import { DataExportButton } from '@/components/farm/DataExportButton';
import { CostAnalyticsDashboard } from '@/components/analytics/CostAnalyticsDashboard';
import { FarmPerformanceView } from '@/components/analytics/FarmPerformanceView';
import { ReportRangePicker, type ReportRangeValue } from '@/components/farm/ReportRangePicker';
// Broiler components
import { BroilerDashboardWidget } from '@/components/broiler/BroilerDashboardWidget';
import { BroilerBatchSheet } from '@/components/broiler/BroilerBatchSheet';
import { BroilerWeightSheet } from '@/components/broiler/BroilerWeightSheet';
import { BroilerFeedSheet } from '@/components/broiler/BroilerFeedSheet';

export function FarmManagementPage() {
  const { language } = useAuth();
  const summary = useFarmSummary();
  const { isLayer, isBroiler } = useFarmType();
  const { data: activeLayerBatch } = useActiveLayerBatch();
  const { data: activeBroilerBatch } = useActiveBroilerBatch();
  const hasActiveBatch = !!(activeLayerBatch || activeBroilerBatch);

  const [activeSheet, setActiveSheet] = useState<'egg' | 'feed' | 'mortality' | 'medicine' | 'finance' | 'schedule' | 'batch' | 'weight' | 'broiler-feed' | null>(null);
  const [activeTab, setActiveTab] = useState<'batch' | 'input' | 'report'>('batch');
  const [batchSectionOpen, setBatchSectionOpen] = useState(false);
  const [summarySectionOpen, setSummarySectionOpen] = useState(true);
  const [analysisSectionOpen, setAnalysisSectionOpen] = useState(true);
  const [costDetailOpen, setCostDetailOpen] = useState(false);
  const [reportRange, setReportRange] = useState<ReportRangeValue>({ days: 30 });
  const reportDays = Math.max(1, Math.min(reportRange.days, 365));

  // Auto-open batch management section when an active batch is detected
  useEffect(() => {
    if (hasActiveBatch) setBatchSectionOpen(true);
  }, [hasActiveBatch]);

  // Handle broiler-specific actions
  const handleBroilerAction = (action: 'batch' | 'weight' | 'broiler-feed') => {
    setActiveSheet(action);
  };

  const t = {
    title: { bn: '🏠 ফার্ম ম্যানেজমেন্ট', en: '🏠 Farm Management' },
    input: { bn: '✏️ এন্ট্রি', en: '✏️ Entry' },
    batch: { bn: '🐔 ব্যাচ', en: '🐔 Batch' },
    report: { bn: '📊 রিপোর্ট', en: '📊 Report' },
    analysis: { bn: '📈 বিশ্লেষণ', en: '📈 Analysis' },
    summarySection: { bn: '📊 আজকের সারাংশ', en: "📊 Today's Summary" },
    analysisSection: { bn: '📈 ট্রেন্ড ও বিশ্লেষণ', en: '📈 Trends & Analysis' },
    summarySubtitle: { bn: 'আজকের পরিসংখ্যান ও খরচ', en: "Today's stats & expenses" },
    analysisSubtitle: { bn: 'পারফরম্যান্স, খরচ ও ট্রেন্ড চার্ট', en: 'Performance, cost & trend charts' },
    productionRate: { bn: 'উৎপাদন হার', en: 'Production Rate' },
    quickTip: { bn: '💡 দ্রুত টিপ: নিচের + বাটন দিয়েও এন্ট্রি করতে পারবেন', en: '💡 Quick tip: Use the + button below for quick entry' },
    batchHeading: { bn: 'ব্যাচ ব্যবস্থাপনা', en: 'Batch Management' },
    batchSubtitle: {
      bn: 'চলমান ব্যাচ দেখুন, নতুন ব্যাচ শুরু করুন বা সমাপ্ত করুন',
      en: 'View active batch, start new, or end batch',
    },
  };

  const handleQuickAction = (action: import('@/components/farm/FarmInputCards').EntryActionKey) => {
    // Medicine → unified Health sheet
    if (action === 'medicine') {
      setActiveSheet('medicine');
      return;
    }
    // Mortality → unified Health sheet (opens to mortality tab)
    if (action === 'mortality') {
      setActiveSheet('mortality');
      return;
    }
    // Feed Stock → FeedManagementSheet (Stock tab)
    if (action === 'feed-stock') {
      setActiveSheet('feed');
      return;
    }
    setActiveSheet(action as any);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="page-container px-4 pb-36">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Title */}
          <h2 className="text-xl font-bold">{t.title[language]}</h2>

          {/* Today's Status Banner */}
          <TodayStatusBanner />

          {/* Stats Header */}
          <FarmStatsHeader onFlockClick={() => setActiveTab('batch')} />

          {/* Tabbed Interface - 3 tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
            <TabsList className="w-full grid grid-cols-3 h-12 rounded-2xl bg-gradient-to-r from-muted/60 to-muted/40 p-1.5 gap-1 border border-border/50 shadow-sm">
              <TabsTrigger
                value="batch"
                className="rounded-xl text-xs font-semibold text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:ring-1 data-[state=active]:ring-primary/20 transition-all duration-200"
              >
                {t.batch[language]}
              </TabsTrigger>
              <TabsTrigger
                value="input"
                className="rounded-xl text-xs font-semibold text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:ring-1 data-[state=active]:ring-primary/20 transition-all duration-200"
              >
                {t.input[language]}
              </TabsTrigger>
              <TabsTrigger
                value="report"
                className="rounded-xl text-xs font-semibold text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-md data-[state=active]:ring-1 data-[state=active]:ring-primary/20 transition-all duration-200"
              >
                {t.report[language]}
              </TabsTrigger>
            </TabsList>

            {/* Batch Tab — Active batch lifecycle (start/view/end) */}
            <TabsContent value="batch" className="mt-4">
              <div className="space-y-4">
                <Collapsible open={batchSectionOpen} onOpenChange={setBatchSectionOpen}>
                  <CollapsibleTrigger className="w-full flex items-center gap-2 rounded-xl border border-border/60 bg-card hover:bg-accent/40 transition-colors p-3 group">
                    <Layers className="h-4 w-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0 text-left">
                      <h3 className="text-sm font-semibold leading-tight">
                        {t.batchHeading[language]}
                      </h3>
                      <p className="text-[11px] text-muted-foreground leading-tight">
                        {hasActiveBatch
                          ? (language === 'bn' ? '✅ সক্রিয় ব্যাচ চলছে' : '✅ Active batch running')
                          : t.batchSubtitle[language]}
                      </p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 pt-4">
                    {isLayer && <LayerBatchCard />}

                    {isBroiler && activeBroilerBatch && (
                      <BroilerDashboardWidget
                        onBatchClick={() => handleBroilerAction('batch')}
                        onWeightClick={() => handleBroilerAction('weight')}
                        onFeedClick={() => handleBroilerAction('broiler-feed')}
                      />
                    )}

                    {/* Empty-state hint for broiler when no active batch */}
                    {isBroiler && !activeBroilerBatch && (
                      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-5 text-center space-y-3">
                        <div className="mx-auto h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <PackageOpen className="h-5 w-5 text-primary" />
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {language === 'bn'
                            ? 'এখনো কোনো ব্যাচ যোগ করা হয়নি। ট্র্যাকিং শুরু করতে নতুন ব্যাচ যোগ করুন।'
                            : 'No batch added yet. Add a new batch to start tracking.'}
                        </p>
                        <Button
                          size="sm"
                          className="h-10 font-semibold"
                          onClick={() => handleBroilerAction('batch')}
                        >
                          <Plus className="mr-1.5 h-4 w-4" />
                          {language === 'bn' ? 'ব্যাচ যোগ করুন' : 'Add Batch'}
                        </Button>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>

                {/* Schedule Card - moved from Entry tab */}
                <button
                  type="button"
                  onClick={() => setActiveSheet('schedule')}
                  className="w-full text-left rounded-2xl border border-border/60 bg-card hover:bg-accent/40 transition-colors p-4 flex items-center gap-3 shadow-sm"
                >
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-tight">
                      {language === 'bn' ? '⏰ শিডিউল ও রিমাইন্ডার' : '⏰ Schedule & Reminders'}
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                      {language === 'bn'
                        ? 'খাবার, পরিষ্কার, টিকা — স্বয়ংক্রিয় রিমাইন্ডার সেট করুন'
                        : 'Feeding, cleaning, vaccination — set automatic reminders'}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              </div>
            </TabsContent>

            {/* Input Tab - Grouped Quick Entry */}
            <TabsContent value="input" className="mt-4">
              <div className="space-y-5">
                {/* Layer Mode: Grouped entries (egg/feed → mortality/medicine → finance/feed-stock) */}
                {isLayer && (
                  <FarmInputCards
                    onCardClick={handleQuickAction}
                    grouped
                  />
                )}

                {/* Broiler Mode: weight/feed in production, mortality/medicine in health, finance/feed-stock in financial */}
                {isBroiler && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {language === 'bn' ? '🐔 ব্রয়লার এন্ট্রি' : '🐔 Broiler Entries'}
                      </h4>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            aria-label={language === 'bn' ? 'তথ্য' : 'Info'}
                          >
                            <Info className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-[240px]">
                          <p className="text-xs">
                            {language === 'bn'
                              ? 'ব্যাচ তৈরি বা ব্যাচ-স্পেসিফিক ভিউ এর জন্য উপরের "🐔 ব্যাচ" ট্যাব দেখুন'
                              : 'For batch creation or batch-specific view, see the "🐔 Batch" tab above'}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <FarmInputCards
                      onCardClick={handleQuickAction}
                      grouped
                      isBroiler
                    />
                  </div>
                )}

                {/* Recent History pushed to bottom */}
                <RecentEntryHistory />

                <p className="text-xs text-center text-muted-foreground">
                  {t.quickTip[language]}
                </p>
              </div>
            </TabsContent>

            {/* Report Tab - Merged: Today's Summary + Trends & Analysis */}
            <TabsContent value="report" className="mt-4">
              <div className="space-y-4">
                {/* Top action bar */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold">{t.report[language]}</h3>
                  </div>
                  <DataExportButton />
                </div>

                {/* Date range picker — drives the Trends & Analysis section below */}
                <ReportRangePicker value={reportRange} onChange={setReportRange} />

                {/* === Section 1: Today's Summary (collapsible) === */}
                <Collapsible open={summarySectionOpen} onOpenChange={setSummarySectionOpen}>
                  <CollapsibleTrigger className="w-full flex items-center gap-2 rounded-xl border border-border/60 bg-card hover:bg-accent/40 transition-colors p-3 group">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0 text-left">
                      <h3 className="text-sm font-semibold leading-tight">
                        {t.summarySection[language]}
                      </h3>
                      <p className="text-[11px] text-muted-foreground leading-tight">
                        {t.summarySubtitle[language]}
                      </p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 pt-4">
                    {/* Daily Expense Summary */}
                    <DailyExpenseSummary />

                    {/* Layer Mode: Show Layer Summary (production rate is already included) */}
                    {isLayer && <FarmSummaryCards />}

                    {/* Broiler Mode: Show batch overview as summary */}
                    {isBroiler && (
                      <BroilerDashboardWidget
                        onBatchClick={() => handleBroilerAction('batch')}
                        onWeightClick={() => handleBroilerAction('weight')}
                        onFeedClick={() => handleBroilerAction('broiler-feed')}
                      />
                    )}
                  </CollapsibleContent>
                </Collapsible>

                {/* === Section 2: Trends & Analysis (collapsible) === */}
                <Collapsible open={analysisSectionOpen} onOpenChange={setAnalysisSectionOpen}>
                  <CollapsibleTrigger className="w-full flex items-center gap-2 rounded-xl border border-border/60 bg-card hover:bg-accent/40 transition-colors p-3 group">
                    <BarChart3 className="h-4 w-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0 text-left">
                      <h3 className="text-sm font-semibold leading-tight">
                        {t.analysisSection[language]}
                      </h3>
                      <p className="text-[11px] text-muted-foreground leading-tight">
                        {t.analysisSubtitle[language]}
                      </p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 pt-4">
                    {/* 1. Finance — Income / Expense / Net (most important) */}
                    <FinanceSummaryRange days={reportDays} />

                    {/* 2. Mortality Trend Chart - Both modes */}
                    <MortalityTrendChart days={reportDays} />

                    {/* 3. Performance Snapshot — environmental conditions & flock health */}
                    <FarmPerformanceView days={Math.min(reportDays, 30)} />

                    {/* 4. Layer Mode: Egg Correlation Analysis */}
                    {isLayer && <EggCorrelationCard days={reportDays} />}

                    {/* 5. Cost Analytics — collapsible (detailed energy/water/feed breakdown) */}
                    <Collapsible open={costDetailOpen} onOpenChange={setCostDetailOpen}>
                      <CollapsibleTrigger className="w-full flex items-center gap-2 rounded-xl border border-border/60 bg-card hover:bg-accent/40 transition-colors p-3 group">
                        <BarChart3 className="h-4 w-4 text-primary shrink-0" />
                        <div className="flex-1 min-w-0 text-left">
                          <h3 className="text-sm font-semibold leading-tight">
                            {language === 'bn' ? 'বিস্তারিত খরচ বিশ্লেষণ' : 'Detailed Cost Analytics'}
                          </h3>
                          <p className="text-[11px] text-muted-foreground leading-tight">
                            {language === 'bn' ? 'বিদ্যুৎ, পানি ও ফিড খরচের ট্রেন্ড' : 'Energy, water & feed cost trends'}
                          </p>
                        </div>
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-4">
                        <CostAnalyticsDashboard days={reportDays} />
                      </CollapsibleContent>
                    </Collapsible>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>

      {/* Floating Action Button */}
      <QuickActionFAB onAction={handleQuickAction} />

      <BottomNav />

      {/* Sheets */}
      <EggProductionSheet 
        open={activeSheet === 'egg'} 
        onOpenChange={(open) => !open && setActiveSheet(null)} 
      />
      <FeedManagementSheet 
        open={activeSheet === 'feed'} 
        onOpenChange={(open) => !open && setActiveSheet(null)} 
      />
      <HealthSheet 
        open={activeSheet === 'mortality' || activeSheet === 'medicine'} 
        onOpenChange={(open) => !open && setActiveSheet(null)} 
      />
      <FinanceSheet 
        open={activeSheet === 'finance'} 
        onOpenChange={(open) => !open && setActiveSheet(null)} 
      />
      <ScheduleSheet 
        open={activeSheet === 'schedule'} 
        onOpenChange={(open) => !open && setActiveSheet(null)} 
      />
      
      {/* Broiler Sheets */}
      <BroilerBatchSheet 
        open={activeSheet === 'batch'} 
        onOpenChange={(open) => !open && setActiveSheet(null)} 
      />
      <BroilerWeightSheet 
        open={activeSheet === 'weight'} 
        onOpenChange={(open) => !open && setActiveSheet(null)} 
      />
      <BroilerFeedSheet 
        open={activeSheet === 'broiler-feed'} 
        onOpenChange={(open) => !open && setActiveSheet(null)} 
      />
    </div>
  );
}
