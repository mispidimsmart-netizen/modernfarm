import { useState } from 'react';
import { motion } from 'framer-motion';
import { Egg, Wheat, Skull, Wallet, ChevronRight, TrendingUp, TrendingDown, BarChart3, ClipboardList } from 'lucide-react';
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

export function FarmManagementPage() {
  const { language } = useAuth();
  const summary = useFarmSummary();
  
  const [activeSheet, setActiveSheet] = useState<'egg' | 'feed' | 'mortality' | 'finance' | 'flock' | null>(null);

  const t = {
    title: { bn: 'ফার্ম ম্যানেজমেন্ট', en: 'Farm Management' },
    eggProduction: { bn: 'ডিম উৎপাদন', en: 'Egg Production' },
    feedManagement: { bn: 'খাদ্য ব্যবস্থাপনা', en: 'Feed Management' },
    mortality: { bn: 'মর্টালিটি', en: 'Mortality' },
    finance: { bn: 'আয়-ব্যয়', en: 'Finance' },
    flockInfo: { bn: 'মুরগির তথ্য', en: 'Flock Info' },
    last30Days: { bn: 'গত ৩০ দিন', en: 'Last 30 days' },
    eggs: { bn: 'টি ডিম', en: 'eggs' },
    kg: { bn: 'কেজি', en: 'kg' },
    birds: { bn: 'টি মুরগি', en: 'birds' },
    taka: { bn: '৳', en: '৳' },
    profit: { bn: 'লাভ', en: 'Profit' },
    loss: { bn: 'ক্ষতি', en: 'Loss' },
    productionRate: { bn: 'উৎপাদন হার', en: 'Production Rate' },
    totalBirds: { bn: 'মোট মুরগি', en: 'Total Birds' },
    summary: { bn: 'সারাংশ', en: 'Summary' },
    analysis: { bn: 'বিশ্লেষণ', en: 'Analysis' },
    management: { bn: 'ব্যবস্থাপনা', en: 'Management' },
  };

  const menuItems = [
    {
      key: 'egg' as const,
      icon: Egg,
      title: t.eggProduction[language],
      value: `${summary.totalEggs.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')} ${t.eggs[language]}`,
      color: 'bg-amber-500/10 text-amber-600',
    },
    {
      key: 'feed' as const,
      icon: Wheat,
      title: t.feedManagement[language],
      value: `${summary.totalFeedUsed.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')} ${t.kg[language]}`,
      color: 'bg-emerald-500/10 text-emerald-600',
    },
    {
      key: 'mortality' as const,
      icon: Skull,
      title: t.mortality[language],
      value: `${summary.totalMortality.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')} ${t.birds[language]}`,
      color: 'bg-red-500/10 text-red-600',
    },
    {
      key: 'finance' as const,
      icon: Wallet,
      title: t.finance[language],
      value: `${t.taka[language]}${Math.abs(summary.profit).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}`,
      color: summary.profit >= 0 ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600',
      subValue: summary.profit >= 0 ? t.profit[language] : t.loss[language],
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
          <div className="mb-4 flex items-center justify-between">
            <h2 className="section-title">{t.title[language]}</h2>
            <span className="text-xs text-muted-foreground">{t.last30Days[language]}</span>
          </div>

          {/* Summary Cards at Top */}
          <div className="mb-4 grid grid-cols-2 gap-3">
            <Card 
              className="cursor-pointer transition-transform active:scale-[0.98]"
              onClick={() => setActiveSheet('flock')}
            >
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{t.totalBirds[language]}</p>
                <p className="text-2xl font-bold text-primary">
                  {(summary.flockInfo?.total_birds ?? 0).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{t.productionRate[language]}</p>
                <div className="flex items-center gap-1">
                  <p className="text-2xl font-bold text-primary">{summary.productionRate}%</p>
                  {Number(summary.productionRate) > 80 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabbed Interface */}
          <Tabs defaultValue="management" className="w-full">
            <TabsList className="w-full grid grid-cols-3 h-11 rounded-xl bg-muted/50 mb-4">
              <TabsTrigger value="management" className="rounded-lg text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm gap-1.5">
                <ClipboardList className="h-3.5 w-3.5" />
                {t.management[language]}
              </TabsTrigger>
              <TabsTrigger value="summary" className="rounded-lg text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm gap-1.5">
                <BarChart3 className="h-3.5 w-3.5" />
                {t.summary[language]}
              </TabsTrigger>
              <TabsTrigger value="analysis" className="rounded-lg text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                {t.analysis[language]}
              </TabsTrigger>
            </TabsList>

            {/* Management Tab */}
            <TabsContent value="management" className="mt-0 space-y-3">
              {menuItems.map((item, index) => (
                <motion.div
                  key={item.key}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card 
                    className="cursor-pointer transition-transform active:scale-[0.98]"
                    onClick={() => setActiveSheet(item.key)}
                  >
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${item.color}`}>
                        <item.icon size={24} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{item.title}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-lg font-semibold">{item.value}</p>
                          {item.subValue && (
                            <span className={`text-xs ${summary.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ({item.subValue})
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="text-muted-foreground" size={20} />
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </TabsContent>

            {/* Summary Tab - Today's Summary */}
            <TabsContent value="summary" className="mt-0">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  {language === 'bn' ? '📊 আজকের সারাংশ' : '📊 Today\'s Summary'}
                </h3>
                <FarmSummaryCards />
              </div>
            </TabsContent>

            {/* Analysis Tab - Egg Correlation */}
            <TabsContent value="analysis" className="mt-0">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  {language === 'bn' ? '🥚 ডিম উৎপাদন বিশ্লেষণ' : '🥚 Egg Production Analysis'}
                </h3>
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
