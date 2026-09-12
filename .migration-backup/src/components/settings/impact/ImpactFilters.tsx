import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  SENSOR_META, DEVICE_META, ALL_SENSORS, ALL_DEVICES,
  type SensorKey, type DeviceKey,
} from '@/lib/sensorDeviceImpact';

interface Props {
  bn: boolean;
  selectedSensors: Set<SensorKey>;
  selectedDevices: Set<DeviceKey>;
  setSelectedSensors: (s: Set<SensorKey>) => void;
  setSelectedDevices: (s: Set<DeviceKey>) => void;
  toggleSensor: (k: SensorKey) => void;
  toggleDevice: (k: DeviceKey) => void;
}

export function ImpactFilters({
  bn, selectedSensors, selectedDevices, setSelectedSensors, setSelectedDevices, toggleSensor, toggleDevice,
}: Props) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="rounded-lg border p-3 bg-muted/30">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs font-semibold">{bn ? '🌡️ সেন্সর নির্বাচন' : '🌡️ Sensors'}</Label>
          <div className="flex gap-1">
            <button
              type="button"
              className="text-[10px] underline text-muted-foreground hover:text-foreground"
              onClick={() => setSelectedSensors(new Set(ALL_SENSORS))}
            >
              {bn ? 'সব' : 'All'}
            </button>
            <span className="text-muted-foreground">·</span>
            <button
              type="button"
              className="text-[10px] underline text-muted-foreground hover:text-foreground"
              onClick={() => setSelectedSensors(new Set())}
            >
              {bn ? 'কোনোটি না' : 'None'}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {ALL_SENSORS.map((k) => (
            <label key={k} className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox checked={selectedSensors.has(k)} onCheckedChange={() => toggleSensor(k)} />
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: SENSOR_META[k].color }} />
              {bn ? SENSOR_META[k].bn : SENSOR_META[k].en}
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-lg border p-3 bg-muted/30">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs font-semibold">{bn ? '⚡ ডিভাইস নির্বাচন' : '⚡ Devices'}</Label>
          <div className="flex gap-1">
            <button
              type="button"
              className="text-[10px] underline text-muted-foreground hover:text-foreground"
              onClick={() => setSelectedDevices(new Set(ALL_DEVICES))}
            >
              {bn ? 'সব' : 'All'}
            </button>
            <span className="text-muted-foreground">·</span>
            <button
              type="button"
              className="text-[10px] underline text-muted-foreground hover:text-foreground"
              onClick={() => setSelectedDevices(new Set())}
            >
              {bn ? 'কোনোটি না' : 'None'}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {ALL_DEVICES.map((k) => (
            <label key={k} className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox checked={selectedDevices.has(k)} onCheckedChange={() => toggleDevice(k)} />
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: DEVICE_META[k].color }} />
              {bn ? DEVICE_META[k].bn : DEVICE_META[k].en}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
