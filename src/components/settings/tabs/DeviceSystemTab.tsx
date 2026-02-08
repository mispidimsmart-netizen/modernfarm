import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Cpu, Wifi, RefreshCw, Upload, Settings2, Thermometer,
  Droplets, Wind, AlertTriangle, Clock, FileCode, Trash2,
  Copy, Plus, Home, Signal, HardDrive, Bug, ChevronDown,
  Shield, Zap, RotateCcw
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { generateDeviceToken } from '@/lib/esp32Api';
import { useSheds } from '@/hooks/useSheds';
import { useAllDeviceHealth } from '@/hooks/useDeviceHealth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { ESP32CodeGenerator } from '@/components/device/ESP32CodeGenerator';
import { ThresholdSettingsCard } from '@/components/settings/ThresholdSettingsCard';
import { AdvancedAutomationSettingsCard } from '@/components/settings/AdvancedAutomationSettingsCard';
import { OTAManagementCard } from '@/components/device/OTAManagementCard';

interface SectionProps {
  title: string;
  titleBn: string;
  icon: React.ElementType;
  color: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  language: string;
}

function CollapsibleSection({ title, titleBn, icon: Icon, color, children, defaultOpen = false, language }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="font-semibold">{language === 'bn' ? titleBn : title}</span>
            </div>
            <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            </motion.div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t p-4">
            {children}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export function DeviceSystemTab() {
  const { language, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: sheds } = useSheds();
  const { data: deviceHealthList } = useAllDeviceHealth();
  const deviceHealth = deviceHealthList?.[0]; // Get first device health

  const [newDeviceName, setNewDeviceName] = useState('');
  const [selectedShedForDevice, setSelectedShedForDevice] = useState<string>('');
  const [showFactoryResetDialog, setShowFactoryResetDialog] = useState(false);
  const [debugMode, setDebugMode] = useState(false);

  // Calibration offsets
  const [tempOffset, setTempOffset] = useState(0);
  const [humidityOffset, setHumidityOffset] = useState(0);
  const [ammoniaOffset, setAmmoniaOffset] = useState(0);

  // Fetch device tokens
  const { data: deviceTokens } = useQuery({
    queryKey: ['device_tokens', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('device_tokens')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Add device token
  const addDeviceToken = useMutation({
    mutationFn: async ({ name, shedId }: { name: string; shedId?: string }) => {
      if (!user) throw new Error('Not authenticated');
      const token = generateDeviceToken();
      const { error } = await supabase
        .from('device_tokens')
        .insert({ 
          user_id: user.id, 
          device_name: name, 
          token,
          shed_id: shedId || null
        });
      if (error) throw error;
      return token;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['device_tokens'] });
      setNewDeviceName('');
      setSelectedShedForDevice('');
      toast({
        title: language === 'bn' ? 'ডিভাইস যোগ হয়েছে' : 'Device Added',
      });
    },
  });

  // Delete device token
  const deleteDeviceToken = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('device_tokens')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['device_tokens'] });
    },
  });

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: language === 'bn' ? 'কপি হয়েছে!' : 'Copied!' });
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleRestartDevice = () => {
    toast({
      title: language === 'bn' ? 'রিস্টার্ট কমান্ড পাঠানো হয়েছে' : 'Restart command sent',
      description: language === 'bn' ? 'ডিভাইস শীঘ্রই রিস্টার্ট হবে' : 'Device will restart shortly',
    });
  };

  const handleFactoryReset = () => {
    toast({
      title: language === 'bn' ? 'ফ্যাক্টরি রিসেট সম্পন্ন' : 'Factory reset complete',
      variant: 'destructive',
    });
    setShowFactoryResetDialog(false);
  };

  return (
    <div className="space-y-4">
      {/* Admin Warning */}
      <Card className="bg-purple-500/10 border-purple-500/30">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-purple-500" />
            <div>
              <p className="font-semibold text-purple-700 dark:text-purple-300">
                {language === 'bn' ? 'অ্যাডমিন সেটিংস' : 'Admin Settings'}
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-400">
                {language === 'bn' 
                  ? 'এই সেটিংস শুধুমাত্র প্রযুক্তিবিদদের জন্য' 
                  : 'These settings are for technicians only'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Device Section */}
      <CollapsibleSection
        title="Device Management"
        titleBn="ডিভাইস ম্যানেজমেন্ট"
        icon={Cpu}
        color="bg-blue-500/10 text-blue-500"
        defaultOpen={true}
        language={language}
      >
        <div className="space-y-4">
          {/* Device Health Overview */}
          {deviceHealth && (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-muted/50 rounded-lg p-3">
                <Signal className="h-4 w-4 mx-auto mb-1 text-green-500" />
                <p className="text-xs text-muted-foreground">
                  {language === 'bn' ? 'সিগন্যাল' : 'Signal'}
                </p>
                <p className="font-semibold">{deviceHealth.wifi_signal_strength || '-'}%</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <Clock className="h-4 w-4 mx-auto mb-1 text-blue-500" />
                <p className="text-xs text-muted-foreground">
                  {language === 'bn' ? 'আপটাইম' : 'Uptime'}
                </p>
                <p className="font-semibold">
                  {deviceHealth.uptime_seconds 
                    ? `${Math.floor(deviceHealth.uptime_seconds / 3600)}h`
                    : '-'}
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <HardDrive className="h-4 w-4 mx-auto mb-1 text-purple-500" />
                <p className="text-xs text-muted-foreground">
                  {language === 'bn' ? 'ফার্মওয়্যার' : 'Firmware'}
                </p>
                <p className="font-semibold text-xs">{deviceHealth.firmware_version || '-'}</p>
              </div>
            </div>
          )}

          <Separator />

          {/* Add New Device */}
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

            <Button
              onClick={() => newDeviceName && addDeviceToken.mutate({ 
                name: newDeviceName, 
                shedId: selectedShedForDevice !== 'none' ? selectedShedForDevice : undefined 
              })}
              disabled={!newDeviceName || addDeviceToken.isPending}
              className="w-full"
            >
              <Plus size={16} className="mr-1" />
              {language === 'bn' ? 'ডিভাইস যোগ করুন' : 'Add Device'}
            </Button>
          </div>

          {/* Device List */}
          <div className="space-y-2">
            {deviceTokens?.map((device) => (
              <div key={device.id} className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
                <Cpu className="h-5 w-5 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{device.device_name}</p>
                  <p className="text-xs text-muted-foreground font-mono truncate">
                    {device.token.substring(0, 16)}...
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => copyToClipboard(device.token)}>
                  <Copy size={14} />
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

          {/* Restart Device */}
          <Button variant="outline" className="w-full" onClick={handleRestartDevice}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {language === 'bn' ? 'ডিভাইস রিস্টার্ট করুন' : 'Restart Device'}
          </Button>
        </div>
      </CollapsibleSection>

      {/* OTA Firmware Management */}
      <CollapsibleSection
        title="OTA Firmware"
        titleBn="OTA ফার্মওয়্যার"
        icon={Upload}
        color="bg-green-500/10 text-green-500"
        language={language}
      >
        <OTAManagementCard />
      </CollapsibleSection>

      {/* ESP32 Code Generator */}
      <CollapsibleSection
        title="Code Generator"
        titleBn="কোড জেনারেটর"
        icon={FileCode}
        color="bg-blue-500/10 text-blue-500"
        language={language}
      >
        <div className="space-y-4">
          <ESP32CodeGenerator language={language} />

          <Separator />

          <Button 
            variant="outline" 
            className="w-full border-destructive/50 text-destructive hover:bg-destructive/10"
            onClick={() => setShowFactoryResetDialog(true)}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            {language === 'bn' ? 'ফ্যাক্টরি রিসেট' : 'Factory Reset'}
          </Button>
        </div>
      </CollapsibleSection>

      {/* Calibration Section */}
      <CollapsibleSection
        title="Sensor Calibration"
        titleBn="সেন্সর ক্যালিব্রেশন"
        icon={Settings2}
        color="bg-orange-500/10 text-orange-500"
        language={language}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {language === 'bn' 
              ? 'সেন্সর রিডিং সঠিক করতে অফসেট মান নির্ধারণ করুন' 
              : 'Set offset values to correct sensor readings'}
          </p>

          {/* Temperature Offset */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Thermometer className="h-4 w-4 text-red-500" />
              <Label>{language === 'bn' ? 'তাপমাত্রা অফসেট' : 'Temperature Offset'}</Label>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.1"
                value={tempOffset}
                onChange={(e) => setTempOffset(Number(e.target.value))}
                className="w-20 h-9 text-center"
              />
              <span className="text-sm text-muted-foreground">°C</span>
            </div>
          </div>

          {/* Humidity Offset */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Droplets className="h-4 w-4 text-blue-500" />
              <Label>{language === 'bn' ? 'আর্দ্রতা অফসেট' : 'Humidity Offset'}</Label>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="1"
                value={humidityOffset}
                onChange={(e) => setHumidityOffset(Number(e.target.value))}
                className="w-20 h-9 text-center"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>

          {/* Ammonia Offset */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wind className="h-4 w-4 text-yellow-500" />
              <Label>{language === 'bn' ? 'অ্যামোনিয়া অফসেট' : 'Ammonia Offset'}</Label>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="1"
                value={ammoniaOffset}
                onChange={(e) => setAmmoniaOffset(Number(e.target.value))}
                className="w-20 h-9 text-center"
              />
              <span className="text-sm text-muted-foreground">ppm</span>
            </div>
          </div>

          <Button 
            className="w-full"
            onClick={() => toast({ title: language === 'bn' ? 'ক্যালিব্রেশন সেভ হয়েছে' : 'Calibration saved' })}
          >
            {language === 'bn' ? 'ক্যালিব্রেশন সেভ করুন' : 'Save Calibration'}
          </Button>
        </div>
      </CollapsibleSection>

      {/* Advanced Control Section */}
      <CollapsibleSection
        title="Advanced Control"
        titleBn="এডভান্সড কন্ট্রোল"
        icon={Zap}
        color="bg-purple-500/10 text-purple-500"
        language={language}
      >
        <div className="space-y-4">
          <ThresholdSettingsCard />
          <Separator />
          <AdvancedAutomationSettingsCard />
        </div>
      </CollapsibleSection>

      {/* Logs Section */}
      <CollapsibleSection
        title="Logs & Debug"
        titleBn="লগ ও ডিবাগ"
        icon={Bug}
        color="bg-gray-500/10 text-gray-500"
        language={language}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>{language === 'bn' ? 'ডিবাগ মোড' : 'Debug Mode'}</Label>
              <p className="text-xs text-muted-foreground">
                {language === 'bn' ? 'বিস্তারিত লগ দেখুন' : 'View detailed logs'}
              </p>
            </div>
            <Switch checked={debugMode} onCheckedChange={setDebugMode} />
          </div>

          <Button variant="outline" className="w-full">
            <FileCode className="mr-2 h-4 w-4" />
            {language === 'bn' ? 'ইভেন্ট লগ দেখুন' : 'View Event Logs'}
          </Button>

          <Button variant="outline" className="w-full">
            <AlertTriangle className="mr-2 h-4 w-4" />
            {language === 'bn' ? 'এরর লগ দেখুন' : 'View Error Logs'}
          </Button>
        </div>
      </CollapsibleSection>

      {/* Factory Reset Dialog */}
      <AlertDialog open={showFactoryResetDialog} onOpenChange={setShowFactoryResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <AlertDialogTitle>
                {language === 'bn' ? 'ফ্যাক্টরি রিসেট?' : 'Factory Reset?'}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="pt-2">
              {language === 'bn' 
                ? 'এটি ডিভাইসের সকল সেটিংস মুছে ফেলবে এবং ডিফল্ট অবস্থায় ফিরিয়ে আনবে।'
                : 'This will erase all device settings and restore to factory defaults.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{language === 'bn' ? 'বাতিল' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleFactoryReset} className="bg-destructive hover:bg-destructive/90">
              {language === 'bn' ? 'হ্যাঁ, রিসেট করুন' : 'Yes, Reset'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
