import { Badge } from '@/components/ui/badge';
import { Thermometer, Droplets, Wind, Building2, User } from 'lucide-react';
import type { AdminSensorChartLabels } from '@/data/adminSensorChartLabels';

interface Props {
  labels: AdminSensorChartLabels;
  selectedUserId: string;
  selectedFarmName?: string | null;
  stats: { avgTemp: number; avgHumidity: number; avgAmmonia: number; totalReadings: number; farmCount: number };
}

export function AdminSensorStatsBadges({ labels, selectedUserId, selectedFarmName, stats }: Props) {
  return (
    <div className="flex flex-wrap gap-3">
      {selectedUserId !== 'all' && selectedFarmName && (
        <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 px-4 py-1.5 shadow-lg shadow-green-500/30">
          <User className="w-3.5 h-3.5 mr-1.5" />
          {labels.selectedFarm}: {selectedFarmName}
        </Badge>
      )}
      <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 px-4 py-1.5 shadow-lg shadow-orange-500/30">
        <Thermometer className="w-3.5 h-3.5 mr-1.5" />
        {labels.avgTemp}: {stats.avgTemp}°C
      </Badge>
      <Badge className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-0 px-4 py-1.5 shadow-lg shadow-cyan-500/30">
        <Droplets className="w-3.5 h-3.5 mr-1.5" />
        {labels.avgHumidity}: {stats.avgHumidity}%
      </Badge>
      <Badge className="bg-gradient-to-r from-purple-500 to-pink-600 text-white border-0 px-4 py-1.5 shadow-lg shadow-purple-500/30">
        <Wind className="w-3.5 h-3.5 mr-1.5" />
        {labels.avgAmmonia}: {stats.avgAmmonia} ppm
      </Badge>
      {selectedUserId === 'all' && (
        <Badge className="bg-gradient-to-r from-indigo-500 to-violet-600 text-white border-0 px-4 py-1.5 shadow-lg shadow-indigo-500/30">
          <Building2 className="w-3.5 h-3.5 mr-1.5" />
          {stats.farmCount} {labels.farms}
        </Badge>
      )}
      <Badge className="bg-gradient-to-r from-slate-600 to-slate-700 text-white border-0 px-4 py-1.5 shadow-lg">
        {stats.totalReadings} {labels.readings}
      </Badge>
    </div>
  );
}
