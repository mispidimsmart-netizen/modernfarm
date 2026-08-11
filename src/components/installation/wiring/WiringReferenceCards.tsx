import { Cable, CheckCircle2, AlertTriangle, Lightbulb } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { jumperWireTypes, wiringConnections } from '@/data/installationGuide';
import {
  WIRE_COLORS,
  ESP32_TEXT_DIAGRAM,
  WIRING_IMPORTANT_NOTES,
  WIRING_CHECKLIST,
} from '@/data/wiringReference';
import wiringDiagram from '@/assets/esp32-wiring-diagram.png';

export function WireColorLegendCard() {
  return (
    <Card className="bg-gradient-to-r from-muted/50 to-muted/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          🎨 তারের রং চার্ট (Wire Color Guide)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {WIRE_COLORS.map((wire, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-background/50">
              <div className={`w-4 h-4 rounded-full ${wire.color} shrink-0`} />
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{wire.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{wire.use}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function WiringDiagramCard() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          📐 ওয়্যারিং ডায়াগ্রাম
          <Badge variant="secondary" className="text-[10px]">ছবিতে দেখুন</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <img
          src={wiringDiagram}
          alt="ESP32 Wiring Diagram"
          loading="lazy"
          decoding="async"
          className="w-full rounded-lg border border-border mb-4"
        />

        <Accordion type="single" collapsible>
          <AccordionItem value="text-diagram">
            <AccordionTrigger className="text-xs py-2">টেক্সট ডায়াগ্রাম দেখুন</AccordionTrigger>
            <AccordionContent>
              <div className="bg-muted/30 rounded-lg p-4 overflow-x-auto">
                <pre className="text-xs font-mono whitespace-pre text-foreground">
                  {ESP32_TEXT_DIAGRAM}
                </pre>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

export function QuickReferenceTableCard() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">🔌 দ্রুত রেফারেন্স টেবিল</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-1">কম্পোনেন্ট</th>
                <th className="text-left py-2 px-1">পিন</th>
                <th className="text-left py-2 px-1">ESP32</th>
                <th className="text-left py-2 px-1">তার</th>
              </tr>
            </thead>
            <tbody>
              {wiringConnections.map((conn, idx) => (
                <tr key={idx} className="border-b border-border/50">
                  <td className="py-2 px-1 font-medium">{conn.component}</td>
                  <td className="py-2 px-1">{conn.pin}</td>
                  <td className="py-2 px-1 font-mono text-primary">{conn.esp32Pin}</td>
                  <td className="py-2 px-1">
                    <div className="flex items-center gap-1">
                      <div className={`w-3 h-3 rounded-full ${conn.color}`}></div>
                      {conn.note && <span className="text-muted-foreground">({conn.note})</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export function JumperWireGuideCard() {
  return (
    <Card className="border-2 border-accent">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Cable className="h-4 w-4 text-accent" />
          🔌 জাম্পার ওয়্যার চেনার গাইড
        </CardTitle>
        <p className="text-xs text-muted-foreground">Male-to-Male, Male-to-Female, Female-to-Female তার চেনার সহজ উপায়</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {jumperWireTypes.map((wire, idx) => (
              <div key={idx} className="p-3 rounded-lg border-2 border-border/50 hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-3 h-3 rounded-full ${wire.color}`}></div>
                  <span className="font-bold text-sm">{wire.type}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{wire.typeBn}</p>

                <div className="bg-muted/50 rounded-lg p-3 text-center mb-3">
                  <p className="text-2xl font-mono tracking-widest">{wire.visual}</p>
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>{wire.endA}</span>
                    <span>{wire.endB}</span>
                  </div>
                </div>

                <p className="text-xs font-medium mb-1">🔍 চেনার উপায়:</p>
                <p className="text-xs text-muted-foreground mb-2">{wire.description}</p>

                <p className="text-xs font-medium mb-1">✅ কখন ব্যবহার:</p>
                <p className="text-xs text-muted-foreground mb-2">{wire.usage}</p>

                <p className="text-xs font-medium mb-1">📌 উদাহরণ:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {wire.examples.map((ex, exIdx) => (
                    <li key={exIdx}>• {ex}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-lg bg-accent/10 border border-accent/30">
            <p className="text-sm font-bold flex items-center gap-2 mb-2">
              <Lightbulb className="h-4 w-4 text-accent" />
              ⚡ দ্রুত চেনার টিপস
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div className="flex items-start gap-2">
                <span className="text-lg">📍</span>
                <div>
                  <p className="font-medium">Male (পিন/সুই)</p>
                  <p className="text-muted-foreground">ধাতব পিন বের হয়ে আছে - ব্রেডবোর্ড বা সকেটে ঢোকানো যায়</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-lg">⬜</span>
                <div>
                  <p className="font-medium">Female (সকেট/গর্ত)</p>
                  <p className="text-muted-foreground">প্লাস্টিকের ভেতরে গর্ত - এতে পিন ঢোকানো যায়</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
            <p className="text-sm font-bold mb-2">🐔 FarmEye প্রজেক্টে কোনটা কিনবেন?</p>
            <p className="text-xs text-muted-foreground mb-2">
              আমরা সাধারণত <strong>Male-to-Female (M-F)</strong> তার বেশি ব্যবহার করি কারণ:
            </p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>✅ ESP32 এর পিনগুলো Male (পিন বের হয়ে আছে)</li>
              <li>✅ বেশিরভাগ সেন্সর মডিউলেও Male পিন থাকে</li>
              <li>✅ M-F তার দিয়ে সরাসরি সংযোগ করা যায়</li>
            </ul>
            <div className="mt-2 p-2 bg-background/50 rounded text-xs">
              <p className="font-medium">💡 সুপারিশ: ৪০ পিসের M-F + ২০ পিসের M-M মিশ্র সেট কিনুন (৳১৫০-২৫০)</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ImportantNotesCard() {
  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-destructive">⚠️ অবশ্যই মনে রাখুন</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="space-y-3">
          {WIRING_IMPORTANT_NOTES.map((note, idx) => (
            <div key={idx} className="flex items-start gap-2 p-2 rounded bg-muted/50">
              <span className="text-lg">{note.emoji}</span>
              <div>
                <p className="font-medium">{note.title}</p>
                <p className="text-xs text-muted-foreground">{note.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function WiringChecklistCard() {
  return (
    <Card className="border-green-500/30 bg-green-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-green-600 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          ওয়্যারিং চেকলিস্ট
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="grid grid-cols-1 gap-2">
          {WIRING_CHECKLIST.map((item, idx) => (
            <label key={idx} className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded border-gray-300" />
              <span>{item}</span>
            </label>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function WiringWarningIcon() {
  return <AlertTriangle className="h-4 w-4" />;
}
