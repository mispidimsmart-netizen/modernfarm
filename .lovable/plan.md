
# এডভান্সড অটোমেশন সেটিংস ও ESP32 API আপডেট পরিকল্পনা

## সারসংক্ষেপ
সেটিংস পেজে `AdvancedAutomationSettingsCard` যোগ করা এবং ESP32 Edge Function API-তে ৭টি নতুন অটোমেশন মডিউলের সেটিংস সাপোর্ট যুক্ত করা।

---

## পদক্ষেপ ১: সেটিংস পেজ আপডেট

### ফাইল: `src/pages/SettingsPage.tsx`

**পরিবর্তনসমূহ:**
1. AdvancedAutomationSettingsCard কম্পোনেন্ট import করা
2. Owner-only Settings সেকশনে নতুন "Advanced Automation" সেকশন যোগ করা
3. Cog/Settings2 আইকন ব্যবহার করা

**যোগ করার অবস্থান:**
- "Fan Speed Control" এবং "Heat Stress Index" সেকশনের মধ্যে নতুন সেকশন হিসেবে
- অথবা "Weather & Automation" সেকশনের ভেতরে

---

## পদক্ষেপ ২: ESP32 API Edge Function আপডেট

### ফাইল: `supabase/functions/esp32-api/index.ts`

**২.১ নতুন Endpoint যোগ করা:**
```
GET /advanced-settings - এডভান্সড অটোমেশন সেটিংস ফেচ
```

**২.২ `/sync` এন্ডপয়েন্ট আপডেট:**
- `advanced_automation_settings` টেবিল থেকে ডাটা ফেচ করা
- ESP32-তে পাঠানোর জন্য response-এ যোগ করা

**২.৩ `/system-status` এন্ডপয়েন্ট আপডেট:**
- সকল মডিউলের সেটিংস (min_vent, heater, fogger, airflow, water) অন্তর্ভুক্ত করা

**২.৪ Device Status Payload আপডেট:**
- `fogger_on`, `circulation_fan_on`, `heater_on` ফিল্ড সাপোর্ট

---

## পদক্ষেপ ৩: এডভান্সড সেটিংস রেসপন্স স্ট্রাকচার

ESP32-তে পাঠানো হবে:
```json
{
  "advanced_automation": {
    "min_vent": {
      "enabled": true,
      "temp_threshold": 26,
      "cycle_seconds": 40,
      "interval_minutes": 5,
      "ceiling_fan_always_on": true
    },
    "heater": {
      "enabled": true,
      "on_temp": 20,
      "off_temp": 24,
      "tolerance": 0.7
    },
    "fogger": {
      "enabled": false,
      "start_temp": 32,
      "start_humidity_max": 85,
      "on_seconds": 40,
      "pause_seconds": 120,
      "stop_temp": 30,
      "stop_humidity": 90
    },
    "airflow": {
      "enabled": true,
      "early_age_days": 10,
      "mid_age_days": 20,
      "mid_on_seconds": 30,
      "mid_interval_minutes": 3,
      "night_on_seconds": 60,
      "night_interval_minutes": 5
    },
    "curtain_advisory": {
      "enabled": true,
      "open_temp_diff": 3,
      "close_on_cold": true
    },
    "water_analytics": {
      "drop_threshold_percent": 30,
      "night_spike_enabled": true,
      "zero_flow_alert": true,
      "baseline_hours": 24
    },
    "lighting": {
      "fade_duration_minutes": 10
    }
  }
}
```

---

## কারিগরি বিবরণ

### ফাইল পরিবর্তন তালিকা:

| ফাইল | পরিবর্তনের ধরণ |
|------|--------------|
| `src/pages/SettingsPage.tsx` | Import এবং নতুন সেকশন যোগ |
| `supabase/functions/esp32-api/index.ts` | নতুন handler এবং existing sync আপডেট |

### নির্ভরতা:
- ইতোমধ্যে তৈরি: `AdvancedAutomationSettingsCard`
- ইতোমধ্যে তৈরি: `useAdvancedAutomation` hook
- ইতোমধ্যে তৈরি: `advanced_automation_settings` টেবিল

### ESP32 Sync Flow:
```
ESP32 Boot → /sync request → Get advanced_automation in response → Cache in EEPROM
```

---

## প্রত্যাশিত ফলাফল

1. সেটিংস পেজে "এডভান্সড অটোমেশন" সেকশন দেখা যাবে
2. ৭টি মডিউলের সব সেটিংস পরিবর্তন করা যাবে
3. ESP32 ডিভাইস `/sync` কল করে সব সেটিংস পাবে
4. লোকাল ক্যাশে সেটিংস সংরক্ষণ করে ফেইল-সেফ মোডে কাজ করতে পারবে
