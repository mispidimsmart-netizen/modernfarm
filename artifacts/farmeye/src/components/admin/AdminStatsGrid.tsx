import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Building2, Cpu, AlertTriangle } from 'lucide-react';
import type { AdminPageLabels } from '@/data/adminPageLabels';

interface AdminStats {
  totalUsers: number;
  totalSheds: number;
  activeDevices: number;
  alertsToday: number;
  layerFarms: number;
  broilerFarms: number;
  activeBroilerBatches: number;
}

interface AdminStatsGridProps {
  stats?: AdminStats | null;
  loadingStats: boolean;
  labels: AdminPageLabels;
}

export function AdminStatsGrid({ stats, loadingStats, labels }: AdminStatsGridProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Users — Teal primary brand */}
      <Card className="bg-gradient-to-br from-[#1F7A3E] via-emerald-700 to-teal-800 border border-emerald-400/30 text-white shadow-xl shadow-emerald-900/40 hover:shadow-emerald-500/30 transition-shadow">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100/80 text-sm font-medium">{labels.totalUsers}</p>
              {loadingStats ? (
                <Skeleton className="h-9 w-16 bg-emerald-400/30 mt-1" />
              ) : (
                <p className="text-4xl font-bold mt-1">{stats?.totalUsers || 0}</p>
              )}
              {!loadingStats && stats && (
                <div className="flex gap-2 mt-1.5">
                  <Badge variant="outline" className="text-[10px] border-emerald-300/50 text-emerald-100 px-1.5 py-0">
                    🥚 {stats.layerFarms}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] border-emerald-300/50 text-emerald-100 px-1.5 py-0">
                    🐔 {stats.broilerFarms}
                  </Badge>
                </div>
              )}
            </div>
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/20">
              <Users className="w-7 h-7 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Sheds — Cyan/Sky */}
      <Card className="bg-gradient-to-br from-sky-600 via-cyan-700 to-teal-800 border border-cyan-400/30 text-white shadow-xl shadow-cyan-900/40 hover:shadow-cyan-500/30 transition-shadow">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-cyan-100/80 text-sm font-medium">{labels.totalSheds}</p>
              {loadingStats ? (
                <Skeleton className="h-9 w-16 bg-cyan-400/30 mt-1" />
              ) : (
                <p className="text-4xl font-bold mt-1">{stats?.totalSheds || 0}</p>
              )}
            </div>
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/20">
              <Building2 className="w-7 h-7 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Devices — Indigo/Blue */}
      <Card className="bg-gradient-to-br from-indigo-600 via-blue-700 to-slate-800 border border-blue-400/30 text-white shadow-xl shadow-blue-900/40 hover:shadow-blue-500/30 transition-shadow">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100/80 text-sm font-medium">{labels.activeDevices}</p>
              {loadingStats ? (
                <Skeleton className="h-9 w-16 bg-blue-400/30 mt-1" />
              ) : (
                <p className="text-4xl font-bold mt-1">{stats?.activeDevices || 0}</p>
              )}
              {!loadingStats && stats && stats.activeBroilerBatches > 0 && (
                <Badge variant="outline" className="text-[10px] border-blue-300/50 text-blue-100 px-1.5 py-0 mt-1.5">
                  🐔 {stats.activeBroilerBatches} ব্যাচ সক্রিয়
                </Badge>
              )}
            </div>
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/20">
              <Cpu className="w-7 h-7 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts Today — Amber/Rose */}
      <Card className="bg-gradient-to-br from-amber-600 via-orange-700 to-rose-800 border border-amber-400/30 text-white shadow-xl shadow-amber-900/40 hover:shadow-amber-500/30 transition-shadow">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-100/80 text-sm font-medium">{labels.alertsToday}</p>
              {loadingStats ? (
                <Skeleton className="h-9 w-16 bg-amber-400/30 mt-1" />
              ) : (
                <p className="text-4xl font-bold mt-1">{stats?.alertsToday || 0}</p>
              )}
            </div>
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/20">
              <AlertTriangle className="w-7 h-7 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
