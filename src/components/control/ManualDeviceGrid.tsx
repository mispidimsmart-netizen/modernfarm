import { motion } from 'framer-motion';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { getDeviceColors } from '@/data/deviceColors';
import type { ControlDeviceMeta } from '@/data/controlDevices';
import { evaluateSafetyLock } from '@/lib/deviceSafetyLock';

interface Props {
  devices: ControlDeviceMeta[];
  language: 'bn' | 'en';
  isDeviceActive: (deviceKey: string) => boolean;
  pendingCommands: Record<string, { desired: boolean; startedAt: number }>;
  onToggle: (deviceKey: string, next: boolean) => void;
  disabled: boolean;
  /** Live safety context — Safety Engine still applies in MANUAL mode when ON. */
  temperature?: number;
  ammonia?: number;
  tempMax?: number;
  ammoniaMax?: number;
  engineEnabled?: boolean | null;
}

/**
 * MANUAL mode grid — direct ON/OFF switches with a pending spinner until the
 * ESP32 confirms the actual state.
 */
export function ManualDeviceGrid({
  devices,
  language,
  isDeviceActive,
  pendingCommands,
  onToggle,
  disabled,
  temperature = 0,
  ammonia = 0,
  tempMax = 32,
  ammoniaMax = 25,
  engineEnabled,
}: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4">
      {devices.map((device, index) => {
        const active = isDeviceActive(device.key);
        const Icon = device.icon;
        const isPending = !!pendingCommands[device.key];
        const c = getDeviceColors(device.key);
        const { isSafetyLocked, reason } = evaluateSafetyLock({
          deviceKey: device.key,
          temperature,
          ammonia,
          tempMax,
          ammoniaMax,
          engineEnabled,
        });

        return (
          <motion.div
            key={device.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
          >
            <Card
              className={`border-2 transition-all duration-300 h-full ${
                isPending
                  ? 'border-amber-500/60 bg-amber-500/5'
                  : active
                    ? 'border-current/40 shadow-md ' + c.activeShadow
                    : 'border-border/50 hover:border-border bg-card'
              }`}
              style={active && !isPending ? { borderColor: 'transparent' } : undefined}
            >
              <CardContent className="py-3 px-3 flex flex-col gap-2.5">
                {/* Row 1: icon + switch */}
                <div className="flex items-start justify-between gap-2">
                  <div className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 ${
                    active && !isPending
                      ? `${c.activeBg} text-white shadow-lg ${c.activeShadow}`
                      : isPending
                        ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                        : `bg-muted ${c.iconTint}`
                  }`}>
                    <Icon className={`h-5 w-5 ${active && !isPending ? 'animate-pulse' : ''}`} />
                    {active && !isPending && (
                      <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${c.activeBg} opacity-75`} />
                        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${c.activeBg}`} />
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Switch
                      checked={active}
                      onCheckedChange={(val) => onToggle(device.key, val)}
                      disabled={disabled || isPending || (isSafetyLocked && active)}
                      className={`${!isPending ? c.switchOn : 'data-[state=checked]:bg-amber-500 data-[state=unchecked]:bg-amber-500/40'}`}
                    />
                    {isPending && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-white shadow">
                        <Loader2 className="h-3 w-3 animate-spin" />
                      </span>
                    )}
                  </div>
                </div>

                {/* Row 2: name + description */}
                <div className="flex flex-col gap-0.5 min-w-0">
                  <p className="text-sm font-bold leading-tight truncate">{device.name[language]}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2">{device.description[language]}</p>
                </div>

                {isSafetyLocked && reason && (
                  <div className="flex items-start gap-1.5 rounded-md bg-red-500/10 border border-red-500/30 px-2 py-1">
                    <ShieldAlert className="h-3 w-3 text-red-600 mt-0.5 shrink-0" />
                    <p className="text-[10px] leading-tight text-muted-foreground">{reason[language]}</p>
                  </div>
                )}

                {/* Row 3: state pill */}
                <div className="flex items-center justify-between pt-1 border-t border-border/40">
                  <span className={`text-[10px] font-bold tracking-wider ${
                    isPending
                      ? 'text-amber-600 dark:text-amber-400'
                      : active ? c.iconTint : 'text-muted-foreground'
                  }`}>
                    {isPending
                      ? (language === 'bn' ? 'অপেক্ষায়…' : 'PENDING…')
                      : (active ? 'ON' : 'OFF')}
                  </span>
                  {active && !isPending && (
                    <span className={`h-1.5 w-1.5 rounded-full ${c.activeBg} animate-pulse`} />
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
