import { useState } from 'react';
import { Copy, Check, Eye, EyeOff, Sparkles, Wifi, Download, FileCode } from 'lucide-react';
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
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const t = {
    title: language === 'bn' ? '🚀 কোড জেনারেটর' : '🚀 Code Generator',
    subtitle: language === 'bn' ? 'আপনার WiFi ও টোকেন দিয়ে রেডি-টু-পেস্ট কোড তৈরি করুন' : 'Generate ready-to-paste code with your credentials',
    wifiName: language === 'bn' ? 'WiFi নাম (SSID)' : 'WiFi Name (SSID)',
    wifiNamePlaceholder: language === 'bn' ? 'আপনার WiFi নেটওয়ার্কের নাম' : 'Your WiFi network name',
    wifiPassword: language === 'bn' ? 'WiFi পাসওয়ার্ড' : 'WiFi Password',
    wifiPasswordPlaceholder: language === 'bn' ? 'আপনার WiFi পাসওয়ার্ড' : 'Your WiFi password',
    deviceToken: language === 'bn' ? 'ডিভাইস টোকেন' : 'Device Token',
    deviceTokenPlaceholder: language === 'bn' ? 'Settings → ESP32 Devices থেকে কপি করুন' : 'Copy from Settings → ESP32 Devices',
    generateCode: language === 'bn' ? 'কোড তৈরি করুন' : 'Generate Code',
    copyCode: language === 'bn' ? 'কোড কপি করুন' : 'Copy Code',
    copied: language === 'bn' ? 'কপি হয়েছে!' : 'Copied!',
    generatedCode: language === 'bn' ? 'আপনার কনফিগারেশন কোড' : 'Your Configuration Code',
    pasteInstruction: language === 'bn' 
      ? '👆 এই কোডটি esp32-code.ino ফাইলের // ============= CONFIGURATION ============= সেকশনে পেস্ট করুন' 
      : '👆 Paste this code in the // ============= CONFIGURATION ============= section of esp32-code.ino',
    downloadFirmware: language === 'bn' ? 'ফার্মওয়্যার ডাউনলোড করুন' : 'Download Firmware',
    downloadingFirmware: language === 'bn' ? 'ডাউনলোড হচ্ছে...' : 'Downloading...',
  };

  const downloadFirmwareCode = async () => {
    try {
      // Fetch the firmware code from the public folder
      const response = await fetch('/esp32-code.ino');
      if (!response.ok) throw new Error('Failed to fetch');
      
      const code = await response.text();
      
      // Create a blob and download
      const blob = new Blob([code], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'esp32-code.ino';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(language === 'bn' ? 'ফার্মওয়্যার ডাউনলোড হয়েছে!' : 'Firmware downloaded!');
    } catch (error) {
      toast.error(language === 'bn' ? 'ডাউনলোড ব্যর্থ হয়েছে' : 'Download failed');
    }
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

  const generatedCode = `// ============= CONFIGURATION =============
// WiFi Settings
const char* WIFI_SSID = "${ssid.trim()}";
const char* WIFI_PASSWORD = "${password}";

// API Settings
const char* API_URL = "https://hbwfuvqrfgtefozajyfu.supabase.co/functions/v1/esp32-api/data";
const char* DEVICE_ID = "ESP32_LAYER_001";
const char* DEVICE_TOKEN = "${deviceToken.trim()}";  // Get from Dashboard > Device Management`;

  const copyToClipboard = () => {
    if (!validateInputs()) {
      toast.error(language === 'bn' ? 'সব তথ্য সঠিকভাবে পূরণ করুন' : 'Please fill all fields correctly');
      return;
    }

    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    toast.success(t.copied);
    setTimeout(() => setCopied(false), 2000);
  };

  const isValid = ssid.trim() && password.length >= 8 && deviceToken.trim().length >= 10;

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
        {/* Download Firmware Button */}
        <div className="p-3 bg-muted/50 rounded-lg border border-dashed border-primary/30">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileCode className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">
                  {language === 'bn' ? 'ধাপ ১: ফার্মওয়্যার কোড' : 'Step 1: Firmware Code'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {language === 'bn' ? 'Arduino IDE তে আপলোড করতে এই ফাইল প্রয়োজন' : 'Required for Arduino IDE upload'}
                </p>
              </div>
            </div>
            <Button onClick={downloadFirmwareCode} variant="default" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              {t.downloadFirmware}
            </Button>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              {language === 'bn' ? 'ধাপ ২: কনফিগারেশন' : 'Step 2: Configuration'}
            </span>
          </div>
        </div>
        {/* WiFi SSID */}
        <div className="space-y-2">
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
        <div className="space-y-2">
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

        {/* Device Token */}
        <div className="space-y-2">
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

        {/* Generated Code Preview */}
        {isValid && (
          <div className="space-y-2">
            <Label className="text-sm text-primary font-medium">{t.generatedCode}</Label>
            <div className="relative">
              <pre className="bg-muted rounded-lg p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
                {generatedCode}
              </pre>
              <Button
                size="sm"
                variant="secondary"
                className="absolute top-2 right-2"
                onClick={copyToClipboard}
              >
                {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                {copied ? t.copied : t.copyCode}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
              {t.pasteInstruction}
            </p>
          </div>
        )}

        {/* Copy Button (if not already showing code preview) */}
        {!isValid && (
          <Button 
            className="w-full"
            disabled={!ssid.trim() || !password || !deviceToken.trim()}
            onClick={copyToClipboard}
          >
            <Copy className="h-4 w-4 mr-2" />
            {t.copyCode}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
