import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Thermometer, 
  Droplets, 
  Scale, 
  Leaf, 
  AlertTriangle,
  CheckCircle2,
  MinusCircle,
  XCircle,
  Egg,
  Bird
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useFarmPerformance } from '@/hooks/useFarmPerformance';
import { useFarmType } from '@/hooks/useFarmType';
import { useAuth } from '@/context/AuthContext';

interface ConditionBadgeProps {
  condition: 'GOOD' | 'MODERATE' | 'POOR';
  language: 'en' | 'bn';
}

function ConditionBadge({ condition, language }: ConditionBadgeProps) {
  const config = {
    GOOD: {
      label: language === 'bn' ? 'ভালো' : 'Good',
      icon: CheckCircle2,
      className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    },
    MODERATE: {
      label: language === 'bn' ? 'মাঝারি' : 'Moderate',
      icon: MinusCircle,
      className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    },
    POOR: {
      label: language === 'bn' ? 'দুর্বল' : 'Needs Attention',
      icon: XCircle,
      className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    },
  };
  
  const { label, icon: Icon, className } = config[condition];
  
  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium ${className}`}>
      <Icon size={20} />
      <span>{label}</span>
    </div>
  );
}

interface MetricCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  color?: string;
}

function MetricCard({ icon: Icon, label, value, unit, subtext, color = 'text-primary' }: MetricCardProps) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50">
      <div className={`p-2 rounded-lg bg-background ${color}`}>
        <Icon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="text-lg font-bold">
          {value}
          {unit && <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>}
        </p>
        {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
      </div>
    </div>
  );
}

export function FarmPerformanceView() {
  const { language } = useAuth();
  const { isLayer, isBroiler } = useFarmType();
  const { data: performance, isLoading } = useFarmPerformance(7);
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }
  
  if (!performance) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {language === 'bn' ? 'পারফরম্যান্স ডেটা পাওয়া যায়নি' : 'No performance data available'}
        </CardContent>
      </Card>
    );
  }
  
  const { metrics, weekStart, weekEnd } = performance;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Overall Condition */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp size={18} className="text-primary" />
            {language === 'bn' ? 'এই সপ্তাহের খামার অবস্থা' : 'Farm Condition This Week'}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {new Date(weekStart).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', { 
              month: 'short', day: 'numeric' 
            })} - {new Date(weekEnd).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', { 
              month: 'short', day: 'numeric' 
            })}
          </p>
        </CardHeader>
        <CardContent className="text-center pb-6">
          <ConditionBadge condition={metrics.overallCondition} language={language} />
        </CardContent>
      </Card>
      
      {/* Key Benefits */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Leaf size={18} className="text-primary" />
            {language === 'bn' ? 'আনুমানিক সুবিধা' : 'Estimated Benefits'}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {language === 'bn' ? '* এই মানগুলো আনুমানিক' : '* These values are estimated'}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Heat Stress Avoided */}
          <MetricCard
            icon={Thermometer}
            label={language === 'bn' ? 'হিট স্ট্রেস এড়ানো হয়েছে' : 'Heat Stress Avoided'}
            value={metrics.heatStressAvoidedHours}
            unit={language === 'bn' ? 'ঘণ্টা' : 'hours'}
            color="text-sensor-temperature"
          />
          
          {/* Layer specific */}
          {isLayer && metrics.estimatedFeedSavedKg !== undefined && (
            <MetricCard
              icon={Leaf}
              label={language === 'bn' ? 'আনুমানিক খাবার সাশ্রয়' : 'Estimated Feed Saved'}
              value={metrics.estimatedFeedSavedKg}
              unit="kg"
              subtext={language === 'bn' ? '~আনুমানিক' : '~estimated'}
              color="text-sensor-humidity"
            />
          )}
          
          {/* Broiler specific */}
          {isBroiler && metrics.estimatedWeightPreservedKg !== undefined && (
            <>
              <MetricCard
                icon={Scale}
                label={language === 'bn' ? 'আনুমানিক সংরক্ষিত ওজন' : 'Estimated Weight Preserved'}
                value={metrics.estimatedWeightPreservedKg}
                unit="kg"
                subtext={language === 'bn' ? '~আনুমানিক' : '~estimated'}
                color="text-sensor-water"
              />
              {metrics.fcrImprovementEstimate !== undefined && metrics.fcrImprovementEstimate > 0 && (
                <MetricCard
                  icon={Bird}
                  label={language === 'bn' ? 'FCR উন্নতি আনুমানিক' : 'FCR Improvement Estimate'}
                  value={`-${metrics.fcrImprovementEstimate}`}
                  subtext={language === 'bn' ? 'কম FCR = ভালো দক্ষতা' : 'Lower FCR = Better efficiency'}
                  color="text-primary"
                />
              )}
            </>
          )}
          
          {/* Estimated Extra Profit */}
          <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-primary">
                  {language === 'bn' ? 'আনুমানিক অতিরিক্ত লাভ' : 'Estimated Extra Profit'}
                </p>
                <p className="text-xs text-primary/60">
                  {language === 'bn' ? '* পরিবেশ নিয়ন্ত্রণ থেকে' : '* From environmental control'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">
                  ৳{metrics.estimatedExtraProfitBDT.toLocaleString()}
                </p>
                <p className="text-xs text-primary/60">
                  ~{language === 'bn' ? 'আনুমানিক' : 'estimated'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Stability Indicators */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {isLayer ? <Egg size={18} className="text-sensor-temperature" /> : <Bird size={18} className="text-sensor-water" />}
            {language === 'bn' ? 'স্থিতিশীলতা সূচক' : 'Stability Indicators'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Temperature Stability */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm">
                {language === 'bn' ? 'তাপমাত্রা স্থিতিশীলতা' : 'Temperature Stability'}
              </span>
              <span className="text-sm font-medium">{metrics.tempStabilityIndex}%</span>
            </div>
            <Progress value={metrics.tempStabilityIndex} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.tempStabilityIndex >= 80 
                ? (language === 'bn' ? '✓ ভালো' : '✓ Good')
                : metrics.tempStabilityIndex >= 60
                  ? (language === 'bn' ? '△ উন্নতির সুযোগ আছে' : '△ Room for improvement')
                  : (language === 'bn' ? '⚠ মনোযোগ দিন' : '⚠ Needs attention')}
            </p>
          </div>
          
          {/* Farm Type Specific Index */}
          {isLayer && metrics.eggProductionStabilityIndex !== undefined && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm">
                  {language === 'bn' ? 'ডিম উৎপাদন স্থিতিশীলতা' : 'Egg Production Stability'}
                </span>
                <span className="text-sm font-medium">{metrics.eggProductionStabilityIndex}%</span>
              </div>
              <Progress value={metrics.eggProductionStabilityIndex} className="h-2" />
            </div>
          )}
          
          {isBroiler && metrics.growthComfortScore !== undefined && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm">
                  {language === 'bn' ? 'বৃদ্ধির আরাম স্কোর' : 'Growth Comfort Score'}
                </span>
                <span className="text-sm font-medium">{metrics.growthComfortScore}%</span>
              </div>
              <Progress value={metrics.growthComfortScore} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Disclaimer */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 text-warning-foreground text-xs">
        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" />
        <p>
          {language === 'bn' 
            ? 'এই মানগুলো স্ট্যান্ডার্ড পোল্ট্রি গবেষণার উপর ভিত্তি করে আনুমানিক। প্রকৃত ফলাফল ভিন্ন হতে পারে।'
            : 'These values are estimates based on standard poultry research. Actual results may vary.'}
        </p>
      </div>
    </motion.div>
  );
}
