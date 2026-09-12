import { motion } from 'framer-motion';
import { 
  Bird, Wheat, Scale, TrendingUp, DollarSign, 
  AlertTriangle, BarChart3, Activity
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useBroilerCostAnalytics } from '@/hooks/useBroilerCostAnalytics';
import { 
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, 
  Tooltip, CartesianGrid, LineChart, Line, Legend
} from 'recharts';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function BroilerCostDashboard() {
  const { language } = useAuth();
  const { analytics, isLoading, hasActiveBatch } = useBroilerCostAnalytics();
  const navigate = useNavigate();

  const formatCurrency = (value: number) => {
    return `৳${value.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US')}`;
  };

  // Show empty state if no active batch
  if (!isLoading && !hasActiveBatch) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Bird className="w-16 h-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">
          {language === 'bn' ? 'কোন সক্রিয় ব্যাচ নেই' : 'No Active Batch'}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {language === 'bn' 
            ? 'খরচ বিশ্লেষণ দেখতে প্রথমে একটি ব্রয়লার ব্যাচ তৈরি করুন'
            : 'Create a broiler batch first to see cost analytics'}
        </p>
        <Button onClick={() => navigate('/farm')}>
          {language === 'bn' ? 'ব্যাচ তৈরি করুন' : 'Create Batch'}
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // FCR color based on rating
  const fcrColors = {
    excellent: 'text-green-500',
    good: 'text-blue-500',
    average: 'text-yellow-500',
    poor: 'text-red-500',
    none: 'text-muted-foreground',
  };

  const fcrLabels = {
    excellent: language === 'bn' ? 'চমৎকার' : 'Excellent',
    good: language === 'bn' ? 'ভালো' : 'Good',
    average: language === 'bn' ? 'গড়' : 'Average',
    poor: language === 'bn' ? 'খারাপ' : 'Poor',
    none: language === 'bn' ? 'ডাটা নেই' : 'No Data',
  };

  // Prepare trend chart data
  const trendChartData = analytics.dailyTrends.map(day => ({
    ...day,
    date: new Date(day.date).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', {
      day: 'numeric',
      month: 'short',
    }),
    weightKg: day.weight / 1000,
  }));

  return (
    <div className="space-y-4">
      {/* Active Batch Header */}
      {analytics.activeBatch && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-4 border border-amber-500/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Bird className="w-5 h-5 text-amber-500" />
                <h3 className="font-semibold">
                  {language === 'bn' ? analytics.activeBatch.nameBn : analytics.activeBatch.name}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {language === 'bn' ? 'বয়স:' : 'Age:'} {analytics.activeBatch.ageDays} {language === 'bn' ? 'দিন' : 'days'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{analytics.activeBatch.currentBirds.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">
                {language === 'bn' ? 'বর্তমান পাখি' : 'Current Birds'}
              </p>
            </div>
          </div>
          
          {analytics.activeBatch.mortalityPercent > 3 && (
            <div className="mt-3 flex items-center gap-2 text-xs text-red-500">
              <AlertTriangle size={14} />
              <span>
                {language === 'bn' 
                  ? `মৃত্যুহার: ${analytics.activeBatch.mortalityPercent}% (${analytics.activeBatch.mortalityCount} পাখি)`
                  : `Mortality: ${analytics.activeBatch.mortalityPercent}% (${analytics.activeBatch.mortalityCount} birds)`}
              </span>
            </div>
          )}
        </motion.div>
      )}

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Cost Per Kg Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl bg-card p-4 shadow-card"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="rounded-lg bg-primary/10 p-2">
              <DollarSign size={18} className="text-primary" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {language === 'bn' ? 'প্রতি কেজি খরচ' : 'Cost/Kg'}
            </span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(analytics.costPerKg.totalCostPerKg)}</p>
          <p className={`text-xs mt-1 ${analytics.costPerKg.profitPerKg > 0 ? 'text-green-500' : 'text-red-500'}`}>
            {analytics.costPerKg.profitPerKg > 0 ? '+' : ''}{formatCurrency(analytics.costPerKg.profitPerKg)} {language === 'bn' ? 'লাভ' : 'profit'}
          </p>
        </motion.div>

        {/* FCR Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl bg-card p-4 shadow-card"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="rounded-lg bg-blue-500/10 p-2">
              <Activity size={18} className="text-blue-500" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">FCR</span>
          </div>
          <p className="text-2xl font-bold">{analytics.weightAnalytics.fcr || '—'}</p>
          <p className={`text-xs mt-1 ${fcrColors[analytics.weightAnalytics.fcrRating]}`}>
            {fcrLabels[analytics.weightAnalytics.fcrRating]}
          </p>
        </motion.div>

        {/* Weight Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl bg-card p-4 shadow-card"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="rounded-lg bg-green-500/10 p-2">
              <Scale size={18} className="text-green-500" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {language === 'bn' ? 'গড় ওজন' : 'Avg Weight'}
            </span>
          </div>
          <p className="text-2xl font-bold">{analytics.weightAnalytics.currentWeight}g</p>
          <p className={`text-xs mt-1 ${analytics.weightAnalytics.weightGap >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {analytics.weightAnalytics.weightGap >= 0 ? '+' : ''}{analytics.weightAnalytics.weightGap}g vs {language === 'bn' ? 'টার্গেট' : 'target'}
          </p>
        </motion.div>

        {/* Feed Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-xl bg-card p-4 shadow-card"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="rounded-lg bg-amber-500/10 p-2">
              <Wheat size={18} className="text-amber-500" />
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {language === 'bn' ? 'মোট খাদ্য' : 'Total Feed'}
            </span>
          </div>
          <p className="text-2xl font-bold">{analytics.feedAnalytics.totalFeedKg} kg</p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatCurrency(analytics.feedAnalytics.totalFeedCost)}
          </p>
        </motion.div>
      </div>

      {/* Batch Financial Summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="rounded-xl bg-card p-4 shadow-card"
      >
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={18} className="text-primary" />
          <h3 className="font-semibold">
            {language === 'bn' ? 'ব্যাচ আর্থিক সারাংশ' : 'Batch Financial Summary'}
          </h3>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{language === 'bn' ? 'বাচ্চা খরচ' : 'Chick Cost'}</span>
            <span>{formatCurrency(analytics.batchTotals.totalChickCost)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{language === 'bn' ? 'খাদ্য খরচ' : 'Feed Cost'}</span>
            <span>{formatCurrency(analytics.batchTotals.totalFeedCost)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{language === 'bn' ? 'অন্যান্য খরচ' : 'Other Expenses'}</span>
            <span>{formatCurrency(analytics.batchTotals.totalOtherExpenses)}</span>
          </div>
          
          <div className="border-t pt-3">
            <div className="flex justify-between font-semibold">
              <span>{language === 'bn' ? 'মোট বিনিয়োগ' : 'Total Investment'}</span>
              <span>{formatCurrency(analytics.batchTotals.totalInvestment)}</span>
            </div>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span>{language === 'bn' ? 'আনুমানিক বিক্রয়' : 'Est. Revenue'}</span>
              <span className="font-medium">{formatCurrency(analytics.batchTotals.estimatedRevenue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">{language === 'bn' ? 'আনুমানিক লাভ' : 'Est. Profit'}</span>
              <span className={`font-bold ${analytics.batchTotals.estimatedProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatCurrency(analytics.batchTotals.estimatedProfit)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{language === 'bn' ? 'লাভ মার্জিন' : 'Profit Margin'}</span>
              <span>{analytics.batchTotals.profitMargin}%</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Cost Breakdown Per Kg */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="rounded-xl bg-card p-4 shadow-card"
      >
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={18} className="text-primary" />
          <h3 className="font-semibold">
            {language === 'bn' ? 'প্রতি কেজি খরচ বিভাজন' : 'Cost Breakdown Per Kg'}
          </h3>
        </div>

        <div className="grid grid-cols-5 gap-2 text-center">
          <div className="rounded-lg bg-amber-500/10 p-2">
            <p className="text-sm font-bold text-amber-600">৳{analytics.costPerKg.chickCost}</p>
            <p className="text-[10px] text-muted-foreground">{language === 'bn' ? 'বাচ্চা' : 'Chick'}</p>
          </div>
          <div className="rounded-lg bg-orange-500/10 p-2">
            <p className="text-sm font-bold text-orange-600">৳{analytics.costPerKg.feedCost}</p>
            <p className="text-[10px] text-muted-foreground">{language === 'bn' ? 'খাদ্য' : 'Feed'}</p>
          </div>
          <div className="rounded-lg bg-yellow-500/10 p-2">
            <p className="text-sm font-bold text-yellow-600">৳{analytics.costPerKg.electricityCost}</p>
            <p className="text-[10px] text-muted-foreground">{language === 'bn' ? 'বিদ্যুৎ' : 'Power'}</p>
          </div>
          <div className="rounded-lg bg-blue-500/10 p-2">
            <p className="text-sm font-bold text-blue-600">৳{analytics.costPerKg.waterCost}</p>
            <p className="text-[10px] text-muted-foreground">{language === 'bn' ? 'পানি' : 'Water'}</p>
          </div>
          <div className="rounded-lg bg-gray-500/10 p-2">
            <p className="text-sm font-bold text-gray-600">৳{analytics.costPerKg.otherCost}</p>
            <p className="text-[10px] text-muted-foreground">{language === 'bn' ? 'অন্যান্য' : 'Other'}</p>
          </div>
        </div>
      </motion.div>

      {/* 7-Day Trends Chart */}
      {analytics.dailyTrends.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
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
                      feedKg: language === 'bn' ? 'খাদ্য (kg)' : 'Feed (kg)',
                      mortality: language === 'bn' ? 'মৃত্যু' : 'Mortality',
                    };
                    return [value, labels[name] || name];
                  }}
                />
                <Legend 
                  formatter={(value) => {
                    const labels: Record<string, string> = {
                      feedKg: language === 'bn' ? 'খাদ্য' : 'Feed',
                      mortality: language === 'bn' ? 'মৃত্যু' : 'Deaths',
                    };
                    return labels[value] || value;
                  }}
                  wrapperStyle={{ fontSize: '10px' }}
                />
                <Bar dataKey="feedKg" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="mortality" fill="hsl(217 91% 60%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* Weight Gain Chart (actual vs target) */}
      {analytics.weightHistory.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75 }}
          className="rounded-xl bg-card p-4 shadow-card"
        >
          <div className="flex items-center gap-2 mb-4">
            <Scale size={18} className="text-green-500" />
            <h3 className="font-semibold">
              {language === 'bn' ? 'ওজন বৃদ্ধির গ্রাফ' : 'Weight Gain Trend'}
            </h3>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.weightHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="ageDays"
                  tick={{ fontSize: 10 }}
                  stroke="hsl(var(--muted-foreground))"
                  tickLine={false}
                  label={{ value: language === 'bn' ? 'বয়স (দিন)' : 'Age (days)', position: 'insideBottom', offset: -2, fontSize: 10 }}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  stroke="hsl(var(--muted-foreground))"
                  tickLine={false}
                  label={{ value: 'g', angle: -90, position: 'insideLeft', fontSize: 10 }}
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
                      weight: language === 'bn' ? 'প্রকৃত ওজন' : 'Actual',
                      targetWeight: language === 'bn' ? 'টার্গেট' : 'Target',
                    };
                    return [`${value} g`, labels[name] || name];
                  }}
                  labelFormatter={(v) => `${language === 'bn' ? 'বয়স' : 'Day'}: ${v}`}
                />
                <Legend
                  formatter={(value) => {
                    const labels: Record<string, string> = {
                      weight: language === 'bn' ? 'প্রকৃত' : 'Actual',
                      targetWeight: language === 'bn' ? 'টার্গেট' : 'Target',
                    };
                    return labels[value] || value;
                  }}
                  wrapperStyle={{ fontSize: '10px' }}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="hsl(142 71% 45%)"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="targetWeight"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* FCR Trend Chart (cumulative FCR vs industry target) */}
      {analytics.fcrTrend.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="rounded-xl bg-card p-4 shadow-card"
        >
          <div className="flex items-center gap-2 mb-4">
            <Activity size={18} className="text-blue-500" />
            <h3 className="font-semibold">
              {language === 'bn' ? 'FCR ট্রেন্ড চার্ট' : 'FCR Trend Chart'}
            </h3>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.fcrTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="ageDays"
                  tick={{ fontSize: 10 }}
                  stroke="hsl(var(--muted-foreground))"
                  tickLine={false}
                  label={{ value: language === 'bn' ? 'বয়স (দিন)' : 'Age (days)', position: 'insideBottom', offset: -2, fontSize: 10 }}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  stroke="hsl(var(--muted-foreground))"
                  tickLine={false}
                  domain={[0, 'auto']}
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
                      fcr: language === 'bn' ? 'প্রকৃত FCR' : 'Actual FCR',
                      target: language === 'bn' ? 'টার্গেট FCR' : 'Target FCR',
                    };
                    return [value, labels[name] || name];
                  }}
                  labelFormatter={(v) => `${language === 'bn' ? 'বয়স' : 'Day'}: ${v}`}
                />
                <Legend
                  formatter={(value) => {
                    const labels: Record<string, string> = {
                      fcr: language === 'bn' ? 'প্রকৃত' : 'Actual',
                      target: language === 'bn' ? 'টার্গেট' : 'Target',
                    };
                    return labels[value] || value;
                  }}
                  wrapperStyle={{ fontSize: '10px' }}
                />
                <Line
                  type="monotone"
                  dataKey="fcr"
                  stroke="hsl(217 91% 60%)"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="target"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            {language === 'bn'
              ? 'প্রকৃত লাইন টার্গেটের নিচে থাকলে ভালো (কম খাদ্যে বেশি ওজন)।'
              : 'Lower than target line is better (less feed for more weight).'}
          </p>
        </motion.div>
      )}


      <div className="rounded-xl bg-primary/5 p-4 text-sm">
        <p className="font-medium text-primary mb-2">
          💡 {language === 'bn' ? 'ব্রয়লার খরচ কমানোর টিপস' : 'Broiler Cost Saving Tips'}
        </p>
        <ul className="space-y-1.5 text-xs text-muted-foreground list-disc list-inside">
          <li>
            {language === 'bn' 
              ? 'FCR ১.৮ এর নিচে রাখুন - প্রতি ০.১ কমলে ৫% খরচ সাশ্রয়'
              : 'Keep FCR below 1.8 - every 0.1 reduction saves 5% cost'}
          </li>
          <li>
            {language === 'bn' 
              ? 'প্রথম ৭ দিন সঠিক তাপমাত্রা (৩৩°C) নিশ্চিত করুন'
              : 'Ensure correct temperature (33°C) in first 7 days'}
          </li>
          <li>
            {language === 'bn' 
              ? 'মৃত্যুহার ৩% এর নিচে রাখুন - সঠিক বায়োসিকিউরিটি'
              : 'Keep mortality below 3% - proper biosecurity'}
          </li>
        </ul>
      </div>
    </div>
  );
}
