import { Settings, MonitorSmartphone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { FarmType, FirmwareMode, Language } from './types';
import type { CodegenLabels } from './labels';

interface Props {
  language: Language;
  t: CodegenLabels;
  firmwareMode: FirmwareMode;
  farmType: FarmType;
  setFarmType: (v: FarmType) => void;
  shedName: string;
  setShedName: (v: string) => void;
  shedId: string;
  setShedId: (v: string) => void;
  includeSafetyEngine: boolean;
  setIncludeSafetyEngine: (v: boolean) => void;
  /** v8 only — the optional TFT display toggle. */
  showDisplayOption?: boolean;
  hasDisplay?: boolean;
  setHasDisplay?: (v: boolean) => void;
}

/** Step 4 — farm type / shed, plus build-time safety engine toggle. */
export function FarmTypeSafetySection({
  language,
  t,
  firmwareMode,
  farmType,
  setFarmType,
  shedName,
  setShedName,
  shedId,
  setShedId,
  includeSafetyEngine,
  setIncludeSafetyEngine,
  showDisplayOption = false,
  hasDisplay = false,
  setHasDisplay,
}: Props) {
  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs">
            {firmwareMode === 'hardcoded' ? '4' : '2'}
          </span>
          {t.step4}
        </div>

        <div className="pl-7 space-y-3">
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-2">
              <Settings className="h-3 w-3" />
              {t.farmTypeLabel}
            </Label>
            <Select value={farmType} onValueChange={(v: FarmType) => setFarmType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="layer">{t.layerFarm}</SelectItem>
                <SelectItem value="broiler">{t.broilerFarm}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="shedName" className="text-xs">{t.shedNameLabel}</Label>
              <Input
                id="shedName"
                value={shedName}
                onChange={(e) => setShedName(e.target.value)}
                placeholder={t.shedNamePlaceholder}
                className="text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="shedId" className="text-xs">{t.shedIdLabel}</Label>
              <Input
                id="shedId"
                value={shedId}
                onChange={(e) => setShedId(e.target.value)}
                placeholder={t.shedIdPlaceholder}
                className="text-sm font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs">!</span>
          {language === 'bn' ? 'সেফটি ইঞ্জিন' : 'Safety Engine'}
        </div>
        <div className="pl-7">
          <div
            className={`flex items-start justify-between gap-3 p-3 rounded-lg border ${
              includeSafetyEngine ? 'border-green-500/30 bg-green-500/5' : 'border-amber-500/40 bg-amber-500/5'
            }`}
          >
            <div className="flex-1">
              <p className="text-sm font-medium">
                {includeSafetyEngine
                  ? language === 'bn'
                    ? '🛡️ সম্পূর্ণ সেফটি ইঞ্জিন সহ'
                    : '🛡️ Include Full Safety Engine'
                  : language === 'bn'
                    ? '⚠️ সেফটি ইঞ্জিন ছাড়া (Lite)'
                    : '⚠️ Without Safety Engine (Lite)'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {language === 'bn'
                  ? 'বন্ধ করলেও ৪২°C+ এ ফ্যান+অ্যালার্ম auto চালু হবে (Hard Floor)'
                  : 'Even when off, fan + alarm auto-trigger at 42°C+ (Hard Floor stays active)'}
              </p>
            </div>
            <Switch checked={includeSafetyEngine} onCheckedChange={setIncludeSafetyEngine} />
          </div>

          {showDisplayOption && (
            <div
              className={`mt-3 flex items-start justify-between gap-3 p-3 rounded-lg border ${
                hasDisplay ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/40'
              }`}
            >
              <div className="flex-1">
                <p className="text-sm font-medium flex items-center gap-2">
                  <MonitorSmartphone className="h-4 w-4" />
                  {language === 'bn' ? 'বোর্ডে TFT ডিসপ্লে আছে (ঐচ্ছিক)' : 'Board has TFT display (optional)'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {hasDisplay
                    ? language === 'bn'
                      ? '⚠️ Arduino IDE-তে "Adafruit GFX Library" ও "Adafruit ILI9341" ইনস্টল করতে হবে। পিন: SCK 21, MOSI 22, CS 17, DC 5।'
                      : '⚠️ Install "Adafruit GFX Library" + "Adafruit ILI9341". Pins: SCK 21, MOSI 22, CS 17, DC 5.'
                    : language === 'bn'
                      ? 'ডিসপ্লে/প্যানেল LED না থাকলে বন্ধ রাখুন — কোনো লাইব্রেরি লাগবে না, রিলে/সেফটি লজিক একই থাকে। পরে ডিসপ্লে বসিয়ে আবার জেনারেট করলেই চলবে।'
                      : 'Keep off if you have no display — no extra libraries, relay/safety logic unchanged. Add it later and re-generate.'}
                </p>
              </div>
              <Switch checked={hasDisplay} onCheckedChange={(v) => setHasDisplay?.(v)} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
