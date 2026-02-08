import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, Bell, Calendar, 
  Download, BarChart3, Clock, Loader2, CheckCircle2
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const EXPORT_OPTIONS = [
  { value: 'all', labelBn: 'সব ডেটা', labelEn: 'All Data' },
  { value: 'sensor_readings', labelBn: 'সেন্সর রিডিং', labelEn: 'Sensor Readings' },
  { value: 'egg_production', labelBn: 'ডিম উৎপাদন', labelEn: 'Egg Production' },
  { value: 'feed_consumption', labelBn: 'খাদ্য খরচ', labelEn: 'Feed Consumption' },
  { value: 'alerts', labelBn: 'অ্যালার্ট', labelEn: 'Alerts' },
  { value: 'daily_summary', labelBn: 'দৈনিক সারাংশ', labelEn: 'Daily Summary' },
  { value: 'broiler_batches', labelBn: 'ব্রয়লার ব্যাচ', labelEn: 'Broiler Batches' },
];

export function ReportsDataTab() {
  const { language } = useAuth();
  const { toast } = useToast();

  const [dailyReport, setDailyReport] = useState(true);
  const [weeklySummary, setWeeklySummary] = useState(true);
  const [exportType, setExportType] = useState('all');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

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

  const handleExportData = async () => {
    setIsExporting(true);
    setExportSuccess(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: language === 'bn' ? 'লগইন করুন' : 'Please login',
          variant: 'destructive',
        });
        setIsExporting(false);
        return;
      }

      const response = await supabase.functions.invoke('export-data', {
        body: {},
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // For CSV download, we need to call the function URL directly
      const functionUrl = `https://hbwfuvqrfgtefozajyfu.supabase.co/functions/v1/export-data?type=${exportType}`;
      
      const fetchResponse = await fetch(functionUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!fetchResponse.ok) {
        throw new Error('Export failed');
      }

      // Get the blob and download
      const blob = await fetchResponse.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `farm_export_${exportType}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setExportSuccess(true);
      toast({
        title: language === 'bn' ? '✅ এক্সপোর্ট সফল!' : '✅ Export Successful!',
        description: language === 'bn' 
          ? 'CSV ফাইল ডাউনলোড হয়েছে' 
          : 'CSV file downloaded',
      });

      // Reset success state after 3 seconds
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: language === 'bn' ? 'এক্সপোর্ট ব্যর্থ' : 'Export Failed',
        description: language === 'bn' 
          ? 'আবার চেষ্টা করুন' 
          : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
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

      {/* Export Data Section */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            {language === 'bn' ? 'ডেটা এক্সপোর্ট' : 'Data Export'}
          </CardTitle>
          <CardDescription>
            {language === 'bn' 
              ? 'আপনার খামারের ডেটা CSV ফাইলে ডাউনলোড করুন' 
              : 'Download your farm data as CSV file'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Export Type Selector */}
          <div className="space-y-2">
            <Label>{language === 'bn' ? 'ডেটার ধরণ' : 'Data Type'}</Label>
            <Select value={exportType} onValueChange={setExportType}>
              <SelectTrigger className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {language === 'bn' ? option.labelBn : option.labelEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Export Button */}
          <Button 
            className="w-full h-12 gap-2"
            onClick={handleExportData}
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {language === 'bn' ? 'এক্সপোর্ট হচ্ছে...' : 'Exporting...'}
              </>
            ) : exportSuccess ? (
              <>
                <CheckCircle2 className="h-5 w-5" />
                {language === 'bn' ? 'সফল!' : 'Success!'}
              </>
            ) : (
              <>
                <Download className="h-5 w-5" />
                {language === 'bn' ? 'CSV ডাউনলোড করুন' : 'Download CSV'}
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            {language === 'bn' 
              ? '💡 এক্সপোর্ট করা ফাইল Excel এ সরাসরি খুলতে পারবেন'
              : '💡 Exported file can be opened directly in Excel'}
          </p>
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
        </CardContent>
      </Card>
    </div>
  );
}
