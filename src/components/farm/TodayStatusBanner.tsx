import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTodaySummary } from '@/hooks/useTodaySummary';
import { format } from 'date-fns';
import { bn, enUS } from 'date-fns/locale';

export function TodayStatusBanner() {
  const { language } = useAuth();
  const { data: summary, isLoading } = useTodaySummary();
  
  const today = new Date();
  const dateStr = format(today, 'EEEE, d MMMM', { 
    locale: language === 'bn' ? bn : enUS 
  });

  const hasEnteredToday = summary && summary.todayEggs > 0;

  if (isLoading) {
    return (
      <div className="h-20 rounded-2xl bg-muted/50 animate-pulse" />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl p-4 ${
        hasEnteredToday 
          ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20' 
          : 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground mb-1">{dateStr}</p>
          <div className="flex items-center gap-2">
            {hasEnteredToday ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-semibold text-green-700 dark:text-green-400">
                    {language === 'bn' ? 'আজকের ডেটা এন্ট্রি সম্পন্ন ✓' : "Today's entry complete ✓"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {language === 'bn' 
                      ? `${summary.todayEggs.toLocaleString('bn-BD')} টি ডিম রেকর্ড করা হয়েছে`
                      : `${summary.todayEggs.toLocaleString()} eggs recorded`
                    }
                  </p>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="font-semibold text-amber-700 dark:text-amber-400">
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
            <p className={`text-lg font-bold ${summary.todayProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
    </motion.div>
  );
}
