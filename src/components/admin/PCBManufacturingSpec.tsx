import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, FileText, Cpu, Zap, Shield, Box, CircuitBoard, Loader2, Plug, FileArchive } from 'lucide-react';
import { toast } from 'sonner';
import {
  PROJECT, GPIO_MAP, BOM, POWER_TREE, SAFETY_NOTES, TEST_CHECKLIST,
  MAINS_TERMINALS, RELAY_OUTPUTS, WIRING_RULES, CONNECTOR_MAP,
} from './pcb/pcbData';
import { generateDocx, generateWiringDocx } from './pcb/pcbDocx';
import { generateGerberZip } from './pcb/pcbPackage';

export function PCBManufacturingSpec() {
  const [busy, setBusy] = useState(false);
  const [busyWiring, setBusyWiring] = useState(false);
  const [busyZip, setBusyZip] = useState(false);

  const handleDownload = async () => {
    try {
      setBusy(true);
      await generateDocx();
      toast.success('Word ফাইল ডাউনলোড হয়েছে — ম্যানুফ্যাকচারারকে দিন');
    } catch (e) {
      console.error(e);
      toast.error('Word ফাইল তৈরিতে সমস্যা হয়েছে');
    } finally {
      setBusy(false);
    }
  };

  const handleDownloadWiring = async () => {
    try {
      setBusyWiring(true);
      await generateWiringDocx();
      toast.success('ওয়্যারিং ডায়াগ্রাম Word ফাইল ডাউনলোড হয়েছে');
    } catch (e) {
      console.error(e);
      toast.error('Word ফাইল তৈরিতে সমস্যা হয়েছে');
    } finally {
      setBusyWiring(false);
    }
  };

  const handleDownloadZip = async () => {
    try {
      setBusyZip(true);
      await generateGerberZip();
      toast.success('Gerber/Drill ZIP ডাউনলোড হয়েছে — ম্যানুফ্যাকচারারকে দিন');
    } catch (e) {
      console.error(e);
      toast.error('ZIP তৈরিতে সমস্যা হয়েছে');
    } finally {
      setBusyZip(false);
    }
  };

  const downloadText = (filename: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    saveAs(blob, filename);
  };

  const docDownloads = [
    {
      key: 'bom',
      label: 'BOM (Bill of Materials)',
      desc: 'সম্পূর্ণ পার্টস তালিকা — ম্যানুফ্যাকচারারের কেনাকাটার জন্য',
      filename: `FarmEye_BOM_${PROJECT.productCode}.csv`,
      mime: 'text/csv',
      build: buildBomCsv,
      icon: <FileText className="w-4 h-4" />,
    },
    {
      key: 'gpio',
      label: 'GPIO Map (পিন অ্যাসাইনমেন্ট)',
      desc: 'ESP32-WROOM-32 38-pin সব পিনের ফাংশন ও সংযোগ',
      filename: `FarmEye_GPIO_MAP_${PROJECT.productCode}.csv`,
      mime: 'text/csv',
      build: buildGpioCsv,
      icon: <Cpu className="w-4 h-4" />,
    },
    {
      key: 'conn',
      label: 'Connector Map (তারের রঙ)',
      desc: 'প্রতিটি কানেক্টরের পিন, সিগন্যাল, ও তারের রঙ',
      filename: `FarmEye_CONNECTORS_${PROJECT.productCode}.csv`,
      mime: 'text/csv',
      build: buildConnectorCsv,
      icon: <Plug className="w-4 h-4" />,
    },
  ];

  return (
    <Tabs defaultValue="spec" className="space-y-4">
      <TabsList className="grid grid-cols-2 w-full max-w-md">
        <TabsTrigger value="spec" className="gap-2"><CircuitBoard className="w-4 h-4" />PCB স্পেসিফিকেশন</TabsTrigger>
        <TabsTrigger value="wiring" className="gap-2"><Plug className="w-4 h-4" />টার্মিনাল ওয়্যারিং</TabsTrigger>
      </TabsList>

      <TabsContent value="spec" className="space-y-4 mt-0">
      {/* Hero / download card */}
      <Card className="bg-gradient-to-br from-emerald-900/40 to-teal-900/30 border-emerald-500/30">
        <CardContent className="pt-6 pb-6 flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 shrink-0">
              <CircuitBoard className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">PCB ম্যানুফ্যাকচারিং স্পেসিফিকেশন</h2>
              <p className="text-sm text-emerald-200/80 mt-1">
                {PROJECT.name} — {PROJECT.version}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                সম্পূর্ণ BOM, GPIO ম্যাপ, লে-আউট জোন, সেফটি ও টেস্ট চেকলিস্ট সহ একটি প্রোডাকশন-রেডি Word ফাইল — সরাসরি ম্যানুফ্যাকচারারকে দিন। (বাংলা ফন্ট নিরাপদ)
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <Button
              size="lg"
              onClick={handleDownload}
              disabled={busy}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/30"
            >
              {busy ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Download className="w-5 h-5 mr-2" />}
              Word ডাউনলোড (.docx)
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={handleDownloadZip}
              disabled={busyZip}
              className="border-emerald-500/40 bg-emerald-950/40 text-emerald-100 hover:bg-emerald-900/60 hover:text-white"
            >
              {busyZip ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <FileArchive className="w-5 h-5 mr-2" />}
              Gerber/Drill ZIP
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Individual document downloads */}
      <Card className="bg-slate-900/80 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Download className="w-5 h-5 text-emerald-400" />
            পৃথক ডকুমেন্টস ডাউনলোড
          </CardTitle>
          <p className="text-xs text-slate-400 mt-1">
            ম্যানুফ্যাকচারারকে আলাদাভাবে নির্দিষ্ট ফাইল পাঠাতে চাইলে এখান থেকে ডাউনলোড করুন। সম্পূর্ণ প্যাকেজের জন্য উপরের PDF / ZIP ব্যবহার করুন।
          </p>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {docDownloads.map((d) => (
            <button
              key={d.key}
              onClick={() => {
                try {
                  downloadText(d.filename, d.build(), d.mime);
                  toast.success(`${d.label} ডাউনলোড হয়েছে`);
                } catch (e) {
                  console.error(e);
                  toast.error('ফাইল তৈরিতে সমস্যা হয়েছে');
                }
              }}
              className="text-left rounded-xl border border-emerald-500/20 bg-emerald-950/20 hover:bg-emerald-900/40 hover:border-emerald-500/50 transition-colors p-4 group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 text-emerald-300">
                  {d.icon}
                  <span className="text-sm font-semibold text-white">{d.label}</span>
                </div>
                <Download className="w-4 h-4 text-emerald-400 opacity-60 group-hover:opacity-100 shrink-0" />
              </div>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">{d.desc}</p>
              <p className="text-[10px] text-emerald-500/70 mt-2 font-mono truncate">{d.filename}</p>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* On-screen preview */}
      <Card className="bg-slate-900/80 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <FileText className="w-5 h-5 text-emerald-400" />
            ডকুমেন্ট প্রিভিউ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-3">
            {/* 1. Overview */}
            <SpecSection icon={<Box className="w-4 h-4" />} title="১. প্রকল্প পরিচিতি">
              <KV k="পণ্যের নাম" v={PROJECT.name} />
              <KV k="ভার্সন" v={PROJECT.version} />
              <KV k="প্রোডাক্ট কোড" v={PROJECT.productCode} />
              <KV k="ভেন্ডর" v={PROJECT.vendor} />
              <KV k="এনক্লোজার" v={PROJECT.enclosure} />
              <p className="text-xs text-slate-400 mt-2">
                2-layer FR-4, 1.6 mm, ENIG ফিনিশ। সিগন্যাল ট্রেস ≥ 0.3 mm, মেইনস কারেন্ট পাথ ≥ 2.0 mm বা copper-pour।
              </p>
            </SpecSection>

            {/* 2. Power tree */}
            <SpecSection icon={<Zap className="w-4 h-4" />} title="২. পাওয়ার ট্রি">
              <ul className="text-xs text-slate-300 space-y-1.5">
                {POWER_TREE.map((p, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-emerald-400">▸</span>
                    <span className="font-mono">{p}</span>
                  </li>
                ))}
              </ul>
            </SpecSection>

            {/* 3. GPIO */}
            <SpecSection icon={<Cpu className="w-4 h-4" />} title="৩. ESP32-WROOM-32 GPIO ম্যাপ">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-emerald-300 border-b border-white/10">
                      <th className="py-2 pr-3">GPIO</th>
                      <th className="py-2 pr-3">ফাংশন</th>
                      <th className="py-2 pr-3">Dir</th>
                      <th className="py-2">নোট</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-300">
                    {GPIO_MAP.map(([g, f, d, n], i) => (
                      <tr key={i} className="border-b border-white/5 align-top">
                        <td className="py-1.5 pr-3 font-mono text-emerald-200">{g}</td>
                        <td className="py-1.5 pr-3">{f}</td>
                        <td className="py-1.5 pr-3"><Badge variant="outline" className="text-[10px] border-slate-600 text-slate-300">{d}</Badge></td>
                        <td className="py-1.5 text-slate-400">{n}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SpecSection>

            {/* 4. BOM */}
            <SpecSection icon={<FileText className="w-4 h-4" />} title={`৪. বিল অফ মেটেরিয়ালস (${BOM.length} আইটেম)`}>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-emerald-300 border-b border-white/10">
                      <th className="py-2 pr-2">Ref</th>
                      <th className="py-2 pr-2">Qty</th>
                      <th className="py-2 pr-2">Part</th>
                      <th className="py-2 pr-2">Spec</th>
                      <th className="py-2">নোট</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-300">
                    {BOM.map((b, i) => (
                      <tr key={i} className="border-b border-white/5 align-top">
                        <td className="py-1.5 pr-2 font-mono text-emerald-200">{b.ref}</td>
                        <td className="py-1.5 pr-2 text-center">{b.qty}</td>
                        <td className="py-1.5 pr-2">{b.part}</td>
                        <td className="py-1.5 pr-2 text-slate-400">{b.spec}</td>
                        <td className="py-1.5 text-slate-400">{b.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SpecSection>

            {/* 5. Layout */}
            <SpecSection icon={<CircuitBoard className="w-4 h-4" />} title="৫. PCB লে-আউট জোন">
              <pre className="text-[11px] text-slate-300 bg-slate-950/60 p-3 rounded-lg border border-white/10 overflow-x-auto leading-snug">
{`┌──────────────────────────────────────────────────────┐
│  ZONE A — 230 VAC MAINS  (silkscreen RED)            │
│  F1 fuse, MOV1 surge, J1 input, KM1 contactor        │
│  ━━━━━━━ 6 mm isolation slot ━━━━━━━━━━━━━━━━━━━━    │
│  ZONE B — 8-ch Relay K1 + per-channel fuses F2..F9   │
│  Output terminals J2 × 8  (NO / COM / NC)            │
│  ━━━━━━━ 6 mm isolation slot ━━━━━━━━━━━━━━━━━━━━    │
│  ZONE C — Low-voltage logic                          │
│  PS1 SMPS · PS2 buck · PS3 SIM supply · ESP32 socket │
│  J3 × 6 sensor connectors · LED1-3 · BZ1 buzzer      │
└──────────────────────────────────────────────────────┘
   Cable glands PG1 × 6 enter from BOTTOM
   GSM antenna SMA bulkhead exits TOP`}
              </pre>
            </SpecSection>

            {/* 6. Safety */}
            <SpecSection icon={<Shield className="w-4 h-4" />} title="৬. সেফটি ও কমপ্লায়েন্স">
              <ul className="text-xs text-slate-300 space-y-1.5">
                {SAFETY_NOTES.map((n, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-amber-400 shrink-0">⚠</span>
                    <span>{n}</span>
                  </li>
                ))}
              </ul>
            </SpecSection>

            {/* 7. Test */}
            <SpecSection icon={<FileText className="w-4 h-4" />} title="৭. ফ্যাক্টরি টেস্ট চেকলিস্ট">
              <ol className="text-xs text-slate-300 space-y-1.5 list-decimal list-inside">
                {TEST_CHECKLIST.map((n, i) => <li key={i}>{n}</li>)}
              </ol>
            </SpecSection>
          </ScrollArea>
        </CardContent>
      </Card>
      </TabsContent>

      {/* ===================== TERMINAL WIRING TAB ===================== */}
      <TabsContent value="wiring" className="space-y-4 mt-0">
        <Card className="bg-gradient-to-br from-amber-900/40 to-orange-900/30 border-amber-500/30">
          <CardContent className="pt-6 pb-6 flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30 shrink-0">
                <Plug className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">টার্মিনাল ওয়্যারিং ডায়াগ্রাম</h2>
                <p className="text-sm text-amber-200/80 mt-1">L / N / PE input  ·  COM / NO / NC outputs (8 channels)</p>
                <p className="text-xs text-slate-400 mt-1">
                  ইলেকট্রিশিয়ান বা ম্যানুফ্যাকচারারের জন্য আলাদা Word ফাইল — wire color, fuse, contactor সহ পূর্ণ schematic।
                </p>
              </div>
            </div>
            <Button
              size="lg"
              onClick={handleDownloadWiring}
              disabled={busyWiring}
              className="bg-gradient-to-r from-amber-500 to-orange-600 text-white border-0 hover:from-amber-600 hover:to-orange-700 shadow-lg shadow-amber-500/30 shrink-0"
            >
              {busyWiring ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Download className="w-5 h-5 mr-2" />}
              ওয়্যারিং Word (.docx)
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/80 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <Plug className="w-5 h-5 text-amber-400" /> ওয়্যারিং প্রিভিউ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-3">
              {/* Mains input */}
              <SpecSection icon={<Zap className="w-4 h-4" />} title="১. মেইনস ইনপুট টার্মিনাল  J1  (L / N / PE)">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-amber-300 border-b border-white/10">
                        <th className="py-2 pr-3">Pin</th>
                        <th className="py-2 pr-3">Label</th>
                        <th className="py-2 pr-3">Wire Colour</th>
                        <th className="py-2 pr-3">Cable</th>
                        <th className="py-2">Connects To</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-300">
                      {MAINS_TERMINALS.map((t, i) => (
                        <tr key={i} className="border-b border-white/5 align-top">
                          <td className="py-1.5 pr-3 font-mono text-amber-200 font-bold">{t.pin}</td>
                          <td className="py-1.5 pr-3 font-semibold">{t.label}</td>
                          <td className="py-1.5 pr-3">{t.color}</td>
                          <td className="py-1.5 pr-3 text-slate-400">{t.wire}</td>
                          <td className="py-1.5 text-slate-400">{t.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SpecSection>

              {/* Relay outputs */}
              <SpecSection icon={<CircuitBoard className="w-4 h-4" />} title="২. রিলে আউটপুট টার্মিনাল  J2 × 8  (COM / NO / NC)">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-amber-300 border-b border-white/10">
                        <th className="py-2 pr-2">CH</th>
                        <th className="py-2 pr-2">GPIO</th>
                        <th className="py-2 pr-2">Load</th>
                        <th className="py-2 pr-2">COM</th>
                        <th className="py-2 pr-2">NO</th>
                        <th className="py-2 pr-2">NC</th>
                        <th className="py-2">Fuse</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-300">
                      {RELAY_OUTPUTS.map((r, i) => (
                        <tr key={i} className="border-b border-white/5 align-top">
                          <td className="py-1.5 pr-2 font-mono text-amber-200 font-bold">{r.ch}</td>
                          <td className="py-1.5 pr-2 font-mono text-emerald-200">{r.gpio}</td>
                          <td className="py-1.5 pr-2 font-semibold">{r.load}</td>
                          <td className="py-1.5 pr-2 text-slate-300">{r.com}</td>
                          <td className="py-1.5 pr-2 text-slate-300">{r.no}</td>
                          <td className="py-1.5 pr-2 text-slate-500">{r.nc}</td>
                          <td className="py-1.5 text-slate-400">{r.fuse}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SpecSection>

              {/* Schematic */}
              <SpecSection icon={<Zap className="w-4 h-4" />} title="৩. সিঙ্গেল-চ্যানেল ওয়্যারিং স্কিম্যাটিক">
                <pre className="text-[11px] text-slate-300 bg-slate-950/60 p-3 rounded-lg border border-white/10 overflow-x-auto leading-snug">
{`   230 VAC                +-------+         +-----------+        +----------+
   L  o----[ F1 10A ]----| MOV1  |---o-----| RELAY COM |        |   LOAD   |
                          +-------+   |     |           |        | (Fan /   |
                                      |     |    NO o---+--------+ Heater)  |
                                 [F2..F9 5A per ch]    |        |          |
   N  o-----------------------------------------------+--------+--+ N      |
                                                       |          |        |
   PE o--[ Enclosure / DIN rail / Load chassis ]------+----------+ PE      |
                                                                  +--------+

   NC = (not used, leave open)
   ESP32 GPIO --[ opto-isolator on K1 board ]--> Relay coil (active LOW)`}
                </pre>
              </SpecSection>

              {/* Rules */}
              <SpecSection icon={<Shield className="w-4 h-4" />} title="৪. ওয়্যারিং নিয়ম ও সেফটি">
                <ol className="text-xs text-slate-300 space-y-1.5 list-decimal list-inside">
                  {WIRING_RULES.map((n, i) => <li key={i}>{n}</li>)}
                </ol>
              </SpecSection>

              {/* 5. Connector & wire-colour map */}
              <SpecSection icon={<Plug className="w-4 h-4" />} title="৫. কানেক্টর ও তারের রঙ ম্যাপিং (প্রতিটি প্লাগ, পিন-বাই-পিন)">
                <p className="text-[11px] text-slate-400 mb-3">
                  AC পাওয়ারে IEC 60446 রঙ-কোড। DC ও সিগন্যাল লাইনে Nexiot Labs convention — ফিল্ডে এই রঙ মেনে চললে troubleshooting দ্রুত হয়।
                </p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {CONNECTOR_MAP.map((g) => (
                    <div key={g.id} className="rounded-lg border border-white/10 bg-slate-950/50 overflow-hidden">
                      <div className="px-3 py-2 bg-gradient-to-r from-amber-900/30 to-transparent border-b border-white/10">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-mono text-amber-300 font-bold text-xs">{g.id}</span>
                          <span className="text-[10px] text-slate-500">{g.pitch}</span>
                        </div>
                        <div className="text-xs text-slate-200 font-semibold mt-0.5">{g.title}</div>
                        <div className="text-[10px] text-slate-400">{g.subtitle}</div>
                      </div>
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="text-left text-slate-500 border-b border-white/5">
                            <th className="px-2 py-1 w-8 text-center">Pin</th>
                            <th className="px-2 py-1">Signal</th>
                            <th className="px-2 py-1 w-6"></th>
                            <th className="px-2 py-1">Wire</th>
                            <th className="px-2 py-1 w-16">AWG</th>
                          </tr>
                        </thead>
                        <tbody className="text-slate-300">
                          {g.rows.map((r, i) => (
                            <tr key={i} className="border-b border-white/5 last:border-0 align-middle">
                              <td className="px-2 py-1.5 text-center font-mono text-amber-200 font-bold">{r.pin}</td>
                              <td className="px-2 py-1.5 font-semibold">{r.signal}</td>
                              <td className="px-2 py-1.5">
                                <span
                                  className="inline-block w-3.5 h-3.5 rounded-full border border-white/30 shadow-inner"
                                  style={{ backgroundColor: r.colorHex }}
                                  title={r.colorName}
                                />
                              </td>
                              <td className="px-2 py-1.5 text-slate-300">{r.colorName}</td>
                              <td className="px-2 py-1.5 text-slate-400 font-mono text-[10px]">{r.awg}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              </SpecSection>
            </ScrollArea>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function SpecSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 pb-5 border-b border-white/5 last:border-0">
      <h3 className="text-sm font-bold text-emerald-300 flex items-center gap-2 mb-3">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-col sm:flex-row gap-1 sm:gap-3 text-xs py-1">
      <span className="text-slate-400 sm:w-32 shrink-0">{k}:</span>
      <span className="text-slate-200">{v}</span>
    </div>
  );
}
