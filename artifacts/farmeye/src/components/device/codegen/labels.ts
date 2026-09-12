import type { Language } from './types';

/** Localized strings for the ESP32 firmware generator UI. */
export function getCodegenLabels(language: Language) {
  const bn = language === 'bn';
  return {
    title: bn ? '🚀 ESP32 ফার্মওয়্যার জেনারেটর' : '🚀 ESP32 Firmware Generator',
    subtitle: bn
      ? 'আপনার WiFi, টোকেন ও ফার্মের ধরন দিন - সম্পূর্ণ ফার্মওয়্যার পাবেন'
      : 'Enter WiFi, token & farm type - get complete firmware',
    wifiName: bn ? 'WiFi নাম (SSID)' : 'WiFi Name (SSID)',
    wifiNamePlaceholder: bn ? 'আপনার WiFi নেটওয়ার্কের নাম' : 'Your WiFi network name',
    wifiPassword: bn ? 'WiFi পাসওয়ার্ড' : 'WiFi Password',
    wifiPasswordPlaceholder: bn ? 'আপনার WiFi পাসওয়ার্ড' : 'Your WiFi password',
    deviceToken: bn ? 'ডিভাইস টোকেন' : 'Device Token',
    deviceTokenPlaceholder: bn ? 'উপরে থেকে কপি করুন' : 'Copy from above',
    downloadFirmware: bn ? '📥 সম্পূর্ণ ফার্মওয়্যার ডাউনলোড করুন' : '📥 Download Complete Firmware',
    downloadOTAFirmware: bn ? '📥 OTA ফার্মওয়্যার ডাউনলোড করুন' : '📥 Download OTA Firmware',
    downloading: bn ? 'প্রস্তুত হচ্ছে...' : 'Preparing...',
    fillAllFields: bn ? 'সব তথ্য সঠিকভাবে পূরণ করুন' : 'Please fill all fields correctly',
    downloadSuccess: bn
      ? '✅ সম্পূর্ণ ফার্মওয়্যার ডাউনলোড হয়েছে! Arduino IDE তে Open করে Upload করুন'
      : '✅ Complete firmware downloaded! Open in Arduino IDE and Upload',
    downloadOTASuccess: bn
      ? '✅ OTA ফার্মওয়্যার ডাউনলোড হয়েছে! Compile করে .bin ফাইল OTA-তে আপলোড করুন'
      : '✅ OTA firmware downloaded! Compile to .bin and upload to OTA',
    downloadFailed: bn ? 'ডাউনলোড ব্যর্থ হয়েছে' : 'Download failed',
    step1: bn ? 'ধাপ ১: ফার্মওয়্যার মোড' : 'Step 1: Firmware Mode',
    step2: bn ? 'ধাপ ২: WiFi তথ্য' : 'Step 2: WiFi Info',
    step3: bn ? 'ধাপ ৩: ডিভাইস টোকেন' : 'Step 3: Device Token',
    step4: bn ? 'ধাপ ৪: খামারের ধরন' : 'Step 4: Farm Type',
    step5: bn ? 'ধাপ ৫: ডাউনলোড' : 'Step 5: Download',
    readyToUpload: bn
      ? '👆 এই ফাইল Arduino IDE তে সরাসরি Open → Upload করুন। কোনো কোড এডিটের প্রয়োজন নেই!'
      : '👆 Open this file in Arduino IDE → Upload. No code editing required!',
    readyToOTA: bn
      ? '👆 Arduino IDE → Sketch → Export Compiled Binary → .bin ফাইলটি OTA-তে আপলোড করুন'
      : '👆 Arduino IDE → Sketch → Export Compiled Binary → Upload .bin to OTA',
    farmTypeLabel: bn ? 'খামারের ধরন' : 'Farm Type',
    layerFarm: bn ? '🥚 লেয়ার (ডিম উৎপাদন)' : '🥚 Layer (Egg Production)',
    broilerFarm: bn ? '🐔 ব্রয়লার (মাংস উৎপাদন)' : '🐔 Broiler (Meat Production)',
    shedIdLabel: bn ? 'শেড ID (ঐচ্ছিক)' : 'Shed ID (Optional)',
    shedIdPlaceholder: bn ? 'যেমন: shed_001' : 'e.g., shed_001',
    shedNameLabel: bn ? 'শেডের নাম (ঐচ্ছিক)' : 'Shed Name (Optional)',
    shedNamePlaceholder: bn ? 'যেমন: শেড ক' : 'e.g., Shed A',
    firmwareFeatures: bn ? '✨ ফার্মওয়্যার ফিচার' : '✨ Firmware Features',
    feature1: bn ? '✓ অটোমেশন (HSI, তাপমাত্রা, অ্যামোনিয়া)' : '✓ Automation (HSI, Temperature, Ammonia)',
    feature2: bn ? '✓ অফলাইন ফেইল-সেফ মোড' : '✓ Offline Fail-Safe Mode',
    feature3: bn ? '✓ ৫০-রেকর্ড অফলাইন বাফার' : '✓ 50-Record Offline Buffer',
    feature4: bn ? '✓ স্মার্ট ওয়াটার মনিটরিং' : '✓ Smart Water Monitoring',
    feature5: bn ? '✓ পাওয়ার ফেইলার অ্যালার্ট' : '✓ Power Failure Alert',
    feature6: bn ? '✓ OTA আপডেট সাপোর্ট' : '✓ OTA Update Support',
    hardcodedMode: bn ? '🔒 হার্ডকোডেড (প্রথমবার সেটআপ)' : '🔒 Hardcoded (First-time Setup)',
    otaMode: bn ? '☁️ OTA-Ready (সব ডিভাইসে কাজ করবে)' : '☁️ OTA-Ready (Works on all devices)',
    hardcodedDesc: bn
      ? 'WiFi ও টোকেন কোডে এম্বেড থাকবে। প্রথমবার সেটআপের জন্য।'
      : 'WiFi & token embedded in code. For first-time setup.',
    otaDesc: bn
      ? 'NVS থেকে credentials পড়বে। একটি ফার্মওয়্যার সব ডিভাইসে OTA আপডেট হিসেবে কাজ করবে।'
      : 'Reads credentials from NVS. One firmware works as OTA update for all devices.',
    firmwareModeLabel: bn ? 'ফার্মওয়্যার মোড' : 'Firmware Mode',
  };
}

export type CodegenLabels = ReturnType<typeof getCodegenLabels>;
