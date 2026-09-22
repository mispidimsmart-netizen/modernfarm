import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, BarChart3, ScrollText, TrendingUp, Globe, ChevronDown,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SensorDeviceImpactReport } from '@/components/settings/SensorDeviceImpactReport';
import { ReportsAnalyticsView } from '@/components/reports/ReportsAnalyticsView';
import { DataExportCard } from '@/components/settings/DataExportCard';
import { WeeklyReportCard } from '@/components/settings/WeeklyReportCard';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';

function ReportSection({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} asChild>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Icon className="h-5 w-5 text-primary" />
              {title}
              <ChevronDown
                className={`h-5 w-5 text-muted-foreground ml-auto transition-transform ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export function ReportsDataTab() {
  const { language } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold flex items-center justify-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          {language === 'bn' ? 'রিপোর্ট ও ডেটা' : 'Reports & Data'}
        </h3>
        <p className="text-sm text-muted-foreground">
          {language === 'bn'
            ? 'খামারের কর্মক্ষমতা বিশ্লেষণ ও ডেটা এক্সপোর্ট'
            : 'Farm performance analytics & data export'}
        </p>
      </div>

      {/* AI-powered analytics dashboard */}
      <ReportSection
        icon={TrendingUp}
        title={language === 'bn' ? 'বিশ্লেষণ ও AI Anomaly' : 'Analytics & AI Anomaly'}
      >
        <AnalyticsDashboard />
      </ReportSection>

      {/* Embedded Reports Analytics: Overview, Performance, Costs */}
      <ReportSection
        icon={TrendingUp}
        title={language === 'bn' ? 'বিশ্লেষণ ও ট্রেন্ড' : 'Analytics & Trends'}
      >
        <ReportsAnalyticsView />
      </ReportSection>

      {/* Sensor ↔ Device ↔ Impact correlation + full Excel export */}
      <SensorDeviceImpactReport />

      {/* Universal CSV exporter (any data type, any date range) */}
      <DataExportCard />

      {/* Weekly scheduled email summary report */}
      <WeeklyReportCard />

      {/* Quick Actions */}
      <ReportSection icon={FileText} title={language === 'bn' ? 'দ্রুত কাজ' : 'Quick Actions'}>
        <Button
          variant="outline"
          className="w-full justify-start h-12 mb-2"
          onClick={() => navigate('/benchmark')}
        >
          <Globe className="mr-3 h-5 w-5 text-primary" />
          <div className="text-left">
            <p className="font-medium">{language === 'bn' ? 'ফার্ম বেঞ্চমার্ক' : 'Farm Benchmark'}</p>
            <p className="text-xs text-muted-foreground">
              {language === 'bn'
                ? 'অন্যান্য অ্যানোনিমাইজড ফার্মের সাথে KPI তুলনা'
                : 'Compare KPIs vs anonymized farms'}
            </p>
          </div>
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start h-12"
          onClick={() => navigate('/audit-log')}
        >
          <ScrollText className="mr-3 h-5 w-5 text-primary" />
          <div className="text-left">
            <p className="font-medium">{language === 'bn' ? 'অডিট লগ' : 'Audit Log'}</p>
            <p className="text-xs text-muted-foreground">
              {language === 'bn'
                ? 'সিস্টেম কার্যকলাপ ও পরিবর্তনের ইতিহাস'
                : 'System activity & change history'}
            </p>
          </div>
        </Button>
      </ReportSection>
    </div>
  );
}
