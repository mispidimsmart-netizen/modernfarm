import { useState, useEffect } from 'react';
import { Download, Eye, EyeOff, Sparkles, Wifi, Loader2, CheckCircle2, Settings, Cpu, CloudDownload, Info, Database, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { z } from 'zod';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';

// Validation schema
const configSchema = z.object({
  ssid: z.string().trim().min(1, 'WiFi নাম দিন').max(32, 'WiFi নাম ৩২ অক্ষরের বেশি হতে পারবে না'),
  password: z.string().min(8, 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষর হতে হবে').max(64, 'পাসওয়ার্ড ৬৪ অক্ষরের বেশি হতে পারবে না'),
  deviceToken: z.string().trim().min(10, 'সঠিক ডিভাইস টোকেন দিন').max(100, 'টোকেন সঠিক নয়'),
  shedId: z.string().optional(),
  shedName: z.string().optional(),
  farmId: z.string().optional(),
});

// OTA mode doesn't require credentials
const otaConfigSchema = z.object({
  shedId: z.string().optional(),
  shedName: z.string().optional(),
});

type FarmType = 'layer' | 'broiler';
type FirmwareMode = 'hardcoded' | 'ota';

interface ESP32CodeGeneratorProps {
  language?: 'bn' | 'en';
  showFarmSelector?: boolean;
}

interface FarmOption {
  id: string;
  name: string;
  name_en: string;
  owner_id: string;
  owner_email?: string;
}

export function ESP32CodeGenerator({ language = 'bn', showFarmSelector = false }: ESP32CodeGeneratorProps) {
  const [ssid, setSsid] = useState(() => localStorage.getItem('farmeye_wifi_ssid') || '');
  const [password, setPassword] = useState(() => localStorage.getItem('farmeye_wifi_pass') || '');
  const [deviceToken, setDeviceToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDownloading, setIsDownloading] = useState(false);
  const [farmType, setFarmType] = useState<FarmType>('layer');
  const [shedId, setShedId] = useState('');
  const [shedName, setShedName] = useState('');
  const [firmwareMode, setFirmwareMode] = useState<FirmwareMode>('hardcoded');
  const [farmId, setFarmId] = useState('');
  const [autoLoaded, setAutoLoaded] = useState(false);
  const [allFarms, setAllFarms] = useState<FarmOption[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState('');

  // Fetch all farms for admin selector
  useEffect(() => {
    if (!showFarmSelector) return;
    const fetchAllFarms = async () => {
      try {
        const { data: farms } = await supabase
          .from('farms')
          .select('id, name, name_en, owner_id')
          .eq('is_active', true)
          .order('name');
        if (farms && farms.length > 0) {
          // Fetch owner emails from profiles - only farms with valid profiles
          const ownerIds = [...new Set(farms.map(f => f.owner_id))];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, email')
            .in('id', ownerIds);
          
          const profileIds = new Set(profiles?.map(p => p.id) || []);
          const emailMap = new Map(profiles?.map(p => [p.id, p.email]) || []);
          // Filter: only show farms whose owner has a valid profile
          const validFarms = farms.filter(f => profileIds.has(f.owner_id));
          setAllFarms(validFarms.map(f => ({ ...f, owner_email: emailMap.get(f.owner_id) || '' })));
        }
      } catch (err) {
        console.warn('Could not fetch farms:', err);
      }
    };
    fetchAllFarms();
  }, [showFarmSelector]);

  // Load credentials for selected farm (admin) or own farm (regular user)
  useEffect(() => {
    const fetchCredentials = async (targetFarmId?: string) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        let farm: { id: string; name: string } | null = null;

        if (targetFarmId) {
          // Admin selected a specific farm
          const { data: farms } = await supabase
            .from('farms')
            .select('id, name')
            .eq('id', targetFarmId)
            .limit(1);
          farm = farms?.[0] || null;
        } else if (!showFarmSelector) {
          // Regular user: fetch own farm
          const { data: farms } = await supabase
            .from('farms')
            .select('id, name')
            .eq('owner_id', user.id)
            .eq('is_active', true)
            .limit(1);
          farm = farms?.[0] || null;
        }

        if (farm) {
          setFarmId(farm.id);

          // Fetch shed
          const { data: sheds } = await supabase
            .from('sheds')
            .select('id, name')
            .eq('farm_id', farm.id)
            .limit(1);

          if (sheds?.[0]) {
            setShedId(sheds[0].id);
            setShedName(sheds[0].name || '');
          } else {
            setShedId('');
            setShedName('');
          }

          // Fetch device token
          const { data: tokens } = await supabase
            .from('device_tokens')
            .select('token')
            .eq('farm_id', farm.id)
            .eq('is_active', true)
            .limit(1);

          if (tokens?.[0]) {
            setDeviceToken(tokens[0].token);
          } else {
            setDeviceToken('');
          }

          setAutoLoaded(true);
        }
      } catch (err) {
        console.warn('Could not auto-load credentials:', err);
      }
    };

    if (showFarmSelector && selectedFarmId) {
      fetchCredentials(selectedFarmId);
    } else if (!showFarmSelector) {
      fetchCredentials();
    }
  }, [showFarmSelector, selectedFarmId]);

  // Save WiFi credentials to localStorage for auto-fill
  useEffect(() => {
    if (ssid) localStorage.setItem('farmeye_wifi_ssid', ssid);
  }, [ssid]);

  useEffect(() => {
    if (password) localStorage.setItem('farmeye_wifi_pass', password);
  }, [password]);

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
    downloadOTAFirmware: language === 'bn' ? '📥 OTA ফার্মওয়্যার ডাউনলোড করুন' : '📥 Download OTA Firmware',
    downloading: language === 'bn' ? 'প্রস্তুত হচ্ছে...' : 'Preparing...',
    fillAllFields: language === 'bn' ? 'সব তথ্য সঠিকভাবে পূরণ করুন' : 'Please fill all fields correctly',
    downloadSuccess: language === 'bn' 
      ? '✅ সম্পূর্ণ ফার্মওয়্যার ডাউনলোড হয়েছে! Arduino IDE তে Open করে Upload করুন' 
      : '✅ Complete firmware downloaded! Open in Arduino IDE and Upload',
    downloadOTASuccess: language === 'bn' 
      ? '✅ OTA ফার্মওয়্যার ডাউনলোড হয়েছে! Compile করে .bin ফাইল OTA-তে আপলোড করুন' 
      : '✅ OTA firmware downloaded! Compile to .bin and upload to OTA',
    downloadFailed: language === 'bn' ? 'ডাউনলোড ব্যর্থ হয়েছে' : 'Download failed',
    step1: language === 'bn' ? 'ধাপ ১: ফার্মওয়্যার মোড' : 'Step 1: Firmware Mode',
    step2: language === 'bn' ? 'ধাপ ২: WiFi তথ্য' : 'Step 2: WiFi Info',
    step3: language === 'bn' ? 'ধাপ ৩: ডিভাইস টোকেন' : 'Step 3: Device Token',
    step4: language === 'bn' ? 'ধাপ ৪: খামারের ধরন' : 'Step 4: Farm Type',
    step5: language === 'bn' ? 'ধাপ ৫: ডাউনলোড' : 'Step 5: Download',
    readyToUpload: language === 'bn' 
      ? '👆 এই ফাইল Arduino IDE তে সরাসরি Open → Upload করুন। কোনো কোড এডিটের প্রয়োজন নেই!' 
      : '👆 Open this file in Arduino IDE → Upload. No code editing required!',
    readyToOTA: language === 'bn' 
      ? '👆 Arduino IDE → Sketch → Export Compiled Binary → .bin ফাইলটি OTA-তে আপলোড করুন' 
      : '👆 Arduino IDE → Sketch → Export Compiled Binary → Upload .bin to OTA',
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
    hardcodedMode: language === 'bn' ? '🔒 হার্ডকোডেড (প্রথমবার সেটআপ)' : '🔒 Hardcoded (First-time Setup)',
    otaMode: language === 'bn' ? '☁️ OTA-Ready (সব ডিভাইসে কাজ করবে)' : '☁️ OTA-Ready (Works on all devices)',
    hardcodedDesc: language === 'bn' 
      ? 'WiFi ও টোকেন কোডে এম্বেড থাকবে। প্রথমবার সেটআপের জন্য।' 
      : 'WiFi & token embedded in code. For first-time setup.',
    otaDesc: language === 'bn' 
      ? 'NVS থেকে credentials পড়বে। একটি ফার্মওয়্যার সব ডিভাইসে OTA আপডেট হিসেবে কাজ করবে।' 
      : 'Reads credentials from NVS. One firmware works as OTA update for all devices.',
    firmwareModeLabel: language === 'bn' ? 'ফার্মওয়্যার মোড' : 'Firmware Mode',
  };

  const validateInputs = () => {
    try {
      if (firmwareMode === 'ota') {
        // OTA mode doesn't require WiFi/token
        otaConfigSchema.parse({ shedId, shedName });
      } else {
        configSchema.parse({ ssid, password, deviceToken, shedId, shedName });
      }
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
      // Fetch firmware template from public folder with cache-busting
      // IMPORTANT: Use esp32-industrial.ino (v7.0+) — the ONLY authorized firmware
      const response = await fetch('/esp32-industrial.ino?t=' + Date.now());
      if (!response.ok) throw new Error('Failed to fetch firmware template');
      let firmwareCode = await response.text();
      
      if (firmwareMode === 'hardcoded') {
        // Mode 1: Hardcoded credentials (for first-time setup)
        // Use regex to handle variable whitespace alignment in firmware template
        firmwareCode = firmwareCode.replace(
          /const\s+char\*\s+WIFI_SSID\s*=\s*"YOUR_WIFI_SSID"\s*;/,
          `const char* WIFI_SSID     = "${ssid.trim()}";`
        );
        
        firmwareCode = firmwareCode.replace(
          /const\s+char\*\s+WIFI_PASSWORD\s*=\s*"YOUR_WIFI_PASSWORD"\s*;/,
          `const char* WIFI_PASSWORD  = "${password}";`
        );
        
        firmwareCode = firmwareCode.replace(
          /const\s+char\*\s+DEVICE_TOKEN\s*=\s*"YOUR_DEVICE_TOKEN"\s*;/,
          `const char* DEVICE_TOKEN   = "${deviceToken.trim()}";  // Auto-configured`
        );

        // Replace Shed ID
        firmwareCode = firmwareCode.replace(
          /const\s+char\*\s+SHED_ID\s*=\s*"YOUR_SHED_ID"\s*;/,
          `const char* SHED_ID        = "${shedId.trim() || 'default_shed'}";`
        );

        // Replace Shed Name
        firmwareCode = firmwareCode.replace(
          /const\s+char\*\s+SHED_NAME\s*=\s*"[^"]*"\s*;/,
          `const char* SHED_NAME      = "${shedName.trim() || 'Shed A'}";`
        );

        // Replace Farm ID
        firmwareCode = firmwareCode.replace(
          /const\s+char\*\s+FARM_ID\s*=\s*"YOUR_FARM_ID"\s*;/,
          `const char* FARM_ID        = "${farmId.trim() || 'default_farm'}";  // Auto-configured`
        );
        
        // Keep USE_HARDCODED_TOKEN = true (default)
      } else {
        // Mode 2: OTA-ready firmware (reads from NVS)
        firmwareCode = firmwareCode.replace(
          '#define USE_HARDCODED_TOKEN true',
          '#define USE_HARDCODED_TOKEN false  // OTA Mode: Reads credentials from NVS'
        );
      }

      // Set default Farm Type in EEPROM default
      if (farmType === 'broiler') {
        // Update the default farmType to BROILER
        firmwareCode = firmwareCode.replace(
          '.farmType = FARM_PROFILE_LAYER,  // Default: Layer',
          '.farmType = FARM_PROFILE_BROILER,  // Default: Broiler (auto-configured)'
        );
        
        // Also set initial broiler age to Day 1
        firmwareCode = firmwareCode.replace(
          '.chickAgeDays = 1,                // Default: Day 1',
          '.chickAgeDays = 1,                // Default: Day 1 (auto-configured for broiler)'
        );
      }

      // Add a header comment showing the configuration
      const modeLabel = firmwareMode === 'ota' ? 'OTA-READY (NVS Mode)' : 'HARDCODED (First-time Setup)';
      const configHeader = `
/*
 * ╔═══════════════════════════════════════════════════════════════════════╗
 * ║  🔧 AUTO-CONFIGURED BY FARMEYE GENERATOR                             ║
 * ╠═══════════════════════════════════════════════════════════════════════╣
 * ║  Mode: ${modeLabel.padEnd(57)}║
 * ║  Farm Type: ${(farmType === 'layer' ? 'LAYER (Egg)' : 'BROILER (Meat)').padEnd(54)}║${firmwareMode === 'hardcoded' ? `
 * ║  WiFi SSID: ${ssid.trim().padEnd(54)}║
 * ║  Device Token: ${deviceToken.trim().substring(0, 50).padEnd(50)}...║
 * ║  Shed: ${(shedName || 'Default Shed').padEnd(58)}║` : `
 * ║  📦 Credentials will be loaded from NVS storage                       ║
 * ║  ⚠️ Device must be first provisioned with hardcoded firmware          ║`}
 * ║  Generated: ${new Date().toISOString().padEnd(53)}║
 * ╠═══════════════════════════════════════════════════════════════════════╣${firmwareMode === 'ota' ? `
 * ║  📋 OTA INSTRUCTIONS:                                                 ║
 * ║  1. Arduino IDE → Sketch → Export Compiled Binary                    ║
 * ║  2. Upload the .bin file to OTA Firmware section                     ║
 * ║  3. Push to devices - they'll auto-update!                           ║` : `
 * ║  ⚠️ এই ফাইল সরাসরি Arduino IDE তে Upload করুন!                       ║
 * ║  ⚠️ Upload this file directly in Arduino IDE!                        ║`}
 * ╚═══════════════════════════════════════════════════════════════════════╝
 */

`;
      firmwareCode = configHeader + firmwareCode;

      // Helper to trigger a file download (robust: uses click + revokeObjectURL after delay)
      const triggerDownload = (content: string, filename: string): Promise<void> => {
        return new Promise((resolve) => {
          const blob = new Blob([content], { type: 'application/octet-stream' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.style.display = 'none';
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            resolve();
          }, 500);
        });
      };

      // Download the .ino file first, then safety header sequentially
      // Sequential downloads avoid pop-up blocker issues
      const inoFilename = firmwareMode === 'ota' 
        ? `farmeye-ota-${farmType}-${Date.now()}.ino`
        : `farmeye-${farmType}-${Date.now()}.ino`;
      
      await triggerDownload(firmwareCode, inoFilename);

      // Then download the required safety engine header file
      try {
        const headerResponse = await fetch('/esp32-safety-engine.h?t=' + Date.now());
        if (headerResponse.ok) {
          const headerCode = await headerResponse.text();
          // Wait a moment before second download to avoid browser blocking
          await new Promise(r => setTimeout(r, 800));
          await triggerDownload(headerCode, 'esp32-safety-engine.h');
        }
      } catch (headerErr) {
        console.warn('Could not download safety header:', headerErr);
      }
      
      const successMsg = firmwareMode === 'ota' ? t.downloadOTASuccess : t.downloadSuccess;
      toast.success(
        (language === 'bn' 
          ? '✅ ফার্মওয়্যার + Safety Engine হেডার ডাউনলোড হয়েছে! দুটি ফাইল একই ফোল্ডারে রাখুন।'
          : '✅ Firmware + Safety Engine header downloaded! Keep both files in the same folder.'),
        { duration: 6000 }
      );
    } catch (error) {
      console.error('Download error:', error);
      toast.error(t.downloadFailed);
    } finally {
      setIsDownloading(false);
    }
  };

  const isValid = firmwareMode === 'ota' 
    ? true  // OTA mode always valid
    : ssid.trim().length > 0 && password.length >= 8 && deviceToken.trim().length >= 10;

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
        {/* Admin Farm Selector */}
        {showFarmSelector && (
          <div className="space-y-3 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <div className="flex items-center gap-2 text-sm font-medium text-purple-600 dark:text-purple-400">
              <Home className="h-4 w-4" />
              {language === 'bn' ? '🏠 খামার সিলেক্ট করুন' : '🏠 Select Farm'}
            </div>
            <Select
              value={selectedFarmId}
              onValueChange={(value) => {
                setSelectedFarmId(value);
                setAutoLoaded(false);
                setDeviceToken('');
                setShedId('');
                setShedName('');
                setFarmId('');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={language === 'bn' ? 'একটি খামার বেছে নিন...' : 'Choose a farm...'} />
              </SelectTrigger>
              <SelectContent>
                {allFarms.map((farm) => (
                  <SelectItem key={farm.id} value={farm.id}>
                    <div className="flex flex-col">
                      <span>{language === 'bn' ? farm.name : farm.name_en}</span>
                      {farm.owner_email && (
                        <span className="text-xs text-muted-foreground">{farm.owner_email}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {allFarms.length === 0 && (
              <p className="text-xs text-muted-foreground">
                {language === 'bn' ? 'কোনো খামার পাওয়া যায়নি' : 'No farms found'}
              </p>
            )}
            {selectedFarmId && !deviceToken && autoLoaded && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                ⚠️ {language === 'bn' 
                  ? 'এই খামারে কোনো ডিভাইস টোকেন নেই। প্রথমে Setup Wizard সম্পন্ন করতে হবে।' 
                  : 'No device token found for this farm. Setup Wizard must be completed first.'}
              </p>
            )}
          </div>
        )}

        {/* Step 1: Firmware Mode */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs">1</span>
            {t.step1}
          </div>
          
          <div className="pl-7 space-y-3">
            <Label className="text-sm flex items-center gap-2">
              <Settings className="h-3 w-3" />
              {t.firmwareModeLabel}
            </Label>
            <div className="grid gap-2">
              <button
                type="button"
                onClick={() => setFirmwareMode('hardcoded')}
                className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                  firmwareMode === 'hardcoded' 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  firmwareMode === 'hardcoded' ? 'border-primary' : 'border-muted-foreground'
                }`}>
                  {firmwareMode === 'hardcoded' && <div className="w-2 h-2 rounded-full bg-primary" />}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{t.hardcodedMode}</p>
                  <p className="text-xs text-muted-foreground">{t.hardcodedDesc}</p>
                </div>
              </button>
              
              <button
                type="button"
                onClick={() => setFirmwareMode('ota')}
                className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                  firmwareMode === 'ota' 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  firmwareMode === 'ota' ? 'border-primary' : 'border-muted-foreground'
                }`}>
                  {firmwareMode === 'ota' && <div className="w-2 h-2 rounded-full bg-primary" />}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm flex items-center gap-1">
                    {t.otaMode}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>{language === 'bn' 
                            ? 'ডিভাইসে প্রথমবার হার্ডকোডেড ফার্মওয়্যার ফ্ল্যাশ করুন। তারপর এই OTA ফার্মওয়্যার সব ডিভাইসে আপডেট হিসেবে পাঠাতে পারবেন।'
                            : 'First flash hardcoded firmware to device. Then this OTA firmware can be pushed as an update to all devices.'
                          }</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </p>
                  <p className="text-xs text-muted-foreground">{t.otaDesc}</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Step 2: WiFi Settings (only for hardcoded mode) */}
        {firmwareMode === 'hardcoded' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs">2</span>
              {t.step2}
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
        )}

        {/* Step 3: Device Token (only for hardcoded mode) */}
        {firmwareMode === 'hardcoded' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs">3</span>
              {t.step3}
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
              {autoLoaded && (
              <div className="flex items-center gap-1.5 p-2 bg-accent/50 border border-primary/30 rounded-lg">
                  <Database className="h-3 w-3 text-primary" />
                  <p className="text-xs text-primary">
                    {language === 'bn' 
                      ? '✅ ডিভাইস টোকেন, Farm ID ও Shed ID স্বয়ংক্রিয়ভাবে লোড হয়েছে!'
                      : '✅ Device Token, Farm ID & Shed ID auto-loaded from database!'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Farm Type & Shed */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs">{firmwareMode === 'hardcoded' ? '4' : '2'}</span>
            {t.step4}
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

        {/* Step 5: Download */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs">{firmwareMode === 'hardcoded' ? '5' : '3'}</span>
            {t.step5}
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
                  {firmwareMode === 'ota' ? <CloudDownload className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                  {firmwareMode === 'ota' ? t.downloadOTAFirmware : t.downloadFirmware}
                </>
              )}
            </Button>
            
            {isValid && (
              <div className="flex items-start gap-2 p-3 bg-primary/10 border border-primary/30 rounded-lg">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-xs text-primary">
                  {firmwareMode === 'ota' ? t.readyToOTA : t.readyToUpload}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
