import { useState } from 'react';
import { motion } from 'framer-motion';
import { Egg, Wheat, Skull, Wallet, ChevronRight, TrendingUp, TrendingDown, PenLine, FileText, LineChart, Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useFarmSummary } from '@/hooks/useFarmManagement';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EggProductionSheet } from '@/components/farm/EggProductionSheet';
import { FeedManagementSheet } from '@/components/farm/FeedManagementSheet';
import { MortalitySheet } from '@/components/farm/MortalitySheet';
import { FinanceSheet } from '@/components/farm/FinanceSheet';
import { FlockInfoSheet } from '@/components/farm/FlockInfoSheet';
import { FarmSummaryCards } from '@/components/dashboard/FarmSummaryCards';
import { EggCorrelationCard } from '@/components/analytics/EggCorrelationCard';

export function FarmManagementPage() {
  const { language } = useAuth();
  const summary = useFarmSummary();
  
  const [activeSheet, setActiveSheet] = useState<'egg' | 'feed' | 'mortality' | 'finance' | 'flock' | null>(null);

  const t = {
    title: { bn: 'ফার্ম ম্যানেজমেন্ট', en: 'Farm Management' },
    eggProduction: { bn: 'ডিম উৎপাদন', en: 'Egg Production' },
    feedManagement: { bn: 'খাদ্য', en: 'Feed' },
    mortality: { bn: 'মৃত্যু', en: 'Mortality' },
    finance: { bn: 'হিসাব', en: 'Finance' },
    flockInfo: { bn: 'মুরগির তথ্য', en: 'Flock Info' },
    last30Days: { bn: 'গত ৩০ দিন', en: 'Last 30 days' },
    eggs: { bn: 'টি', en: '' },
    kg: { bn: 'কেজি', en: 'kg' },
    birds: { bn: 'টি', en: '' },
    taka: { bn: '৳', en: '৳' },
    profit: { bn: 'লাভ', en: 'Profit' },
    loss: { bn: 'ক্ষতি', en: 'Loss' },
    productionRate: { bn: 'উৎপাদন হার', en: 'Production Rate' },
    totalBirds: { bn: 'মোট মুরগি', en: 'Total Birds' },
    input: { bn: '✏️ ইনপুট', en: '✏️ Input' },
    report: { bn: '📊 রিপোর্ট', en: '📊 Report' },
    analysis: { bn: '📈 বিশ্লেষণ', en: '📈 Analysis' },
    quickEntry: { bn: 'দ্রুত এন্ট্রি', en: 'Quick Entry' },
    todaySummary: { bn: 'আজকের সারাংশ', en: "Today's Summary" },
    eggAnalysis: { bn: 'ডিম উৎপাদন বিশ্লেষণ', en: 'Egg Production Analysis' },
    addNew: { bn: 'নতুন যোগ করুন', en: 'Add New' },
  };

  const inputItems = [
    {
      key: 'egg' as const,
      icon: Egg,
      title: t.eggProduction[language],
      subtitle: language === 'bn' ? 'আজকের ডিম সংখ্যা লিখুন' : 'Enter today\'s egg count',
      color: 'from-amber-500 to-orange-500',
      bgColor: 'bg-amber-500/10',
    },
    {
      key: 'feed' as const,
      icon: Wheat,
      title: t.feedManagement[language],
      subtitle: language === 'bn' ? 'খাদ্য খরচ ও স্টক' : 'Feed usage & stock',
      color: 'from-emerald-500 to-green-500',
      bgColor: 'bg-emerald-500/10',
    },
    {
      key: 'mortality' as const,
      icon: Skull,
      title: t.mortality[language],
      subtitle: language === 'bn' ? 'মৃত্যু রেকর্ড করুন' : 'Record mortality',
      color: 'from-red-500 to-rose-500',
      bgColor: 'bg-red-500/10',
    },
    {
      key: 'finance' as const,
      icon: Wallet,
      title: t.finance[language],
      subtitle: language === 'bn' ? 'আয় ও ব্যয় হিসাব' : 'Income & expenses',
      color: 'from-blue-500 to-indigo-500',
      bgColor: 'bg-blue-500/10',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="page-container px-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Header with Stats */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold">{t.title[language]}</h2>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                {t.last30Days[language]}
              </span>
            </div>
            
            {/* Mini Stats Row */}
            <div className="grid grid-cols-3 gap-2">
              <Card 
                className="cursor-pointer transition-transform active:scale-[0.98] bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20"
                onClick={() => setActiveSheet('flock')}
              >
                <CardContent className="p-3 text-center">
                  <p className="text-lg font-bold text-primary">
                    {(summary.flockInfo?.total_birds ?? 0).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{t.totalBirds[language]}</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-amber-500/5 to-amber-500/10 border-amber-500/20">
                <CardContent className="p-3 text-center">
                  <p className="text-lg font-bold text-amber-600">
                    {summary.totalEggs.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{language === 'bn' ? 'মোট ডিম' : 'Total Eggs'}</p>
                </CardContent>
              </Card>
              <Card className={`bg-gradient-to-br ${summary.profit >= 0 ? 'from-green-500/5 to-green-500/10 border-green-500/20' : 'from-red-500/5 to-red-500/10 border-red-500/20'}`}>
                <CardContent className="p-3 text-center">
                  <div className="flex items-center justify-center gap-0.5">
                    <p className={`text-lg font-bold ${summary.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {t.taka[language]}{Math.abs(summary.profit).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}
                    </p>
                    {summary.profit >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-green-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{summary.profit >= 0 ? t.profit[language] : t.loss[language]}</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Tabbed Interface */}
          <Tabs defaultValue="input" className="w-full">
            <TabsList className="w-full grid grid-cols-3 h-12 rounded-2xl bg-muted/50 p-1 mb-4">
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
            <TabsContent value="input" className="mt-0">
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {language === 'bn' ? '👆 যেকোনো আইটেমে ট্যাপ করে দ্রুত ডেটা এন্ট্রি করুন' : '👆 Tap any item for quick data entry'}
                </p>
                
                <div className="grid grid-cols-2 gap-3">
                  {inputItems.map((item, index) => (
                    <motion.div
                      key={item.key}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card 
                        className="cursor-pointer transition-all hover:shadow-md active:scale-[0.98] overflow-hidden"
                        onClick={() => setActiveSheet(item.key)}
                      >
                        <CardContent className="p-0">
                          <div className={`h-1.5 bg-gradient-to-r ${item.color}`} />
                          <div className="p-4">
                            <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${item.bgColor} mb-2`}>
                              <item.icon size={20} className="text-foreground" />
                            </div>
                            <p className="font-semibold text-sm">{item.title}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{item.subtitle}</p>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="mt-2 h-7 text-xs gap-1 px-2 -ml-2"
                            >
                              <Plus size={14} />
                              {t.addNew[language]}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Report Tab - Today's Summary */}
            <TabsContent value="report" className="mt-0">
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
            <TabsContent value="analysis" className="mt-0">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <LineChart className="h-4 w-4 text-primary" />
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
