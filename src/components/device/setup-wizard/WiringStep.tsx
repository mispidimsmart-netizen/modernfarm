import { Cable, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { HwVersion, RelayRow } from './wizardConstants';

interface Props {
  version: HwVersion;
  relayMap: RelayRow[];
  wiringConfirmed: boolean;
  setWiringConfirmed: (v: boolean) => void;
  onOpenGuide: () => void;
}

export function WiringStep({ version, relayMap, wiringConfirmed, setWiringConfirmed, onOpenGuide }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Cable className="h-4 w-4 text-primary" />
          {version === 'v10' ? 'v10 ওয়্যারিং' : 'v8 ওয়্যারিং'} — রিলে GPIO ম্যাপ
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          ESP32-WROOM-32 <strong>38-pin DevKit V1</strong> ব্যবহার করুন (WROVER নয়)।
          প্রতিটি রিলে এই GPIO অনুযায়ী কানেক্ট করুন।
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted">
              <tr>
                <th className="px-2 py-1.5 text-left">GPIO</th>
                <th className="px-2 py-1.5 text-left">Relay Ch</th>
                <th className="px-2 py-1.5 text-left">লোড</th>
              </tr>
            </thead>
            <tbody>
              {relayMap.map((r) => (
                <tr key={r.gpio} className="border-t">
                  <td className="px-2 py-1.5 font-mono text-[11px]">{r.gpio}</td>
                  <td className="px-2 py-1.5">{r.ch}</td>
                  <td className="px-2 py-1.5">{r.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border border-amber-500/40 bg-amber-500/5 rounded-lg p-2 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px]">
            রিলে <strong>active-LOW</strong> (LOW = ON)। 5V relay-এর VCC ESP32-এর 5V পিন
            বা আলাদা পাওয়ার সাপ্লাইতে দিন। GND অবশ্যই common করুন।
          </p>
        </div>

        <label className="flex items-start gap-2 cursor-pointer rounded-lg border p-2 hover:bg-accent">
          <Checkbox
            checked={wiringConfirmed}
            onCheckedChange={(c) => setWiringConfirmed(c === true)}
            className="mt-0.5"
          />
          <span className="text-xs">
            আমি উপরের <strong>{version}</strong> ওয়্যারিং ডায়াগ্রাম অনুযায়ী রিলে কানেক্ট করেছি
            এবং double-check করেছি।
          </span>
        </label>

        <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={onOpenGuide}>
          বিস্তারিত wiring diagram দেখুন →
        </Button>
      </CardContent>
    </Card>
  );
}
