/**
 * SmartActionDock — Sticky context-aware action above the BottomNav (S2.3)
 *
 * Surfaces ONE primary action when sensors detect an out-of-range condition:
 *   - Hot      → toggle Fan
 *   - Cold     → toggle Heater
 *   - High NH3 → toggle Fogger
 *
 * Hidden when:
 *   - Logged-out / on auth routes
 *   - Sensors stale or device offline (no trustworthy context)
 *   - All readings within range (no clutter)
 *
 * Uses HoldToConfirmButton for safety on every relay write.
 * Cloud writes desired_* via useSendDeviceCommand (never overrides actual).
 */

import { memo, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Fan, Flame, Wind } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRealtimeSensorData, useRealtimeStatusLevels, useRealtimeDeviceStatus } from '@/hooks/useRealtimeSensorData';
import { useFarmSettings } from '@/hooks/useFarmData';
import { useSendDeviceCommand } from '@/hooks/useDeviceCommands';
import { HoldToConfirmButton } from '@/components/ui/hold-to-confirm-button';
import { cn } from '@/lib/utils';

const HIDDEN_ROUTES = ['/login', '/reset-password', '/org-signup'];

type DeviceKey = 'fan' | 'heater' | 'fogger';

interface ActionConfig {
  device: DeviceKey;
  isOn: boolean;
  Icon: typeof Fan;
  reason: { bn: string; en: string };
  toneClass: string;
  /**
   * Priority weight — lower = shown first.
   * Tens digit = severity (10 danger, 20 warning).
   * Ones digit = metric tie-break (1 temperature, 2 ammonia, 3 humidity).
   * Rule of thumb: life-safety (temperature) > air quality (ammonia) > comfort.
   */
  priority: number;
}

export const SmartActionDock = memo(function SmartActionDock() {
  const { user, language } = useAuth();
  const location = useLocation();
  const { sensorData, hasRealData } = useRealtimeSensorData();
  const status = useRealtimeStatusLevels(sensorData);
  const { status: deviceStatus } = useRealtimeDeviceStatus();
  const { data: settings } = useFarmSettings();
  const sendCmd = useSendDeviceCommand();

  // Build the FULL list of currently-violated conditions, then pick the
  // highest-priority one. Multi-alert tie-break is deterministic:
  //   danger temperature → danger ammonia → danger cold
  //   warning hot         → warning ammonia → warning cold
  const { primary, extraCount } = useMemo<{ primary: ActionConfig | null; extraCount: number }>(() => {
    if (!hasRealData || !settings) return { primary: null, extraCount: 0 };

    const candidates: ActionConfig[] = [];
    const tMax = Number(settings.temperature_max);
    const tMin = Number(settings.temperature_min);
    const nh3Max = Number(settings.ammonia_max);

    // Hot → fan
    if (sensorData.temperature > tMax) {
      const sev = status.temperature === 'danger' ? 10 : 20;
      candidates.push({
        device: 'fan',
        isOn: deviceStatus.fan,
        Icon: Fan,
        reason: {
          bn: `শেড গরম (${sensorData.temperature.toFixed(1)}°C)`,
          en: `Shed hot (${sensorData.temperature.toFixed(1)}°C)`,
        },
        toneClass: sev === 10 ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700',
        priority: sev + 1,
      });
    }
    // High ammonia → fogger
    if (sensorData.ammonia > nh3Max) {
      const sev = status.ammonia === 'danger' ? 10 : 20;
      candidates.push({
        device: 'fogger',
        isOn: deviceStatus.fogger,
        Icon: Wind,
        reason: {
          bn: `অ্যামোনিয়া বেশি (${sensorData.ammonia.toFixed(0)} ppm)`,
          en: `Ammonia high (${sensorData.ammonia.toFixed(0)} ppm)`,
        },
        toneClass: sev === 10 ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700',
        priority: sev + 2,
      });
    }
    // Cold → heater
    if (sensorData.temperature < tMin) {
      const sev = status.temperature === 'danger' ? 10 : 20;
      candidates.push({
        device: 'heater',
        isOn: deviceStatus.heater,
        Icon: Flame,
        reason: {
          bn: `শেড ঠান্ডা (${sensorData.temperature.toFixed(1)}°C)`,
          en: `Shed cold (${sensorData.temperature.toFixed(1)}°C)`,
        },
        toneClass: sev === 10 ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700',
        priority: sev + 3,
      });
    }

    if (candidates.length === 0) return { primary: null, extraCount: 0 };

    candidates.sort((a, b) => a.priority - b.priority);
    return { primary: candidates[0], extraCount: candidates.length - 1 };
  }, [hasRealData, settings, status, sensorData, deviceStatus]);

  if (!user) return null;
  if (HIDDEN_ROUTES.some(r => location.pathname.startsWith(r))) return null;
  if (!primary) return null;
  const action = primary;

  const { device, isOn, Icon, reason, toneClass } = action;
  const targetState = !isOn;
  const verb = targetState
    ? (language === 'bn' ? 'চালু করুন' : 'Turn ON')
    : (language === 'bn' ? 'বন্ধ করুন' : 'Turn OFF');

  const deviceLabel = {
    fan:    { bn: 'ফ্যান', en: 'Fan' },
    heater: { bn: 'হিটার', en: 'Heater' },
    fogger: { bn: 'ফগার', en: 'Fogger' },
  }[device];

  const handleConfirm = () => {
    sendCmd.mutate({ commandType: device, commandValue: targetState });
  };

  return (
    <AnimatePresence>
      <motion.div
        key={`${device}-${isOn}`}
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        className="fixed inset-x-0 bottom-[64px] z-40 px-3 pb-2 pointer-events-none"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)' }}
      >
        <div className="mx-auto flex max-w-md items-center gap-2 rounded-2xl border bg-card/95 p-2 shadow-lg backdrop-blur-md pointer-events-auto">
          <div className={cn(
            'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white',
            toneClass.split(' ')[0]
          )}>
            <Icon size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {language === 'bn' ? 'প্রস্তাবিত পদক্ষেপ' : 'Suggested action'}
            </p>
            <p className="truncate text-xs font-medium text-foreground">
              {reason[language]}
            </p>
          </div>
          <HoldToConfirmButton
            onConfirm={handleConfirm}
            holdMs={700}
            variant={targetState ? 'destructive' : 'primary'}
            label={`${deviceLabel[language]} ${verb}`}
            holdingLabel={language === 'bn' ? 'নিশ্চিত করছি…' : 'Confirming…'}
            icon={<Icon size={14} />}
            className={cn(
              'h-10 px-3 text-xs font-semibold flex-shrink-0',
              toneClass
            )}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

export default SmartActionDock;
