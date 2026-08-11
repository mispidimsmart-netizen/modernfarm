import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { HwVersion } from './wizardConstants';

interface Props {
  version: HwVersion | null;
  onPick: (v: HwVersion) => void;
}

export function VersionStep({ version, onPick }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">কোন কন্ট্রোলার সংস্করণ ব্যবহার করছেন?</CardTitle>
        <p className="text-xs text-muted-foreground">
          আপনার ESP32-এ যে ওয়্যারিং ডায়াগ্রাম অনুসরণ করেছেন সেটি বেছে নিন।
        </p>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onPick('v8')}
          className={`text-left rounded-lg border-2 p-3 transition ${
            version === 'v8' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-sm">v8 (Stable)</span>
            <Badge variant="secondary" className="text-[10px]">পুরাতন ওয়্যারিং</Badge>
          </div>
          <p className="text-[11px] text-muted-foreground mb-2">
            GPIO 14/27/26/25/33/32 — DHT22, MQ-135, LDR সেন্সর।
          </p>
          <ul className="text-[10px] text-muted-foreground space-y-0.5">
            <li>• 6-channel relay</li>
            <li>• Legacy install অনুযায়ী</li>
            <li>• ফিল্ড-টেস্টেড স্থিতিশীল</li>
          </ul>
        </button>

        <button
          type="button"
          onClick={() => onPick('v10')}
          className={`text-left rounded-lg border-2 p-3 transition ${
            version === 'v10' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-sm flex items-center gap-1">
              v10 <Sparkles className="h-3 w-3 text-primary" />
            </span>
            <Badge className="text-[10px]">নতুন</Badge>
          </div>
          <p className="text-[11px] text-muted-foreground mb-2">
            GPIO 5/18/19/21/22/23/25/26 — Phase 9 সেন্সর support।
          </p>
          <ul className="text-[10px] text-muted-foreground space-y-0.5">
            <li>• 8-channel relay</li>
            <li>• SHT31, BH1750, ZE03, SCD41, PMS5003</li>
            <li>• GSM SMS failover + Auto-detect</li>
          </ul>
        </button>
      </CardContent>
    </Card>
  );
}
