import { SafeDeviceCard, type DeviceMode } from '@/components/control';
import { evaluateSafetyLock } from '@/lib/deviceSafetyLock';
import type { ControlDeviceMeta } from '@/data/controlDevices';

interface Props {
  devices: ControlDeviceMeta[];
  isDeviceActive: (deviceKey: string) => boolean;
  getDeviceMode: (deviceKey: string) => DeviceMode;
  getRemainingTime: (deviceKey: string) => string | null;
  activeTimers: Record<string, { endTime: number; duration: number }>;
  temperature: number;
  ammonia: number;
  tempMax: number;
  ammoniaMax: number;
  engineEnabled?: boolean | null;
  onRunTemporarily: (device: ControlDeviceMeta) => void;
  onStopTemporarily: (device: ControlDeviceMeta) => void;
  onCancelOverride: (deviceKey: string) => void;
  disabled: boolean;
}

/**
 * AUTO mode grid — timer-based temporary overrides. Devices held ON by a
 * safety protection are rendered locked (no stop action offered).
 */
export function AutoDeviceGrid({
  devices,
  isDeviceActive,
  getDeviceMode,
  getRemainingTime,
  activeTimers,
  temperature,
  ammonia,
  tempMax,
  ammoniaMax,
  engineEnabled,
  onRunTemporarily,
  onStopTemporarily,
  onCancelOverride,
  disabled,
}: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
      {devices.map((device) => {
        const { isSafetyLocked, reason } = evaluateSafetyLock({
          deviceKey: device.key,
          temperature,
          ammonia,
          tempMax,
          ammoniaMax,
          engineEnabled,
        });

        return (
          <SafeDeviceCard
            key={device.key}
            deviceKey={device.key}
            icon={device.icon}
            name={device.name}
            description={device.description}
            isActive={isDeviceActive(device.key)}
            mode={isSafetyLocked ? 'safety_lock' : getDeviceMode(device.key)}
            remainingTime={getRemainingTime(device.key)}
            isSafetyLocked={isSafetyLocked}
            safetyReason={reason}
            hasOverride={Boolean(activeTimers[device.key])}
            isAutoMode
            onRunTemporarily={() => onRunTemporarily(device)}
            onStopTemporarily={() => onStopTemporarily(device)}
            onCancelOverride={() => onCancelOverride(device.key)}
            disabled={disabled}
          />
        );
      })}
    </div>
  );
}
