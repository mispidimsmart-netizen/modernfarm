import { motion } from 'framer-motion';
import { Bird, Scale, TrendingUp, TrendingDown, Utensils, Target, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useActiveBatch, useBatchStats } from '@/hooks/useBroilerData';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface BroilerDashboardWidgetProps {
  onBatchClick: () => void;
  onWeightClick: () => void;
  onFeedClick: () => void;
}

export function BroilerDashboardWidget({ onBatchClick, onWeightClick, onFeedClick }: BroilerDashboardWidgetProps) {
  const { language } = useAuth();
  const { data: batch, isLoading } = useActiveBatch();
  const stats = useBatchStats(batch?.id);

  const getFCRColor = () => {
    switch (stats.fcrRating) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-emerald-600';
      case 'average': return 'text-amber-600';
      case 'poor': return 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };

  const getFCRLabel = () => {
    const labels = {
      excellent: { bn: 'চমৎকার!', en: 'Excellent!' },
      good: { bn: 'ভালো', en: 'Good' },
      average: { bn: 'মোটামুটি', en: 'Average' },
      poor: { bn: 'উন্নতি দরকার', en: 'Needs work' },
    };
    return labels[stats.fcrRating]?.[language] || '';
  };

  const t = {
    noBatch: { bn: '🐔 কোনো সক্রিয় ব্যাচ নেই', en: '🐔 No active batch' },
    createBatch: { bn: 'নতুন ব্যাচ শুরু করুন', en: 'Start a new batch' },
    days: { bn: 'দিন', en: 'days' },
    birds: { bn: 'মুরগি', en: 'birds' },
    weight: { bn: 'ওজন', en: 'Weight' },
    fcr: { bn: 'FCR', en: 'FCR' },
    feed: { bn: 'খাদ্য', en: 'Feed' },
    mortality: { bn: 'মৃত্যু', en: 'Mortality' },
    grams: { bn: 'গ্রা', en: 'g' },
    kg: { bn: 'কেজি', en: 'kg' },
  };

  // No active batch - show prompt
  if (!batch && !isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card 
          onClick={onBatchClick}
          className="cursor-pointer transition-all hover:shadow-md active:scale-[0.98] border-dashed border-2 border-primary/30 bg-primary/5"
        >
          <CardContent className="p-6 text-center">
            <Bird className="h-12 w-12 mx-auto text-primary/50 mb-3" />
            <p className="font-semibold text-primary">{t.noBatch[language]}</p>
            <p className="text-sm text-muted-foreground mt-1">{t.createBatch[language]}</p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-4">
          <div className="h-24 bg-muted rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {/* Batch Header Card */}
      <Card 
        onClick={onBatchClick}
        className="cursor-pointer transition-all hover:shadow-md active:scale-[0.99] bg-gradient-to-br from-orange-500/10 to-amber-500/10 border-orange-500/20"
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <Bird className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="font-bold text-lg">
                  {language === 'bn' ? batch?.batch_name_bn : batch?.batch_name}
                </p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>📅 {stats.ageDays} {t.days[language]}</span>
                  <span>•</span>
                  <span>🐔 {batch?.current_bird_count.toLocaleString()}</span>
                </div>
              </div>
            </div>
            
            {/* Mortality Warning */}
            {stats.mortalityPercent > 2 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 text-red-600 text-xs">
                <AlertTriangle className="h-3 w-3" />
                {stats.mortalityPercent.toFixed(1)}%
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Weight Card */}
        <Card 
          onClick={onWeightClick}
          className="cursor-pointer transition-all hover:shadow-md active:scale-[0.98]"
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <Scale className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">{t.weight[language]}</span>
            </div>
            <p className="text-xl font-bold">
              {stats.currentWeight.toLocaleString()}
              <span className="text-sm text-muted-foreground ml-1">{t.grams[language]}</span>
            </p>
            <div className="mt-2">
              <Progress value={Math.min(stats.weightProgress, 100)} className="h-1.5" />
              <p className="text-xs text-muted-foreground mt-1">
                {stats.weightProgress.toFixed(0)}% {language === 'bn' ? 'টার্গেটের' : 'of target'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* FCR Card */}
        <Card 
          onClick={onFeedClick}
          className="cursor-pointer transition-all hover:shadow-md active:scale-[0.98]"
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">{t.fcr[language]}</span>
            </div>
            <p className={`text-xl font-bold ${getFCRColor()}`}>
              {stats.fcr > 0 ? stats.fcr.toFixed(2) : '--'}
            </p>
            <p className={`text-xs mt-1 ${getFCRColor()}`}>
              {stats.fcr > 0 ? getFCRLabel() : (language === 'bn' ? 'ডেটা নেই' : 'No data')}
            </p>
          </CardContent>
        </Card>

        {/* Feed Card */}
        <Card 
          onClick={onFeedClick}
          className="cursor-pointer transition-all hover:shadow-md active:scale-[0.98]"
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <Utensils className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">{t.feed[language]}</span>
            </div>
            <p className="text-xl font-bold">
              {stats.totalFeedKg.toFixed(0)}
              <span className="text-sm text-muted-foreground ml-1">{t.kg[language]}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {language === 'bn' ? 'মোট খাদ্য' : 'Total feed'}
            </p>
          </CardContent>
        </Card>

        {/* Mortality Card */}
        <Card className="cursor-pointer transition-all hover:shadow-md active:scale-[0.98]">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <span className="text-xs text-muted-foreground">{t.mortality[language]}</span>
            </div>
            <p className={`text-xl font-bold ${stats.mortalityPercent > 3 ? 'text-red-600' : stats.mortalityPercent > 2 ? 'text-amber-600' : 'text-green-600'}`}>
              {stats.mortality}
              <span className="text-sm text-muted-foreground ml-1">
                ({stats.mortalityPercent.toFixed(1)}%)
              </span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {language === 'bn' ? 'মোট মৃত্যু' : 'Total deaths'}
            </p>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
