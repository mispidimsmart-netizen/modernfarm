import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, Bell, Calendar, Trash2, AlertTriangle, 
  Download, BarChart3, Clock, CheckCircle2
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

export function ReportsDataTab() {
  const { language } = useAuth();
  const { toast } = useToast();

  const [dailyReport, setDailyReport] = useState(true);
  const [weeklySummary, setWeeklySummary] = useState(true);
  const [showResetDialog, setShowResetDialog] = useState(false);

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

  const handleDataReset = () => {
    // Implement data reset logic
    toast({
      title: language === 'bn' ? 'ডেটা মুছে ফেলা হয়েছে' : 'Data has been reset',
      variant: 'destructive',
    });
    setShowResetDialog(false);
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
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Clock className="h-5 w-5 text-blue-500" />
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
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                <Calendar className="h-5 w-5 text-green-500" />
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
        <CardContent className="space-y-3">
          {/* View Reports */}
          <Button 
            variant="outline" 
            className="w-full justify-start h-12"
            onClick={() => window.location.href = '/reports'}
          >
            <BarChart3 className="mr-3 h-5 w-5 text-blue-500" />
            <div className="text-left">
              <p className="font-medium">{language === 'bn' ? 'রিপোর্ট দেখুন' : 'View Reports'}</p>
              <p className="text-xs text-muted-foreground">
                {language === 'bn' ? 'বিস্তারিত বিশ্লেষণ' : 'Detailed analytics'}
              </p>
            </div>
          </Button>

          {/* Export Data */}
          <Button 
            variant="outline" 
            className="w-full justify-start h-12"
            onClick={() => toast({ title: language === 'bn' ? 'শীঘ্রই আসছে' : 'Coming soon' })}
          >
            <Download className="mr-3 h-5 w-5 text-green-500" />
            <div className="text-left">
              <p className="font-medium">{language === 'bn' ? 'ডেটা এক্সপোর্ট' : 'Export Data'}</p>
              <p className="text-xs text-muted-foreground">
                {language === 'bn' ? 'CSV ফাইলে ডাউনলোড' : 'Download as CSV'}
              </p>
            </div>
          </Button>
        </CardContent>
      </Card>

      {/* Data Reset - Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {language === 'bn' ? 'বিপদ জোন' : 'Danger Zone'}
          </CardTitle>
          <CardDescription>
            {language === 'bn' 
              ? 'এই কাজগুলো আর ফিরিয়ে আনা যাবে না' 
              : 'These actions cannot be undone'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline" 
            className="w-full border-destructive/50 text-destructive hover:bg-destructive/10"
            onClick={() => setShowResetDialog(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {language === 'bn' ? 'সকল ডেটা মুছে ফেলুন' : 'Reset All Data'}
          </Button>
        </CardContent>
      </Card>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <AlertDialogTitle>
                {language === 'bn' ? 'আপনি কি নিশ্চিত?' : 'Are you sure?'}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="pt-2">
              {language === 'bn' 
                ? 'এটি আপনার সকল সেন্সর রিডিং, অ্যালার্ট এবং রিপোর্ট স্থায়ীভাবে মুছে ফেলবে। এই কাজ আর ফিরিয়ে আনা যাবে না।'
                : 'This will permanently delete all your sensor readings, alerts, and reports. This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDataReset}
              className="bg-destructive hover:bg-destructive/90"
            >
              {language === 'bn' ? 'হ্যাঁ, মুছে ফেলুন' : 'Yes, Delete All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
