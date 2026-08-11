import { useState } from 'react';
import { HeartPulse, Skull, Pill, Package, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { ReadOnlyBanner } from '@/components/farm/ReadOnlyBanner';
import { useMortalityRecords, useFlockInfo } from '@/hooks/useFarmManagement';
import { useMedicineStockSummary } from '@/hooks/useMedicine';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { HEALTH_LABELS as t, mortalityRatePercent } from '@/lib/healthOptions';
import { MortalityTab } from '@/components/farm/health/MortalityTab';
import { MedicineUsageTab } from '@/components/farm/health/MedicineUsageTab';
import { MedicineStockTab } from '@/components/farm/health/MedicineStockTab';

interface HealthSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HealthSheet({ open, onOpenChange }: HealthSheetProps) {
  const { language } = useAuth();
  const { canLogDailyData } = usePermissions();
  const { data: mortRecords } = useMortalityRecords();
  const { data: flockInfo } = useFlockInfo();
  const stockSummary = useMedicineStockSummary();

  const [activeTab, setActiveTab] = useState<'mortality' | 'usage' | 'stock'>('mortality');

  const totalMortality = mortRecords?.reduce((s, r) => s + r.count, 0) ?? 0;
  const mortalityRate = mortalityRatePercent(totalMortality, flockInfo?.total_birds);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl overflow-y-auto">
        <SheetHeader className="pb-3">
          <SheetTitle className="flex items-center gap-2">
            <HeartPulse className="h-5 w-5 text-destructive" />
            {t.title[language]}
          </SheetTitle>
        </SheetHeader>

        {!canLogDailyData && (
          <div className="mb-3">
            <ReadOnlyBanner />
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 mb-3">
          <Card className="bg-destructive/10 border-destructive/20">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-muted-foreground">{t.mortalityRate[language]}</p>
                  <p className="text-[9px] text-muted-foreground">{t.last30Days[language]}</p>
                </div>
                <div className="flex items-center gap-1">
                  {Number(mortalityRate) > 2 && (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  )}
                  <span className="text-lg font-bold text-destructive">{mortalityRate}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-pink-500/10 border-pink-500/20">
            <CardContent className="p-3">
              <p className="text-[10px] text-muted-foreground">{t.stock[language]}</p>
              <p className="text-lg font-bold text-pink-600">
                {stockSummary.items.length} {language === 'bn' ? 'ধরণ' : 'types'}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="mortality">
              <Skull className="h-3.5 w-3.5 mr-1" />
              {t.mortality[language]}
            </TabsTrigger>
            <TabsTrigger value="usage">
              <Pill className="h-3.5 w-3.5 mr-1" />
              {t.usage[language]}
            </TabsTrigger>
            <TabsTrigger value="stock">
              <Package className="h-3.5 w-3.5 mr-1" />
              {t.stock[language]}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mortality">
            <MortalityTab language={language} canLogDailyData={canLogDailyData} />
          </TabsContent>

          <TabsContent value="usage">
            <MedicineUsageTab language={language} canLogDailyData={canLogDailyData} />
          </TabsContent>

          <TabsContent value="stock">
            <MedicineStockTab language={language} canLogDailyData={canLogDailyData} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
