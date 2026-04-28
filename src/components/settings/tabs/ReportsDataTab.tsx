import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, Bell, Calendar, 
  BarChart3, Clock, ScrollText
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { SensorDeviceImpactReport } from '@/components/settings/SensorDeviceImpactReport';

export function ReportsDataTab() {
  const { language } = useAuth();
  const { toast } = useToast();

  const [dailyReport, setDailyReport] = useState(true);
  const [weeklySummary, setWeeklySummary] = useState(true);


  const handleDailyReportChange = (checked: boolean) => {
    setDailyReport(checked);
    toast({
      title: checked 
        ? (language === 'bn' ? 'দৈনিক রিপোর্ট চালু' : 'Daily Report Enabled')
        : (language === 'bn' ? 'দৈনিক রিপোর্ট বন্ধ' : 'Daily Report Disabled'),
    });
  };

  const handleWeeklySummaryChange = (checked: boolean) => {
    setWeeklySummary(checked);
    toast({
      title: checked 
        ? (language === 'bn' ? 'সাপ্তাহিক সারাংশ চালু' : 'Weekly Summary Enabled')
        : (language === 'bn' ? 'সাপ্তাহিক সারাংশ বন্ধ' : 'Weekly Summary Disabled'),
    });
  };


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
            ? 'রিপোর্ট খামারের কর্মক্ষমতা ট্র্যাক করতে সাহায্য করে' 
            : 'Reports help track farm performance'}
        </p>
      </div>

      {/* NEW: Sensor ↔ Device ↔ Impact correlation + full Excel export */}
      <SensorDeviceImpactReport />

      {/* Notification Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            {language === 'bn' ? 'রিপোর্ট নোটিফিকেশন' : 'Report Notifications'}
          </CardTitle>
          <CardDescription>
            {language === 'bn' 
              ? 'নিয়মিত আপডেট পেতে নোটিফিকেশন চালু করুন' 
              : 'Enable notifications for regular updates'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Daily Report */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <Label className="font-medium">
                  {language === 'bn' ? 'দৈনিক রিপোর্ট' : 'Daily Report'}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {language === 'bn' ? 'প্রতিদিন রাত ৯টায়' : 'Every day at 9 PM'}
                </p>
              </div>
            </div>
            <Switch
              checked={dailyReport}
              onCheckedChange={handleDailyReportChange}
            />
          </div>

          {/* Weekly Summary */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <Label className="font-medium">
                  {language === 'bn' ? 'সাপ্তাহিক সারাংশ' : 'Weekly Summary'}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {language === 'bn' ? 'প্রতি শুক্রবার সন্ধ্যায়' : 'Every Friday evening'}
                </p>
              </div>
            </div>
            <Switch
              checked={weeklySummary}
              onCheckedChange={handleWeeklySummaryChange}
            />
          </div>
        </CardContent>
      </Card>

      {/* Report Features */}
      <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
        <CardContent className="pt-6">
          <p className="text-sm font-medium mb-4">
            {language === 'bn' ? '📊 রিপোর্টে যা থাকে' : '📊 What\'s in Reports'}
          </p>
          <div className="space-y-3">
            {[
              { icon: '🌡️', text: language === 'bn' ? 'তাপমাত্রা ও আর্দ্রতার সারাংশ' : 'Temperature & humidity summary' },
              { icon: '🐔', text: language === 'bn' ? 'পাখির স্বাস্থ্য স্কোর' : 'Bird health score' },
              { icon: '💧', text: language === 'bn' ? 'পানি খরচের হিসাব' : 'Water consumption stats' },
              { icon: '⚡', text: language === 'bn' ? 'ডিভাইস রানটাইম' : 'Device runtime' },
              { icon: '⚠️', text: language === 'bn' ? 'অ্যালার্টের সারাংশ' : 'Alert summary' },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-3 text-sm"
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.text}</span>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

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
            onClick={() => window.location.href = '/reports'}
          >
            <BarChart3 className="mr-3 h-5 w-5 text-primary" />
            <div className="text-left">
              <p className="font-medium">{language === 'bn' ? 'রিপোর্ট দেখুন' : 'View Reports'}</p>
              <p className="text-xs text-muted-foreground">
                {language === 'bn' ? 'বিস্তারিত বিশ্লেষণ' : 'Detailed analytics'}
              </p>
            </div>
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start h-12 mt-2"
            onClick={() => window.location.href = '/audit-log'}
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
