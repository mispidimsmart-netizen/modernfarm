import { useState } from 'react';
import { ArrowLeft, Cable, Settings, ShoppingCart, Bird, Egg, Cpu, Thermometer, Wind, Droplets, Power, Fan } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from 'sonner';
import { LDRStatusBanner } from '@/components/lighting/LDRStatusBanner';
import { CurrentAutomationStatusBanner } from '@/components/admin/CurrentAutomationStatusBanner';
import { getPartsTotals, guideVersionMeta, type GuideVersion } from '@/data/installationVersionMap';
import { GuideVersionProvider, useGuideVersion } from '@/components/installation/GuideVersionContext';

import { InstallationPartsTab } from '@/components/installation/InstallationPartsTab';
import { InstallationWiringTab } from '@/components/installation/InstallationWiringTab';
import { InstallationSetupTab } from '@/components/installation/InstallationSetupTab';

function InstallationGuideContent() {
  const navigate = useNavigate();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { version, setVersion } = useGuideVersion();
  const meta = guideVersionMeta[version];
  const totals = getPartsTotals(version);
  const essentialTotal = totals.essential;
  const fullTotal = totals.full;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(label);
    toast.success('কপি হয়েছে!');
    setTimeout(() => setCopiedCode(null), 2000);
  };


  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-foreground">ইনস্টলেশন গাইড</h1>
            <p className="text-xs text-muted-foreground">Installation Guide</p>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Quick link to Pin Map page */}
        <Button
          variant="outline"
          className="w-full justify-between border-2 border-primary/40 bg-primary/5 hover:bg-primary/10 h-auto py-3"
          onClick={() => navigate('/pin-map')}
        >
          <span className="flex flex-col items-start gap-0.5">
            <span className="text-sm font-bold text-primary">পিন ম্যাপ & সেন্সর দেখুন</span>
            <span className="text-[11px] text-muted-foreground font-normal">v8 / v10 দ্রুত toggle ও search</span>
          </span>
          <ArrowLeft className="h-4 w-4 rotate-180 text-primary" />
        </Button>

        {/* Phase 1-9 live automation status (single source of truth) */}
        <CurrentAutomationStatusBanner />

        {/* LDR Hardware Status — large, farmer-friendly */}
        <LDRStatusBanner />

        {/* LDR Installation Guide moved into the Wiring tab below */}


        {/* Farm Type Info Banner */}
        <Card className="border-2 border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Bird className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="font-bold text-amber-700 dark:text-amber-400">🐔 লেয়ার ও ব্রয়লার উভয় ফার্মে কাজ করে!</p>
                <p className="text-xs text-muted-foreground">একই হার্ডওয়্যার, অ্যাপ থেকে ফার্ম টাইপ সিলেক্ট করুন</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <div className="flex items-center gap-1 mb-1">
                  <Egg className="h-3 w-3 text-orange-500" />
                  <span className="font-medium text-orange-600 dark:text-orange-400">লেয়ার</span>
                </div>
                <p className="text-muted-foreground">স্থির তাপমাত্রা (18-27°C)</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center gap-1 mb-1">
                  <Bird className="h-3 w-3 text-blue-500" />
                  <span className="font-medium text-blue-600 dark:text-blue-400">ব্রয়লার</span>
                </div>
                <p className="text-muted-foreground">বয়স-ভিত্তিক তাপমাত্রা কার্ভ</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sensor Summary — version aware */}
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Cpu className="h-4 w-4 text-primary" />
              {version === 'v8'
                ? `৫টি সেন্সর + ৮-চ্যানেল রিলে (${meta.firmware})`
                : `প্রিমিয়াম I²C সেন্সর সেট + ৮-চ্যানেল রিলে (${meta.firmware})`}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10">
                <Thermometer className="h-4 w-4 text-green-500" />
                <span>{version === 'v8' ? 'DHT22 ×2 (তাপ/আর্দ্রতা)' : 'SHT31 (তাপ/আর্দ্রতা, I²C)'}</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-500/10">
                <Wind className="h-4 w-4 text-yellow-500" />
                <span>{version === 'v8' ? 'MQ-137 (অ্যামোনিয়া)' : 'ZE03-NH3 (অ্যামোনিয়া)'}</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/10">
                <Droplets className="h-4 w-4 text-blue-500" />
                <span>YF-S201 (পানি ফ্লো)</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-cyan-500/10">
                <Power className="h-4 w-4 text-cyan-500" />
                <span>ZMPT101B (ভোল্টেজ)</span>
              </div>
            </div>
            <div className="mt-3 p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <p className="text-xs font-medium text-purple-600 dark:text-purple-400 flex items-center gap-2">
                <Fan className="h-3 w-3" />
                ৮-চ্যানেল রিলে: এক্সহস্ট, সিলিং ফ্যান, লাইট, হিটার, ফগার, অ্যালার্ম, স্প্রিংকলার, সার্কুলেশন
              </p>
            </div>
          </CardContent>
        </Card>


        {/* Quick Summary - Price */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">মূল পার্টস (Essential)</p>
                <p className="text-lg font-bold text-primary">৳{essentialTotal.min.toLocaleString()} - ৳{essentialTotal.max.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">সম্পূর্ণ সেটআপ (Full)</p>
                <p className="text-lg font-bold text-foreground">৳{fullTotal.min.toLocaleString()} - ৳{fullTotal.max.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="parts" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="parts" className="text-xs">
              <ShoppingCart className="h-3 w-3 mr-1" />
              পার্টস
            </TabsTrigger>
            <TabsTrigger value="wiring" className="text-xs">
              <Cable className="h-3 w-3 mr-1" />
              ওয়্যারিং
            </TabsTrigger>
            <TabsTrigger value="setup" className="text-xs">
              <Settings className="h-3 w-3 mr-1" />
              সেটআপ
            </TabsTrigger>
          </TabsList>

          {/* Parts List Tab */}
          <InstallationPartsTab />

          <InstallationWiringTab />

          <InstallationSetupTab
            copiedCode={copiedCode}
            onCopy={copyToClipboard}
            onNavigate={navigate}
          />
        </Tabs>
      </div>

    </div>
  );
}

export default function InstallationGuidePage() {
  return (
    <GuideVersionProvider>
      <InstallationGuideContent />
    </GuideVersionProvider>
  );
}

