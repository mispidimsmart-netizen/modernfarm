import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useSelectedShed, useSheds } from '@/hooks/useSheds';
import { useAllDeviceHealth } from '@/hooks/useDeviceHealth';
import { useLiveSensorData } from '@/hooks/useSensorData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, ShieldAlert, Cloud, CloudOff, Cpu, 
  Thermometer, Droplets, Wind, AlertTriangle,
  CheckCircle, Clock, RefreshCw, Zap, Activity
} from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { bn, enUS } from 'date-fns/locale';
import { calculateHSI, getHSILabel, getHSIColor, getHSIBgColor } from '@/lib/heatStressIndex';

interface ShedAutomationStatus {
  shedId: string;
  shedName: string;
  shedNameEn: string;
  isActive: boolean;
  device: {
    isOnline: boolean;
    failsafeMode: boolean;
    lastCloudSync: string | null;
    lastSeen: string | null;
    mode: 'AUTO' | 'FAIL-SAFE';
  } | null;
  sensor: {
    temperature: number;
    humidity: number;
    ammonia: number;
  } | null;
  hsi: {
    index: number;
    level: string;
    fanSpeed: string;
  } | null;
}

export function AutomationEngineDashboard() {
  const { language, user } = useAuth();
  const { data: sheds } = useSheds();
  const { data: deviceHealth } = useAllDeviceHealth();
  const { selectedShedId } = useSelectedShed();
  const sensorData = useLiveSensorData();

  const t = {
    title: { bn: 'অটোমেশন ইঞ্জিন', en: 'Automation Engine' },
    subtitle: { bn: 'প্রতিটি শেড = স্বাধীন ইউনিট', en: 'Each Shed = Independent Unit' },
    cloudSupervisor: { bn: 'ক্লাউড সুপারভাইজার', en: 'Cloud Supervisor' },
    dualExecution: { bn: 'ডুয়াল এক্সিকিউশন', en: 'Dual Execution' },
    esp32Local: { bn: 'ESP32 লোকাল', en: 'ESP32 Local' },
    cloudAdvanced: { bn: 'ক্লাউড অ্যাডভান্সড', en: 'Cloud Advanced' },
    currentMode: { bn: 'বর্তমান মোড', en: 'Current Mode' },
    auto: { bn: 'অটো (ক্লাউড)', en: 'AUTO (Cloud)' },
    failsafe: { bn: 'ফেইল-সেফ', en: 'FAIL-SAFE' },
    offline: { bn: 'অফলাইন', en: 'Offline' },
    lastSync: { bn: 'শেষ সিংক', en: 'Last Sync' },
    hsiStatus: { bn: 'হিট স্ট্রেস ইনডেক্স', en: 'Heat Stress Index' },
    fanAction: { bn: 'ফ্যান অ্যাকশন', en: 'Fan Action' },
    rulesActive: { bn: 'রুলস সক্রিয়', en: 'Rules Active' },
    shedCount: { bn: 'মোট শেড', en: 'Total Sheds' },
    online: { bn: 'অনলাইন', en: 'Online' },
    inFailsafe: { bn: 'ফেইল-সেফে', en: 'In Fail-Safe' },
    birdSafetyFirst: { bn: '🐔 মুরগির নিরাপত্তা সর্বপ্রথম', en: '🐔 Bird Safety First' },
  };

  // Build per-shed status
  const shedStatuses: ShedAutomationStatus[] = (sheds || []).map(shed => {
    const health = deviceHealth?.find(d => d.shed_id === shed.id);
    
    // For demo/current sensor data, use the current selected shed's data
    const sensor = shed.id === selectedShedId && sensorData ? {
      temperature: sensorData.temperature,
      humidity: sensorData.humidity,
      ammonia: sensorData.ammonia,
    } : null;

    let hsi = null;
    if (sensor) {
      const hsiResult = calculateHSI(sensor.temperature, sensor.humidity);
      hsi = {
        index: hsiResult.index,
        level: hsiResult.level,
        fanSpeed: hsiResult.level === 'normal' ? 'OFF' : 
                  hsiResult.level === 'mild' ? 'LOW' :
                  hsiResult.level === 'moderate' ? 'MEDIUM' : 'HIGH',
      };
    }

    return {
      shedId: shed.id,
      shedName: shed.name,
      shedNameEn: shed.name_en,
      isActive: shed.is_active,
      device: health ? {
        isOnline: health.is_online,
        failsafeMode: health.failsafe_mode,
        lastCloudSync: health.last_cloud_sync_at,
        lastSeen: health.last_seen_at,
        mode: health.failsafe_mode ? 'FAIL-SAFE' : 'AUTO',
      } : null,
      sensor,
      hsi,
    };
  });

  const totalSheds = shedStatuses.length;
  const onlineSheds = shedStatuses.filter(s => s.device?.isOnline).length;
  const failsafeSheds = shedStatuses.filter(s => s.device?.failsafeMode).length;

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <span>{t.title[language]}</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {t.subtitle[language]}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Architecture Overview */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-primary">{totalSheds}</p>
              <p className="text-xs text-muted-foreground">{t.shedCount[language]}</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-status-normal/10">
              <p className="text-2xl font-bold text-status-normal">{onlineSheds}</p>
              <p className="text-xs text-muted-foreground">{t.online[language]}</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-amber-500/10">
              <p className="text-2xl font-bold text-amber-600">{failsafeSheds}</p>
              <p className="text-xs text-muted-foreground">{t.inFailsafe[language]}</p>
            </div>
          </div>

          {/* Dual Execution Badge */}
          <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-sm">
            <Zap className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-blue-700 dark:text-blue-300">
              {t.dualExecution[language]}:
            </span>
            <span className="text-blue-600 dark:text-blue-400">
              {t.esp32Local[language]} + {t.cloudAdvanced[language]}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Per-Shed Status Cards */}
      <div className="space-y-3">
        {shedStatuses.map((shed, index) => (
          <motion.div
            key={shed.shedId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <ShedStatusCard 
              status={shed} 
              language={language} 
              isSelected={shed.shedId === selectedShedId}
            />
          </motion.div>
        ))}
      </div>

      {/* Safety Philosophy */}
      <Card className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-900/10">
        <CardContent className="py-3">
          <p className="text-center text-sm font-medium text-amber-700 dark:text-amber-400">
            {t.birdSafetyFirst[language]} — সন্দেহ হলে Fan ON
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function ShedStatusCard({ 
  status, 
  language, 
  isSelected 
}: { 
  status: ShedAutomationStatus; 
  language: 'bn' | 'en';
  isSelected: boolean;
}) {
  const t = {
    mode: { bn: 'মোড', en: 'Mode' },
    auto: { bn: 'অটো', en: 'AUTO' },
    failsafe: { bn: 'ফেইল-সেফ', en: 'FAIL-SAFE' },
    offline: { bn: 'অফলাইন', en: 'Offline' },
    noDevice: { bn: 'ডিভাইস নেই', en: 'No Device' },
    hsi: { bn: 'HSI', en: 'HSI' },
    fan: { bn: 'ফ্যান', en: 'Fan' },
    sync: { bn: 'সিংক', en: 'Sync' },
    never: { bn: 'কখনো না', en: 'Never' },
  };

  const getTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return t.never[language];
    return formatDistanceToNow(new Date(dateStr), {
      locale: language === 'bn' ? bn : enUS,
      addSuffix: true,
    });
  };

  const isFailsafe = status.device?.failsafeMode;
  const isOnline = status.device?.isOnline;
  const hasDevice = status.device !== null;

  return (
    <Card className={`transition-all ${
      isSelected ? 'ring-2 ring-primary' : ''
    } ${
      isFailsafe ? 'border-amber-500/50' : ''
    }`}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between mb-2">
          {/* Shed Name */}
          <div className="flex items-center gap-2">
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
              isFailsafe ? 'bg-amber-500/20' : 
              isOnline ? 'bg-primary/10' : 'bg-muted'
            }`}>
              {isFailsafe ? (
                <ShieldAlert className="h-4 w-4 text-amber-600" />
              ) : isOnline ? (
                <Shield className="h-4 w-4 text-primary" />
              ) : (
                <Cpu className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="font-medium text-sm">
                {language === 'bn' ? status.shedName : status.shedNameEn}
              </p>
              {hasDevice && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {t.sync[language]}: {getTimeAgo(status.device?.lastCloudSync)}
                </p>
              )}
            </div>
          </div>

          {/* Mode Badge */}
          <Badge 
            variant="outline"
            className={`text-xs ${
              !hasDevice ? 'text-muted-foreground' :
              isFailsafe ? 'border-amber-500 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
              isOnline ? 'border-green-500 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
              'text-red-500'
            }`}
          >
            {!hasDevice ? t.noDevice[language] :
             isFailsafe ? t.failsafe[language] :
             isOnline ? t.auto[language] : t.offline[language]}
          </Badge>
        </div>

        {/* HSI & Sensor Data (only if available) */}
        {status.sensor && status.hsi && (
          <div className="grid grid-cols-3 gap-2 mt-2">
            {/* Temperature */}
            <div className="flex items-center gap-1.5 p-1.5 rounded bg-muted/50">
              <Thermometer className="h-3.5 w-3.5 text-orange-500" />
              <span className="text-xs font-medium">{status.sensor.temperature}°C</span>
            </div>
            
            {/* HSI */}
            <div className={`flex items-center gap-1.5 p-1.5 rounded ${getHSIBgColor(status.hsi.level as any)}`}>
              <Activity className={`h-3.5 w-3.5 ${getHSIColor(status.hsi.level as any)}`} />
              <span className={`text-xs font-medium ${getHSIColor(status.hsi.level as any)}`}>
                {status.hsi.index.toFixed(1)}
              </span>
            </div>
            
            {/* Fan Speed */}
            <div className="flex items-center gap-1.5 p-1.5 rounded bg-blue-50 dark:bg-blue-900/20">
              <Wind className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                {status.hsi.fanSpeed}
              </span>
            </div>
          </div>
        )}

        {/* Fail-Safe Warning */}
        {isFailsafe && (
          <div className="mt-2 p-1.5 rounded bg-amber-100 dark:bg-amber-900/30 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            {language === 'bn' 
              ? 'লোকাল অটোমেশন সক্রিয়'
              : 'Local automation active'
            }
          </div>
        )}
      </CardContent>
    </Card>
  );
}
