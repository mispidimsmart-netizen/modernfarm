import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTodaySummary } from '@/hooks/useTodaySummary';
import { useFarmType } from '@/hooks/useFarmType';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { bn, enUS } from 'date-fns/locale';

export function TodayStatusBanner() {
  const { language } = useAuth();
  const { data: summary, isLoading } = useTodaySummary();
  const { isLayer, isBroiler } = useFarmType();
  
  const today = new Date();
  const dateStr = format(today, 'EEEE, d MMMM', { 
    locale: language === 'bn' ? bn : enUS 
  });

  const hasEnteredToday = Boolean(summary?.hasTodayEntry);
  const completedText = isLayer
    ? `${(summary?.todayEggs ?? 0).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')} টি ডিম রেকর্ড করা হয়েছে`
    : isBroiler
      ? `খাদ্য ${(summary?.todayBroilerFeedKg ?? 0).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')} কেজি, মৃত্যু ${(summary?.todayMortality ?? 0).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}টি`
      : '';

  if (isLoading) {
    return (
      <div className="h-20 rounded-2xl bg-muted/50 animate-pulse" />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className={`border ${hasEnteredToday ? 'border-green-500/30 bg-green-500/5' : 'border-primary/30 bg-primary/5'}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-1">{dateStr}</p>
              <div className="flex items-center gap-2">
                {hasEnteredToday ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-semibold text-green-700 dark:text-green-400">
                        {language === 'bn' ? 'আজকের ডেটা এন্ট্রি সম্পন্ন ✓' : "Today's entry complete ✓"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {language === 'bn' ? completedText : completedText}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-semibold text-foreground">
                        {language === 'bn' ? 'আজকের ডেটা এন্ট্রি বাকি আছে' : "Today's entry pending"}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock size={12} />
                        {language === 'bn' 
                          ? 'নিচের + বাটনে ট্যাপ করুন'
                          : 'Tap + button below to start'
                        }
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {hasEnteredToday && summary && (
              <div className="text-right">
                <p className={`text-lg font-bold ${summary.todayProfit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                  ৳{Math.abs(summary.todayProfit).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {summary.todayProfit >= 0 
                    ? (language === 'bn' ? 'আজকের লাভ' : "Today's profit")
                    : (language === 'bn' ? 'আজকের ক্ষতি' : "Today's loss")
                  }
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
