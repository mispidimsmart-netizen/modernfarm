import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, LineChart, BarChart3, Egg, TrendingUp, TrendingDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useFarmSummary } from '@/hooks/useFarmManagement';
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

export function FarmManagementPage() {
  const { language } = useAuth();
  const summary = useFarmSummary();
  
  const [activeSheet, setActiveSheet] = useState<'egg' | 'feed' | 'mortality' | 'finance' | 'flock' | null>(null);

  const t = {
    title: { bn: '🏠 ফার্ম ম্যানেজমেন্ট', en: '🏠 Farm Management' },
    input: { bn: '✏️ এন্ট্রি', en: '✏️ Entry' },
    report: { bn: '📊 সারাংশ', en: '📊 Summary' },
    analysis: { bn: '📈 বিশ্লেষণ', en: '📈 Analysis' },
    todaySummary: { bn: 'আজকের সারাংশ', en: "Today's Summary" },
    eggAnalysis: { bn: 'উৎপাদন বিশ্লেষণ', en: 'Production Analysis' },
    productionRate: { bn: 'উৎপাদন হার', en: 'Production Rate' },
    quickTip: { bn: '💡 দ্রুত টিপ: নিচের + বাটন দিয়েও এন্ট্রি করতে পারবেন', en: '💡 Quick tip: Use the + button below for quick entry' },
  };

  const handleQuickAction = (action: 'egg' | 'feed' | 'mortality' | 'finance') => {
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
            <TabsList className="w-full grid grid-cols-3 h-11 rounded-2xl bg-muted/50 p-1">
              <TabsTrigger 
                value="input" 
                className="rounded-xl text-xs font-medium data-[state=active]:bg-card data-[state=active]:shadow-md transition-all"
              >
                {t.input[language]}
              </TabsTrigger>
              <TabsTrigger 
                value="report" 
                className="rounded-xl text-xs font-medium data-[state=active]:bg-card data-[state=active]:shadow-md transition-all"
              >
                {t.report[language]}
              </TabsTrigger>
              <TabsTrigger 
                value="analysis" 
                className="rounded-xl text-xs font-medium data-[state=active]:bg-card data-[state=active]:shadow-md transition-all"
              >
                {t.analysis[language]}
              </TabsTrigger>
            </TabsList>

            {/* Input Tab - Quick Entry Cards */}
            <TabsContent value="input" className="mt-4">
              <div className="space-y-4">
                <FarmInputCards onCardClick={handleQuickAction} />
                <p className="text-xs text-center text-muted-foreground">
                  {t.quickTip[language]}
                </p>
              </div>
            </TabsContent>

            {/* Report Tab - Today's Summary */}
            <TabsContent value="report" className="mt-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">{t.todaySummary[language]}</h3>
                </div>
                <FarmSummaryCards />
                
                {/* Production Rate Card */}
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
              </div>
            </TabsContent>

            {/* Analysis Tab - Egg Correlation */}
            <TabsContent value="analysis" className="mt-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">{t.eggAnalysis[language]}</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  {language === 'bn' 
                    ? '🔍 তাপমাত্রা, আর্দ্রতা ও অন্যান্য ফ্যাক্টরের সাথে ডিম উৎপাদনের সম্পর্ক দেখুন' 
                    : '🔍 See how temperature, humidity & other factors affect egg production'}
                </p>
                <EggCorrelationCard />
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
    </div>
  );
}
