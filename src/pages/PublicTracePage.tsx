import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, ShieldCheck, MapPin } from 'lucide-react';

interface TraceData {
  found: boolean;
  slug?: string;
  generated_at?: string;
  farm?: {
    id?: string; code?: string; name?: string; name_en?: string; location?: string;
    photo_url?: string; registered_at?: string; total_sheds?: number;
  };
  farmer?: { name?: string; avatar_url?: string };
  batch?: {
    kind: string; name?: string; breed?: string; start_date?: string; end_date?: string;
    age_days?: number; initial_bird_count?: number; current_bird_count?: number; status?: string;
  };
  feed?: { date: string; feed_type: string; quantity_kg: number }[];
  medicine?: { date: string; name: string; type: string }[];
  environment?: { avg_temperature?: number; avg_humidity?: number; readings?: number };
}

export default function PublicTracePage() {
  const { slug = '' } = useParams();
  const sheetRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['public-trace', slug],
    enabled: !!slug,
    queryFn: async (): Promise<TraceData> => {
      const { data, error } = await supabase.rpc('get_public_batch_trace', { _slug: slug });
      if (error) throw error;
      return (data ?? { found: false }) as unknown as TraceData;
    },
  });

  const capture = async () => {
    if (!sheetRef.current) return null;
    return html2canvas(sheetRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
  };

  const downloadPng = async () => {
    setBusy(true);
    try {
      const canvas = await capture();
      if (!canvas) return;
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `farm-trace-${slug}.png`;
      a.click();
    } finally {
      setBusy(false);
    }
  };

  const downloadPdf = async () => {
    setBusy(true);
    try {
      const canvas = await capture();
      if (!canvas) return;
      const img = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const width = 210;
      const height = (canvas.height * width) / canvas.width;
      pdf.addImage(img, 'PNG', 0, 0, width, Math.min(height, 297));
      pdf.save(`farm-trace-${slug}.pdf`);
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">লোড হচ্ছে…</div>;
  }

  if (!data?.found) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 p-6 text-center">
        <h1 className="text-lg font-semibold">তথ্য পাওয়া যায়নি</h1>
        <p className="text-sm text-muted-foreground">এই QR কোডটি অকার্যকর অথবা খামারি এখনো তথ্য প্রকাশ করেননি।</p>
      </div>
    );
  }

  const b = data.batch!;
  const feed = data.feed ?? [];
  const medicine = data.medicine ?? [];

  return (
    <main className="min-h-screen bg-muted/40 p-4">
      <div className="mx-auto max-w-2xl space-y-3">
        <div ref={sheetRef} className="rounded-xl bg-background p-5">
          <header className="flex items-center gap-3 border-b pb-4">
            {data.farm?.photo_url ? (
              <img src={data.farm.photo_url} alt={`${data.farm?.name} খামারের ছবি`} className="h-16 w-16 rounded-xl object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="h-7 w-7" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold">{data.farm?.name}</h1>
              {data.farm?.location && (
                <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {data.farm.location}
                </p>
              )}
              <p className="mt-0.5 text-xs text-muted-foreground">খামারি: {data.farmer?.name || '—'}</p>
            </div>
          </header>

          <section className="mt-4 space-y-2">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold">{b.name}</h2>
              <Badge variant="secondary">{b.kind === 'layer' ? 'লেয়ার' : 'ব্রয়লার'}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              <Info label="জাত" value={b.breed || '—'} />
              <Info label="শুরুর তারিখ" value={b.start_date ? new Date(b.start_date).toLocaleDateString('bn-BD') : '—'} />
              <Info label="বয়স" value={`${b.age_days ?? 0} দিন`} />
              <Info label="শুরুতে পাখি" value={String(b.initial_bird_count ?? '—')} />
              <Info label="বর্তমান পাখি" value={String(b.current_bird_count ?? '—')} />
              <Info label="অবস্থা" value={b.status || '—'} />
              <Info label="গড় তাপমাত্রা" value={data.environment?.avg_temperature != null ? `${data.environment.avg_temperature}°C` : '—'} />
              <Info label="গড় আর্দ্রতা" value={data.environment?.avg_humidity != null ? `${data.environment.avg_humidity}%` : '—'} />
            </div>
          </section>

          <TraceList title="ফিড রেকর্ড" empty="কোনো ফিড রেকর্ড নেই">
            {feed.slice(0, 20).map((f, i) => (
              <li key={i} className="flex justify-between border-b py-1 text-sm last:border-0">
                <span>{new Date(f.date).toLocaleDateString('bn-BD')} — {f.feed_type}</span>
                <span className="text-muted-foreground">{f.quantity_kg} কেজি</span>
              </li>
            ))}
          </TraceList>

          <TraceList title="ওষুধ/ভ্যাকসিন" empty="কোনো ওষুধের রেকর্ড নেই">
            {medicine.slice(0, 20).map((m, i) => (
              <li key={i} className="flex justify-between border-b py-1 text-sm last:border-0">
                <span>{new Date(m.date).toLocaleDateString('bn-BD')} — {m.name}</span>
                <span className="text-muted-foreground">{m.type}</span>
              </li>
            ))}
          </TraceList>

          <footer className="mt-5 border-t pt-3 text-center text-[11px] text-muted-foreground">
            ট্রেস আইডি: {data.slug} · তৈরি: {data.generated_at ? new Date(data.generated_at).toLocaleString('bn-BD') : ''}
            <br />
            Powered by FarmEye — Nexiot Labs
          </footer>
        </div>

        <Card>
          <CardContent className="flex flex-wrap justify-center gap-2 p-3">
            <Button onClick={downloadPdf} disabled={busy}>
              <FileText className="mr-1 h-4 w-4" /> PDF ডাউনলোড
            </Button>
            <Button variant="outline" onClick={downloadPng} disabled={busy}>
              <Download className="mr-1 h-4 w-4" /> ছবি ডাউনলোড
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/60 p-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function TraceList({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) {
  return (
    <section className="mt-4">
      <h3 className="mb-1 text-sm font-semibold">{title}</h3>
      {children.length ? <ul>{children}</ul> : <p className="text-sm text-muted-foreground">{empty}</p>}
    </section>
  );
}
