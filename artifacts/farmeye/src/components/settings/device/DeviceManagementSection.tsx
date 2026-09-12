import { useState } from 'react';
import { Clock, Copy, Cpu, HardDrive, Plus, RefreshCw, Shield, Signal, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Props {
  language: string;
  deviceHealth?: any;
  sheds?: Array<{ id: string; name: string; name_en: string }>;
  deviceTokens?: any[];
  addDeviceToken: { mutate: (v: { name: string; shedId?: string }, opts?: any) => void; isPending: boolean };
  deleteDeviceToken: { mutate: (id: string) => void };
  onCopyToken: (token: string) => void;
  onRestartDevice: () => void;
  onOpenSecurity: (device: { id: string; name: string; version: number }) => void;
}

/** Device tokens CRUD + health snapshot + restart action. */
export function DeviceManagementSection({
  language,
  deviceHealth,
  sheds,
  deviceTokens,
  addDeviceToken,
  deleteDeviceToken,
  onCopyToken,
  onRestartDevice,
  onOpenSecurity,
}: Props) {
  const [newDeviceName, setNewDeviceName] = useState('');
  const [selectedShedForDevice, setSelectedShedForDevice] = useState('');

  const handleAdd = () => {
    if (!newDeviceName) return;
    addDeviceToken.mutate(
      {
        name: newDeviceName,
        shedId:
          selectedShedForDevice && selectedShedForDevice !== 'none' ? selectedShedForDevice : undefined,
      },
      {
        onSuccess: () => {
          setNewDeviceName('');
          setSelectedShedForDevice('');
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      {deviceHealth && (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-muted/50 rounded-lg p-3">
            <Signal className="h-4 w-4 mx-auto mb-1 text-green-500" />
            <p className="text-xs text-muted-foreground">{language === 'bn' ? 'সিগন্যাল' : 'Signal'}</p>
            <p className="font-semibold">{deviceHealth.wifi_signal_strength || '-'}%</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <Clock className="h-4 w-4 mx-auto mb-1 text-blue-500" />
            <p className="text-xs text-muted-foreground">{language === 'bn' ? 'আপটাইম' : 'Uptime'}</p>
            <p className="font-semibold">
              {deviceHealth.uptime_seconds ? `${Math.floor(deviceHealth.uptime_seconds / 3600)}h` : '-'}
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <HardDrive className="h-4 w-4 mx-auto mb-1 text-purple-500" />
            <p className="text-xs text-muted-foreground">{language === 'bn' ? 'ফার্মওয়্যার' : 'Firmware'}</p>
            <p className="font-semibold text-xs">{deviceHealth.firmware_version || '-'}</p>
          </div>
        </div>
      )}

      <Separator />

      <div className="space-y-3">
        <Label>{language === 'bn' ? 'নতুন ডিভাইস যোগ করুন' : 'Add New Device'}</Label>
        <div className="flex gap-2">
          <Input
            placeholder={language === 'bn' ? 'ডিভাইসের নাম' : 'Device name'}
            value={newDeviceName}
            onChange={(e) => setNewDeviceName(e.target.value)}
            className="flex-1"
          />
        </div>

        {sheds && sheds.length > 0 && (
          <Select value={selectedShedForDevice} onValueChange={setSelectedShedForDevice}>
            <SelectTrigger>
              <SelectValue placeholder={language === 'bn' ? 'শেড নির্বাচন করুন' : 'Select shed'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{language === 'bn' ? 'কোনো শেড নয়' : 'No shed'}</SelectItem>
              {sheds.map((shed) => (
                <SelectItem key={shed.id} value={shed.id}>
                  {language === 'bn' ? shed.name : shed.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Button onClick={handleAdd} disabled={!newDeviceName || addDeviceToken.isPending} className="w-full">
          <Plus size={16} className="mr-1" />
          {language === 'bn' ? 'ডিভাইস যোগ করুন' : 'Add Device'}
        </Button>
      </div>

      <div className="space-y-2">
        {deviceTokens?.map((device: any) => (
          <div key={device.id} className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
            <Cpu className="h-5 w-5 text-primary" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm">{device.device_name}</p>
                {(device.secret_version ?? 0) >= 1 ? (
                  <Badge className="bg-primary/10 text-primary text-[10px] px-1.5 py-0">
                    <Shield className="h-2.5 w-2.5 mr-0.5" />
                    HMAC v{device.secret_version}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-600 border-amber-600/40">
                    Legacy
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground font-mono truncate">{device.token.substring(0, 16)}...</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onCopyToken(device.token)}>
              <Copy size={14} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-primary"
              title={language === 'bn' ? 'সিকিউরিটি' : 'Security'}
              onClick={() =>
                onOpenSecurity({ id: device.id, name: device.device_name, version: device.secret_version ?? 0 })
              }
            >
              <Shield size={14} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive"
              onClick={() => deleteDeviceToken.mutate(device.id)}
            >
              <Trash2 size={14} />
            </Button>
          </div>
        ))}
      </div>

      <Button variant="outline" className="w-full" onClick={onRestartDevice}>
        <RefreshCw className="mr-2 h-4 w-4" />
        {language === 'bn' ? 'ডিভাইস রিস্টার্ট করুন' : 'Restart Device'}
      </Button>
    </div>
  );
}
