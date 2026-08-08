import { Settings, Info } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { FirmwareMode, Language } from './types';
import type { CodegenLabels } from './labels';

interface Props {
  language: Language;
  t: CodegenLabels;
  firmwareMode: FirmwareMode;
  setFirmwareMode: (m: FirmwareMode) => void;
}

/** Step 1 — hardcoded vs OTA-ready firmware mode. */
export function FirmwareModeSection({ language, t, firmwareMode, setFirmwareMode }: Props) {
  const optionClass = (active: boolean) =>
    `flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
      active ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/50'
    }`;
  const radioClass = (active: boolean) =>
    `mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
      active ? 'border-primary' : 'border-muted-foreground'
    }`;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-primary">
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs">
          1
        </span>
        {t.step1}
      </div>

      <div className="pl-7 space-y-3">
        <Label className="text-sm flex items-center gap-2">
          <Settings className="h-3 w-3" />
          {t.firmwareModeLabel}
        </Label>
        <div className="grid gap-2">
          <button type="button" onClick={() => setFirmwareMode('hardcoded')} className={optionClass(firmwareMode === 'hardcoded')}>
            <div className={radioClass(firmwareMode === 'hardcoded')}>
              {firmwareMode === 'hardcoded' && <div className="w-2 h-2 rounded-full bg-primary" />}
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">{t.hardcodedMode}</p>
              <p className="text-xs text-muted-foreground">{t.hardcodedDesc}</p>
            </div>
          </button>

          <button type="button" onClick={() => setFirmwareMode('ota')} className={optionClass(firmwareMode === 'ota')}>
            <div className={radioClass(firmwareMode === 'ota')}>
              {firmwareMode === 'ota' && <div className="w-2 h-2 rounded-full bg-primary" />}
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm flex items-center gap-1">
                {t.otaMode}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>
                        {language === 'bn'
                          ? 'ডিভাইসে প্রথমবার হার্ডকোডেড ফার্মওয়্যার ফ্ল্যাশ করুন। তারপর এই OTA ফার্মওয়্যার সব ডিভাইসে আপডেট হিসেবে পাঠাতে পারবেন।'
                          : 'First flash hardcoded firmware to device. Then this OTA firmware can be pushed as an update to all devices.'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </p>
              <p className="text-xs text-muted-foreground">{t.otaDesc}</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
