import { Droplets, Thermometer, Wind } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  language: string;
  tempOffset: number;
  setTempOffset: (v: number) => void;
  humidityOffset: number;
  setHumidityOffset: (v: number) => void;
  ammoniaOffset: number;
  setAmmoniaOffset: (v: number) => void;
  onSave: () => void;
  saving: boolean;
}

/** Sensor offset inputs. Values are cached locally and persisted to the DB for ESP32 sync. */
export function SensorCalibrationSection({
  language,
  tempOffset,
  setTempOffset,
  humidityOffset,
  setHumidityOffset,
  ammoniaOffset,
  setAmmoniaOffset,
  onSave,
  saving,
}: Props) {
  const rows = [
    {
      key: 'temp',
      icon: <Thermometer className="h-4 w-4 text-red-500" />,
      label: language === 'bn' ? 'তাপমাত্রা অফসেট' : 'Temperature Offset',
      step: '0.1',
      unit: '°C',
      value: tempOffset,
      onChange: setTempOffset,
    },
    {
      key: 'humidity',
      icon: <Droplets className="h-4 w-4 text-blue-500" />,
      label: language === 'bn' ? 'আর্দ্রতা অফসেট' : 'Humidity Offset',
      step: '1',
      unit: '%',
      value: humidityOffset,
      onChange: setHumidityOffset,
    },
    {
      key: 'ammonia',
      icon: <Wind className="h-4 w-4 text-yellow-500" />,
      label: language === 'bn' ? 'অ্যামোনিয়া অফসেট' : 'Ammonia Offset',
      step: '1',
      unit: 'ppm',
      value: ammoniaOffset,
      onChange: setAmmoniaOffset,
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {language === 'bn'
          ? 'সেন্সর রিডিং সঠিক করতে অফসেট মান নির্ধারণ করুন'
          : 'Set offset values to correct sensor readings'}
      </p>

      {rows.map((row) => (
        <div key={row.key} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {row.icon}
            <Label>{row.label}</Label>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step={row.step}
              value={row.value}
              onChange={(e) => row.onChange(Number(e.target.value))}
              className="w-20 h-9 text-center"
            />
            <span className="text-sm text-muted-foreground">{row.unit}</span>
          </div>
        </div>
      ))}

      <Button className="w-full" disabled={saving} onClick={onSave}>
        {saving
          ? language === 'bn'
            ? 'সংরক্ষণ হচ্ছে...'
            : 'Saving...'
          : language === 'bn'
            ? 'ক্যালিব্রেশন সেভ করুন'
            : 'Save Calibration'}
      </Button>
    </div>
  );
}
