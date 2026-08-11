import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { QrCode, Download, Copy, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useBatchTracePages, type BatchPage } from '@/hooks/useTraceability';
import { useFarmContext } from '@/context/FarmContext';

function QrCard({ page, onToggle }: { page: BatchPage; onToggle: (p: BatchPage, next: boolean) => void }) {
  const [dataUrl, setDataUrl] = useState<string>('');
  const url = useMemo(() => `${window.location.origin}/trace/${page.public_slug}`, [page.public_slug]);
  const { toast } = useToast();

  useEffect(() => {
    QRCode.toDataURL(url, { width: 512, margin: 2 }).then(setDataUrl).catch(() => setDataUrl(''));
  }, [url]);

  const download = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `qr-${page.batchName}-${page.public_slug}.png`;
    a.click();
  };

  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-start gap-3">
        {dataUrl ? (
          <img src={dataUrl} alt={`${page.batchName} QR কোড`} className="h-20 w-20 rounded bg-background" loading="lazy" />
        ) : (
          <div className="h-20 w-20 animate-pulse rounded bg-muted" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium text-sm">{page.batchName}</span>
            <Badge variant="secondary">{page.batch_kind === 'layer' ? 'লেয়ার' : 'ব্রয়লার'}</Badge>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{page.breed || 'জাত উল্লেখ নেই'}</p>
          <div className="mt-2 flex items-center gap-2">
            <Switch checked={page.is_published} onCheckedChange={(v) => onToggle(page, v)} aria-label="পাবলিক করুন" />
            <span className="text-xs">{page.is_published ? 'পাবলিক চালু' : 'পাবলিক বন্ধ'}</span>
          </div>
          {!page.is_published && (
            <p className="mt-1 text-[11px] text-destructive">
              পাবলিক বন্ধ থাকলে QR স্ক্যান করে কেউ তথ্য দেখতে পাবে না — আগে চালু করুন।
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={download} disabled={!dataUrl}>
          <Download className="mr-1 h-4 w-4" /> QR ডাউনলোড
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            navigator.clipboard.writeText(url);
            toast({ title: 'লিংক কপি হয়েছে' });
          }}
        >
          <Copy className="mr-1 h-4 w-4" /> লিংক
        </Button>
        <Button size="sm" variant="ghost" asChild>
          <a href={url} target="_blank" rel="noreferrer">
            <ExternalLink className="mr-1 h-4 w-4" /> প্রিভিউ
          </a>
        </Button>
      </div>
    </div>
  );
}

export function BatchQrSection() {
  const { selectedFarmId } = useFarmContext();
  const { data = [], isLoading } = useBatchTracePages(selectedFarmId);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const onToggle = async (page: BatchPage, next: boolean) => {
    const { error } = await supabase.from('batch_public_pages').update({ is_published: next }).eq('id', page.id);
    if (error) {
      toast({ title: 'পরিবর্তন ব্যর্থ', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: next ? 'ব্যাচটি এখন পাবলিক' : 'পাবলিক বন্ধ করা হয়েছে' });
    queryClient.invalidateQueries({ queryKey: ['batch-trace-pages', selectedFarmId] });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <QrCode className="h-4 w-4 text-primary" />
          ৩. ব্যাচ ট্রেসিবিলিটি ও QR
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          QR স্ক্যান করে যে কেউ (লগইন ছাড়াই) ব্যাচের তথ্য দেখতে ও PDF/ছবি ডাউনলোড করতে পারবে। খরচ, আয় বা ফোন নম্বর দেখানো হয় না।
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">লোড হচ্ছে…</p>}
        {!isLoading && !data.length && <p className="text-sm text-muted-foreground">কোনো ব্যাচ পাওয়া যায়নি।</p>}
        {data.map((p) => (
          <QrCard key={p.id} page={p} onToggle={onToggle} />
        ))}
      </CardContent>
    </Card>
  );
}
