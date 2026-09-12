import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Download, Activity, ChevronDown } from 'lucide-react';
import { useOperationTrace } from '@/hooks/useTraceability';
import { downloadSheet, formatDuration } from '@/lib/traceExcel';
import { useFarmContext } from '@/context/FarmContext';
import { useState } from 'react';

export function OperationTraceSection() {
  const { selectedFarmId } = useFarmContext();
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useOperationTrace(selectedFarmId, 7);
  const rows = data?.rows ?? [];
  const events = data?.events ?? [];
  const maxSeconds = rows[0]?.totalSeconds || 1;

  const handleExport = () => {
    downloadSheet(`operation-traceability-${new Date().toISOString().slice(0, 10)}.xlsx`, [
      {
        name: 'Summary',
        rows: rows.map((r) => ({
          'ডিভাইস': r.deviceName,
          'চালু হয়েছে (বার)': r.onCount,
          'মোট রানটাইম (মিনিট)': Math.round(r.totalSeconds / 60),
          'ম্যানুয়াল কমান্ড': r.manualCount,
          'অটো কমান্ড': r.autoCount,
          'সর্বশেষ': r.lastAt ? new Date(r.lastAt).toLocaleString('bn-BD') : '-',
        })),
      },
      {
        name: 'Events',
        rows: events.map((e) => ({
          'সময়': new Date(e.at).toLocaleString('bn-BD'),
          'ডিভাইস': e.deviceName,
          'কমান্ড': e.command,
          'মান': e.value,
          'মোড': e.mode === 'manual' ? 'ম্যানুয়াল' : 'অটো',
          'ইউজার আইডি': e.userId ?? '-',
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
                <Activity className="h-4 w-4 text-primary" />
                ২. অপারেশন ট্রেসিবিলিটি
              </CardTitle>
              <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            {open && (
              <Button size="sm" variant="outline" onClick={handleExport} disabled={!rows.length}>
                <Download className="mr-1 h-4 w-4" /> এক্সেল
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">গত ৭ দিনে কোন ডিভাইস কতক্ষণ চলেছে, ম্যানুয়াল না অটো</p>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-2">
        {!isLoading && !rows.length && <p className="text-sm text-muted-foreground">এই সময়ে কোনো ডিভাইস কমান্ড নেই।</p>}
        {rows.map((r) => (
          <div key={r.deviceName} className="rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-medium text-sm">{r.deviceName}</span>
              <Badge variant="secondary">{formatDuration(r.totalSeconds)}</Badge>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>চালু: {r.onCount} বার</span>
              <span>ম্যানুয়াল: {r.manualCount}</span>
              <span>অটো: {r.autoCount}</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round((r.totalSeconds / maxSeconds) * 100)}%` }} />
            </div>
          </div>
        ))}
      </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
