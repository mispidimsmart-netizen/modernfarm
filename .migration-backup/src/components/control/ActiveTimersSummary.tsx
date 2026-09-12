import { motion } from 'framer-motion';
import { Timer } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface ActiveTimersSummaryProps {
  language: 'bn' | 'en';
  count: number;
}

/** AUTO-mode banner listing how many devices are under temporary override. */
export function ActiveTimersSummary({ language, count }: ActiveTimersSummaryProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="pt-3 pb-3">
          <div className="flex items-center gap-2 text-sm">
            <Timer className="h-4 w-4 text-amber-500" />
            <span className="font-medium text-amber-600 dark:text-amber-400">
              {language === 'bn'
                ? `${count}টি ডিভাইসে সাময়িক কন্ট্রোল সক্রিয়`
                : `${count} device(s) in temporary control`}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {language === 'bn'
              ? 'টাইমার শেষে স্বয়ংক্রিয়ভাবে অটো মোডে ফিরে যাবে'
              : 'Will return to AUTO mode when timer expires'}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
