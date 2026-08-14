import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Copy, Check, CircuitBoard, ListChecks, FileDown, Cpu, Wrench, ExternalLink, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  FLUX_BOARD,
  FLUX_STEPS,
  PIN_MAP,
  GROUP_LABELS,
  COMPONENTS,
  EXPORT_FILES,
  FINAL_CHECKLIST,
  PROMPTS,
  type PinRow,
} from '@/data/fluxPcbGuide';

const groupOrder: PinRow['group'][] = ['relay', 'sensor', 'gsm', 'display', 'misc'];

const groupTone: Record<PinRow['group'], string> = {
  relay: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  sensor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  gsm: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  display: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  misc: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
};


export function FluxPcbDesignGuide() {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      toast.success('প্রম্পট কপি হয়েছে — Flux.ai Copilot এ পেস্ট করুন');
      setTimeout(() => setCopied((c) => (c === id ? null : c)), 2000);
    } catch {
      toast.error('কপি করা যায়নি — ম্যানুয়ালি সিলেক্ট করে কপি করুন');
    }
  };

  return (
    <div className="space-y-4">
      {/* Intro */}
      <Card className="bg-gradient-to-br from-indigo-950/50 via-slate-900/90 to-fuchsia-950/30 border-indigo-500/25 shadow-xl">
        <CardHeader className="border-b border-indigo-500/10">
          <CardTitle className="text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-indigo-500/40">
              <CircuitBoard className="w-5 h-5 text-white" />
            </div>
            <span className="bg-gradient-to-r from-indigo-200 to-fuchsia-200 bg-clip-text text-transparent font-semibold">
              Flux.ai দিয়ে PCB বোর্ড ডিজাইন — FarmEye Controller v8
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5 space-y-4 text-sm">
          <p className="text-slate-300 leading-relaxed">
            PCB মানে <b className="text-white">প্রিন্টেড সার্কিট বোর্ড</b> — যে সবুজ বোর্ডে সব যন্ত্রাংশ বসানো
            থাকে এবং তামার লাইন দিয়ে নিজে নিজেই সংযোগ হয়ে যায়। এখন যে জোড়াতালি তার দিয়ে সংযোগ করা হয়,
            PCB বানালে সেটা আর লাগবে না — ইনস্টলেশন দ্রুত হবে, তার ঢিলা হয়ে ডিভাইস বন্ধ হওয়ার ঝুঁকি কমবে।
          </p>
          <p className="text-slate-300 leading-relaxed">
            <b className="text-white">Flux.ai</b> একটি অনলাইন ওয়েবসাইট (কিছু ইনস্টল করতে হয় না) যেখানে
            AI Copilot-কে লিখে বললেই সে সার্কিট এঁকে দেয়। নিচের ধাপগুলো ক্রমানুসারে অনুসরণ করুন এবং
            প্রম্পটগুলো হুবহু কপি-পেস্ট করুন।
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="border-indigo-500/40 text-indigo-200">বোর্ড: {FLUX_BOARD}</Badge>
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-200">সাইজ: ১২০ × ১০০ mm</Badge>
            <Badge variant="outline" className="border-amber-500/40 text-amber-200">পাওয়ার: বাহ্যিক 5V/3A অ্যাডাপ্টার</Badge>
            <Badge variant="outline" className="border-fuchsia-500/40 text-fuchsia-200">GSM: SIM800L (4.0V)</Badge>
          </div>
          <Button
            variant="outline"
            className="border-indigo-500/40 text-indigo-200 hover:bg-indigo-500/10"
            onClick={() => window.open('https://www.flux.ai', '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            flux.ai খুলুন
          </Button>
        </CardContent>
      </Card>

      {/* Steps */}
      <Card className="bg-slate-900/80 border-white/10">
        <CardHeader className="border-b border-white/5">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Wrench className="w-4 h-4 text-emerald-400" />
            ধাপে ধাপে প্রসেস (৭ ধাপ)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5 space-y-3">
          {FLUX_STEPS.map((s, i) => (
            <div key={s.title} className="flex gap-3 rounded-xl border border-white/10 bg-slate-800/40 p-3">
              <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-sm font-bold flex items-center justify-center">
                {i + 1}
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-white text-sm">{s.title}</p>
                <p className="text-slate-300 text-sm leading-relaxed">{s.what}</p>
                <p className="text-emerald-300/90 text-xs leading-relaxed">✔ ঠিক হয়েছে বুঝবেন: {s.done}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Pin map */}
      <Card className="bg-slate-900/80 border-white/10">
        <CardHeader className="border-b border-white/5">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Cpu className="w-4 h-4 text-purple-400" />
            পিন ম্যাপিং — ফার্মওয়্যার (v8) থেকে হুবহু
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-5">
          <p className="text-xs text-slate-400">
            এই টেবিলটি <code className="text-slate-200">public/esp32-industrial.ino</code> ফাইলের প্রকৃত
            <code className="text-slate-200"> #define</code> মান থেকে নেওয়া — কোনো আনুমানিক তথ্য নেই।
          </p>
          {groupOrder.map((g) => (
            <div key={g} className="space-y-2">
              <p className="text-sm font-semibold text-white">{GROUP_LABELS[g]}</p>
              <div className="overflow-x-auto rounded-lg border border-white/10">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800/70 text-slate-300">
                    <tr>
                      <th className="text-left p-2 font-medium">GPIO</th>
                      <th className="text-left p-2 font-medium">কাজ</th>
                      <th className="text-left p-2 font-medium hidden sm:table-cell">ফার্মওয়্যার নাম</th>
                      <th className="text-left p-2 font-medium">নোট</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PIN_MAP.filter((p) => p.group === g).map((p) => (
                      <tr key={p.define} className="border-t border-white/5">
                        <td className="p-2">
                          <span className={`inline-flex px-2 py-0.5 rounded-md border text-xs font-mono ${groupTone[g]}`}>
                            GPIO {p.gpio}
                          </span>
                        </td>
                        <td className="p-2 text-slate-200">{p.role}</td>
                        <td className="p-2 text-slate-400 font-mono text-xs hidden sm:table-cell">{p.define}</td>
                        <td className="p-2 text-slate-400 text-xs">{p.note ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-100/90">
              GPIO 34, 35 ও 36 শুধুমাত্র <b>ইনপুট</b> — এগুলোতে কখনো রিলে বা আউটপুট লাগাবেন না।
              GPIO 12 বুট করার সময় LOW থাকতে হবে, নাহলে ESP32 চালু হবে না।
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Prompts */}
      <Card className="bg-slate-900/80 border-white/10">
        <CardHeader className="border-b border-white/5">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Copy className="w-4 h-4 text-fuchsia-400" />
            কপি-পেস্ট প্রম্পট (Flux.ai Copilot এর জন্য)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <Accordion type="single" collapsible className="w-full">
            {PROMPTS.map((p) => (
              <AccordionItem key={p.id} value={p.id} className="border-white/10">
                <AccordionTrigger className="text-white hover:no-underline">
                  <span className="text-left">
                    <span className="block text-sm font-semibold">{p.title}</span>
                    <span className="block text-xs text-slate-400 font-normal">{p.hint}</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <Button
                    size="sm"
                    onClick={() => copy(p.id, p.text)}
                    className="bg-gradient-to-r from-fuchsia-500 to-indigo-600 text-white border-0"
                  >
                    {copied === p.id ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                    {copied === p.id ? 'কপি হয়েছে' : 'প্রম্পট কপি করুন'}
                  </Button>
                  <pre className="max-h-80 overflow-auto rounded-lg bg-slate-950/80 border border-white/10 p-3 text-[11px] leading-relaxed text-slate-300 whitespace-pre-wrap">
                    {p.text}
                  </pre>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Components */}
      <Card className="bg-slate-900/80 border-white/10">
        <CardHeader className="border-b border-white/5">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <CircuitBoard className="w-4 h-4 text-emerald-400" />
            কী কী ইলেকট্রনিক কম্পোনেন্ট ও সার্কিট লাগবে (এবং কেন)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid gap-2 sm:grid-cols-2">
            {COMPONENTS.map((c) => (
              <div key={c.name} className="rounded-lg border border-white/10 bg-slate-800/40 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-white">{c.name}</p>
                  <Badge variant="outline" className="shrink-0 border-emerald-500/40 text-emerald-200 text-[11px]">
                    {c.qty}
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{c.why}</p>
              </div>
            ))}
          </div>
          <Separator className="my-4 bg-white/10" />
          <p className="text-xs text-slate-400">
            নোট: বোর্ডে সরাসরি ২২০V থেকে DC বানানো হবে <b className="text-amber-300">না</b> — নিরাপত্তার জন্য
            বাইরের 5V/3A অ্যাডাপ্টারই ব্যবহার হবে (আগের সিদ্ধান্ত অনুযায়ী)।
          </p>
        </CardContent>
      </Card>

      {/* Export files */}
      <Card className="bg-slate-900/80 border-white/10">
        <CardHeader className="border-b border-white/5">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <FileDown className="w-4 h-4 text-cyan-400" />
            Flux থেকে কোন ফাইলগুলো লাগবে (প্রস্তুতকারককে দিতে)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-2">
          {EXPORT_FILES.map((f) => (
            <div key={f.file} className="rounded-lg border border-white/10 bg-slate-800/40 p-3">
              <p className="text-sm font-medium text-cyan-200">{f.file}</p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{f.why}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Checklist */}
      <Card className="bg-slate-900/80 border-white/10">
        <CardHeader className="border-b border-white/5">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-teal-400" />
            অর্ডার দেওয়ার আগে চূড়ান্ত চেকলিস্ট
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-2">
          {FINAL_CHECKLIST.map((c, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-slate-300">
              <Check className="w-4 h-4 text-teal-400 mt-0.5 shrink-0" />
              <span>{c}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default FluxPcbDesignGuide;
