import { Cable, AlertTriangle, Info, Lightbulb } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { detailedWiringGuide } from '@/data/installationGuide';
import { getWiringCategories } from '@/data/installationVersionMap';
import { useGuideVersion } from '@/components/installation/GuideVersionContext';

import { BuzzerWiringSection } from '@/components/installation/wiring/BuzzerWiringSection';
import { FoggerWiringSection } from '@/components/installation/wiring/FoggerWiringSection';
import { SprinklerWiringSection } from '@/components/installation/wiring/SprinklerWiringSection';
import { AcWiringSection } from '@/components/installation/wiring/AcWiringSection';
import { McbContactorSection } from '@/components/installation/wiring/McbContactorSection';
import { FarmTypeMappingSection } from '@/components/installation/wiring/FarmTypeMappingSection';
import { CapacitorDiagram, PowerSetupDiagram, type PowerSetupInfo } from '@/components/installation/wiring/WiringDiagramBlocks';

type Sensor = typeof detailedWiringGuide[number];

function SensorWiringDetails({ sensor }: { sensor: Sensor }) {
  return (
    <div className="ml-11 space-y-4">
      {/* Quick pin-out chart (compact) */}
      <div className={`rounded-lg border-2 ${sensor.bgColor} border-dashed p-2.5`}>
        <p className="text-[11px] font-semibold mb-2 flex items-center gap-1">
          <Cable className={`h-3 w-3 ${sensor.color}`} />
          📍 দ্রুত পিন-আউট চার্ট ({sensor.pins.length} পিন)
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] font-mono">
            <thead>
              <tr className="border-b border-border/60 text-muted-foreground">
                <th className="text-left py-1 pr-2 font-semibold">#</th>
                <th className="text-left py-1 pr-2 font-semibold">{sensor.nameEn.split(' ')[0]} পিন</th>
                <th className="text-center py-1 px-1">→</th>
                <th className="text-left py-1 pr-2 font-semibold">ESP32 / টার্গেট</th>
                <th className="text-left py-1 font-semibold">তার</th>
              </tr>
            </thead>
            <tbody>
              {sensor.pins.map((pin, i) => (
                <tr key={i} className="border-b border-border/30 last:border-0">
                  <td className="py-1 pr-2 text-muted-foreground">{i + 1}</td>
                  <td className="py-1 pr-2 font-semibold">{pin.sensorPin}</td>
                  <td className="py-1 px-1 text-center text-primary">→</td>
                  <td className="py-1 pr-2 text-primary">{pin.esp32Pin}</td>
                  <td className="py-1 text-muted-foreground">
                    {pin.wireColor && pin.wireColor !== '-' ? `🔌 ${pin.wireNameEn || pin.wireColor}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pin connections */}
      <div className="space-y-2">
        {sensor.pins.map((pin, pinIdx) => (
          <div key={pinIdx} className={`flex items-start gap-3 p-3 rounded-lg ${pin.warning ? 'bg-destructive/5 border border-destructive/20' : 'bg-muted/50'}`}>
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
              {pinIdx + 1}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">{pin.sensorPin}</Badge>
                {pin.esp32Pin !== '-' && (
                  <>
                    <span className="text-xs">→</span>
                    <Badge className="text-xs bg-primary">{pin.esp32Pin}</Badge>
                  </>
                )}
                {pin.wireColor && pin.wireColor !== '-' && (
                  <Badge variant="secondary" className="text-xs">
                    🔌 {pin.wireColor} {pin.wireNameEn && `(${pin.wireNameEn})`}
                  </Badge>
                )}
              </div>
              <p className="text-sm mt-1">{pin.instruction}</p>
              {pin.warning && (
                <p className="text-xs text-destructive mt-1 font-medium">{pin.warning}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 12V Power Setup Diagram */}
      {'hasPowerSetupDiagram' in sensor && sensor.hasPowerSetupDiagram && 'powerSetupInfo' in sensor && sensor.powerSetupInfo && (
        <PowerSetupDiagram info={sensor.powerSetupInfo as unknown as PowerSetupInfo} />
      )}

      {/* Capacitor Wiring Diagram */}
      {sensor.hasCapacitorDiagram && <CapacitorDiagram />}

      {/* Resistor note */}
      {sensor.resistorNote && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
          <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700 dark:text-blue-400">{sensor.resistorNote}</p>
        </div>
      )}

      {/* Extra note */}
      {sensor.extraNote && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-status-warning/10 border border-status-warning/30">
          <AlertTriangle className="h-4 w-4 text-status-warning shrink-0 mt-0.5" />
          <p className="text-sm text-status-warning">{sensor.extraNote}</p>
        </div>
      )}

      {/* Tips */}
      {sensor.tips && sensor.tips.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Info className="h-3 w-3" /> টিপস:
          </p>
          {sensor.tips.map((tip, tipIdx) => (
            <p key={tipIdx} className="text-xs text-muted-foreground ml-4">• {tip}</p>
          ))}
        </div>
      )}

      {'hasBuzzerDiagram' in sensor && sensor.hasBuzzerDiagram && 'buzzerWiringInfo' in sensor && sensor.buzzerWiringInfo && (
        <BuzzerWiringSection info={sensor.buzzerWiringInfo} />
      )}
      {'hasFoggerDiagram' in sensor && sensor.hasFoggerDiagram && 'foggerWiringInfo' in sensor && sensor.foggerWiringInfo && (
        <FoggerWiringSection info={sensor.foggerWiringInfo} />
      )}
      {'hasSprinklerDiagram' in sensor && sensor.hasSprinklerDiagram && 'sprinklerWiringInfo' in sensor && sensor.sprinklerWiringInfo && (
        <SprinklerWiringSection info={sensor.sprinklerWiringInfo} />
      )}
      {sensor.hasAcWiring && sensor.acWiringInfo && (
        <AcWiringSection info={sensor.acWiringInfo} />
      )}
      {'hasMcbContactorWiring' in sensor && sensor.hasMcbContactorWiring && 'mcbContactorInfo' in sensor && sensor.mcbContactorInfo && (
        <McbContactorSection info={sensor.mcbContactorInfo as Parameters<typeof McbContactorSection>[0]['info']} />
      )}
      {sensor.hasFarmTypeMapping && sensor.farmTypeMapping && (
        <FarmTypeMappingSection info={sensor.farmTypeMapping} />
      )}
    </div>
  );
}

/** Category → sensor nested accordion with full per-sensor wiring instructions. */
export function SensorWiringAccordion() {
  const { version } = useGuideVersion();
  const categories = getWiringCategories(version);
  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          ধাপে ধাপে ওয়্যারিং গাইড
          <Badge variant="outline" className="ml-auto text-[10px] uppercase">{version}</Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">শুধু {version} বোর্ডে প্রযোজ্য সেন্সরগুলোর বিস্তারিত নির্দেশনা</p>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {categories.map((cat) => {
            const sensors = cat.sensorIds
              .map((sid) => detailedWiringGuide.find((s) => s.id === sid))
              .filter((s): s is Sensor => Boolean(s));
            if (sensors.length === 0) return null;

            const CatIcon = cat.icon;
            return (
              <AccordionItem key={cat.id} value={cat.id}>
                <AccordionTrigger className="hover:no-underline py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full ${cat.bgColor} flex items-center justify-center`}>
                      <CatIcon className={`h-5 w-5 ${cat.color}`} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold">{cat.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {cat.nameEn} · {sensors.length} বিকল্প/ডিভাইস
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-4">
                  <Accordion type="single" collapsible className="w-full border-l-2 border-primary/20 pl-3 ml-2">
                    {sensors.map((sensor) => (
                      <AccordionItem key={sensor.id} value={sensor.id}>
                        <AccordionTrigger className="hover:no-underline py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full ${sensor.bgColor} flex items-center justify-center`}>
                              <sensor.icon className={`h-4 w-4 ${sensor.color}`} />
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-medium">{sensor.name}</p>
                              <p className="text-xs text-muted-foreground">{sensor.nameEn}</p>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 pb-4">
                          <SensorWiringDetails sensor={sensor} />
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}
