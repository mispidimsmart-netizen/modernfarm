import { useState, useEffect } from 'react';
import { Battery, Zap, Save } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAllDeviceHealth, useDeviceTokens } from '@/hooks/useDeviceHealth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface DevicePowerSettings {
  id: string;
  device_name: string;
  battery_capacity_wh: number;
  power_consumption_w: number;
}

export function BatterySettingsCard() {
  const { language, user } = useAuth();
  const { data: deviceHealth } = useAllDeviceHealth();
  const { data: deviceTokens } = useDeviceTokens();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [deviceSettings, setDeviceSettings] = useState<DevicePowerSettings[]>([]);

  // Initialize device settings from health data
  useEffect(() => {
    if (deviceHealth && deviceTokens) {
      const settings = deviceHealth.map(health => {
        const token = deviceTokens.find(t => t.id === health.device_token_id);
        return {
          id: health.id,
          device_name: token?.device_name || 'Unknown Device',
          battery_capacity_wh: health.battery_capacity_wh || 100,
          power_consumption_w: health.power_consumption_w || 50,
        };
      });
      setDeviceSettings(settings);
    }
  }, [deviceHealth, deviceTokens]);

  // Update device power settings
  const updateSettings = useMutation({
    mutationFn: async (settings: DevicePowerSettings) => {
      const { error } = await supabase
        .from('device_health')
        .update({
          battery_capacity_wh: settings.battery_capacity_wh,
          power_consumption_w: settings.power_consumption_w,
        })
        .eq('id', settings.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['device_health'] });
      queryClient.invalidateQueries({ queryKey: ['battery-backup-estimate'] });
      toast({
        title: language === 'bn' ? 'সেটিংস সংরক্ষিত' : 'Settings Saved',
        description: language === 'bn' 
          ? 'ব্যাটারি এবং পাওয়ার সেটিংস আপডেট হয়েছে' 
          : 'Battery and power settings updated',
      });
    },
    onError: () => {
      toast({
        title: language === 'bn' ? 'ত্রুটি' : 'Error',
        description: language === 'bn' 
          ? 'সেটিংস সংরক্ষণ করতে সমস্যা হয়েছে' 
          : 'Failed to save settings',
        variant: 'destructive',
      });
    },
  });

  const handleSettingChange = (
    deviceId: string, 
    field: 'battery_capacity_wh' | 'power_consumption_w', 
    value: number
  ) => {
    setDeviceSettings(prev => 
      prev.map(d => d.id === deviceId ? { ...d, [field]: value } : d)
    );
  };

  const handleSave = (device: DevicePowerSettings) => {
    updateSettings.mutate(device);
  };

  // Calculate estimated backup time
  const calculateBackupTime = (capacityWh: number, consumptionW: number) => {
    if (consumptionW <= 0) return '-';
    const hours = capacityWh / consumptionW;
    if (hours >= 1) {
      return `${hours.toFixed(1)} ${language === 'bn' ? 'ঘণ্টা' : 'hours'}`;
    }
    const minutes = Math.round(hours * 60);
    return `${minutes} ${language === 'bn' ? 'মিনিট' : 'minutes'}`;
  };

  if (!deviceSettings.length) {
    return (
      <div className="rounded-2xl bg-card p-4 shadow-card">
        <h3 className="mb-4 flex items-center gap-2 font-semibold">
          <Battery size={18} />
          {language === 'bn' ? 'ব্যাটারি ব্যাকআপ সেটিংস' : 'Battery Backup Settings'}
        </h3>
        <p className="text-center text-sm text-muted-foreground py-4">
          {language === 'bn' 
            ? 'কোনো ডিভাইস সংযুক্ত নেই। প্রথমে ESP32 ডিভাইস যোগ করুন।'
            : 'No devices connected. Add an ESP32 device first.'}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-card p-4 shadow-card">
      <h3 className="mb-2 flex items-center gap-2 font-semibold">
        <Battery size={18} />
        {language === 'bn' ? 'ব্যাটারি ব্যাকআপ সেটিংস' : 'Battery Backup Settings'}
      </h3>
      
      <p className="mb-4 text-sm text-muted-foreground">
        {language === 'bn' 
          ? 'আপনার ব্যাটারি ক্যাপাসিটি এবং পাওয়ার কনসাম্পশন সেট করুন সঠিক backup time calculation এর জন্য।'
          : 'Set your battery capacity and power consumption for accurate backup time calculation.'}
      </p>

      <div className="space-y-6">
        {deviceSettings.map((device) => (
          <div key={device.id} className="rounded-xl bg-muted/50 p-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-medium text-sm">{device.device_name}</span>
              <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Zap size={12} />
                {calculateBackupTime(device.battery_capacity_wh, device.power_consumption_w)}
              </div>
            </div>

            {/* Battery Capacity */}
            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between">
                <Label className="text-sm">
                  {language === 'bn' ? 'ব্যাটারি ক্যাপাসিটি' : 'Battery Capacity'}
                </Label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={device.battery_capacity_wh}
                    onChange={(e) => handleSettingChange(
                      device.id, 
                      'battery_capacity_wh', 
                      Math.max(0, parseInt(e.target.value) || 0)
                    )}
                    className="h-8 w-20 text-right text-sm"
                    min={0}
                    max={10000}
                  />
                  <span className="text-xs text-muted-foreground">Wh</span>
                </div>
              </div>
              <Slider
                value={[device.battery_capacity_wh]}
                onValueChange={([value]) => handleSettingChange(device.id, 'battery_capacity_wh', value)}
                min={0}
                max={1000}
                step={10}
                className="mt-2"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {language === 'bn' 
                  ? 'সাধারণত: 12V 7Ah = 84Wh, 12V 20Ah = 240Wh, 12V 100Ah = 1200Wh'
                  : 'Common: 12V 7Ah = 84Wh, 12V 20Ah = 240Wh, 12V 100Ah = 1200Wh'}
              </p>
            </div>

            {/* Power Consumption */}
            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between">
                <Label className="text-sm">
                  {language === 'bn' ? 'পাওয়ার কনসাম্পশন' : 'Power Consumption'}
                </Label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={device.power_consumption_w}
                    onChange={(e) => handleSettingChange(
                      device.id, 
                      'power_consumption_w', 
                      Math.max(1, parseInt(e.target.value) || 1)
                    )}
                    className="h-8 w-20 text-right text-sm"
                    min={1}
                    max={5000}
                  />
                  <span className="text-xs text-muted-foreground">W</span>
                </div>
              </div>
              <Slider
                value={[device.power_consumption_w]}
                onValueChange={([value]) => handleSettingChange(device.id, 'power_consumption_w', value)}
                min={1}
                max={500}
                step={5}
                className="mt-2"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {language === 'bn' 
                  ? 'সেন্সর + কন্ট্রোলার: ~10-30W, ফ্যান সহ: 50-200W'
                  : 'Sensors + Controller: ~10-30W, With fans: 50-200W'}
              </p>
            </div>

            {/* Estimated Backup */}
            <div className="mb-4 rounded-lg bg-background p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">
                  {language === 'bn' ? 'আনুমানিক ব্যাকআপ সময়' : 'Estimated Backup Time'}
                </span>
                <span className="text-lg font-bold text-primary">
                  {calculateBackupTime(device.battery_capacity_wh, device.power_consumption_w)}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {language === 'bn' 
                  ? 'সূত্র: ক্যাপাসিটি (Wh) ÷ কনসাম্পশন (W) = সময় (ঘণ্টা)'
                  : 'Formula: Capacity (Wh) ÷ Consumption (W) = Time (hours)'}
              </p>
            </div>

            {/* Save Button */}
            <Button
              onClick={() => handleSave(device)}
              disabled={updateSettings.isPending}
              className="w-full"
              size="sm"
            >
              <Save size={14} className="mr-2" />
              {language === 'bn' ? 'সংরক্ষণ করুন' : 'Save Settings'}
            </Button>
          </div>
        ))}
      </div>

      {/* Info Box */}
      <div className="mt-4 rounded-xl bg-primary/5 p-3 text-xs text-muted-foreground">
        <p className="font-medium text-primary mb-1">
          💡 {language === 'bn' ? 'টিপস' : 'Tips'}
        </p>
        <ul className="space-y-1 list-disc list-inside">
          <li>
            {language === 'bn' 
              ? 'ব্যাটারি Wh = Voltage × Ah (যেমন: 12V × 20Ah = 240Wh)'
              : 'Battery Wh = Voltage × Ah (e.g., 12V × 20Ah = 240Wh)'}
          </li>
          <li>
            {language === 'bn' 
              ? 'শুধু ESP32 এবং সেন্সর হলে 10-20W, ফ্যান যুক্ত থাকলে বেশি'
              : 'ESP32 + sensors only: 10-20W, with fans: higher'}
          </li>
          <li>
            {language === 'bn' 
              ? 'বাস্তবে ব্যাটারি 80% efficiency ধরুন'
              : 'In practice, assume 80% battery efficiency'}
          </li>
        </ul>
      </div>
    </div>
  );
}
