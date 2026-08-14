import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Cpu, Activity, Bell, TrendingUp, BookOpen, Shield } from 'lucide-react';
import { SystemHealthCard } from '@/components/admin/SystemHealthCard';
import { AdminNotificationSender } from '@/components/admin/AdminNotificationSender';
import { AdminSensorCharts } from '@/components/admin/AdminSensorCharts';
import { TenantIsolationAuditTab } from '@/components/admin/TenantIsolationAuditTab';
import { AppDocumentation } from '@/components/admin/AppDocumentation';
import { CalibrationWizardSheet } from '@/components/calibration/CalibrationWizard';
import ForensicTimelineCard from '@/components/admin/ForensicTimelineCard';
import { ProductionAuditReport } from '@/components/admin/ProductionAuditReport';
import { TechnicalArchitectureReport } from '@/components/admin/TechnicalArchitectureReport';
import { PhaseCRoadmapPanel } from '@/components/admin/PhaseCRoadmapPanel';
import { FirmwareManagementTab } from '@/components/admin/FirmwareManagementTab';
import { MqttHealthCard } from '@/components/admin/MqttHealthCard';
import { OTAHardeningCard } from '@/components/admin/OTAHardeningCard';
import { ScaleReadinessCard } from '@/components/admin/ScaleReadinessCard';
import { Phase8StatusCard } from '@/components/admin/Phase8StatusCard';
import { Phase9SensorUpgradeCard } from '@/components/admin/Phase9SensorUpgradeCard';
import { AdminDeviceHealthPanel } from '@/components/admin/AdminDeviceHealthPanel';
import { SecurityAuditLogPanel } from '@/components/admin/SecurityAuditLogPanel';
import { AdminCommandDeliveryPanel } from '@/components/admin/AdminCommandDeliveryPanel';
import { PCBManufacturingSpec } from '@/components/admin/PCBManufacturingSpec';
import { PaymentApprovalPanel } from '@/components/admin/PaymentApprovalPanel';
import { ObservabilityDashboard } from '@/components/admin/ObservabilityDashboard';
import { PerformanceDashboardTab } from '@/components/admin/PerformanceDashboardTab';
import { FarmBenchmarkingTab } from '@/components/admin/FarmBenchmarkingTab';
import { UserManagementTab } from '@/components/admin/UserManagementTab';
import { FluxPcbDesignGuide } from '@/components/admin/FluxPcbDesignGuide';

interface AdminDashboardTabsProps {
  language: 'bn' | 'en';
}

export function AdminDashboardTabs({ language }: AdminDashboardTabsProps) {
  const navigate = useNavigate();

  return (
    <Tabs defaultValue="users" className="w-full">
      <TabsList className="bg-slate-900/80 border border-white/10 flex flex-wrap h-auto gap-1 p-1.5 rounded-xl shadow-lg w-full justify-start">
        <TabsTrigger value="users" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-purple-600 data-[state=active]:text-white text-slate-300 hover:text-white rounded-lg">
          <Users className="w-4 h-4 mr-2" />
          ব্যবহারকারী ব্যবস্থাপনা
        </TabsTrigger>
        <TabsTrigger value="analytics" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-green-600 data-[state=active]:text-white text-slate-300 hover:text-white rounded-lg">
          <TrendingUp className="w-4 h-4 mr-2" />
          অ্যানালিটিক্স
        </TabsTrigger>
        <TabsTrigger value="notify" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-600 data-[state=active]:text-white text-slate-300 hover:text-white rounded-lg">
          <Bell className="w-4 h-4 mr-2" />
          নোটিফিকেশন
        </TabsTrigger>
        <TabsTrigger value="system" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-600 data-[state=active]:text-white text-slate-300 hover:text-white rounded-lg">
          <Activity className="w-4 h-4 mr-2" />
          সিস্টেম
        </TabsTrigger>
        <TabsTrigger value="security" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-rose-600 data-[state=active]:text-white text-slate-300 hover:text-white rounded-lg">
          <Shield className="w-4 h-4 mr-2" />
          সিকিউরিটি ও অডিট
        </TabsTrigger>
        <TabsTrigger value="firmware" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white text-slate-300 hover:text-white rounded-lg">
          <Cpu className="w-4 h-4 mr-2" />
          ফার্মওয়্যার ও PCB
        </TabsTrigger>
        <TabsTrigger value="payments" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-green-600 data-[state=active]:text-white text-slate-300 hover:text-white rounded-lg">
          পেমেন্ট
        </TabsTrigger>
        <TabsTrigger value="guide" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white text-slate-300 hover:text-white rounded-lg">
          <BookOpen className="w-4 h-4 mr-2" />
          ইনস্টলেশন গাইড
        </TabsTrigger>
        <TabsTrigger value="docs" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-rose-600 data-[state=active]:text-white text-slate-300 hover:text-white rounded-lg">
          <BookOpen className="w-4 h-4 mr-2" />
          ডকুমেন্টেশন
        </TabsTrigger>
      </TabsList>

      {/* User Management — Admin / Org / Farm / Worker */}
      <TabsContent value="users" className="mt-4">
        <UserManagementTab language={language} />
      </TabsContent>

      <TabsContent value="analytics" className="mt-4">
        <AdminSensorCharts language={language} />
      </TabsContent>

      <TabsContent value="notify" className="mt-4">
        <AdminNotificationSender language={language} />
      </TabsContent>

      <TabsContent value="system" className="mt-4 space-y-4">
        <SystemHealthCard language={language} />
        <AdminDeviceHealthPanel language={language} />
        <MqttHealthCard />
        <ScaleReadinessCard />
        <Phase8StatusCard />
        <Phase9SensorUpgradeCard />
        <ObservabilityDashboard language={language} />
        <PerformanceDashboardTab />
        <FarmBenchmarkingTab />
      </TabsContent>

      <TabsContent value="security" className="mt-4 space-y-4">
        <SecurityAuditLogPanel />
        <AdminCommandDeliveryPanel />
        <TenantIsolationAuditTab />
        <ForensicTimelineCard />
        <ProductionAuditReport />
      </TabsContent>

      <TabsContent value="firmware" className="mt-4 space-y-4">
        <FirmwareManagementTab language={language} />
        <OTAHardeningCard />
        <PCBManufacturingSpec />
        <PhaseCRoadmapPanel />
        <TechnicalArchitectureReport />
      </TabsContent>

      <TabsContent value="payments" className="mt-4">
        <PaymentApprovalPanel />
      </TabsContent>

      <TabsContent value="guide" className="mt-4 space-y-4">
        <Card className="bg-gradient-to-br from-teal-950/40 via-slate-900/90 to-emerald-950/30 border-teal-500/20 shadow-xl shadow-teal-500/10 backdrop-blur-sm">
          <CardHeader className="border-b border-teal-500/10">
            <CardTitle className="text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/40">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="bg-gradient-to-r from-teal-200 to-emerald-200 bg-clip-text text-transparent font-semibold">
                ESP32 ইনস্টলেশন গাইড
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <p className="text-teal-200/70">
              ESP32 হার্ডওয়্যার সেটআপ, পার্টস লিস্ট, ওয়্যারিং ডায়াগ্রাম এবং ফার্মওয়্যার আপলোড গাইড।
            </p>
            <Button
              onClick={() => navigate('/installation-guide')}
              className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white border-0 shadow-lg shadow-teal-500/30 transition-all"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              ইনস্টলেশন গাইড দেখুন
            </Button>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/50 border-cyan-500/20 shadow-xl shadow-cyan-500/5">
          <CardHeader className="border-b border-cyan-500/10">
            <CardTitle className="text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center shadow-lg shadow-cyan-500/40">
                <Cpu className="w-5 h-5 text-white" />
              </div>
              <span className="bg-gradient-to-r from-cyan-200 to-teal-200 bg-clip-text text-transparent font-semibold">
                ইনস্টলেশন ক্যালিব্রেশন উইজার্ড
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-slate-400 text-sm mb-4">
              নতুন ডিভাইস সেটআপের সময় সঠিক সেন্সর প্লেসমেন্ট ও ক্যালিব্রেশন নিশ্চিত করতে এই উইজার্ড ব্যবহার করুন।
            </p>
            <CalibrationWizardSheet>
              <Button className="bg-gradient-to-r from-cyan-500 to-teal-600 text-white border-0 hover:from-cyan-600 hover:to-teal-700 shadow-lg shadow-cyan-500/30">
                <Cpu className="w-4 h-4 mr-2" />
                ক্যালিব্রেশন উইজার্ড চালু করুন
              </Button>
            </CalibrationWizardSheet>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="docs" className="mt-4 space-y-4">
        <AppDocumentation />
      </TabsContent>
    </Tabs>
  );
}
