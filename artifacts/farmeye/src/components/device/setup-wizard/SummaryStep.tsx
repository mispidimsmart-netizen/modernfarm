import { ClipboardCheck, Download, Settings as SettingsIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { HwVersion, RelayRow, SensorOption } from './wizardConstants';

interface Props {
  version: HwVersion;
  firmwareFile: string;
  firmwareLabel: string;
  relayMap: RelayRow[];
  sensorList: SensorOption[];
  selectedSensors: string[];
  onDownload: () => void;
  onOpenGenerator: () => void;
}

export function SummaryStep({
  version,
  firmwareFile,
  firmwareLabel,
  relayMap,
  sensorList,
  selectedSensors,
  onDownload,
  onOpenGenerator,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-emerald-600" />
          সারাংশ ও ফার্মওয়্যার ডাউনলোড
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">কন্ট্রোলার সংস্করণ</span>
            <Badge className="text-[10px]">{version.toUpperCase()}</Badge>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">ফার্মওয়্যার ফাইল</span>
            <span className="font-mono text-[11px]">{firmwareFile.replace('/', '')}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">রিলে চ্যানেল</span>
            <span>{relayMap.length} ch</span>
          </div>
          <div className="flex items-start justify-between text-xs gap-2">
            <span className="text-muted-foreground shrink-0">নির্বাচিত সেন্সর</span>
            <span className="text-right">
              {selectedSensors.length === 0
                ? '—'
                : sensorList
                    .filter((s) => selectedSensors.includes(s.id))
                    .map((s) => s.name.split(' (')[0])
                    .join(', ')}
            </span>
          </div>
        </div>

        <Button onClick={onDownload} className="w-full" size="lg">
          <Download className="h-4 w-4 mr-2" />
          {firmwareLabel} ডাউনলোড করুন
        </Button>

        <div className="border border-primary/30 bg-primary/5 rounded-lg p-2 space-y-1">
          <p className="text-[11px] font-semibold">পরবর্তী ধাপ:</p>
          <ol className="text-[11px] text-muted-foreground space-y-0.5 list-decimal list-inside">
            <li>ডাউনলোডকৃত .ino ফাইল Arduino IDE-তে খুলুন</li>
            <li>WiFi SSID, Password ও DEVICE_TOKEN বসান</li>
            <li>ESP32-এ flash করুন (Board: ESP32 Dev Module)</li>
            <li>Serial Monitor-এ auto-detect সেন্সর তালিকা verify করুন</li>
          </ol>
        </div>

        <Button variant="outline" size="sm" className="w-full" onClick={onOpenGenerator}>
          <SettingsIcon className="h-4 w-4 mr-2" />
          WiFi + Token সহ Code Generator ব্যবহার করুন
        </Button>
      </CardContent>
    </Card>
  );
}
