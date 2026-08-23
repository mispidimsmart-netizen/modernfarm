import { Lightbulb } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TabsContent } from '@/components/ui/tabs';
import { InstallationV10WiringNotice } from '@/components/installation/InstallationV10Updates';
import { LDRInstallationGuide } from '@/components/lighting/LDRInstallationGuide';
import { SensorWiringAccordion } from '@/components/installation/wiring/SensorWiringAccordion';
import {
  WireColorLegendCard,
  WiringDiagramCard,
  QuickReferenceTableCard,
  JumperWireGuideCard,
  ImportantNotesCard,
  WiringChecklistCard,
} from '@/components/installation/wiring/WiringReferenceCards';

export function InstallationWiringTab() {
  const { version } = useGuideVersion();
  return (
    <TabsContent value="wiring" className="mt-4 space-y-4">
      {version === 'v10' && <InstallationV10WiringNotice />}

      <WireColorLegendCard />
      <WiringDiagramCard />
      <SensorWiringAccordion />
      <QuickReferenceTableCard />
      <JumperWireGuideCard />
      <ImportantNotesCard />

      {/* 🔆 LDR (আলো সেন্সর) ইনস্টলেশন গাইড */}
      <Card className="border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            🔆 LDR আলো সেন্সর ইনস্টলেশন
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            ঐচ্ছিক — শুধু স্মার্ট লাইটিং অটোমেশন চালু করতে চাইলে যোগ করুন
          </p>
        </CardHeader>
        <CardContent>
          <LDRInstallationGuide />
        </CardContent>
      </Card>

      <WiringChecklistCard />
    </TabsContent>
  );
}
