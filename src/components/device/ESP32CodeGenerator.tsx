import { useState } from 'react';
import { Download, Eye, EyeOff, Sparkles, Wifi, Loader2, CheckCircle2, Settings, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { z } from 'zod';

// Validation schema
const configSchema = z.object({
  ssid: z.string().trim().min(1, 'WiFi নাম দিন').max(32, 'WiFi নাম ৩২ অক্ষরের বেশি হতে পারবে না'),
  password: z.string().min(8, 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষর হতে হবে').max(64, 'পাসওয়ার্ড ৬৪ অক্ষরের বেশি হতে পারবে না'),
  deviceToken: z.string().trim().min(10, 'সঠিক ডিভাইস টোকেন দিন').max(100, 'টোকেন সঠিক নয়'),
  shedId: z.string().optional(),
  shedName: z.string().optional(),
  farmId: z.string().optional(),
});

type FarmType = 'layer' | 'broiler';

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
  const [farmType, setFarmType] = useState<FarmType>('layer');
  const [shedId, setShedId] = useState('');
  const [shedName, setShedName] = useState('');

  const t = {
    title: language === 'bn' ? '🚀 ESP32 ফার্মওয়্যার জেনারেটর' : '🚀 ESP32 Firmware Generator',
    subtitle: language === 'bn' 
      ? 'আপনার WiFi, টোকেন ও ফার্মের ধরন দিন - সম্পূর্ণ ফার্মওয়্যার পাবেন' 
      : 'Enter WiFi, token & farm type - get complete firmware',
    wifiName: language === 'bn' ? 'WiFi নাম (SSID)' : 'WiFi Name (SSID)',
    wifiNamePlaceholder: language === 'bn' ? 'আপনার WiFi নেটওয়ার্কের নাম' : 'Your WiFi network name',
    wifiPassword: language === 'bn' ? 'WiFi পাসওয়ার্ড' : 'WiFi Password',
    wifiPasswordPlaceholder: language === 'bn' ? 'আপনার WiFi পাসওয়ার্ড' : 'Your WiFi password',
    deviceToken: language === 'bn' ? 'ডিভাইস টোকেন' : 'Device Token',
    deviceTokenPlaceholder: language === 'bn' ? 'উপরে থেকে কপি করুন' : 'Copy from above',
    downloadFirmware: language === 'bn' ? '📥 সম্পূর্ণ ফার্মওয়্যার ডাউনলোড করুন' : '📥 Download Complete Firmware',
    downloading: language === 'bn' ? 'প্রস্তুত হচ্ছে...' : 'Preparing...',
    fillAllFields: language === 'bn' ? 'সব তথ্য সঠিকভাবে পূরণ করুন' : 'Please fill all fields correctly',
    downloadSuccess: language === 'bn' 
      ? '✅ সম্পূর্ণ ফার্মওয়্যার ডাউনলোড হয়েছে! Arduino IDE তে Open করে Upload করুন' 
      : '✅ Complete firmware downloaded! Open in Arduino IDE and Upload',
    downloadFailed: language === 'bn' ? 'ডাউনলোড ব্যর্থ হয়েছে' : 'Download failed',
    step1: language === 'bn' ? 'ধাপ ১: WiFi তথ্য' : 'Step 1: WiFi Info',
    step2: language === 'bn' ? 'ধাপ ২: ডিভাইস টোকেন' : 'Step 2: Device Token',
    step3: language === 'bn' ? 'ধাপ ৩: খামারের ধরন' : 'Step 3: Farm Type',
    step4: language === 'bn' ? 'ধাপ ৪: ডাউনলোড' : 'Step 4: Download',
    readyToUpload: language === 'bn' 
      ? '👆 এই ফাইল Arduino IDE তে সরাসরি Open → Upload করুন। কোনো কোড এডিটের প্রয়োজন নেই!' 
      : '👆 Open this file in Arduino IDE → Upload. No code editing required!',
    farmTypeLabel: language === 'bn' ? 'খামারের ধরন' : 'Farm Type',
    layerFarm: language === 'bn' ? '🥚 লেয়ার (ডিম উৎপাদন)' : '🥚 Layer (Egg Production)',
    broilerFarm: language === 'bn' ? '🐔 ব্রয়লার (মাংস উৎপাদন)' : '🐔 Broiler (Meat Production)',
    shedIdLabel: language === 'bn' ? 'শেড ID (ঐচ্ছিক)' : 'Shed ID (Optional)',
    shedIdPlaceholder: language === 'bn' ? 'যেমন: shed_001' : 'e.g., shed_001',
    shedNameLabel: language === 'bn' ? 'শেডের নাম (ঐচ্ছিক)' : 'Shed Name (Optional)',
    shedNamePlaceholder: language === 'bn' ? 'যেমন: শেড ক' : 'e.g., Shed A',
    firmwareFeatures: language === 'bn' ? '✨ ফার্মওয়্যার ফিচার' : '✨ Firmware Features',
    feature1: language === 'bn' ? '✓ অটোমেশন (HSI, তাপমাত্রা, অ্যামোনিয়া)' : '✓ Automation (HSI, Temperature, Ammonia)',
    feature2: language === 'bn' ? '✓ অফলাইন ফেইল-সেফ মোড' : '✓ Offline Fail-Safe Mode',
    feature3: language === 'bn' ? '✓ ৫০-রেকর্ড অফলাইন বাফার' : '✓ 50-Record Offline Buffer',
    feature4: language === 'bn' ? '✓ স্মার্ট ওয়াটার মনিটরিং' : '✓ Smart Water Monitoring',
    feature5: language === 'bn' ? '✓ পাওয়ার ফেইলার অ্যালার্ট' : '✓ Power Failure Alert',
    feature6: language === 'bn' ? '✓ OTA আপডেট সাপোর্ট' : '✓ OTA Update Support',
  };

  const validateInputs = () => {
    try {
      configSchema.parse({ ssid, password, deviceToken, shedId, shedName });
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
      // Fetch the complete unified firmware template
      const response = await fetch('/esp32-unified.ino');
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
        'const char* DEVICE_TOKEN = "YOUR_DEVICE_TOKEN";',
        `const char* DEVICE_TOKEN = "${deviceToken.trim()}";  // Auto-configured`
      );

      // Replace Shed ID
      firmwareCode = firmwareCode.replace(
        'const char* SHED_ID = "YOUR_SHED_ID";',
        `const char* SHED_ID = "${shedId.trim() || 'default_shed'}";`
      );

      // Replace Shed Name
      firmwareCode = firmwareCode.replace(
        'const char* SHED_NAME = "Shed A";',
        `const char* SHED_NAME = "${shedName.trim() || 'Shed A'}";`
      );

      // Set default Farm Type in EEPROM default
      if (farmType === 'broiler') {
        // Update the default farmType to BROILER
        firmwareCode = firmwareCode.replace(
          '.farmType = FARM_PROFILE_LAYER,  // Default: Layer',
          '.farmType = FARM_PROFILE_BROILER,  // Default: Broiler (auto-configured)'
        );
      }

      // Add a header comment showing the configuration
      const configHeader = `
/*
 * ╔═══════════════════════════════════════════════════════════════════════╗
 * ║  🔧 AUTO-CONFIGURED BY FARMEYE GENERATOR                             ║
 * ╠═══════════════════════════════════════════════════════════════════════╣
 * ║  WiFi SSID: ${ssid.trim().padEnd(54)}║
 * ║  Device Token: ${deviceToken.trim().substring(0, 50).padEnd(50)}...║
 * ║  Farm Type: ${(farmType === 'layer' ? 'LAYER (Egg)' : 'BROILER (Meat)').padEnd(54)}║
 * ║  Shed: ${(shedName || 'Default Shed').padEnd(58)}║
 * ║  Generated: ${new Date().toISOString().padEnd(53)}║
 * ╠═══════════════════════════════════════════════════════════════════════╣
 * ║  ⚠️ এই ফাইল সরাসরি Arduino IDE তে Upload করুন!                       ║
 * ║  ⚠️ Upload this file directly in Arduino IDE!                        ║
 * ╚═══════════════════════════════════════════════════════════════════════╝
 */

`;
      firmwareCode = configHeader + firmwareCode;

      // Create a blob and download
      const blob = new Blob([firmwareCode], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `farmeye-${farmType}-${Date.now()}.ino`;
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
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          {t.title}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{t.subtitle}</p>
        
        {/* Firmware Features Summary */}
        <div className="mt-3 p-3 bg-muted/50 rounded-lg">
          <p className="text-xs font-medium mb-2 flex items-center gap-1">
            <Cpu className="h-3 w-3" />
            {t.firmwareFeatures}
          </p>
          <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
            <span>{t.feature1}</span>
            <span>{t.feature2}</span>
            <span>{t.feature3}</span>
            <span>{t.feature4}</span>
            <span>{t.feature5}</span>
            <span>{t.feature6}</span>
          </div>
        </div>
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

        {/* Step 3: Farm Type & Shed */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs">3</span>
            {t.step3}
          </div>
          
          <div className="pl-7 space-y-3">
            <div className="space-y-2">
              <Label className="text-sm flex items-center gap-2">
                <Settings className="h-3 w-3" />
                {t.farmTypeLabel}
              </Label>
              <Select value={farmType} onValueChange={(v: FarmType) => setFarmType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="layer">{t.layerFarm}</SelectItem>
                  <SelectItem value="broiler">{t.broilerFarm}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="shedName" className="text-xs">{t.shedNameLabel}</Label>
                <Input
                  id="shedName"
                  value={shedName}
                  onChange={(e) => setShedName(e.target.value)}
                  placeholder={t.shedNamePlaceholder}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="shedId" className="text-xs">{t.shedIdLabel}</Label>
                <Input
                  id="shedId"
                  value={shedId}
                  onChange={(e) => setShedId(e.target.value)}
                  placeholder={t.shedIdPlaceholder}
                  className="text-sm font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Step 4: Download */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs">4</span>
            {t.step4}
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
