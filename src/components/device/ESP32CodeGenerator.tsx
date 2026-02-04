import { useState } from 'react';
import { Download, Eye, EyeOff, Sparkles, Wifi, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { z } from 'zod';

// Validation schema
const configSchema = z.object({
  ssid: z.string().trim().min(1, 'WiFi নাম দিন').max(32, 'WiFi নাম ৩২ অক্ষরের বেশি হতে পারবে না'),
  password: z.string().min(8, 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষর হতে হবে').max(64, 'পাসওয়ার্ড ৬৪ অক্ষরের বেশি হতে পারবে না'),
  deviceToken: z.string().trim().min(10, 'সঠিক ডিভাইস টোকেন দিন').max(100, 'টোকেন সঠিক নয়'),
});

interface ESP32CodeGeneratorProps {
  language?: 'bn' | 'en';
}

export function ESP32CodeGenerator({ language = 'bn' }: ESP32CodeGeneratorProps) {
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [deviceToken, setDeviceToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDownloading, setIsDownloading] = useState(false);

  const t = {
    title: language === 'bn' ? '🚀 ESP32 ফার্মওয়্যার জেনারেটর' : '🚀 ESP32 Firmware Generator',
    subtitle: language === 'bn' 
      ? 'আপনার WiFi ও টোকেন দিন, প্রস্তুত ফার্মওয়্যার ডাউনলোড করুন' 
      : 'Enter your credentials, download ready-to-use firmware',
    wifiName: language === 'bn' ? 'WiFi নাম (SSID)' : 'WiFi Name (SSID)',
    wifiNamePlaceholder: language === 'bn' ? 'আপনার WiFi নেটওয়ার্কের নাম' : 'Your WiFi network name',
    wifiPassword: language === 'bn' ? 'WiFi পাসওয়ার্ড' : 'WiFi Password',
    wifiPasswordPlaceholder: language === 'bn' ? 'আপনার WiFi পাসওয়ার্ড' : 'Your WiFi password',
    deviceToken: language === 'bn' ? 'ডিভাইস টোকেন' : 'Device Token',
    deviceTokenPlaceholder: language === 'bn' ? 'উপরে থেকে কপি করুন' : 'Copy from above',
    downloadFirmware: language === 'bn' ? 'প্রস্তুত ফার্মওয়্যার ডাউনলোড করুন' : 'Download Ready Firmware',
    downloading: language === 'bn' ? 'প্রস্তুত হচ্ছে...' : 'Preparing...',
    fillAllFields: language === 'bn' ? 'সব তথ্য সঠিকভাবে পূরণ করুন' : 'Please fill all fields correctly',
    downloadSuccess: language === 'bn' 
      ? '✅ ফার্মওয়্যার ডাউনলোড হয়েছে! Arduino IDE তে সরাসরি আপলোড করুন' 
      : '✅ Firmware downloaded! Upload directly in Arduino IDE',
    downloadFailed: language === 'bn' ? 'ডাউনলোড ব্যর্থ হয়েছে' : 'Download failed',
    step1: language === 'bn' ? 'ধাপ ১: WiFi তথ্য' : 'Step 1: WiFi Info',
    step2: language === 'bn' ? 'ধাপ ২: ডিভাইস টোকেন' : 'Step 2: Device Token',
    step3: language === 'bn' ? 'ধাপ ৩: ডাউনলোড' : 'Step 3: Download',
    readyToUpload: language === 'bn' 
      ? '👆 এই ফাইল সরাসরি Arduino IDE তে Open করে Upload করুন - কোনো এডিটের প্রয়োজন নেই!' 
      : '👆 Open this file directly in Arduino IDE and Upload - no editing required!',
  };

  const validateInputs = () => {
    try {
      configSchema.parse({ ssid, password, deviceToken });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const downloadPreparedFirmware = async () => {
    if (!validateInputs()) {
      toast.error(t.fillAllFields);
      return;
    }

    setIsDownloading(true);
    
    try {
      // Fetch the firmware template
      const response = await fetch('/esp32-code.ino');
      if (!response.ok) throw new Error('Failed to fetch firmware template');
      
      let firmwareCode = await response.text();
      
      // Replace the placeholder values with user's credentials
      firmwareCode = firmwareCode.replace(
        'const char* WIFI_SSID = "YOUR_WIFI_SSID";',
        `const char* WIFI_SSID = "${ssid.trim()}";`
      );
      
      firmwareCode = firmwareCode.replace(
        'const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";',
        `const char* WIFI_PASSWORD = "${password}";`
      );
      
      firmwareCode = firmwareCode.replace(
        'const char* DEVICE_TOKEN = "YOUR_DEVICE_TOKEN";  // Get from Dashboard > Device Management',
        `const char* DEVICE_TOKEN = "${deviceToken.trim()}";  // Auto-configured`
      );
      
      // Create a blob and download
      const blob = new Blob([firmwareCode], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'smart-layer-farm-esp32.ino';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(t.downloadSuccess, { duration: 5000 });
    } catch (error) {
      console.error('Download error:', error);
      toast.error(t.downloadFailed);
    } finally {
      setIsDownloading(false);
    }
  };

  const isValid = ssid.trim().length > 0 && password.length >= 8 && deviceToken.trim().length >= 10;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          {t.title}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{t.subtitle}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Step 1: WiFi Settings */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs">1</span>
            {t.step1}
          </div>
          
          {/* WiFi SSID */}
          <div className="space-y-2 pl-7">
            <Label htmlFor="ssid" className="text-sm flex items-center gap-2">
              <Wifi className="h-3 w-3" />
              {t.wifiName}
            </Label>
            <Input
              id="ssid"
              value={ssid}
              onChange={(e) => {
                setSsid(e.target.value);
                if (errors.ssid) setErrors(prev => ({ ...prev, ssid: '' }));
              }}
              placeholder={t.wifiNamePlaceholder}
              className={errors.ssid ? 'border-destructive' : ''}
              maxLength={32}
            />
            {errors.ssid && <p className="text-xs text-destructive">{errors.ssid}</p>}
          </div>

          {/* WiFi Password */}
          <div className="space-y-2 pl-7">
            <Label htmlFor="password" className="text-sm">
              🔐 {t.wifiPassword}
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
                }}
                placeholder={t.wifiPasswordPlaceholder}
                className={`pr-10 ${errors.password ? 'border-destructive' : ''}`}
                maxLength={64}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
          </div>
        </div>

        {/* Step 2: Device Token */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs">2</span>
            {t.step2}
          </div>
          
          <div className="space-y-2 pl-7">
            <Label htmlFor="token" className="text-sm">
              🔑 {t.deviceToken}
            </Label>
            <Input
              id="token"
              value={deviceToken}
              onChange={(e) => {
                setDeviceToken(e.target.value);
                if (errors.deviceToken) setErrors(prev => ({ ...prev, deviceToken: '' }));
              }}
              placeholder={t.deviceTokenPlaceholder}
              className={`font-mono text-sm ${errors.deviceToken ? 'border-destructive' : ''}`}
              maxLength={100}
            />
            {errors.deviceToken && <p className="text-xs text-destructive">{errors.deviceToken}</p>}
          </div>
        </div>

        {/* Step 3: Download */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs">3</span>
            {t.step3}
          </div>
          
          <div className="pl-7 space-y-3">
            <Button 
              className="w-full gap-2"
              size="lg"
              disabled={!isValid || isDownloading}
              onClick={downloadPreparedFirmware}
            >
              {isDownloading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t.downloading}
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  {t.downloadFirmware}
                </>
              )}
            </Button>
            
            {isValid && (
              <div className="flex items-start gap-2 p-3 bg-primary/10 border border-primary/30 rounded-lg">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-xs text-primary">
                  {t.readyToUpload}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
