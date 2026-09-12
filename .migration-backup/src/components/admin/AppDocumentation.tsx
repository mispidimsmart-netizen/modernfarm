import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CurrentAutomationStatusBanner } from './CurrentAutomationStatusBanner';
import { DocOverviewTab } from './docs/tabs/DocOverviewTab';
import { DocFarmTypesTab } from './docs/tabs/DocFarmTypesTab';
import { DocAutomationTab } from './docs/tabs/DocAutomationTab';
import { DocTechnicalTab } from './docs/tabs/DocTechnicalTab';
import { BookOpen } from 'lucide-react';

export function AppDocumentation() {
  return (
    <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/50 border-indigo-500/20 shadow-xl">
      <CardHeader className="border-b border-indigo-500/10">
        <CardTitle className="text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="bg-gradient-to-r from-indigo-200 to-purple-200 bg-clip-text text-transparent">
              📖 সম্পূর্ণ অ্যাপ গাইডলাইন
            </span>
            <p className="text-sm text-slate-400 font-normal mt-1">
              FarmEye IoT সিস্টেমের পূর্ণাঙ্গ ডকুমেন্টেশন (v2.0)
            </p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* Phase 1-9 live automation status (single source of truth) */}
        <CurrentAutomationStatusBanner />

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid grid-cols-4 gap-2 mb-6 bg-slate-800/50 p-1 rounded-xl">
            <TabsTrigger value="overview" className="text-xs">🏠 ওভারভিউ</TabsTrigger>
            <TabsTrigger value="farmtypes" className="text-xs">🐔 ফার্ম টাইপ</TabsTrigger>
            <TabsTrigger value="automation" className="text-xs">⚡ অটোমেশন</TabsTrigger>
            <TabsTrigger value="technical" className="text-xs">🔧 টেকনিক্যাল</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <DocOverviewTab />
          </TabsContent>

          <TabsContent value="farmtypes">
            <DocFarmTypesTab />
          </TabsContent>

          <TabsContent value="automation">
            <DocAutomationTab />
          </TabsContent>

          <TabsContent value="technical">
            <DocTechnicalTab />
          </TabsContent>
        </Tabs>
        <div className="mt-6 pt-4 border-t border-white/10 text-center">
          <p className="text-xs text-slate-400">
            A <span className="text-indigo-300 font-semibold">Nexiot Labs</span> Product
          </p>
          <p className="text-[10px] text-slate-500 mt-1">
            © 2026 Nexiot Labs · FarmEye Automation Platform
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
