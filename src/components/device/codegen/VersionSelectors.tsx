import { Cpu, Info } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { FirmwareVersion, HardwareVersion, Language } from './types';

interface Props {
  language: Language;
  hardwareVersion: HardwareVersion;
  setHardwareVersion: (v: HardwareVersion) => void;
  firmwareVersion: FirmwareVersion;
  setFirmwareVersion: (v: FirmwareVersion) => void;
  isMismatch: boolean;
  mismatchAck: boolean;
  setMismatchAck: (v: boolean) => void;
}

/** Hardware version picker + mismatch guard + firmware version picker. */
export function VersionSelectors({
  language,
  hardwareVersion,
  setHardwareVersion,
  firmwareVersion,
  setFirmwareVersion,
  isMismatch,
  mismatchAck,
  setMismatchAck,
}: Props) {
  return (
    <>
      <div className="space-y-2 pb-2 border-b">
        <Label className="text-sm flex items-center gap-2">
          <Cpu className="h-3 w-3" />
          {language === 'bn' ? 'এই device-এর Hardware Version' : 'This Device Hardware Version'}
        </Label>
        <Select
          value={hardwareVersion}
          onValueChange={(v) => {
            setHardwareVersion(v as HardwareVersion);
            setMismatchAck(false);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder={language === 'bn' ? 'নির্বাচন করুন...' : 'Select...'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unknown">{language === 'bn' ? '— নির্বাচন করুন —' : '— Select —'}</SelectItem>
            <SelectItem value="v8">v8 Hardware (Exhaust=25, Heater=14, DHT22, MQ-135)</SelectItem>
            <SelectItem value="v10">v10 Hardware (Exhaust=5, Heater=21, SHT31/BH1750/ZE03)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-[11px] text-muted-foreground">
          {language === 'bn'
            ? 'বোর্ডের relay GPIO ও সেন্সর দেখে মিলিয়ে নিন। ভুল হলে relay উল্টো trigger হবে।'
            : 'Match by relay GPIO + sensors on the board. Wrong choice will trigger relays incorrectly.'}
        </p>
      </div>

      {isMismatch && (
        <div className="border-2 border-destructive bg-destructive/10 rounded-lg p-3 space-y-2">
          <p className="text-sm font-semibold text-destructive flex items-center gap-2">
            <Info className="h-4 w-4" />
            {language === 'bn' ? 'Mismatch সতর্কতা' : 'Mismatch Warning'}
          </p>
          <p className="text-xs text-foreground">
            {language === 'bn'
              ? `আপনার device hardware ${hardwareVersion.toUpperCase()}, কিন্তু firmware ${firmwareVersion.toUpperCase()} select করা। এই combination flash করলে relay/সেন্সর ভুল GPIO-তে কাজ করবে — fans হিটারের জায়গায়, light alarm-এর জায়গায় চলতে পারে।`
              : `Your device hardware is ${hardwareVersion.toUpperCase()} but firmware ${firmwareVersion.toUpperCase()} is selected. Flashing this combination will route relays/sensors to wrong GPIOs — fans may toggle the heater, lights may trigger the alarm.`}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              variant="default"
              onClick={() => setFirmwareVersion(hardwareVersion as FirmwareVersion)}
            >
              {language === 'bn'
                ? `Firmware ${hardwareVersion.toUpperCase()}-এ পরিবর্তন করুন`
                : `Switch firmware to ${hardwareVersion.toUpperCase()}`}
            </Button>
            <label className="flex items-center gap-2 text-[11px] cursor-pointer">
              <input
                type="checkbox"
                checked={mismatchAck}
                onChange={(e) => setMismatchAck(e.target.checked)}
                className="rounded"
              />
              {language === 'bn' ? 'আমি জানি, তবুও download করব (override)' : 'I understand, download anyway (override)'}
            </label>
          </div>
        </div>
      )}

      <div className="space-y-2 pb-2 border-b">
        <Label className="text-sm flex items-center gap-2">
          <Cpu className="h-3 w-3" />
          {language === 'bn' ? 'ফার্মওয়্যার ভার্সন' : 'Firmware Version'}
        </Label>
        <Select value={firmwareVersion} onValueChange={(v) => setFirmwareVersion(v as FirmwareVersion)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="v8">v8.0.0 — Stable (legacy GPIO: Exhaust=25, Heater=14)</SelectItem>
            <SelectItem value="v10">v10.0.0-beta.1 — Beta (Phase 9 sensors, Exhaust=5, Heater=21)</SelectItem>
          </SelectContent>
        </Select>
        {firmwareVersion === 'v10' ? (
          <p className="text-[11px] text-amber-600 dark:text-amber-400">
            {language === 'bn'
              ? '⚠️ v10 Beta — শুধুমাত্র নতুন v10 hardware (Phase 9 pin map)। পুরাতন মাঠের device-এ flash করবেন না। OTA mode এখনো support নেই।'
              : '⚠️ v10 Beta — only for new v10 hardware (Phase 9 pin map). Do NOT flash on existing field devices. OTA mode not yet supported.'}
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            {language === 'bn'
              ? 'মাঠে চলা সব device-এর জন্য নিরাপদ default।'
              : 'Safe default for all field-deployed devices.'}
          </p>
        )}
      </div>
    </>
  );
}
