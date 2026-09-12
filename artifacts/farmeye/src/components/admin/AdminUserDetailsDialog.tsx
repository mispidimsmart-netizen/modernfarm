import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Thermometer, Droplets, Wind } from 'lucide-react';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';
import type { AdminUser } from '@/hooks/useSuperAdmin';
import type { AdminPageLabels } from '@/data/adminPageLabels';

interface ShedRow {
  id: string;
  name: string;
  name_en?: string | null;
  is_active?: boolean | null;
}

interface SensorSnapshot {
  temperature: number | string;
  humidity: number | string;
  ammonia: number | string;
}

interface AdminUserDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedUser: AdminUser | null;
  sheds?: ShedRow[] | null;
  sensor?: SensorSnapshot | null;
  labels: AdminPageLabels;
}

export function AdminUserDetailsDialog({
  open,
  onOpenChange,
  selectedUser,
  sheds,
  sensor,
  labels,
}: AdminUserDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-white/10 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={selectedUser?.avatar_url || undefined} />
              <AvatarFallback className="bg-purple-600">
                {selectedUser?.farm_name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            {selectedUser?.farm_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* User Info Section */}
          <div className="bg-slate-700/50 rounded-lg p-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              👤 {labels.userInfo}
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-600/50 rounded-lg p-3">
                <p className="text-gray-400 text-xs">{labels.userName}</p>
                <p className="font-medium">{selectedUser?.user_name || labels.noName}</p>
              </div>
              <div className="bg-slate-600/50 rounded-lg p-3">
                <p className="text-gray-400 text-xs">{labels.phone}</p>
                <p className="font-medium">{selectedUser?.phone || labels.noPhone}</p>
              </div>
              <div className="bg-slate-600/50 rounded-lg p-3">
                <p className="text-gray-400 text-xs">{labels.email}</p>
                <p className="font-medium text-sm">{selectedUser?.email || labels.noEmail}</p>
              </div>
              <div className="bg-slate-600/50 rounded-lg p-3">
                <p className="text-gray-400 text-xs">{labels.joined}</p>
                <p className="font-medium">
                  {selectedUser && format(new Date(selectedUser.created_at), 'dd MMM yyyy', { locale: bn })}
                </p>
              </div>
            </div>
          </div>

          {/* Farm Info Section */}
          <div className="bg-slate-700/50 rounded-lg p-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              🏠 {labels.farmInfo}
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-600/50 rounded-lg p-3">
                <p className="text-gray-400 text-xs">{labels.farmName}</p>
                <p className="font-medium">{selectedUser?.farm_name}</p>
              </div>
              <div className="bg-slate-600/50 rounded-lg p-3">
                <p className="text-gray-400 text-xs">{labels.farmType}</p>
                <p className="font-medium flex items-center gap-2">
                  {selectedUser?.farm_type === 'broiler' ? '🐔' : '🥚'}
                  {selectedUser?.farm_type === 'broiler' ? labels.broiler : labels.layer}
                </p>
              </div>
              <div className="bg-slate-600/50 rounded-lg p-3">
                <p className="text-gray-400 text-xs">{labels.sheds}</p>
                <p className="font-medium">{selectedUser?.sheds_count || 0}</p>
              </div>
            </div>
          </div>

          {/* Sensor Data */}
          {sensor && (
            <div className="bg-slate-700/50 rounded-lg p-4">
              <h4 className="font-medium mb-3">{labels.latestSensorData}</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-orange-500/10 rounded-lg">
                  <Thermometer className="w-6 h-6 text-orange-400 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-orange-400">{sensor.temperature}°C</p>
                  <p className="text-xs text-gray-400">{labels.temperature}</p>
                </div>
                <div className="text-center p-3 bg-blue-500/10 rounded-lg">
                  <Droplets className="w-6 h-6 text-blue-400 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-blue-400">{sensor.humidity}%</p>
                  <p className="text-xs text-gray-400">{labels.humidity}</p>
                </div>
                <div className="text-center p-3 bg-green-500/10 rounded-lg">
                  <Wind className="w-6 h-6 text-green-400 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-green-400">{sensor.ammonia}ppm</p>
                  <p className="text-xs text-gray-400">{labels.ammonia}</p>
                </div>
              </div>
            </div>
          )}

          {/* Sheds List */}
          <div className="bg-slate-700/50 rounded-lg p-4">
            <h4 className="font-medium mb-3">{labels.shedsList}</h4>
            {sheds && sheds.length > 0 ? (
              <div className="space-y-2">
                {sheds.map((shed) => (
                  <div key={shed.id} className="flex items-center justify-between p-3 bg-slate-600/50 rounded-lg">
                    <div>
                      <p className="font-medium">{shed.name}</p>
                      <p className="text-sm text-gray-400">{shed.name_en}</p>
                    </div>
                    <Badge variant="outline" className={shed.is_active ? 'border-green-500 text-green-400' : 'border-gray-500 text-gray-400'}>
                      {shed.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-4">{labels.noSheds}</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
