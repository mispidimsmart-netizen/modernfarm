import { useNavigate } from 'react-router-dom';
import { 
  FileText, BarChart3, ScrollText, TrendingUp
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SensorDeviceImpactReport } from '@/components/settings/SensorDeviceImpactReport';
import { ReportsAnalyticsView } from '@/components/reports/ReportsAnalyticsView';
import { DataExportCard } from '@/components/settings/DataExportCard';
import { WeeklyReportCard } from '@/components/settings/WeeklyReportCard';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';

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

      {/* Embedded Reports Analytics: Overview, Performance, Costs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            {language === 'bn' ? 'বিশ্লেষণ ও ট্রেন্ড' : 'Analytics & Trends'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ReportsAnalyticsView />
        </CardContent>
      </Card>

      {/* Sensor ↔ Device ↔ Impact correlation + full Excel export */}
      <SensorDeviceImpactReport />

      {/* Universal CSV exporter (any data type, any date range) */}
      <DataExportCard />

      {/* Weekly scheduled email summary report */}
      <WeeklyReportCard />

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {language === 'bn' ? 'দ্রুত কাজ' : 'Quick Actions'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline" 
            className="w-full justify-start h-12"
            onClick={() => navigate('/audit-log')}
          >
            <ScrollText className="mr-3 h-5 w-5 text-primary" />
            <div className="text-left">
              <p className="font-medium">{language === 'bn' ? 'অডিট লগ' : 'Audit Log'}</p>
              <p className="text-xs text-muted-foreground">
                {language === 'bn' ? 'সিস্টেম কার্যকলাপ ও পরিবর্তনের ইতিহাস' : 'System activity & change history'}
              </p>
            </div>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
