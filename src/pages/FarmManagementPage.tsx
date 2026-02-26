import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, LineChart, BarChart3, Egg, TrendingUp, TrendingDown, Calendar, ChevronRight, Bird } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useFarmSummary } from '@/hooks/useFarmManagement';
import { useFarmType } from '@/hooks/useFarmType';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EggProductionSheet } from '@/components/farm/EggProductionSheet';
import { FeedManagementSheet } from '@/components/farm/FeedManagementSheet';
import { MortalitySheet } from '@/components/farm/MortalitySheet';
import { FinanceSheet } from '@/components/farm/FinanceSheet';
import { FlockInfoSheet } from '@/components/farm/FlockInfoSheet';
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
import { DataExportButton } from '@/components/farm/DataExportButton';
// Broiler components
import { BroilerDashboardWidget } from '@/components/broiler/BroilerDashboardWidget';
import { BroilerBatchSheet } from '@/components/broiler/BroilerBatchSheet';
import { BroilerWeightSheet } from '@/components/broiler/BroilerWeightSheet';
import { BroilerFeedSheet } from '@/components/broiler/BroilerFeedSheet';

export function FarmManagementPage() {
  const { language } = useAuth();
  const summary = useFarmSummary();
  const { isLayer, isBroiler } = useFarmType();
  
  const [activeSheet, setActiveSheet] = useState<'egg' | 'feed' | 'mortality' | 'finance' | 'flock' | 'schedule' | 'batch' | 'weight' | 'broiler-feed' | null>(null);

  // Handle broiler-specific actions
  const handleBroilerAction = (action: 'batch' | 'weight' | 'broiler-feed') => {
    setActiveSheet(action);
  };

  const t = {
    title: { bn: '🏠 ফার্ম ম্যানেজমেন্ট', en: '🏠 Farm Management' },
    input: { bn: '✏️ এন্ট্রি', en: '✏️ Entry' },
    report: { bn: '📊 সারাংশ', en: '📊 Summary' },
    schedule: { bn: '📅 শিডিউল', en: '📅 Schedule' },
    analysis: { bn: '📈 বিশ্লেষণ', en: '📈 Analysis' },
    todaySummary: { bn: 'আজকের সারাংশ', en: "Today's Summary" },
    eggAnalysis: { bn: 'উৎপাদন বিশ্লেষণ', en: 'Production Analysis' },
    productionRate: { bn: 'উৎপাদন হার', en: 'Production Rate' },
    quickTip: { bn: '💡 দ্রুত টিপ: নিচের + বাটন দিয়েও এন্ট্রি করতে পারবেন', en: '💡 Quick tip: Use the + button below for quick entry' },
  };

  const handleQuickAction = (action: 'egg' | 'feed' | 'mortality' | 'finance' | 'schedule') => {
    setActiveSheet(action);
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
          <FarmStatsHeader onFlockClick={() => setActiveSheet('flock')} />

          {/* Tabbed Interface */}
          <Tabs defaultValue="input" className="w-full">
            <TabsList className="w-full grid grid-cols-4 h-11 rounded-2xl bg-muted/50 p-1">
              <TabsTrigger 
                value="input" 
                className="rounded-xl text-[10px] font-medium data-[state=active]:bg-card data-[state=active]:shadow-md transition-all"
              >
                {t.input[language]}
              </TabsTrigger>
              <TabsTrigger 
                value="report" 
                className="rounded-xl text-[10px] font-medium data-[state=active]:bg-card data-[state=active]:shadow-md transition-all"
              >
                {t.report[language]}
              </TabsTrigger>
              <TabsTrigger 
                value="schedule" 
                className="rounded-xl text-[10px] font-medium data-[state=active]:bg-card data-[state=active]:shadow-md transition-all"
              >
                {t.schedule[language]}
              </TabsTrigger>
              <TabsTrigger 
                value="analysis" 
                className="rounded-xl text-[10px] font-medium data-[state=active]:bg-card data-[state=active]:shadow-md transition-all"
              >
                {t.analysis[language]}
              </TabsTrigger>
            </TabsList>

            {/* Input Tab - Quick Entry Cards */}
            <TabsContent value="input" className="mt-4">
              <div className="space-y-4">
                {/* Entry Status & History */}
                <RecentEntryHistory />

                {/* Broiler Mode: Show Broiler Widget */}
                {isBroiler && (
                  <BroilerDashboardWidget
                    onBatchClick={() => handleBroilerAction('batch')}
                    onWeightClick={() => handleBroilerAction('weight')}
                    onFeedClick={() => handleBroilerAction('broiler-feed')}
                  />
                )}
                
                {/* Layer Mode: Show Layer Input Cards */}
                {isLayer && (
                  <FarmInputCards onCardClick={handleQuickAction} />
                )}
                
                <p className="text-xs text-center text-muted-foreground">
                  {t.quickTip[language]}
                </p>
              </div>
            </TabsContent>

            {/* Report Tab - Today's Summary */}
            <TabsContent value="report" className="mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold">{t.todaySummary[language]}</h3>
                  </div>
                  <DataExportButton />
                </div>
                
                {/* Layer Mode: Show Layer Summary */}
                {/* Daily Expense Summary */}
                <DailyExpenseSummary />

                {isLayer && (
                  <>
                    <FarmSummaryCards />
                    
                    {/* Production Rate Card - Layer Only */}
                    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">{t.productionRate[language]}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-3xl font-bold text-primary">{summary.productionRate}%</p>
                              {Number(summary.productionRate) > 80 ? (
                                <span className="flex items-center gap-1 text-xs text-green-600 bg-green-500/10 px-2 py-0.5 rounded-full">
                                  <TrendingUp className="h-3 w-3" />
                                  {language === 'bn' ? 'ভালো' : 'Good'}
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">
                                  <TrendingDown className="h-3 w-3" />
                                  {language === 'bn' ? 'উন্নতি দরকার' : 'Needs improvement'}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                            <Egg className="h-8 w-8 text-primary" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
                
                {/* Broiler Mode: Show Broiler Summary */}
                {isBroiler && (
                  <BroilerDashboardWidget
                    onBatchClick={() => setActiveSheet('batch')}
                    onWeightClick={() => setActiveSheet('weight')}
                    onFeedClick={() => setActiveSheet('broiler-feed')}
                  />
                )}
              </div>
            </TabsContent>

            {/* Schedule Tab */}
            <TabsContent value="schedule" className="mt-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">
                    {language === 'bn' ? 'শিডিউল ম্যানেজমেন্ট' : 'Schedule Management'}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  {language === 'bn' 
                    ? '📅 খাবার, পরিষ্কার ও টিকার সময়সূচী সেট করুন এবং নোটিফিকেশন পান' 
                    : '📅 Set feed, cleaning & vaccination schedules with notifications'}
                </p>
                
                {/* Schedule Management Card */}
                <Card 
                  onClick={() => setActiveSheet('schedule')}
                  className="cursor-pointer transition-all active:scale-[0.98] hover:shadow-md bg-gradient-to-br from-purple-500/5 to-purple-500/10 border-purple-500/20"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                        <Calendar className="h-6 w-6 text-purple-500" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{language === 'bn' ? 'শিডিউল দেখুন ও যোগ করুন' : 'View & Add Schedules'}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {language === 'bn' ? 'খাবার, পরিষ্কার, টিকা, কাস্টম' : 'Feed, Cleaning, Vaccination, Custom'}
                        </p>
                      </div>
                      <ChevronRight size={20} className="text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Analysis Tab */}
            <TabsContent value="analysis" className="mt-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">
                    {isBroiler 
                      ? (language === 'bn' ? 'পারফরম্যান্স বিশ্লেষণ' : 'Performance Analysis')
                      : t.eggAnalysis[language]
                    }
                  </h3>
                </div>

                {/* Mortality Trend Chart - Both modes */}
                <MortalityTrendChart />
                
                {/* Layer Mode: Egg Correlation Analysis */}
                {isLayer && (
                  <>
                    <p className="text-xs text-muted-foreground">
                      {language === 'bn' 
                        ? '🔍 তাপমাত্রা, আর্দ্রতা ও অন্যান্য ফ্যাক্টরের সাথে ডিম উৎপাদনের সম্পর্ক দেখুন' 
                        : '🔍 See how temperature, humidity & other factors affect egg production'}
                    </p>
                    <EggCorrelationCard />
                  </>
                )}
                
                {/* Broiler Mode: FCR & Weight Analysis */}
                {isBroiler && (
                  <>
                    <p className="text-xs text-muted-foreground">
                      {language === 'bn' 
                        ? '🔍 FCR, ওজন বৃদ্ধি ও খাদ্য খরচের বিশ্লেষণ দেখুন' 
                        : '🔍 View FCR, weight gain & feed cost analysis'}
                    </p>
                    <BroilerDashboardWidget
                      onBatchClick={() => setActiveSheet('batch')}
                      onWeightClick={() => setActiveSheet('weight')}
                      onFeedClick={() => setActiveSheet('broiler-feed')}
                    />
                  </>
                )}
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
      <MortalitySheet 
        open={activeSheet === 'mortality'} 
        onOpenChange={(open) => !open && setActiveSheet(null)} 
      />
      <FinanceSheet 
        open={activeSheet === 'finance'} 
        onOpenChange={(open) => !open && setActiveSheet(null)} 
      />
      <FlockInfoSheet 
        open={activeSheet === 'flock'} 
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
