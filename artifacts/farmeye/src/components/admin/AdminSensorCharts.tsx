import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Thermometer, Droplets, TrendingUp, RefreshCw, Wind } from 'lucide-react';
import { adminSensorChartLabels } from '@/data/adminSensorChartLabels';
import { useAdminSensorAnalytics } from '@/hooks/useAdminSensorAnalytics';
import { AdminSensorUserSelector } from '@/components/admin/sensor-charts/AdminSensorUserSelector';
import { AdminSensorStatsBadges } from '@/components/admin/sensor-charts/AdminSensorStatsBadges';
import { SensorTrendChartCard } from '@/components/admin/sensor-charts/SensorTrendChartCard';
import { FarmComparisonChartCard } from '@/components/admin/sensor-charts/FarmComparisonChartCard';

interface AdminSensorChartsProps {
  language?: 'bn' | 'en';
}

export function AdminSensorCharts({ language = 'bn' }: AdminSensorChartsProps) {
  const labels = adminSensorChartLabels[language];
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [open, setOpen] = useState(false);

  const { profiles, sensorData, isLoading, hourlyData, farmComparison, overallStats, selectedProfile } =
    useAdminSensorAnalytics(selectedUserId);

  const chartConfig = {
    avgTemp: { label: labels.temperature, color: 'hsl(25, 95%, 53%)' },
    avgHumidity: { label: labels.humidity, color: 'hsl(210, 100%, 50%)' },
    avgAmmonia: { label: labels.ammonia, color: 'hsl(280, 80%, 60%)' },
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48 bg-slate-700/50" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-[300px] bg-slate-700/50" />
          <Skeleton className="h-[300px] bg-slate-700/50" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header with User Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h3 className="text-xl font-bold flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <span className="bg-gradient-to-r from-emerald-200 to-green-200 bg-clip-text text-transparent">
            {labels.title}
          </span>
        </h3>

        <AdminSensorUserSelector
          labels={labels}
          profiles={profiles}
          selectedUserId={selectedUserId}
          selectedProfile={selectedProfile}
          onSelect={setSelectedUserId}
          open={open}
          setOpen={setOpen}
        />
      </div>

      <AdminSensorStatsBadges
        labels={labels}
        selectedUserId={selectedUserId}
        selectedFarmName={selectedProfile?.farm_name}
        stats={overallStats}
      />

      {sensorData && sensorData.length > 0 ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <SensorTrendChartCard
              title={labels.temperatureTrend}
              subtitle={labels.last24Hours}
              icon={<Thermometer className="w-4 h-4 text-white" />}
              data={hourlyData}
              dataKey="avgTemp"
              color="hsl(25, 95%, 53%)"
              gradientId="tempGradient"
              unit="°C"
              domain={['dataMin - 2', 'dataMax + 2']}
              chartConfig={chartConfig}
              cardClass="bg-gradient-to-br from-orange-950/40 via-slate-900/80 to-red-950/30 border-orange-500/20 shadow-xl shadow-orange-500/10 backdrop-blur-sm"
              iconWrapClass="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/40"
              titleClass="bg-gradient-to-r from-orange-200 to-red-200 bg-clip-text text-transparent font-semibold"
              subtitleClass="text-xs text-orange-300/60 ml-11"
            />

            <SensorTrendChartCard
              title={labels.humidityTrend}
              subtitle={labels.last24Hours}
              icon={<Droplets className="w-4 h-4 text-white" />}
              data={hourlyData}
              dataKey="avgHumidity"
              color="hsl(195, 100%, 50%)"
              gradientId="humidityGradient"
              unit="%"
              domain={[0, 100]}
              chartConfig={chartConfig}
              cardClass="bg-gradient-to-br from-cyan-950/40 via-slate-900/80 to-blue-950/30 border-cyan-500/20 shadow-xl shadow-cyan-500/10 backdrop-blur-sm"
              iconWrapClass="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/40"
              titleClass="bg-gradient-to-r from-cyan-200 to-blue-200 bg-clip-text text-transparent font-semibold"
              subtitleClass="text-xs text-cyan-300/60 ml-11"
            />
          </div>

          {/* Ammonia Trend (full width when viewing specific user) */}
          {selectedUserId !== 'all' && (
            <SensorTrendChartCard
              title={labels.ammoniaTrend}
              subtitle={labels.last24Hours}
              icon={<Wind className="w-4 h-4 text-white" />}
              data={hourlyData}
              dataKey="avgAmmonia"
              color="hsl(280, 80%, 60%)"
              gradientId="ammoniaGradient"
              unit=" ppm"
              domain={[0, 'dataMax + 5']}
              chartConfig={chartConfig}
              cardClass="bg-gradient-to-br from-purple-950/40 via-slate-900/80 to-pink-950/30 border-purple-500/20 shadow-xl shadow-purple-500/10 backdrop-blur-sm"
              iconWrapClass="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/40"
              titleClass="bg-gradient-to-r from-purple-200 to-pink-200 bg-clip-text text-transparent font-semibold"
              subtitleClass="text-xs text-purple-300/60 ml-11"
            />
          )}

          {/* Farm Comparison Bar Chart (only when all farms selected) */}
          {selectedUserId === 'all' && farmComparison.length > 0 && (
            <FarmComparisonChartCard labels={labels} data={farmComparison} chartConfig={chartConfig} />
          )}
        </>
      ) : (
        <Card className="bg-gradient-to-br from-slate-800/80 via-slate-900/90 to-slate-800/80 border-slate-600/30 shadow-xl backdrop-blur-sm">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center mx-auto mb-4 shadow-lg">
              <RefreshCw className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-300 text-lg font-medium">{labels.noData}</p>
            {selectedUserId !== 'all' && (
              <p className="text-slate-500 text-sm mt-2">{labels.noUserData}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
