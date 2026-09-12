import { Activity, AlertTriangle, CheckCircle2, Database, Wifi, WifiOff, XCircle, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SensorHealthPanel } from './SensorHealthPanel';
import type { HealthLabels } from './labels';
import type { HealthProfile } from './useSystemHealthData';

interface Props {
  labels: HealthLabels;
  selectedUserId: string;
  selectedUser?: HealthProfile;
  dbStatus?: { connected: boolean; latency: number; error?: string };
  loadingDb: boolean;
  activityStats?: {
    sensorLogsToday: number;
    ongoingOutages: number;
    onlineDevices: number;
    totalDevices: number;
    failsafeDevices: number;
    alertsToday: number;
  };
  loadingActivity: boolean;
  sensorHealth: React.ComponentProps<typeof SensorHealthPanel>['sensorHealth'];
  loadingSensorHealth: boolean;
}

/** Left column: database reachability, today's counters and sensor grading. */
export function SystemStatusCard({
  labels,
  selectedUserId,
  selectedUser,
  dbStatus,
  loadingDb,
  activityStats,
  loadingActivity,
  sensorHealth,
  loadingSensorHealth,
}: Props) {
  const healthy = (selectedUserId === 'all' ? dbStatus?.connected : true) && !activityStats?.ongoingOutages;

  return (
    <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/70 border-cyan-500/20 shadow-xl shadow-cyan-500/5">
      <CardHeader className="pb-3 border-b border-cyan-500/10">
        <CardTitle className="text-white flex items-center gap-3 text-base">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="bg-gradient-to-r from-cyan-200 to-blue-200 bg-clip-text text-transparent font-semibold">
            {selectedUserId === 'all' ? labels.systemHealth : labels.userHealth}
          </span>
          {selectedUser && (
            <Badge variant="outline" className="ml-2 text-cyan-300 border-cyan-400/30 bg-cyan-500/10">
              {selectedUser.farm_name}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {selectedUserId === 'all' && (
          <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-slate-800/80 to-slate-700/50 border border-blue-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Database className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-medium">{labels.database}</span>
            </div>
            {loadingDb ? (
              <Skeleton className="h-7 w-24 bg-slate-600" />
            ) : (
              <div className="flex items-center gap-3">
                {dbStatus?.connected ? (
                  <>
                    <Badge className="bg-emerald-500/30 text-emerald-200 border-emerald-400/30 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                      {labels.connected}
                    </Badge>
                    <span className="text-sm text-cyan-300 font-mono bg-cyan-500/10 px-2 py-0.5 rounded-lg">
                      {dbStatus.latency}ms
                    </span>
                  </>
                ) : (
                  <Badge className="bg-rose-500/30 text-rose-200 border-rose-400/30 font-medium">
                    <XCircle className="w-3.5 h-3.5 mr-1.5" />
                    {labels.disconnected}
                  </Badge>
                )}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-yellow-600/10 border border-amber-500/20 text-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center mx-auto mb-2 shadow-lg shadow-amber-500/30">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <p className="text-3xl font-bold text-white">{loadingActivity ? '-' : activityStats?.sensorLogsToday || 0}</p>
            <p className="text-xs text-amber-200/80 mt-1">{labels.sensorLogs}</p>
          </div>
          <div
            className={`p-4 rounded-xl border text-center ${
              activityStats?.ongoingOutages
                ? 'bg-gradient-to-br from-rose-500/10 to-red-600/10 border-rose-500/20'
                : 'bg-gradient-to-br from-emerald-500/10 to-green-600/10 border-emerald-500/20'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-lg ${
                activityStats?.ongoingOutages
                  ? 'bg-gradient-to-br from-rose-500 to-red-600 shadow-rose-500/30'
                  : 'bg-gradient-to-br from-emerald-500 to-green-600 shadow-emerald-500/30'
              }`}
            >
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <p className="text-3xl font-bold text-white">{loadingActivity ? '-' : activityStats?.ongoingOutages || 0}</p>
            <p className={`text-xs mt-1 ${activityStats?.ongoingOutages ? 'text-rose-200/80' : 'text-emerald-200/80'}`}>
              {labels.powerOutages}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-gradient-to-br from-orange-500/10 to-amber-600/10 border border-orange-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
                <AlertTriangle className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm text-orange-200/80 font-medium">{labels.alertsToday}</span>
            </div>
            <Badge
              className={`text-lg font-bold px-3 py-1 ${
                activityStats?.alertsToday
                  ? 'bg-rose-500/30 text-rose-200 border-rose-400/30'
                  : 'bg-emerald-500/30 text-emerald-200 border-emerald-400/30'
              }`}
            >
              {loadingActivity ? '-' : activityStats?.alertsToday || 0}
            </Badge>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-slate-700/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">{labels.deviceStatus}</span>
            <div className="flex items-center gap-2">
              {activityStats?.failsafeDevices ? (
                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">
                  {activityStats.failsafeDevices} Failsafe
                </Badge>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-green-400" />
              <span className="text-white font-medium">{loadingActivity ? '-' : activityStats?.onlineDevices || 0}</span>
              <span className="text-gray-400 text-sm">{labels.online}</span>
            </div>
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-red-400" />
              <span className="text-white font-medium">
                {loadingActivity ? '-' : (activityStats?.totalDevices || 0) - (activityStats?.onlineDevices || 0)}
              </span>
              <span className="text-gray-400 text-sm">{labels.offline}</span>
            </div>
          </div>
        </div>

        <SensorHealthPanel labels={labels} loading={loadingSensorHealth} sensorHealth={sensorHealth} />

        <div
          className={`p-3 rounded-lg text-center ${
            healthy ? 'bg-green-500/10 border border-green-500/30' : 'bg-orange-500/10 border border-orange-500/30'
          }`}
        >
          {healthy ? (
            <div className="flex items-center justify-center gap-2 text-green-400">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">{labels.systemOk}</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-orange-400">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">{labels.attentionRequired}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
