import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Fan, Droplets, Egg, TrendingUp, Zap, 
  DollarSign, BarChart3, Wheat 
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCostAnalytics } from '@/hooks/useCostAnalytics';
import { useFarmType } from '@/hooks/useFarmType';
import { BroilerCostDashboard } from './BroilerCostDashboard';
import { 
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, 
  Tooltip, CartesianGrid, BarChart, Bar, Legend 
} from 'recharts';

export function CostAnalyticsDashboard() {
  const { language } = useAuth();
  const { isBroiler } = useFarmType();
  const analytics = useCostAnalytics(30);

  const formatCurrency = (value: number) => {
    return `৳${value.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}`;
  };

  // Prepare chart data - must be before conditional return
  const trendChartData = useMemo(() => {
    return analytics.dailyTrends.map(day => ({
      ...day,
      date: new Date(day.date).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', {
        day: 'numeric',
        month: 'short',
      }),
    }));
  }, [analytics.dailyTrends, language]);

  // If broiler farm, show broiler-specific dashboard
  if (isBroiler) {
    return <BroilerCostDashboard />;
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Fan Power Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl bg-gradient-to-br from-orange-500/10 to-red-500/10 p-4 border border-orange-500/20"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="rounded-lg bg-orange-500/20 p-2">
              <Fan size={18} className="text-orange-500" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {language === 'bn' ? 'ফ্যান পাওয়ার' : 'Fan Power'}
            </span>
          </div>
          <p className="text-2xl font-bold">{analytics.fanRuntime.estimatedKwh} kWh</p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatCurrency(analytics.fanRuntime.estimatedCost)} / {language === 'bn' ? '৩০ দিন' : '30 days'}
          </p>
          <div className="mt-2 flex gap-1 text-[10px]">
            <span className="rounded bg-green-500/20 px-1.5 py-0.5 text-green-600">
              L: {analytics.fanRuntime.lowSpeedHours}h
            </span>
            <span className="rounded bg-yellow-500/20 px-1.5 py-0.5 text-yellow-600">
              M: {analytics.fanRuntime.mediumSpeedHours}h
            </span>
            <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-red-600">
              H: {analytics.fanRuntime.highSpeedHours}h
            </span>
          </div>
        </motion.div>

        {/* Water Usage Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 p-4 border border-blue-500/20"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="rounded-lg bg-blue-500/20 p-2">
              <Droplets size={18} className="text-blue-500" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {language === 'bn' ? 'পানি ব্যবহার' : 'Water Usage'}
            </span>
          </div>
          <p className="text-2xl font-bold">{analytics.waterUsage.totalLiters.toLocaleString()} L</p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatCurrency(analytics.waterUsage.estimatedCost)} / {language === 'bn' ? '৩০ দিন' : '30 days'}
          </p>
          <p className="text-xs text-blue-500 mt-2">
            {language === 'bn' ? 'গড়:' : 'Avg:'} {analytics.waterUsage.dailyAverage} L/{language === 'bn' ? 'দিন' : 'day'}
          </p>
        </motion.div>
      </div>

      {/* Cost Per Egg Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-xl bg-card p-4 shadow-card"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2">
              <Egg size={18} className="text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">
                {language === 'bn' ? 'প্রতি ডিম খরচ' : 'Cost Per Egg'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {language === 'bn' ? 'গত ৩০ দিনের হিসাব' : 'Last 30 days calculation'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-primary">
              ৳{analytics.costPerEgg.totalCostPerEgg.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">
              / {language === 'bn' ? 'ডিম' : 'egg'}
            </p>
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <Wheat size={16} className="mx-auto mb-1 text-amber-500" />
            <p className="text-lg font-bold">৳{analytics.costPerEgg.feedCostPerEgg.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground">
              {language === 'bn' ? 'খাদ্য' : 'Feed'}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <Zap size={16} className="mx-auto mb-1 text-yellow-500" />
            <p className="text-lg font-bold">৳{analytics.costPerEgg.electricityCostPerEgg.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground">
              {language === 'bn' ? 'বিদ্যুৎ' : 'Electric'}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <Droplets size={16} className="mx-auto mb-1 text-blue-500" />
            <p className="text-lg font-bold">৳{analytics.costPerEgg.waterCostPerEgg.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground">
              {language === 'bn' ? 'পানি' : 'Water'}
            </p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="flex justify-between text-sm border-t pt-3">
          <div>
            <p className="text-muted-foreground">{language === 'bn' ? 'মোট ডিম' : 'Total Eggs'}</p>
            <p className="font-semibold">{analytics.costPerEgg.totalEggs.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground">{language === 'bn' ? 'মোট খাদ্য খরচ' : 'Total Feed Cost'}</p>
            <p className="font-semibold">{formatCurrency(analytics.costPerEgg.totalFeedCost)}</p>
          </div>
        </div>
      </motion.div>

      {/* 7-Day Trends Chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-xl bg-card p-4 shadow-card"
      >
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={18} className="text-primary" />
          <h3 className="font-semibold">
            {language === 'bn' ? '৭ দিনের ট্রেন্ড' : '7-Day Trends'}
          </h3>
        </div>

        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10 }} 
                stroke="hsl(var(--muted-foreground))"
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 10 }} 
                stroke="hsl(var(--muted-foreground))"
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number, name: string) => {
                  const labels: Record<string, string> = {
                    eggs: language === 'bn' ? 'ডিম' : 'Eggs',
                    feedKg: language === 'bn' ? 'খাদ্য (kg)' : 'Feed (kg)',
                    waterLiters: language === 'bn' ? 'পানি (L)' : 'Water (L)',
                  };
                  return [value, labels[name] || name];
                }}
              />
              <Legend 
                formatter={(value) => {
                  const labels: Record<string, string> = {
                    eggs: language === 'bn' ? 'ডিম' : 'Eggs',
                    feedKg: language === 'bn' ? 'খাদ্য' : 'Feed',
                    waterLiters: language === 'bn' ? 'পানি' : 'Water',
                  };
                  return labels[value] || value;
                }}
                wrapperStyle={{ fontSize: '10px' }}
              />
              <Bar dataKey="eggs" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="feedKg" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Water Usage Trend */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="rounded-xl bg-card p-4 shadow-card"
      >
        <div className="flex items-center gap-2 mb-4">
          <Droplets size={18} className="text-blue-500" />
          <h3 className="font-semibold">
            {language === 'bn' ? 'পানি ব্যবহার ট্রেন্ড' : 'Water Usage Trend'}
          </h3>
        </div>

        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendChartData}>
              <defs>
                <linearGradient id="waterGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--sensor-water))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--sensor-water))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10 }} 
                stroke="hsl(var(--muted-foreground))"
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 10 }} 
                stroke="hsl(var(--muted-foreground))"
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                formatter={(value: number) => [`${value} L`, language === 'bn' ? 'পানি' : 'Water']}
              />
              <Area
                type="monotone"
                dataKey="waterLiters"
                stroke="hsl(var(--sensor-water))"
                fill="url(#waterGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Quick Tips */}
      <div className="rounded-xl bg-primary/5 p-4 text-sm">
        <p className="font-medium text-primary mb-2">
          💡 {language === 'bn' ? 'খরচ কমানোর টিপস' : 'Cost Saving Tips'}
        </p>
        <ul className="space-y-1.5 text-xs text-muted-foreground list-disc list-inside">
          <li>
            {language === 'bn' 
              ? 'রাতে ফ্যান লো স্পিডে চালান - ৫০% বিদ্যুৎ সাশ্রয়'
              : 'Run fans on low speed at night - 50% power savings'}
          </li>
          <li>
            {language === 'bn' 
              ? 'নিপল ড্রিংকার ব্যবহার করুন - ৩০% পানি সাশ্রয়'
              : 'Use nipple drinkers - 30% water savings'}
          </li>
          <li>
            {language === 'bn' 
              ? 'সকালে ঠান্ডা সময়ে খাওয়ান - ভালো FCR'
              : 'Feed during cool morning hours - better FCR'}
          </li>
        </ul>
      </div>
    </div>
  );
}
