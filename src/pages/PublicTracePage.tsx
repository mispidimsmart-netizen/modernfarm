import { useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';
import { isTraceMatch } from '@/lib/traceQr';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import smartLogo from '@/assets/smart-logo.png.asset.json';
import pksfLogo from '@/assets/pksf-logo.png.asset.json';
import pidimLogo from '@/assets/pidim-logo.png.asset.json';
import {
  Download, FileText, ShieldCheck, MapPin, Phone, CalendarDays,
  BadgeCheck, Wheat, Syringe, Bird, Hash, Egg, Drumstick,
} from 'lucide-react';

interface TraceData {
  found: boolean;
  slug?: string;
  generated_at?: string;
  brand_name?: string;
  farm?: {
    id?: string; code?: string; reg_no?: string; name?: string; name_en?: string; location?: string;
    photo_url?: string; registered_at?: string; total_sheds?: number; organization_name?: string;
  };
  farmer?: { name?: string; avatar_url?: string; phone?: string };
  batch?: {
    id?: string; kind: string; name?: string; breed?: string; start_date?: string; end_date?: string;
    age_days?: number; initial_bird_count?: number; current_bird_count?: number; status?: string;
  };
  feed?: { date: string; feed_type: string; quantity_kg: number }[];
  medicine?: { date: string; name: string; type: string }[];
  environment?: { avg_temperature?: number; avg_humidity?: number; readings?: number };
}

const bnDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('bn-BD') : '—');

/** Only the detail sections this page renders — keeps the server payload minimal. */
const DETAIL_FIELDS: string[] = ['feed', 'medicine', 'environment'];

export default function PublicTracePage() {
  const { slug = '' } = useParams();
  const [searchParams] = useSearchParams();
  const expectedKind = searchParams.get('kind');
  const expectedBatchId = searchParams.get('batch');
  const expectedFarmId = searchParams.get('farm');
  const sheetRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  // 1) Fast first paint: header/farm/batch only (skips feed, medicine & sensor aggregates)
  const summaryQuery = useQuery({
    queryKey: ['public-trace', slug, 'summary'],
    enabled: !!slug,
    staleTime: 30_000,
    refetchOnMount: 'always',
    queryFn: async (): Promise<TraceData> => {
      const { data, error } = await supabase.rpc('get_public_batch_trace', { _slug: slug, _summary: true });
      if (error) throw error;
      return (data ?? { found: false }) as unknown as TraceData;
    },
  });

  // 2) Heavy details fetched right after, merged in when ready.
  //    Only the sections this page actually renders are requested from the server.
  const detailFields = DETAIL_FIELDS;
  const detailQuery = useQuery({
    queryKey: ['public-trace', slug, 'full', detailFields.join(',')],
    enabled: !!slug && summaryQuery.data?.found === true,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<TraceData> => {
      const { data, error } = await supabase.rpc('get_public_batch_trace', {
        _slug: slug,
        _summary: false,
        _fields: detailFields,
      });
      if (error) throw error;
      return (data ?? { found: false }) as unknown as TraceData;
    },
  });

  const data = detailQuery.data ?? summaryQuery.data;
  const isLoading = summaryQuery.isLoading;
  const detailsLoading = detailQuery.isLoading && summaryQuery.data?.found === true;


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
  const isLayer = b.kind === 'layer';
  /** Poultry-type theme: eggs for layer batches, chicken for broiler batches. */
  const theme = isLayer
    ? {
        page: 'bg-gradient-to-b from-secondary/20 via-background to-secondary/10',
        header: 'bg-gradient-to-r from-secondary via-secondary to-primary text-secondary-foreground',
        icon: Egg,
        label: '🥚 লেয়ার খামার',
      }
    : {
        page: 'bg-gradient-to-b from-primary/15 via-background to-primary/10',
        header: 'bg-gradient-to-r from-primary via-primary to-secondary text-primary-foreground',
        icon: Drumstick,
        label: '🐔 ব্রয়লার খামার',
      };
  const ThemeIcon = theme.icon;
  const avatar = data.farmer?.avatar_url || data.farm?.photo_url;
  const mismatch = !isTraceMatch(
    { kind: expectedKind, batchId: expectedBatchId, farmId: expectedFarmId },
    { kind: b.kind, id: b.id, farmId: data.farm?.id },
  );

  return (
    <main className={`min-h-screen p-3 sm:p-6 ${theme.page}`}>
      <div className="mx-auto max-w-2xl space-y-3">
        {mismatch && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            সতর্কতা: QR কোডের ব্যাচ তথ্য এই পেজের ব্যাচের সাথে মিলছে না। অনুগ্রহ করে খামারির কাছ থেকে নতুন QR নিন।
          </div>
        )}
        <div ref={sheetRef} className="overflow-hidden rounded-2xl border border-primary/20 bg-background shadow-lg">
          {/* Brand header */}
          <header className={`relative overflow-hidden px-5 py-6 ${theme.header}`}>
            <div className="pointer-events-none absolute -right-6 -top-6 opacity-15" aria-hidden="true">
              <ThemeIcon className="h-32 w-32" />
            </div>
            <div className="pointer-events-none absolute -bottom-5 right-16 opacity-10" aria-hidden="true">
              <ThemeIcon className="h-20 w-20" />
            </div>
            <div className="relative flex items-center gap-4">
              {avatar ? (
                <img
                  src={avatar}
                  alt={`${data.farmer?.name || data.farm?.name} — খামারির ছবি`}
                  className="h-24 w-24 shrink-0 rounded-2xl border-4 border-primary-foreground/70 object-cover shadow-md"
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border-4 border-primary-foreground/70 bg-primary-foreground/15">
                  <ShieldCheck className="h-10 w-10" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-widest opacity-90">{theme.label}</p>
                <h1 className="truncate text-xl font-extrabold leading-tight">{data.brand_name || data.farm?.name}</h1>
                <p className="mt-0.5 truncate text-sm font-medium opacity-95">খামারি: {data.farmer?.name || '—'}</p>
                {data.farmer?.phone && (
                  <p className="flex items-center gap-1 text-xs opacity-90">
                    <Phone className="h-3 w-3" /> {data.farmer.phone}
                  </p>
                )}
                <p className="flex items-start gap-1 text-xs opacity-90">
                  <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                  <span className="line-clamp-2">{data.farm?.location || 'ঠিকানা যোগ করা হয়নি'}</span>
                </p>

              </div>
            </div>

            <div className="relative mt-4 grid grid-cols-3 gap-2">
              <Chip icon={<Hash className="h-3 w-3" />} label="ফার্ম কোড" value={data.farm?.code || '—'} />
              <Chip icon={<BadgeCheck className="h-3 w-3" />} label="নিবন্ধন নং" value={data.farm?.reg_no || '—'} />
              <Chip icon={<CalendarDays className="h-3 w-3" />} label="নিবন্ধনের তারিখ" value={bnDate(data.farm?.registered_at)} />
            </div>
          </header>

          <div className="p-5">
            {/* Batch banner — poultry themed */}
            <section
              className={`relative overflow-hidden rounded-xl border p-4 ${
                isLayer ? 'border-secondary/30 bg-secondary/10' : 'border-primary/30 bg-primary/10'
              }`}
            >
              {/* watermark: egg for layer, chicken for broiler */}
              <div className="pointer-events-none absolute -right-3 -top-3 opacity-10">
                {isLayer ? <Egg className="h-24 w-24 text-secondary" /> : <Drumstick className="h-24 w-24 text-primary" />}
              </div>
              <div className="relative flex items-center gap-2">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    isLayer ? 'bg-secondary/20 text-secondary' : 'bg-primary/20 text-primary'
                  }`}
                >
                  {isLayer ? <Egg className="h-5 w-5" /> : <Bird className="h-5 w-5" />}
                </span>
                <h2 className="text-base font-bold">{b.name || 'ব্যাচ'}</h2>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    isLayer ? 'bg-secondary text-secondary-foreground' : 'bg-primary text-primary-foreground'
                  }`}
                >
                  {isLayer ? '🥚 লেয়ার' : '🐔 ব্রয়লার'}
                </span>
              </div>
              <div className="relative mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Info label="জাত" value={b.breed || '—'} />
                <Info label="শুরুর তারিখ" value={bnDate(b.start_date)} />
                <Info label="বয়স" value={`${b.age_days ?? 0} দিন`} />
              </div>
            </section>


            {/* Feed */}
            <TraceList
              title="খাবারের তথ্য"
              icon={<Wheat className="h-4 w-4 text-primary" />}
              tone="primary"
              empty={detailsLoading ? 'লোড হচ্ছে…' : 'কোনো ফিড রেকর্ড নেই'}
            >
              {feed.slice(0, 20).map((f, i) => (
                <li key={i} className="flex justify-between gap-2 border-b border-primary/10 py-1.5 text-sm last:border-0">
                  <span className="font-medium">{f.feed_type}</span>
                  <span className="text-muted-foreground">{bnDate(f.date)}</span>
                </li>
              ))}
            </TraceList>

            {/* Medicine */}
            <TraceList
              title="ঔষধ / ভ্যাকসিনের তথ্য"
              icon={<Syringe className="h-4 w-4 text-secondary" />}
              tone="secondary"
              empty={detailsLoading ? 'লোড হচ্ছে…' : 'কোনো ঔষধ/ভ্যাকসিনের রেকর্ড নেই'}
            >
              {medicine.slice(0, 20).map((m, i) => (
                <li key={i} className="flex justify-between gap-2 border-b border-secondary/10 py-1.5 text-sm last:border-0">
                  <span className="font-medium">{m.name}</span>
                  <span className="text-muted-foreground">{bnDate(m.date)} · {m.type}</span>
                </li>
              ))}
            </TraceList>


            {/* Project branding — same default for every farm */}
            <section className="mt-6 rounded-xl border border-primary/20 bg-muted/40 p-3">
              {/* Top: project logo + name */}
              <div className="flex flex-col items-center gap-1 border-b border-primary/15 pb-3 text-center">
                <img src={smartLogo.url} alt="SMART Project লোগো" className="h-12 w-auto object-contain" crossOrigin="anonymous" />
                <p className="text-[11px] font-semibold leading-snug text-foreground">
                  Sustainable Microenterprise and Resilient Transformation (SMART) Project
                </p>
              </div>
              {/* Bottom: PKSF (left) · Pidim Foundation (right) */}
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="flex flex-col items-center gap-1 text-center">
                  <img src={pksfLogo.url} alt="পিকেএসএফ লোগো" className="h-10 w-auto object-contain" crossOrigin="anonymous" />
                  <p className="text-[10px] text-muted-foreground">সহযোগীতায়</p>
                  <p className="text-[11px] font-semibold text-foreground">পিকেএসএফ</p>
                </div>
                <div className="flex flex-col items-center gap-1 text-center">
                  <img src={pidimLogo.url} alt="পিদিম ফাউন্ডেশন লোগো" className="h-10 w-auto object-contain" crossOrigin="anonymous" />
                  <p className="text-[10px] text-muted-foreground">বাস্তবায়নে</p>
                  <p className="text-[11px] font-semibold text-foreground">পিদিম ফাউন্ডেশন</p>
                </div>
              </div>
            </section>


            <footer className="mt-3 rounded-lg bg-muted/60 p-3 text-center text-[11px] text-muted-foreground">
              ট্রেস আইডি: {data.slug} · তৈরি: {data.generated_at ? new Date(data.generated_at).toLocaleString('bn-BD') : ''}
              <br />
              <span className="font-semibold text-foreground">Powered by FarmEye — Nexiot Labs</span>
            </footer>

          </div>
        </div>

        <Card className="border-primary/20">
          <CardContent className="flex flex-wrap justify-center gap-2 p-3">
            <Button onClick={downloadPdf} disabled={busy || detailsLoading}>
              <FileText className="mr-1 h-4 w-4" /> PDF ডাউনলোড
            </Button>
            <Button variant="outline" onClick={downloadPng} disabled={busy || detailsLoading}>
              <Download className="mr-1 h-4 w-4" /> ছবি ডাউনলোড
            </Button>

          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function Chip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-primary-foreground/15 px-2 py-1.5 backdrop-blur-sm">
      <p className="flex items-center gap-1 text-[10px] opacity-85">{icon} {label}</p>
      <p className="truncate text-xs font-bold">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background/80 p-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

function TraceList({
  title, icon, tone, empty, children,
}: {
  title: string; icon: React.ReactNode; tone: 'primary' | 'secondary'; empty: string; children: React.ReactNode[];
}) {
  return (
    <section className={`mt-4 rounded-xl border p-4 ${tone === 'primary' ? 'border-primary/20' : 'border-secondary/20'}`}>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-bold">{icon} {title}</h3>
      {children.length ? <ul>{children}</ul> : <p className="text-sm text-muted-foreground">{empty}</p>}
    </section>
  );
}
