import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Download, Radio, ChevronDown } from 'lucide-react';
import { useDataTrace } from '@/hooks/useTraceability';
import { downloadSheet } from '@/lib/traceExcel';
import { useFarmContext } from '@/context/FarmContext';
import { useState } from 'react';

export function DataTraceSection() {
  const { selectedFarmId } = useFarmContext();
  const [open, setOpen] = useState(false);
  const { data = [], isLoading } = useDataTrace(selectedFarmId, 7);

  const total = data.reduce((s, r) => s + r.readings, 0);

  const handleExport = () => {
    downloadSheet(`data-traceability-${new Date().toISOString().slice(0, 10)}.xlsx`, [
      {
        name: 'Data Trace',
        rows: data.map((r) => ({
          'ডিভাইস আইডি': r.deviceId,
          'সোর্স': r.source,
          'শেড': r.shedId ?? '-',
          'রিডিং সংখ্যা': r.readings,
          'প্রথম': new Date(r.firstAt).toLocaleString('bn-BD'),
          'সর্বশেষ': new Date(r.lastAt).toLocaleString('bn-BD'),
          'গড় তাপমাত্রা': r.avgTemp ?? '-',
          'গড় আর্দ্রতা': r.avgHumidity ?? '-',
        })),
      },
    ]);
  };

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CollapsibleTrigger className="flex flex-1 items-center gap-2 text-left">
              <CardTitle className="flex flex-1 items-center gap-2 text-base">
                <Radio className="h-4 w-4 text-primary" />
                ১. ডেটা ট্রেসিবিলিটি
              </CardTitle>
              <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            {open && (
              <Button size="sm" variant="outline" onClick={handleExport} disabled={!data.length}>
                <Download className="mr-1 h-4 w-4" /> এক্সেল
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">গত ৭ দিনে কোন ডিভাইস/সেন্সর থেকে কতটি রিডিং এসেছে</p>
        </CardHeader>
        <CollapsibleContent>
      <CardContent className="space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">লোড হচ্ছে…</p>}
        {!isLoading && !data.length && <p className="text-sm text-muted-foreground">এই সময়ে কোনো সেন্সর ডেটা নেই।</p>}
        {!!data.length && (
          <>
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              মোট রিডিং: <span className="font-semibold">{total.toLocaleString('bn-BD')}</span> · উৎস: {data.length}টি
            </div>
            <div className="space-y-2">
              {data.slice(0, 8).map((r) => (
                <div key={`${r.deviceId}-${r.source}-${r.shedId}`} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium text-sm">{r.deviceId}</span>
                    <Badge variant="secondary">{r.source}</Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>রিডিং: {r.readings.toLocaleString('bn-BD')}</span>
                    {r.avgTemp !== null && <span>গড় তাপ: {r.avgTemp}°C</span>}
                    {r.avgHumidity !== null && <span>গড় আর্দ্রতা: {r.avgHumidity}%</span>}
                    <span>সর্বশেষ: {new Date(r.lastAt).toLocaleString('bn-BD')}</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round((r.readings / (data[0]?.readings || 1)) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
