/*
 * Smart Farm - ESP32 Unified Fail-Safe Controller
 * 
 * ╔═══════════════════════════════════════════════════════════════════════╗
 * ║  🐔 UNIFIED CODEBASE - FARM PROFILE SYSTEM                           ║
 * ╠═══════════════════════════════════════════════════════════════════════╣
 * ║  একটাই কোড! Farm Profile (EEPROM-এ সেভ) অনুযায়ী automation চলে       ║
 * ║                                                                       ║
 * ║  FARM PROFILE:                                                        ║
 * ║    0 = Layer (🥚 ডিম উৎপাদন - স্থির তাপমাত্রা)                         ║
 * ║    1 = Broiler (🐔 মাংস উৎপাদন - বয়স-ভিত্তিক তাপমাত্রা)                  ║
 * ║                                                                       ║
 * ║  App থেকে একবার সেট করলেই যথেষ্ট!                                      ║
 * ║  ESP32 restart হলেও profile মনে থাকে।                                 ║
 * ╚═══════════════════════════════════════════════════════════════════════╝
 *
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  🏭 BIG FARM FAIL-SAFE DESIGN RULES (VERY IMPORTANT!)           ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  ✔ Each shed runs independently                                 ║
 * ║  ✔ One shed fail ≠ whole farm fail                              ║
 * ║  ✔ Cloud is advisor, ESP32 is guardian                          ║
 * ║  ✔ Manual override always available locally                     ║
 * ╚══════════════════════════════════════════════════════════════════╝
 * 
 * SAFETY RULES (LOCAL - Cloud এর জন্য অপেক্ষা করে না!):
 * ┌───────────────────────────────────────────────────────────────────┐
 * │  ✓ Watchdog: Firmware freeze > 8 sec → Auto Restart → Fan ON     │
 * │  ✓ Sensor Error: No data > 15 sec → Fan HIGH + Alarm pulse       │
 * │  ✓ Cloud Timeout: No sync > 5 min → LOCAL AUTO MODE              │
 * │  ✓ Water Failure: No pulse > 6 hours → Alert beep                │
 * │  ✓ Default Safe State: Unknown error → Fan ON (never stay OFF)   │
 * └───────────────────────────────────────────────────────────────────┘
 * 
 * LAYER vs BROILER THRESHOLDS:
 * ┌────────────────┬───────────────────────────────────────────────────┐
 * │    Parameter   │     LAYER           │      BROILER               │
 * ├────────────────┼─────────────────────┼────────────────────────────┤
 * │  Temp Range    │  Fixed 18-27°C      │  Age-based (34→22°C)       │
 * │  HSI Fan HIGH  │  > 35               │  > 38                      │
 * │  HSI Emergency │  > 40               │  > 42                      │
 * │  HSI Critical  │  N/A                │  > 45                      │
 * │  Ammonia Fan   │  > 15 ppm           │  > 20 ppm                  │
 * │  Ammonia Alarm │  > 25 ppm           │  > 30 ppm                  │
 * │  Heater ON     │  < 18°C             │  < Target - 2°C            │
 * │  Lighting      │  10min OFF → Beep   │  No alert (optional)       │
 * └────────────────┴─────────────────────┴────────────────────────────┘
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <DHT.h>
#include <EEPROM.h>
#include <esp_task_wdt.h>
#include <esp_system.h>
#include <rom/rtc.h>

// ═══════════════════════════════════════════════════════════════════════
// 🐔 FARM PROFILE SYSTEM (EEPROM Persistent Storage)
// ═══════════════════════════════════════════════════════════════════════
// Farm Profile: 0 = LAYER, 1 = BROILER
// এটা EEPROM-এ সেভ থাকে - App থেকে একবার সেট করলেই যথেষ্ট!
// ESP32 restart হলেও profile মনে থাকে।

#define FARM_PROFILE_LAYER   0
#define FARM_PROFILE_BROILER 1

// EEPROM Configuration
#define EEPROM_SIZE              512
#define EEPROM_CONFIG_ADDR       0      // Start address for FarmConfig
#define EEPROM_MAGIC_ADDR        32     // Magic number address
#define EEPROM_SETTINGS_START    64     // Settings start after config data

#define FARM_CONFIG_MAGIC        0x46524D43    // "FRMC" = Farm Config Magic

// ═══════════════════════════════════════════════════════════════════════
// 📦 FARM CONFIG STRUCTURE (EEPROM Stored)
// ═══════════════════════════════════════════════════════════════════════
struct FarmConfig {
  int farmType;        // 0 = Layer, 1 = Broiler
  int chickAgeDays;    // Only used in broiler mode (current batch age)
  float tempOffset;    // Temperature sensor calibration offset
  float nh3Offset;     // Ammonia sensor calibration offset
};

// Current config (loaded from EEPROM at boot)
FarmConfig farmConfig = {
  .farmType = FARM_PROFILE_LAYER,  // Default: Layer
  .chickAgeDays = 1,                // Default: Day 1
  .tempOffset = 0.0,                // No calibration
  .nh3Offset = 0.0                  // No calibration
};

bool configLoaded = false;  // Track if config loaded from EEPROM

// Helper functions
bool isLayer() { return farmConfig.farmType == FARM_PROFILE_LAYER; }
bool isBroiler() { return farmConfig.farmType == FARM_PROFILE_BROILER; }
String getFarmTypeStr() { return isLayer() ? "LAYER" : "BROILER"; }

// Backward compatibility aliases
#define farmProfile farmConfig.farmType
#define broilerAgeDays farmConfig.chickAgeDays

// ================ WATCHDOG CONFIGURATION ================
#define WDT_TIMEOUT 8  // 8 seconds watchdog timeout
bool wasWatchdogReset = false;

// ================ PIN DEFINITIONS ================
#define DHT_PIN 4
#define DHT_TYPE DHT22
#define MQ135_PIN 34
#define WATER_FLOW_PIN 27
#define POWER_SENSE_PIN 35
#define FAN_RELAY_PIN 26
#define LIGHT_PWM_PIN 25
#define ALARM_RELAY_PIN 33
#define STATUS_LED_PIN 2
#define HEATER_RELAY_PIN 13

// Manual Override Buttons
#define MANUAL_OVERRIDE_BTN 32
#define MANUAL_FAN_BTN 14
#define MANUAL_ALARM_BTN 12

// ================ NETWORK CONFIGURATION ================
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* API_URL = "https://hbwfuvqrfgtefozajyfu.supabase.co/functions/v1/esp32-api";
const char* DEVICE_TOKEN = "YOUR_DEVICE_TOKEN";
const char* SHED_ID = "YOUR_SHED_ID";
const char* SHED_NAME = "Shed A";
const char* FARM_ID = "YOUR_FARM_ID";

// ================ TIMING CONSTANTS ================
const unsigned long CLOUD_SYNC_INTERVAL = 30000;      // 30 seconds
const unsigned long SENSOR_READ_INTERVAL = 5000;      // 5 seconds
const unsigned long WIFI_RECONNECT_INTERVAL = 60000;  // 1 minute
const unsigned long CLOUD_TIMEOUT = 300000;           // ⚠️ 5 MINUTES = LOCAL MODE
const unsigned long BOOT_FAN_DURATION = 20000;        // 20 sec air refresh
const unsigned long SENSOR_TIMEOUT = 15000;           // 15 sec sensor timeout
const unsigned long WATER_TIMEOUT = 21600000;         // 6 hours water timeout

// ================ BROILER TEMPERATURE CURVE ================
struct BroilerTempCurve {
  int minDays;
  int maxDays;
  float minTemp;
  float maxTemp;
};

const BroilerTempCurve BROILER_CURVE[] = {
  { 1,  3, 33, 34 },   // Day 1-3: 33-34°C
  { 4,  7, 32, 32 },   // Day 4-7: 32°C
  { 8, 14, 30, 30 },   // Day 8-14: 30°C
  { 15, 21, 28, 28 },  // Day 15-21: 28°C
  { 22, 28, 26, 26 },  // Day 22-28: 26°C
  { 29, 35, 24, 24 },  // Day 29-35: 24°C
  { 36, 999, 22, 23 }  // Day 36+: 22-23°C
};
const int BROILER_CURVE_SIZE = 7;

// ================ THRESHOLD CONSTANTS ================

// --- LAYER THRESHOLDS ---
const float LAYER_TEMP_HEATER = 18.0;
const float LAYER_TEMP_IDEAL_MIN = 18.0;
const float LAYER_TEMP_IDEAL_MAX = 27.0;
const float LAYER_TEMP_FAN_HIGH = 30.0;
const float LAYER_TEMP_ALARM = 33.0;
const float LAYER_HUMIDITY_LOW = 40.0;
const float LAYER_HUMIDITY_HIGH = 75.0;
const float LAYER_AMMONIA_FAN = 15.0;
const float LAYER_AMMONIA_ALARM = 25.0;
const float LAYER_HSI_FAN_LOW = 30.0;
const float LAYER_HSI_FAN_HIGH = 35.0;
const float LAYER_HSI_EMERGENCY = 40.0;

// --- BROILER THRESHOLDS ---
const float BROILER_TEMP_FAN_DEV = 2.0;      // +2°C → fan HIGH
const float BROILER_TEMP_HEATER_DEV = 2.0;   // -2°C → heater ON
const float BROILER_TEMP_ALARM_DEV = 4.0;    // +4°C → alarm
const float BROILER_HUMIDITY_LOW = 40.0;
const float BROILER_HUMIDITY_HIGH = 75.0;
const float BROILER_AMMONIA_FAN = 20.0;
const float BROILER_AMMONIA_ALARM = 30.0;
const float BROILER_HSI_FAN_HIGH = 38.0;
const float BROILER_HSI_EMERGENCY = 42.0;
const float BROILER_HSI_CRITICAL = 45.0;

// ================ OBJECTS ================
DHT dht(DHT_PIN, DHT_TYPE);
Preferences preferences;

// ================ STATE VARIABLES ================
bool wifiConnected = false;
bool cloudConnected = false;
bool failsafeMode = false;
bool localManualOverride = false;
bool sensorErrorMode = false;
bool waterFailureMode = false;
bool heaterOn = false;
unsigned long lastCloudSync = 0;
unsigned long lastValidSensor = 0;
unsigned long lastWaterPulse = 0;
volatile unsigned long waterPulseCount = 0;

// Sensor readings
float temperature = 0;
float humidity = 0;
float ammonia = 0;
float waterFlow = 0;
bool powerOn = true;

// Device states
bool fanOn = false;
bool lightOn = false;
bool alarmOn = false;
String fanSpeed = "OFF";
float currentHSI = 0;
String systemState = "NORMAL";

// Boot sequence
bool bootFanDone = false;
unsigned long bootFanStart = 0;
bool sensorInitOK = true;

// ═══════════════════════════════════════════════════════════════════════
// FARM PROFILE EEPROM FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

void loadFarmProfile() {
  Serial.println("\n📂 Loading FarmConfig from EEPROM...");
  
  // Check magic number
  uint32_t magic = 0;
  EEPROM.get(EEPROM_MAGIC_ADDR, magic);
  
  if (magic == FARM_CONFIG_MAGIC) {
    // Valid config found - load struct
    EEPROM.get(EEPROM_CONFIG_ADDR, farmConfig);
    
    // Validate values
    if (farmConfig.farmType < 0 || farmConfig.farmType > 1) {
      farmConfig.farmType = FARM_PROFILE_LAYER;
    }
    if (farmConfig.chickAgeDays < 1 || farmConfig.chickAgeDays > 999) {
      farmConfig.chickAgeDays = 1;
    }
    // Limit calibration offsets to reasonable range
    if (farmConfig.tempOffset < -10.0 || farmConfig.tempOffset > 10.0) {
      farmConfig.tempOffset = 0.0;
    }
    if (farmConfig.nh3Offset < -20.0 || farmConfig.nh3Offset > 20.0) {
      farmConfig.nh3Offset = 0.0;
    }
    
    configLoaded = true;
    Serial.println("   ✓ FarmConfig loaded from EEPROM!");
  } else {
    // No valid config - use defaults
    farmConfig.farmType = FARM_PROFILE_LAYER;
    farmConfig.chickAgeDays = 1;
    farmConfig.tempOffset = 0.0;
    farmConfig.nh3Offset = 0.0;
    configLoaded = false;
    Serial.println("   ⚠ No saved config - using defaults (LAYER)");
    Serial.println("   💡 Set via App: POST /set-farm-profile");
  }
  
  printFarmProfile();
}

void saveFarmProfile() {
  Serial.println("\n💾 Saving FarmConfig to EEPROM...");
  
  // Write struct
  EEPROM.put(EEPROM_CONFIG_ADDR, farmConfig);
  
  // Write magic number
  uint32_t magic = FARM_CONFIG_MAGIC;
  EEPROM.put(EEPROM_MAGIC_ADDR, magic);
  
  // Commit to flash
  EEPROM.commit();
  configLoaded = true;
  
  Serial.println("   ✓ FarmConfig saved to EEPROM!");
  Serial.printf("     farmType: %d (%s)\n", farmConfig.farmType, getFarmTypeStr().c_str());
  Serial.printf("     chickAgeDays: %d\n", farmConfig.chickAgeDays);
  Serial.printf("     tempOffset: %.1f°C\n", farmConfig.tempOffset);
  Serial.printf("     nh3Offset: %.1f ppm\n", farmConfig.nh3Offset);
}

bool setFarmProfileFromAPI(uint8_t newProfile, int newAge = -1) {
  if (newProfile > FARM_PROFILE_BROILER) return false;
  
  bool changed = false;
  
  if (newProfile != farmConfig.farmType) {
    Serial.printf("\n🔄 FARM PROFILE CHANGED: %s → %s\n", 
                  getFarmTypeStr().c_str(),
                  newProfile == FARM_PROFILE_LAYER ? "LAYER" : "BROILER");
    farmConfig.farmType = newProfile;
    changed = true;
  }
  
  if (newAge > 0 && newAge < 999 && newAge != farmConfig.chickAgeDays) {
    Serial.printf("🐔 BROILER AGE: Day %d → Day %d\n", farmConfig.chickAgeDays, newAge);
    farmConfig.chickAgeDays = newAge;
    changed = true;
  }
  
  if (changed) {
    saveFarmProfile();
    printFarmProfile();
  }
  
  return true;
}

// Set sensor calibration offsets
void setSensorCalibration(float tempOff, float nh3Off) {
  bool changed = false;
  
  if (tempOff != farmConfig.tempOffset && tempOff >= -10.0 && tempOff <= 10.0) {
    Serial.printf("🌡️ TEMP OFFSET: %.1f → %.1f°C\n", farmConfig.tempOffset, tempOff);
    farmConfig.tempOffset = tempOff;
    changed = true;
  }
  
  if (nh3Off != farmConfig.nh3Offset && nh3Off >= -20.0 && nh3Off <= 20.0) {
    Serial.printf("🧪 NH3 OFFSET: %.1f → %.1f ppm\n", farmConfig.nh3Offset, nh3Off);
    farmConfig.nh3Offset = nh3Off;
    changed = true;
  }
  
  if (changed) {
    saveFarmProfile();
  }
}

void printFarmProfile() {
  Serial.println("\n╔═════════════════════════════════════════════════════════╗");
  Serial.println("║  📦 FARM CONFIG (EEPROM)                                ║");
  Serial.println("╠═════════════════════════════════════════════════════════╣");
  if (isLayer()) {
    Serial.println("║  🥚 FARM PROFILE: LAYER (ডিম উৎপাদন)                    ║");
    Serial.println("║     • Fixed temp range: 18-27°C (ideal)                 ║");
    Serial.println("║     • HSI thresholds: 30/35/40                          ║");
    Serial.println("║     • Ammonia: 15/25 ppm                                ║");
    Serial.println("║     • Lighting protection: 10min OFF → Beep             ║");
  } else {
    Serial.println("║  🐔 FARM PROFILE: BROILER (মাংস উৎপাদন)                  ║");
    Serial.printf("║     • Current Age: Day %d                               ║\n", farmConfig.chickAgeDays);
    float tMin, tMax;
    getBroilerTargetTemp(farmConfig.chickAgeDays, tMin, tMax);
    Serial.printf("║     • Target Temp: %.0f-%.0f°C (age-based)              ║\n", tMin, tMax);
    Serial.println("║     • HSI thresholds: 38/42/45                          ║");
    Serial.println("║     • Ammonia: 20/30 ppm                                ║");
  }
  Serial.println("╠═════════════════════════════════════════════════════════╣");
  Serial.printf("║  🔧 Calibration: Temp %+.1f°C, NH3 %+.1f ppm            ║\n", 
                farmConfig.tempOffset, farmConfig.nh3Offset);
  Serial.println("╚═════════════════════════════════════════════════════════╝\n");
}

// ================ BROILER HELPER ================
void getBroilerTargetTemp(int ageDays, float &minTemp, float &maxTemp) {
  for (int i = 0; i < BROILER_CURVE_SIZE; i++) {
    if (ageDays >= BROILER_CURVE[i].minDays && ageDays <= BROILER_CURVE[i].maxDays) {
      minTemp = BROILER_CURVE[i].minTemp;
      maxTemp = BROILER_CURVE[i].maxTemp;
      return;
    }
  }
  minTemp = BROILER_CURVE[BROILER_CURVE_SIZE - 1].minTemp;
  maxTemp = BROILER_CURVE[BROILER_CURVE_SIZE - 1].maxTemp;
}

// ================ HSI CALCULATION ================
float calculateHSI(float temp, float hum) {
  // Simple HSI = Temperature + (Humidity × 0.1)
  return temp + (hum * 0.1);
}

// ================ WATER FLOW ISR ================
void IRAM_ATTR waterPulseISR() {
  waterPulseCount++;
}

// ================ DEVICE CONTROL ================
void setFanState(bool on, String speed) {
  fanOn = on;
  fanSpeed = speed;
  digitalWrite(FAN_RELAY_PIN, on ? HIGH : LOW);
}

void setAlarm(bool on) {
  alarmOn = on;
  digitalWrite(ALARM_RELAY_PIN, on ? HIGH : LOW);
}

void setHeater(bool on) {
  heaterOn = on;
  digitalWrite(HEATER_RELAY_PIN, on ? HIGH : LOW);
}

// ═══════════════════════════════════════════════════════════════════════
// AUTOMATION ENGINE - Profile-Based
// ═══════════════════════════════════════════════════════════════════════

void runAutomation() {
  if (localManualOverride) {
    Serial.println("⚠️ MANUAL OVERRIDE ACTIVE - Automation skipped");
    return;
  }
  
  // Calculate HSI
  currentHSI = calculateHSI(temperature, humidity);
  
  Serial.printf("\n═══ AUTOMATION (%s) ═══\n", getFarmTypeStr().c_str());
  Serial.printf("Temp=%.1f°C, Hum=%.1f%%, NH3=%.1f ppm, HSI=%.1f\n", 
                temperature, humidity, ammonia, currentHSI);
  
  // Run profile-specific automation
  if (isLayer()) {
    runLayerAutomation();
  } else {
    runBroilerAutomation();
  }
}

// ═══════════════════════════════════════════════════════════════════════
// LAYER AUTOMATION - Fixed Temperature Range
// ═══════════════════════════════════════════════════════════════════════

void runLayerAutomation() {
  // === HSI EMERGENCY (Priority 1) ===
  if (currentHSI > LAYER_HSI_EMERGENCY) {
    Serial.println("🚨 LAYER HSI EMERGENCY (>40) → MAX + ALARM!");
    setFanState(true, "MAX");
    setAlarm(true);
    setHeater(false);
    systemState = "EMERGENCY";
    return;
  }
  
  // === TEMPERATURE ALARM ===
  if (temperature >= LAYER_TEMP_ALARM) {
    Serial.printf("🚨 LAYER TEMP ALARM (%.1f°C >= 33) → HIGH + ALARM!\n", temperature);
    setFanState(true, "HIGH");
    setAlarm(true);
    setHeater(false);
    systemState = "DANGER";
    return;
  }
  
  // === AMMONIA ALARM ===
  if (ammonia > LAYER_AMMONIA_ALARM) {
    Serial.printf("🚨 AMMONIA ALARM (%.1f > 25 ppm) → HIGH + ALARM!\n", ammonia);
    setFanState(true, "HIGH");
    setAlarm(true);
    systemState = "DANGER";
    return;
  }
  
  // Clear alarm if no danger
  setAlarm(false);
  
  // === HSI HIGH STRESS ===
  if (currentHSI >= LAYER_HSI_FAN_HIGH) {
    Serial.printf("🔥 LAYER HSI HIGH (%.1f, 35-40) → Fan HIGH\n", currentHSI);
    setFanState(true, "HIGH");
    setHeater(false);
    systemState = "HIGH_STRESS";
    return;
  }
  
  // === HSI MILD STRESS ===
  if (currentHSI >= LAYER_HSI_FAN_LOW) {
    Serial.printf("⚠️ LAYER HSI MILD (%.1f, 30-35) → Fan LOW\n", currentHSI);
    setFanState(true, "LOW");
    setHeater(false);
    systemState = "MILD_STRESS";
    return;
  }
  
  // === TEMPERATURE HIGH ===
  if (temperature > LAYER_TEMP_FAN_HIGH) {
    Serial.printf("🔥 LAYER TEMP HIGH (%.1f > 30) → Fan HIGH\n", temperature);
    setFanState(true, "HIGH");
    setHeater(false);
    systemState = "HIGH_STRESS";
    return;
  }
  
  // === TEMPERATURE BORDERLINE ===
  if (temperature > LAYER_TEMP_IDEAL_MAX) {
    Serial.printf("⚠️ LAYER TEMP BORDERLINE (%.1f, 27-30) → Fan LOW\n", temperature);
    setFanState(true, "LOW");
    setHeater(false);
    systemState = "MILD_STRESS";
    return;
  }
  
  // === AMMONIA HIGH ===
  if (ammonia > LAYER_AMMONIA_FAN) {
    Serial.printf("⚠️ AMMONIA HIGH (%.1f > 15 ppm) → Fan MEDIUM\n", ammonia);
    setFanState(true, "MEDIUM");
    systemState = "MILD_STRESS";
    return;
  }
  
  // === HIGH HUMIDITY ===
  if (humidity > LAYER_HUMIDITY_HIGH && fanOn) {
    Serial.printf("💨 HUMIDITY HIGH (%.1f > 75%%) → Increase fan\n", humidity);
    if (fanSpeed == "LOW") setFanState(true, "MEDIUM");
    else if (fanSpeed == "MEDIUM") setFanState(true, "HIGH");
    return;
  }
  
  // === COLD - HEATER ON ===
  if (temperature < LAYER_TEMP_HEATER) {
    Serial.printf("🥶 LAYER COLD (%.1f < 18) → Heater ON, Fan OFF\n", temperature);
    setFanState(false, "OFF");
    setHeater(true);
    systemState = "COLD";
    return;
  }
  
  // === IDEAL RANGE ===
  Serial.printf("✅ LAYER IDEAL (%.1f°C, 18-27) → Normal\n", temperature);
  setFanState(false, "OFF");
  setHeater(false);
  systemState = "NORMAL";
}

// ═══════════════════════════════════════════════════════════════════════
// BROILER AUTOMATION - Age-Based Temperature
// ═══════════════════════════════════════════════════════════════════════

void runBroilerAutomation() {
  // Get target temp for current age
  float targetMin, targetMax;
  getBroilerTargetTemp(broilerAgeDays, targetMin, targetMax);
  float targetTemp = (targetMin + targetMax) / 2.0;
  float tempDeviation = temperature - targetTemp;
  
  Serial.printf("🐔 BROILER Day %d: Target=%.0f°C, Actual=%.1f°C, Dev=%+.1f°C\n", 
                broilerAgeDays, targetTemp, temperature, tempDeviation);
  
  // === HSI CRITICAL (>45) - EMERGENCY! ===
  if (currentHSI > BROILER_HSI_CRITICAL) {
    Serial.println("🚨🚨🚨 BROILER HSI CRITICAL (>45) → MAX + CONTINUOUS ALARM!");
    setFanState(true, "MAX");
    setAlarm(true);
    setHeater(false);
    systemState = "EMERGENCY";
    return;
  }
  
  // === HSI EMERGENCY (>42) ===
  if (currentHSI > BROILER_HSI_EMERGENCY) {
    Serial.println("🚨 BROILER HSI EMERGENCY (>42) → MAX + ALARM!");
    setFanState(true, "MAX");
    setAlarm(true);
    setHeater(false);
    systemState = "DANGER";
    return;
  }
  
  // === AMMONIA ALARM ===
  if (ammonia > BROILER_AMMONIA_ALARM) {
    Serial.printf("🚨 AMMONIA ALARM (%.1f > 30 ppm) → HIGH + ALARM!\n", ammonia);
    setFanState(true, "HIGH");
    setAlarm(true);
    systemState = "DANGER";
    return;
  }
  
  // === TEMP ALARM (+4°C) ===
  if (tempDeviation >= BROILER_TEMP_ALARM_DEV) {
    Serial.printf("🚨 BROILER TEMP ALARM (+%.1f°C) → HIGH + ALARM!\n", tempDeviation);
    setFanState(true, "HIGH");
    setAlarm(true);
    setHeater(false);
    systemState = "DANGER";
    return;
  }
  
  // Clear alarm
  setAlarm(false);
  
  // === HSI FAN HIGH (>38) ===
  if (currentHSI > BROILER_HSI_FAN_HIGH) {
    Serial.printf("🔥 BROILER HSI HIGH (%.1f > 38) → Fan HIGH\n", currentHSI);
    setFanState(true, "HIGH");
    setHeater(false);
    systemState = "HIGH_STRESS";
    return;
  }
  
  // === TEMP HIGH (+2°C) ===
  if (tempDeviation >= BROILER_TEMP_FAN_DEV) {
    Serial.printf("🔥 BROILER TEMP HIGH (+%.1f°C) → Fan HIGH\n", tempDeviation);
    setFanState(true, "HIGH");
    setHeater(false);
    systemState = "HIGH_STRESS";
    return;
  }
  
  // === TEMP SLIGHTLY HIGH ===
  if (tempDeviation > 0 && tempDeviation < BROILER_TEMP_FAN_DEV) {
    Serial.printf("⚠️ BROILER TEMP BORDERLINE (+%.1f°C) → Fan LOW\n", tempDeviation);
    setFanState(true, "LOW");
    setHeater(false);
    systemState = "MILD_STRESS";
    return;
  }
  
  // === AMMONIA HIGH ===
  if (ammonia > BROILER_AMMONIA_FAN) {
    Serial.printf("⚠️ AMMONIA HIGH (%.1f > 20 ppm) → Fan MEDIUM\n", ammonia);
    setFanState(true, "MEDIUM");
    systemState = "MILD_STRESS";
    return;
  }
  
  // === HIGH HUMIDITY ===
  if (humidity > BROILER_HUMIDITY_HIGH && fanOn) {
    Serial.printf("💨 HUMIDITY HIGH (%.1f > 75%%) → Increase fan\n", humidity);
    if (fanSpeed == "LOW") setFanState(true, "MEDIUM");
    else if (fanSpeed == "MEDIUM") setFanState(true, "HIGH");
    return;
  }
  
  // === COLD (-2°C) - HEATER ON ===
  if (tempDeviation <= -BROILER_TEMP_HEATER_DEV) {
    Serial.printf("🥶 BROILER COLD (%.1f°C < Target-2) → Heater ON, Fan OFF\n", temperature);
    setFanState(false, "OFF");
    setHeater(true);
    systemState = "COLD";
    return;
  }
  
  // === IDEAL ===
  Serial.printf("✅ BROILER IDEAL (%.1f°C ≈ Target %.0f°C) → Normal\n", temperature, targetTemp);
  setFanState(false, "OFF");
  setHeater(false);
  systemState = "NORMAL";
}

// ═══════════════════════════════════════════════════════════════════════
// SENSOR READING
// ═══════════════════════════════════════════════════════════════════════

void readSensors() {
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  
  if (!isnan(t) && !isnan(h)) {
    // Apply calibration offset from FarmConfig
    temperature = t + farmConfig.tempOffset;
    humidity = h;
    lastValidSensor = millis();
    sensorErrorMode = false;
  } else {
    // Check timeout
    if (millis() - lastValidSensor > SENSOR_TIMEOUT) {
      sensorErrorMode = true;
      Serial.println("⚠️ SENSOR TIMEOUT - Fan ON for safety!");
      setFanState(true, "HIGH");
    }
  }
  
  // Read ammonia
  int ammoniaRaw = analogRead(MQ135_PIN);
  float ammoniaRawMapped = map(ammoniaRaw, 0, 4095, 0, 100);
  // Apply calibration offset from FarmConfig
  ammonia = ammoniaRawMapped + farmConfig.nh3Offset;
  if (ammonia < 0) ammonia = 0;  // Clamp to 0
  
  // Check water flow
  if (waterPulseCount > 0) {
    lastWaterPulse = millis();
    waterPulseCount = 0;
    waterFailureMode = false;
  } else if (millis() - lastWaterPulse > WATER_TIMEOUT) {
    waterFailureMode = true;
  }
  
  // Power sense
  powerOn = analogRead(POWER_SENSE_PIN) > 2000;
}

// ═══════════════════════════════════════════════════════════════════════
// WIFI & CLOUD
// ═══════════════════════════════════════════════════════════════════════

void connectWiFi() {
  Serial.print("📡 Connecting to WiFi");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  wifiConnected = (WiFi.status() == WL_CONNECTED);
  Serial.println(wifiConnected ? "\n✓ WiFi Connected!" : "\n✗ WiFi Failed");
}

void syncWithCloud() {
  if (!wifiConnected) return;
  
  HTTPClient http;
  String url = String(API_URL) + "/sync";
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-token", DEVICE_TOKEN);
  http.setTimeout(10000);
  
  StaticJsonDocument<512> doc;
  doc["temperature"] = temperature;
  doc["humidity"] = humidity;
  doc["ammonia"] = ammonia;
  doc["water_usage"] = waterFlow;
  doc["power_on"] = powerOn;
  doc["fan_on"] = fanOn;
  doc["fan_speed"] = fanSpeed;
  doc["heater_on"] = heaterOn;
  doc["alarm_on"] = alarmOn;
  doc["hsi"] = currentHSI;
  doc["failsafe_mode"] = failsafeMode;
  doc["sensor_error"] = sensorErrorMode;
  doc["farm_profile"] = farmProfile;
  doc["farm_type"] = getFarmTypeStr();
  doc["broiler_age_days"] = broilerAgeDays;
  doc["wifi_rssi"] = WiFi.RSSI();
  doc["uptime_seconds"] = millis() / 1000;
  
  String payload;
  serializeJson(doc, payload);
  
  int httpCode = http.POST(payload);
  
  if (httpCode == 200) {
    String response = http.getString();
    handleCloudResponse(response);
    cloudConnected = true;
    lastCloudSync = millis();
    
    if (failsafeMode) {
      Serial.println("✓ Cloud restored - exiting failsafe");
      failsafeMode = false;
    }
  } else {
    Serial.printf("✗ Cloud sync failed: %d\n", httpCode);
    checkFailsafeTimeout();
  }
  
  http.end();
}

void handleCloudResponse(String response) {
  StaticJsonDocument<1024> doc;
  if (deserializeJson(doc, response)) return;
  
  // === FARM PROFILE SYNC FROM CLOUD ===
  if (doc.containsKey("farm_profile")) {
    int cloudProfile = doc["farm_profile"] | 0;
    if (cloudProfile != farmProfile) {
      setFarmProfileFromAPI(cloudProfile);
    }
  }
  
  // === BROILER AGE SYNC ===
  if (doc.containsKey("broiler_age_days") && isBroiler()) {
    int cloudAge = doc["broiler_age_days"] | 1;
    if (cloudAge != broilerAgeDays && cloudAge > 0) {
      broilerAgeDays = cloudAge;
      saveFarmProfile();
      Serial.printf("🐔 Broiler age synced: Day %d\n", broilerAgeDays);
    }
  }
  
  // === SET FARM PROFILE COMMAND ===
  if (doc.containsKey("set_farm_profile")) {
    int newProfile = doc["set_farm_profile"] | 0;
    int newAge = doc["set_broiler_age"] | -1;
    setFarmProfileFromAPI(newProfile, newAge);
    Serial.println("✓ Farm profile set from cloud command!");
  }
  
  // Ignore device commands in failsafe mode
  if (failsafeMode) {
    Serial.println("⚠️ FAILSAFE: Ignoring cloud commands");
    return;
  }
  
  // Apply device commands (only when NOT in failsafe)
  if (doc.containsKey("device_status") && !localManualOverride) {
    JsonObject status = doc["device_status"];
    fanOn = status["fan_on"] | false;
    fanSpeed = status["fan_speed"] | "OFF";
    digitalWrite(FAN_RELAY_PIN, fanOn ? HIGH : LOW);
  }
}

void checkFailsafeTimeout() {
  if (millis() - lastCloudSync > CLOUD_TIMEOUT && !failsafeMode) {
    Serial.println("\n⚠️ CLOUD TIMEOUT (5 min) → LOCAL AUTO MODE!");
    failsafeMode = true;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// SETUP
// ═══════════════════════════════════════════════════════════════════════

void setup() {
  Serial.begin(115200);
  Serial.println("\n╔═══════════════════════════════════════════════════════════════╗");
  Serial.println("║    Smart Farm - ESP32 Unified Controller v5.0                 ║");
  Serial.println("║    🐔 UNIFIED CODEBASE: Farm Profile System                   ║");
  Serial.println("╚═══════════════════════════════════════════════════════════════╝\n");
  Serial.printf("  Shed: %s (%s)\n", SHED_NAME, SHED_ID);
  Serial.printf("  Farm: %s\n\n", FARM_ID);
  
  // Check watchdog reset
  esp_reset_reason_t resetReason = esp_reset_reason();
  wasWatchdogReset = (resetReason == ESP_RST_TASK_WDT || 
                       resetReason == ESP_RST_WDT || 
                       resetReason == ESP_RST_INT_WDT ||
                       resetReason == ESP_RST_PANIC);
  if (wasWatchdogReset) {
    Serial.println("⚠️🔧 WATCHDOG RESTART DETECTED → Fan ON!");
  }
  
  // Initialize pins
  pinMode(FAN_RELAY_PIN, OUTPUT);
  pinMode(LIGHT_PWM_PIN, OUTPUT);
  pinMode(ALARM_RELAY_PIN, OUTPUT);
  pinMode(STATUS_LED_PIN, OUTPUT);
  pinMode(HEATER_RELAY_PIN, OUTPUT);
  pinMode(MANUAL_OVERRIDE_BTN, INPUT_PULLUP);
  pinMode(MANUAL_FAN_BTN, INPUT_PULLUP);
  pinMode(MANUAL_ALARM_BTN, INPUT_PULLUP);
  pinMode(POWER_SENSE_PIN, INPUT);
  pinMode(WATER_FLOW_PIN, INPUT_PULLUP);
  
  // Watchdog restart → Fan ON immediately
  if (wasWatchdogReset) {
    digitalWrite(FAN_RELAY_PIN, HIGH);
    fanOn = true;
    fanSpeed = "HIGH";
  } else {
    digitalWrite(FAN_RELAY_PIN, LOW);
  }
  digitalWrite(ALARM_RELAY_PIN, LOW);
  digitalWrite(HEATER_RELAY_PIN, LOW);
  
  // Initialize PWM
  ledcSetup(0, 1000, 8);
  ledcAttachPin(LIGHT_PWM_PIN, 0);
  
  // Water flow interrupt
  attachInterrupt(digitalPinToInterrupt(WATER_FLOW_PIN), waterPulseISR, FALLING);
  lastWaterPulse = millis();
  
  // Initialize DHT
  dht.begin();
  delay(2000);
  
  // Test sensors
  float testTemp = dht.readTemperature();
  float testHum = dht.readHumidity();
  sensorInitOK = !isnan(testTemp) && !isnan(testHum);
  lastValidSensor = millis();
  
  if (!sensorInitOK) {
    Serial.println("⚠️ SENSOR ERROR → Failsafe mode!");
    failsafeMode = true;
    digitalWrite(FAN_RELAY_PIN, HIGH);
    fanOn = true;
    fanSpeed = "HIGH";
  }
  
  // === LOAD FARM PROFILE FROM EEPROM ===
  EEPROM.begin(EEPROM_SIZE);
  loadFarmProfile();
  
  // Boot fan sequence
  Serial.println("🌀 Boot fan: 20 sec air refresh...");
  digitalWrite(FAN_RELAY_PIN, HIGH);
  fanOn = true;
  fanSpeed = "HIGH";
  bootFanStart = millis();
  
  // Connect WiFi
  connectWiFi();
  
  // Initial sync
  if (wifiConnected) {
    syncWithCloud();
  }
  
  // Initialize watchdog
  esp_task_wdt_init(WDT_TIMEOUT, true);
  esp_task_wdt_add(NULL);
  
  Serial.println("\n╔════════════════════════════════════════════════════════════╗");
  Serial.println("║  ✅ BOOT COMPLETE                                          ║");
  Serial.printf("║  Profile: %s", getFarmTypeStr().c_str());
  if (isBroiler()) Serial.printf(" (Day %d)", broilerAgeDays);
  Serial.println("                                   ║");
  Serial.printf("║  WiFi: %s                                          ║\n", wifiConnected ? "Connected" : "Disconnected");
  Serial.println("║  Watchdog: 8 sec timeout                                   ║");
  Serial.println("╚════════════════════════════════════════════════════════════╝\n");
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN LOOP
// ═══════════════════════════════════════════════════════════════════════

void loop() {
  static unsigned long lastSensorRead = 0;
  static unsigned long lastCloudAttempt = 0;
  unsigned long now = millis();
  
  // Boot fan sequence complete
  if (!bootFanDone && now - bootFanStart >= BOOT_FAN_DURATION) {
    bootFanDone = true;
    Serial.println("✅ Boot fan complete → AUTO mode");
    if (sensorInitOK && temperature < 30) {
      setFanState(false, "OFF");
    }
  }
  
  // Check WiFi
  if (WiFi.status() != WL_CONNECTED) {
    wifiConnected = false;
    cloudConnected = false;
  }
  
  // Read sensors
  if (now - lastSensorRead >= SENSOR_READ_INTERVAL) {
    readSensors();
    lastSensorRead = now;
  }
  
  // Sync with cloud
  if (now - lastCloudAttempt >= CLOUD_SYNC_INTERVAL) {
    if (wifiConnected) {
      syncWithCloud();
    } else {
      checkFailsafeTimeout();
    }
    lastCloudAttempt = now;
  }
  
  // Run automation
  if (bootFanDone) {
    runAutomation();
  }
  
  // Water failure alert
  if (waterFailureMode) {
    static unsigned long lastWaterBeep = 0;
    if (now - lastWaterBeep >= 30000) {
      digitalWrite(ALARM_RELAY_PIN, HIGH);
      delay(200);
      digitalWrite(ALARM_RELAY_PIN, LOW);
      lastWaterBeep = now;
    }
  }
  
  // Feed watchdog
  esp_task_wdt_reset();
  
  delay(100);
}