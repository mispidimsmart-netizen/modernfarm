import { Cpu, Zap, Wifi, CheckCircle2, ExternalLink, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { TabsContent } from '@/components/ui/tabs';
import { getSetupSteps, getWifiConfigCode, guideVersionMeta } from '@/data/installationVersionMap';
import { useGuideVersion } from '@/components/installation/GuideVersionContext';
import { InstallationV10SetupNotice } from '@/components/installation/InstallationV10Updates';
import { ESP32CodeGenerator } from '@/components/device/ESP32CodeGenerator';

interface InstallationSetupTabProps {
  copiedCode: string | null;
  onCopy: (text: string, label: string) => void;
  onNavigate: (path: string) => void;
}

export function InstallationSetupTab({ copiedCode, onCopy, onNavigate }: InstallationSetupTabProps) {
  const { version } = useGuideVersion();
  const meta = guideVersionMeta[version];
  const steps = getSetupSteps(version);
  const wifiConfigCode = getWifiConfigCode(version);

  return (
    <TabsContent value="setup" className="mt-4 space-y-4">
      {version === 'v10' && <InstallationV10SetupNotice />}
      {/* ESP32 Code Generator - Interactive */}
      <ESP32CodeGenerator language="bn" />

      {/* Setup Steps Accordion */}
      <Accordion type="single" collapsible className="w-full">
        {steps.map((step) => (

          <AccordionItem key={step.step} value={`step-${step.step}`}>
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <step.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">ধাপ {step.step}: {step.title}</p>
                  <p className="text-xs text-muted-foreground">{step.titleEn}</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="ml-11 space-y-2">
                {step.tasks.map((task, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <p className="text-sm">{task}</p>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {/* WiFi Config Code */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">📝 কোড কনফিগারেশন</CardTitle>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onCopy(wifiConfigCode, 'wifi')}
            >
              {copiedCode === 'wifi' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted/50 rounded-lg p-3 text-xs font-mono overflow-x-auto">
            {wifiConfigCode}
          </pre>
        </CardContent>
      </Card>

      {/* Download Buttons */}
      <div className="grid grid-cols-1 gap-2">
        <Button 
          variant="outline" 
          className="w-full justify-start"
          onClick={() => window.open('/esp32-industrial.ino', '_blank')}
        >
          <Cpu className="h-4 w-4 mr-2" />
          <span className="flex-1 text-left">ESP32 Industrial কোড ডাউনলোড (v8.0.0)</span>
          <Badge variant="secondary">Production</Badge>
        </Button>
        <Button 
          variant="outline" 
          className="w-full justify-start"
          onClick={() => window.open('/esp32-safety-engine.h', '_blank')}
        >
          <Zap className="h-4 w-4 mr-2" />
          <span className="flex-1 text-left">Safety Engine হেডার ফাইল</span>
          <Badge variant="secondary">Required</Badge>
        </Button>
        <Button 
          variant="outline" 
          className="w-full justify-start"
          onClick={() => window.open('/esp32-gsm-sms.ino', '_blank')}
        >
          <Wifi className="h-4 w-4 mr-2" />
          <span className="flex-1 text-left">GSM SMS সাপোর্ট সহ কোড</span>
          <Badge variant="secondary">Optional</Badge>
        </Button>
      </div>

      {/* API Docs Link */}
      <Button 
        className="w-full"
        onClick={() => onNavigate('/api-docs')}
      >
        API ডকুমেন্টেশন দেখুন
        <ExternalLink className="h-4 w-4 ml-2" />
      </Button>
    </TabsContent>
  );
}
