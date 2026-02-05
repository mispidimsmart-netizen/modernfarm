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
 #include <Update.h>

// ═══════════════════════════════════════════════════════════════════════
// 🐔 FARM PROFILE SYSTEM (EEPROM Persistent Storage)
// ═══════════════════════════════════════════════════════════════════════
// Farm Profile: 0 = LAYER, 1 = BROILER
// এটা EEPROM-এ সেভ থাকে - App থেকে একবার সেট করলেই যথেষ্ট!
// ESP32 restart হলেও profile মনে থাকে।

#define FARM_PROFILE_LAYER   0
#define FARM_PROFILE_BROILER 1

 // ═══════════════════════════════════════════════════════════════════════
 // 🛡️ PRODUCTION RELIABILITY CONFIG
 // ═══════════════════════════════════════════════════════════════════════
 #define SAFE_MODE_DURATION       30000     // 30 seconds post-boot safe mode
 #define BOOT_VENTILATION_DELAY   5000      // 5 sec ventilation stabilization
 #define GAS_WARMUP_DURATION      300000    // 5 minutes warmup period
 #define GAS_MOVING_AVG_SIZE      10        // Moving average filter size
 #define GAS_CONSECUTIVE_ALERT    3         // Consecutive readings for alert
 #define POWER_SAMPLE_COUNT       50        // RMS sample count
 #define POWER_PERSIST_DURATION   5000      // 5 seconds persistence for alert
 #define OFFLINE_BUFFER_SIZE      50        // Store last 50 readings
 
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

// ═══════════════════════════════════════════════════════════════════════
// 📋 RUNTIME RULES (Loaded at boot based on farmType)
// ═══════════════════════════════════════════════════════════════════════
struct RuntimeRules {
  // Temperature thresholds
  float tempMin;
  float tempMax;
  float tempTarget;
  float tempFanHigh;
  float tempAlarm;
  float tempHeaterOn;
  
  // HSI thresholds
  float hsiFanLow;
  float hsiFanHigh;
  float hsiEmergency;
  float hsiCritical;
  
  // Ammonia thresholds
  float ammoniaFan;
  float ammoniaAlarm;
  
  // Humidity thresholds
  float humidityLow;
  float humidityHigh;
  
  // Feature flags
  bool useAgeBasedTemp;       // Broiler: dynamic temp
  bool lightingProtection;    // Layer: 10min OFF beep
};

RuntimeRules rules;  // Global runtime rules

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
 // 🛡️ RELIABILITY STATE VARIABLES
 // ═══════════════════════════════════════════════════════════════════════
 bool safeModeActive = false;
 unsigned long safeModeEndTime = 0;
 String restartReason = "UNKNOWN";
 int totalRestarts = 0;
 unsigned long onlineDurationSec = 0;
 unsigned long offlineDurationSec = 0;
 unsigned long lastOnlineCheck = 0;
 
 // Gas Sensor Warmup
 bool gasWarmupDone = false;
 unsigned long gasWarmupStart = 0;
 float ammoniaReadings[GAS_MOVING_AVG_SIZE];
 int ammoniaReadingIndex = 0;
 int ammoniaReadingCount = 0;
 float ammoniaAvg10 = 0;
 int consecutiveHighAmmonia = 0;
 
 // Power Sensor Filter
 float powerVoltageRMS = 230.0;
 unsigned long lowVoltageSince = 0;
 bool powerFailConfirmed = false;
 
 // Offline Buffer
 struct SensorBufferEntry {
   unsigned long timestamp;
   float temperature;
   float humidity;
   float ammonia;
   float waterFlow;
   bool powerOn;
   float hsi;
 };
 SensorBufferEntry offlineBuffer[OFFLINE_BUFFER_SIZE];
 int offlineBufferHead = 0;
 int offlineBufferCount = 0;
 
 // Age Sync & OTA
 unsigned long lastAgeSyncTime = 0;
 bool otaInProgress = false;
 int otaProgress = 0;
 String otaStatus = "idle";
 String firmwareVersion = "5.1.0";
 
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

// ═══════════════════════════════════════════════════════════════════════
// 🔄 AGE UPDATE (Cloud → ESP32 → EEPROM)
// App থেকে age change হলে: API → ESP32 → save EEPROM
// ═══════════════════════════════════════════════════════════════════════

void updateAge(int newAge) {
  if (newAge < 1 || newAge > 999) {
    Serial.printf("⚠️ Invalid age: %d (must be 1-999)\n", newAge);
    return;
  }
  
  if (newAge == farmConfig.chickAgeDays) {
    Serial.printf("ℹ️ Age unchanged: Day %d\n", newAge);
    return;
  }
  
  int oldAge = farmConfig.chickAgeDays;
  farmConfig.chickAgeDays = newAge;
  
  Serial.printf("\n🐔 AGE UPDATED: Day %d → Day %d\n", oldAge, newAge);
   
   // Save to EEPROM
   saveFarmProfile();
   
   // Reload rules if broiler mode
   if (isBroiler()) {
     loadBroilerRules();
   }
 }
 
 // ═══════════════════════════════════════════════════════════════════════
 // 🔄 MODE SWITCH (App থেকে Farm Type পরিবর্তন)
 // Layer → Broiler বা Broiler → Layer
 // ESP32: Save EEPROM → Restart Device
 // ═══════════════════════════════════════════════════════════════════════
 
 void switchFarmMode(int newType) {
   // Validate input
   if (newType != FARM_PROFILE_LAYER && newType != FARM_PROFILE_BROILER) {
     Serial.printf("⚠️ Invalid farm type: %d (must be 0=Layer or 1=Broiler)\n", newType);
     return;
   }
   
   // Check if already same type
   if (newType == farmConfig.farmType) {
     Serial.printf("ℹ️ Farm type unchanged: %s\n", getFarmTypeStr().c_str());
     return;
   }
   
   String oldType = getFarmTypeStr();
   
   // Update config
   farmConfig.farmType = newType;
   
   // Reset age to 1 if switching to broiler
   if (newType == FARM_PROFILE_BROILER) {
     farmConfig.chickAgeDays = 1;
   }
   
   Serial.println("\n═══════════════════════════════════════════════════════");
   Serial.printf("🔄 MODE SWITCH: %s → %s\n", oldType.c_str(), getFarmTypeStr().c_str());
   Serial.println("═══════════════════════════════════════════════════════");
   
   // Save to EEPROM
   saveFarmProfile();
   
   Serial.println("\n⏳ Restarting device to apply new profile...");
   Serial.println("   Device will be back online in ~5 seconds");
   delay(1000);  // Allow serial output to flush
   
   // Restart device to fully apply new profile
   ESP.restart();
 }
 
 // Alias for backward compatibility
 void setFarmProfile(int newType) {
   switchFarmMode(newType);
 }
  // Save to EEPROM
  saveFarmProfile();
  
  // If broiler mode, reload temperature rules for new age
  if (isBroiler()) {
    loadBroilerRules();
    Serial.printf("   ✓ Temperature rules updated for Day %d\n", newAge);
  }
}

// Auto-increment age daily (called every 24 hours)
void autoIncrementAge() {
  if (!isBroiler()) return;
  
  farmConfig.chickAgeDays++;
  Serial.printf("\n📅 AUTO AGE INCREMENT: Day %d\n", farmConfig.chickAgeDays);
  
  saveFarmProfile();
  loadBroilerRules();
}

// ═══════════════════════════════════════════════════════════════════════
// 📋 LOAD RULES BASED ON FARM TYPE
// ═══════════════════════════════════════════════════════════════════════

void loadLayerRules() {
  Serial.println("\n🥚 Loading LAYER rules...");
  
  // Fixed temperature range
  rules.tempMin = LAYER_TEMP_IDEAL_MIN;         // 18°C
  rules.tempMax = LAYER_TEMP_IDEAL_MAX;         // 27°C
  rules.tempTarget = (rules.tempMin + rules.tempMax) / 2.0;  // 22.5°C
  rules.tempFanHigh = LAYER_TEMP_FAN_HIGH;      // 30°C
  rules.tempAlarm = LAYER_TEMP_ALARM;           // 33°C
  rules.tempHeaterOn = LAYER_TEMP_HEATER;       // 18°C
  
  // HSI thresholds (lower for layers - more sensitive)
  rules.hsiFanLow = LAYER_HSI_FAN_LOW;          // 30
  rules.hsiFanHigh = LAYER_HSI_FAN_HIGH;        // 35
  rules.hsiEmergency = LAYER_HSI_EMERGENCY;     // 40
  rules.hsiCritical = 999;                       // Not used for Layer
  
  // Ammonia (stricter for layers)
  rules.ammoniaFan = LAYER_AMMONIA_FAN;         // 15 ppm
  rules.ammoniaAlarm = LAYER_AMMONIA_ALARM;     // 25 ppm
  
  // Humidity
  rules.humidityLow = LAYER_HUMIDITY_LOW;       // 40%
  rules.humidityHigh = LAYER_HUMIDITY_HIGH;     // 75%
  
  // Feature flags
  rules.useAgeBasedTemp = false;                // Fixed temp
  rules.lightingProtection = true;              // 10min OFF → beep
  
  Serial.println("   ✓ LAYER rules loaded:");
  Serial.printf("     Temp: %.0f-%.0f°C (fixed)\n", rules.tempMin, rules.tempMax);
  Serial.printf("     HSI: %.0f/%.0f/%.0f\n", rules.hsiFanLow, rules.hsiFanHigh, rules.hsiEmergency);
  Serial.printf("     NH3: %.0f/%.0f ppm\n", rules.ammoniaFan, rules.ammoniaAlarm);
  Serial.println("     Lighting Protection: ON");
}

void loadBroilerRules() {
  Serial.println("\n🐔 Loading BROILER rules...");
  
  // Age-based temperature (calculate from curve)
  float tMin, tMax;
  getBroilerTargetTemp(farmConfig.chickAgeDays, tMin, tMax);
  rules.tempMin = tMin;
  rules.tempMax = tMax;
  rules.tempTarget = (tMin + tMax) / 2.0;
  rules.tempFanHigh = rules.tempTarget + BROILER_TEMP_FAN_DEV;    // +2°C
  rules.tempAlarm = rules.tempTarget + BROILER_TEMP_ALARM_DEV;    // +4°C
  rules.tempHeaterOn = rules.tempTarget - BROILER_TEMP_HEATER_DEV; // -2°C
  
  // HSI thresholds (higher tolerance for broilers)
  rules.hsiFanLow = 35;                                           // Mild
  rules.hsiFanHigh = BROILER_HSI_FAN_HIGH;                        // 38
  rules.hsiEmergency = BROILER_HSI_EMERGENCY;                     // 42
  rules.hsiCritical = BROILER_HSI_CRITICAL;                       // 45
  
  // Ammonia
  rules.ammoniaFan = BROILER_AMMONIA_FAN;                         // 20 ppm
  rules.ammoniaAlarm = BROILER_AMMONIA_ALARM;                     // 30 ppm
  
  // Humidity
  rules.humidityLow = BROILER_HUMIDITY_LOW;                       // 40%
  rules.humidityHigh = BROILER_HUMIDITY_HIGH;                     // 75%
  
  // Feature flags
  rules.useAgeBasedTemp = true;                                   // Dynamic temp
  rules.lightingProtection = false;                               // No beep
  
  Serial.println("   ✓ BROILER rules loaded:");
  Serial.printf("     Age: Day %d\n", farmConfig.chickAgeDays);
  Serial.printf("     Temp: %.0f-%.0f°C (age-based)\n", rules.tempMin, rules.tempMax);
  Serial.printf("     HSI: %.0f/%.0f/%.0f/%.0f\n", rules.hsiFanLow, rules.hsiFanHigh, rules.hsiEmergency, rules.hsiCritical);
  Serial.printf("     NH3: %.0f/%.0f ppm\n", rules.ammoniaFan, rules.ammoniaAlarm);
}

void updateBroilerTempRules() {
  // Called periodically to update temp based on age
  if (!rules.useAgeBasedTemp) return;
  
  float tMin, tMax;
  getBroilerTargetTemp(farmConfig.chickAgeDays, tMin, tMax);
  
  if (tMin != rules.tempMin || tMax != rules.tempMax) {
    rules.tempMin = tMin;
    rules.tempMax = tMax;
    rules.tempTarget = (tMin + tMax) / 2.0;
    rules.tempFanHigh = rules.tempTarget + BROILER_TEMP_FAN_DEV;
    rules.tempAlarm = rules.tempTarget + BROILER_TEMP_ALARM_DEV;
    rules.tempHeaterOn = rules.tempTarget - BROILER_TEMP_HEATER_DEV;
    
    Serial.printf("🔄 BROILER temp updated: Day %d → %.0f-%.0f°C\n", 
                  farmConfig.chickAgeDays, rules.tempMin, rules.tempMax);
  }
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
    
    // Reload rules after profile change
    if (isLayer()) {
      loadLayerRules();
    } else {
      loadBroilerRules();
    }
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

 // ═══════════════════════════════════════════════════════════════════════
 // 🛡️ RELIABILITY HELPER FUNCTIONS
 // ═══════════════════════════════════════════════════════════════════════
 
 String detectRestartReason() {
   esp_reset_reason_t reason = esp_reset_reason();
   switch (reason) {
     case ESP_RST_POWERON: return "POWER_EVENT";
     case ESP_RST_EXT: return "POWER_EVENT";
     case ESP_RST_SW: return "SOFTWARE";
     case ESP_RST_PANIC: return "PANIC";
     case ESP_RST_INT_WDT: case ESP_RST_TASK_WDT: case ESP_RST_WDT: return "WATCHDOG";
     case ESP_RST_BROWNOUT: return "BROWNOUT";
     default: return "UNKNOWN";
   }
 }
 
 bool isPowerRelatedRestart() {
   return (restartReason == "POWER_EVENT" || restartReason == "BROWNOUT" || restartReason == "WATCHDOG");
 }
 
 void enterSafeMode() {
   safeModeActive = true;
   safeModeEndTime = millis() + SAFE_MODE_DURATION;
   Serial.println("\n🛡️ SAFE MODE ACTIVATED (30s) - Fan ON, Commands IGNORED");
   pinMode(FAN_RELAY_PIN, OUTPUT);
   digitalWrite(FAN_RELAY_PIN, HIGH);
   fanOn = true;
   fanSpeed = "HIGH";
   delay(BOOT_VENTILATION_DELAY);
 }
 
 void checkSafeModeExit() {
   if (safeModeActive && millis() >= safeModeEndTime) {
     safeModeActive = false;
     Serial.println("✅ Safe mode ended → Normal automation resumed");
   }
 }
 
 void initGasWarmup() {
   gasWarmupDone = false;
   gasWarmupStart = millis();
   for (int i = 0; i < GAS_MOVING_AVG_SIZE; i++) ammoniaReadings[i] = 0;
   ammoniaReadingIndex = 0;
   ammoniaReadingCount = 0;
   Serial.println("🧪 Gas sensor warmup started (5 minutes)...");
 }
 
 void checkGasWarmup() {
   if (!gasWarmupDone && millis() - gasWarmupStart >= GAS_WARMUP_DURATION) {
     gasWarmupDone = true;
     Serial.println("✅ Gas sensor warmup complete");
   }
 }
 
 float calculateAmmoniaMovingAvg(float newReading) {
   ammoniaReadings[ammoniaReadingIndex] = newReading;
   ammoniaReadingIndex = (ammoniaReadingIndex + 1) % GAS_MOVING_AVG_SIZE;
   if (ammoniaReadingCount < GAS_MOVING_AVG_SIZE) ammoniaReadingCount++;
   float sum = 0;
   for (int i = 0; i < ammoniaReadingCount; i++) sum += ammoniaReadings[i];
   ammoniaAvg10 = sum / ammoniaReadingCount;
   return ammoniaAvg10;
 }
 
 bool shouldTriggerAmmoniaAlert(float threshold) {
   if (!gasWarmupDone) return false;
   if (ammoniaAvg10 > threshold) {
     consecutiveHighAmmonia++;
     if (consecutiveHighAmmonia >= GAS_CONSECUTIVE_ALERT) return true;
   } else {
     consecutiveHighAmmonia = 0;
   }
   return false;
 }
 
 float readPowerVoltageRMS() {
   long sumSquares = 0;
   int dcOffset = 2048;
   for (int i = 0; i < POWER_SAMPLE_COUNT; i++) {
     int sample = analogRead(POWER_SENSE_PIN);
     long val = sample - dcOffset;
     sumSquares += val * val;
     delayMicroseconds(400);
   }
   float rms = sqrt(sumSquares / POWER_SAMPLE_COUNT);
   return (rms / 300.0) * 230.0;
 }
 
 bool checkPowerFailure() {
   powerVoltageRMS = readPowerVoltageRMS();
   bool lowVoltage = powerVoltageRMS < 180.0;
   if (lowVoltage) {
     if (lowVoltageSince == 0) lowVoltageSince = millis();
     if (millis() - lowVoltageSince >= POWER_PERSIST_DURATION) {
       if (!powerFailConfirmed) {
         powerFailConfirmed = true;
         Serial.printf("⚠️ POWER FAILURE: %.1fV RMS\n", powerVoltageRMS);
       }
       return true;
     }
   } else {
     lowVoltageSince = 0;
     if (powerFailConfirmed) {
       Serial.printf("✅ Power restored: %.1fV\n", powerVoltageRMS);
       powerFailConfirmed = false;
     }
   }
   return false;
 }
 
 void addToOfflineBuffer() {
   offlineBuffer[offlineBufferHead].timestamp = millis() / 1000;
   offlineBuffer[offlineBufferHead].temperature = temperature;
   offlineBuffer[offlineBufferHead].humidity = humidity;
   offlineBuffer[offlineBufferHead].ammonia = ammonia;
   offlineBuffer[offlineBufferHead].waterFlow = waterFlow;
   offlineBuffer[offlineBufferHead].powerOn = powerOn;
   offlineBuffer[offlineBufferHead].hsi = currentHSI;
   offlineBufferHead = (offlineBufferHead + 1) % OFFLINE_BUFFER_SIZE;
   if (offlineBufferCount < OFFLINE_BUFFER_SIZE) offlineBufferCount++;
 }
 
 void updateOnlineOfflineDuration() {
   unsigned long now = millis();
   unsigned long elapsed = (now - lastOnlineCheck) / 1000;
   if (cloudConnected) onlineDurationSec += elapsed;
   else offlineDurationSec += elapsed;
   lastOnlineCheck = now;
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
// CONTROL ENGINE (MAIN DECISION)
// Same loop, different rules based on farmType
// ═══════════════════════════════════════════════════════════════════════

void controlLogic() {
  // ===== PRE-CHECK: Manual Override =====
  if (localManualOverride) {
    Serial.println("⚠️ MANUAL OVERRIDE ACTIVE - Automation skipped");
    return;
  }
  
  // ===== PRE-CHECK: Sensor Error Mode =====
  if (sensorErrorMode) {
    Serial.println("⚠️ SENSOR ERROR MODE - Safety fan active");
    return;
  }
  
  // Calculate HSI
  currentHSI = calculateHSI(temperature, humidity);
  
  Serial.printf("\n═══ AUTOMATION (%s) ═══\n", getFarmTypeStr().c_str());
  Serial.printf("Temp=%.1f°C, Hum=%.1f%%, NH3=%.1f ppm, HSI=%.1f\n", 
                temperature, humidity, ammonia, currentHSI);
  
  // ===== MAIN DECISION: Farm Type Based Control =====
  if (farmConfig.farmType == FARM_PROFILE_LAYER) {
    layerControl();
  } 
  else if (farmConfig.farmType == FARM_PROFILE_BROILER) {
    broilerControl();
  }
  
  // ===== COMMON: Safety Checks (runs for both) =====
  runSafetyChecks();
}

// ═══════════════════════════════════════════════════════════════════════
// LAYER CONTROL
// Fixed thresholds, gradual fan speed, lighting protection
// ═══════════════════════════════════════════════════════════════════════

void layerControl() {
  Serial.println("[Layer] Running control logic...");
  
  // ===== TEMPERATURE CONTROL =====
  if (temperature < 18) {
    Serial.printf("🥶 Temp %.1f°C < 18 → Heater ON\n", temperature);
    setHeater(true);
    setFanState(false, "OFF");
    setAlarm(false);
    systemState = "COLD";
    return;
  }
  
  if (temperature > 33) {
    Serial.printf("🚨 Temp %.1f°C > 33 → ALARM!\n", temperature);
    setFanState(true, "HIGH");
    setAlarm(true);
    setHeater(false);
    systemState = "EMERGENCY";
    return;
  }
  
  if (temperature > 30) {
    Serial.printf("🔥 Temp %.1f°C > 30 → Fan HIGH\n", temperature);
    setFanState(true, "HIGH");
    setAlarm(false);
    setHeater(false);
    systemState = "HIGH_STRESS";
    return;
  }
  
  if (temperature > 27) {
    Serial.printf("⚠️ Temp %.1f°C > 27 → Fan LOW\n", temperature);
    setFanState(true, "LOW");
    setAlarm(false);
    setHeater(false);
    systemState = "MILD_STRESS";
    return;
  }
  
  // ===== HSI CONTROL =====
  if (currentHSI > 40) {
    Serial.printf("🚨 HSI %.1f > 40 → Emergency Ventilation!\n", currentHSI);
    setFanState(true, "MAX");
    setAlarm(true);
    setHeater(false);
    systemState = "EMERGENCY";
    return;
  }
  
  if (currentHSI > 35) {
    Serial.printf("🔥 HSI %.1f > 35 → Fan HIGH\n", currentHSI);
    setFanState(true, "HIGH");
    setAlarm(false);
    setHeater(false);
    systemState = "HIGH_STRESS";
    return;
  }
  
  // ===== AMMONIA CONTROL =====
  if (ammonia > 25) {
    Serial.printf("🚨 NH3 %.1f > 25 ppm → ALARM!\n", ammonia);
    setFanState(true, "HIGH");
    setAlarm(true);
    setHeater(false);
    systemState = "DANGER";
    return;
  }
  
  if (ammonia > 15) {
    Serial.printf("⚠️ NH3 %.1f > 15 ppm → Fan ON\n", ammonia);
    setFanState(true, "MEDIUM");
    setAlarm(false);
    setHeater(false);
    systemState = "MILD_STRESS";
    return;
  }
  
  // ===== IDEAL - ALL NORMAL =====
  Serial.printf("✅ Layer IDEAL: %.1f°C, %.1f%%, %.1f ppm\n", temperature, humidity, ammonia);
  setFanState(false, "OFF");
  setAlarm(false);
  setHeater(false);
  systemState = "NORMAL";
}

// ═══════════════════════════════════════════════════════════════════════
// BROILER CONTROL  
// Age-based temperature, dynamic targets, growth-focused
// ═══════════════════════════════════════════════════════════════════════

void broilerControl() {
  // ===== GET TARGET TEMP FOR CURRENT AGE =====
  float targetMin, targetMax;
  getBroilerTargetTemp(broilerAgeDays, targetMin, targetMax);
  float target = (targetMin + targetMax) / 2.0;
  
  Serial.printf("[Broiler] Day %d: Target=%.0f°C, Actual=%.1f°C\n", 
                broilerAgeDays, target, temperature);
  
  // ===== TEMPERATURE CONTROL (Age-Based) =====
  if (temperature < target - 2) {
    Serial.printf("🥶 Temp %.1f°C < Target-2 → Heater ON\n", temperature);
    setHeater(true);
    setFanState(false, "OFF");
    setAlarm(false);
    systemState = "COLD";
    return;
  }
  
  if (temperature > target + 4) {
    Serial.printf("🚨 Temp %.1f°C > Target+4 → ALARM!\n", temperature);
    setFanState(true, "HIGH");
    setAlarm(true);
    setHeater(false);
    systemState = "EMERGENCY";
    return;
  }
  
  if (temperature > target + 2) {
    Serial.printf("🔥 Temp %.1f°C > Target+2 → Fan ON\n", temperature);
    setFanState(true, "HIGH");
    setAlarm(false);
    setHeater(false);
    systemState = "HIGH_STRESS";
    return;
  }
  
  // ===== HSI CONTROL =====
  if (currentHSI > 42) {
    Serial.printf("🚨 HSI %.1f > 42 → Emergency Ventilation!\n", currentHSI);
    setFanState(true, "MAX");
    setAlarm(true);
    setHeater(false);
    systemState = "EMERGENCY";
    return;
  }
  
  if (currentHSI > 38) {
    Serial.printf("🔥 HSI %.1f > 38 → Fan HIGH\n", currentHSI);
    setFanState(true, "HIGH");
    setAlarm(false);
    setHeater(false);
    systemState = "HIGH_STRESS";
    return;
  }
  
  // ===== AMMONIA CONTROL =====
  if (ammonia > 30) {
    Serial.printf("🚨 NH3 %.1f > 30 ppm → ALARM!\n", ammonia);
    setFanState(true, "HIGH");
    setAlarm(true);
    setHeater(false);
    systemState = "DANGER";
    return;
  }
  
  if (ammonia > 20) {
    Serial.printf("⚠️ NH3 %.1f > 20 ppm → Fan ON\n", ammonia);
    setFanState(true, "MEDIUM");
    setAlarm(false);
    setHeater(false);
    systemState = "MILD_STRESS";
    return;
  }
  
  // ===== IDEAL - ALL NORMAL =====
  Serial.printf("✅ Broiler IDEAL: %.1f°C (Target %.0f°C), %.1f ppm\n", temperature, target, ammonia);
  setFanState(false, "OFF");
  setAlarm(false);
  setHeater(false);
  systemState = "NORMAL";
}

// ═══════════════════════════════════════════════════════════════════════
// 🛡️ FAIL-SAFE COMMON (Profile Independent!)
// এগুলো Layer/Broiler যাই হোক - সবার জন্য একই
// ═══════════════════════════════════════════════════════════════════════

void failSafeCommon() {
  // ═══════════════════════════════════════════════════════════════════════
  // 1️⃣ SENSOR MISSING → FAN ON
  // সেন্সর থেকে ডাটা না পেলে - ফ্যান চালু রাখো (সেফটি)
  // ═══════════════════════════════════════════════════════════════════════
  if (sensorErrorMode) {
    Serial.println("🛡️ [FAILSAFE] Sensor missing → Fan ON!");
    setFanState(true, "HIGH");
    systemState = "SENSOR_ERROR";
    // Pulse alarm every 20 seconds
    static unsigned long lastSensorBeep = 0;
    if (millis() - lastSensorBeep > 20000) {
      setAlarm(true);
      delay(200);
      setAlarm(false);
      lastSensorBeep = millis();
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════
  // 2️⃣ NO INTERNET → LOCAL MODE
  // ৫ মিনিট ক্লাউড না পেলে - লোকাল অটো মোডে চলো
  // ═══════════════════════════════════════════════════════════════════════
  unsigned long timeSinceSync = millis() - lastCloudSync;
  
  if (timeSinceSync > CLOUD_TIMEOUT) {
    if (!failsafeMode) {
      Serial.println("🛡️ [FAILSAFE] No internet > 5min → LOCAL AUTO MODE!");
      failsafeMode = true;
    }
  } else {
    if (failsafeMode && cloudConnected) {
      Serial.println("✅ [FAILSAFE] Cloud restored → Normal mode");
      failsafeMode = false;
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════
  // 3️⃣ WATER FAILURE → ALERT
  // ৬ ঘণ্টা পানি না গেলে - বিপ দাও
  // ═══════════════════════════════════════════════════════════════════════
  if (waterFailureMode) {
    Serial.println("🛡️ [FAILSAFE] Water flow missing > 6 hours → Alert!");
    static unsigned long lastWaterBeep = 0;
    if (millis() - lastWaterBeep > 30000) {
      setAlarm(true);
      delay(100);
      setAlarm(false);
      lastWaterBeep = millis();
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════
  // 4️⃣ LIGHTING PROTECTION (Layer Only)
  // ১০ মিনিট লাইট বন্ধ থাকলে - বিপ দাও (শুধু লেয়ার)
  // ═══════════════════════════════════════════════════════════════════════
  if (isLayer() && !lightOn) {
    static unsigned long lightOffStart = 0;
    if (lightOffStart == 0) {
      lightOffStart = millis();
    } else if (millis() - lightOffStart > 600000) {
      Serial.println("🛡️ [FAILSAFE] Light OFF > 10 min → Alert!");
      static unsigned long lastLightBeep = 0;
      if (millis() - lastLightBeep > 60000) {
        setAlarm(true);
        delay(100);
        setAlarm(false);
        lastLightBeep = millis();
      }
    }
  } else {
    // Reset light off timer when light is on
    // (handled by static variable reset on next call)
  }
  
  // ═══════════════════════════════════════════════════════════════════════
  // 5️⃣ WATCHDOG FEED
  // ৮ সেকেন্ড হ্যাং হলে - অটো রিস্টার্ট (hardware level)
  // ═══════════════════════════════════════════════════════════════════════
  esp_task_wdt_reset();
}

// Alias for backward compatibility
void runSafetyChecks() {
  failSafeCommon();
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
   float ammoniaRaw2 = ammoniaRawMapped + farmConfig.nh3Offset;
   if (ammoniaRaw2 < 0) ammoniaRaw2 = 0;
   ammonia = calculateAmmoniaMovingAvg(ammoniaRaw2);  // Moving avg filter
  
  // Check water flow
  if (waterPulseCount > 0) {
    lastWaterPulse = millis();
    waterPulseCount = 0;
    waterFailureMode = false;
  } else if (millis() - lastWaterPulse > WATER_TIMEOUT) {
    waterFailureMode = true;
  }
  
  // Power sense
   powerOn = !checkPowerFailure();  // RMS filter
   checkGasWarmup();
   if (!cloudConnected) addToOfflineBuffer();
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
   // Reliability fields
   doc["firmware_version"] = firmwareVersion;
   doc["restart_reason"] = restartReason;
   doc["total_restarts"] = totalRestarts;
   doc["safe_mode_active"] = safeModeActive;
   doc["power_event_type"] = isPowerRelatedRestart() ? "POWER_EVENT" : "NORMAL";
   doc["gas_warmup_done"] = gasWarmupDone;
   doc["ammonia_avg_10"] = ammoniaAvg10;
   doc["consecutive_high_ammonia"] = consecutiveHighAmmonia;
   doc["power_voltage_rms"] = powerVoltageRMS;
   doc["offline_buffer_count"] = offlineBufferCount;
   doc["ota_status"] = otaStatus;
   doc["ota_progress"] = otaProgress;
   doc["online_duration_seconds"] = onlineDurationSec;
   doc["offline_duration_seconds"] = offlineDurationSec;
  
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
   if (failsafeMode || safeModeActive) {
     Serial.println("⚠️ SAFE/FAILSAFE MODE: Ignoring cloud commands");
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
   Serial.println("║    Smart Farm - ESP32 Unified Controller v5.1                 ║");
  Serial.println("║    🐔 UNIFIED CODEBASE: Farm Profile System                   ║");
   Serial.println("║    🛡️ PRODUCTION RELIABILITY: Safe Mode + Filters            ║");
  Serial.println("╚═══════════════════════════════════════════════════════════════╝\n");
  Serial.printf("  Shed: %s (%s)\n", SHED_NAME, SHED_ID);
  Serial.printf("  Farm: %s\n\n", FARM_ID);
  
   // Detect restart reason
   restartReason = detectRestartReason();
   wasWatchdogReset = (restartReason == "WATCHDOG" || restartReason == "PANIC");
   Serial.printf("📋 Restart Reason: %s\n", restartReason.c_str());
   
   // Track restart count
   preferences.begin("device", false);
   totalRestarts = preferences.getInt("restarts", 0) + 1;
   preferences.putInt("restarts", totalRestarts);
   preferences.end();
   Serial.printf("📊 Total Restarts: %d\n", totalRestarts);
  
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
  
   // SAFE MODE: Power-related restart → 30s safe mode
   if (isPowerRelatedRestart() || wasWatchdogReset) {
     enterSafeMode();
  } else {
     digitalWrite(FAN_RELAY_PIN, HIGH);  // Always safe state
     fanOn = true;
     fanSpeed = "HIGH";
     delay(BOOT_VENTILATION_DELAY);
  }
  digitalWrite(ALARM_RELAY_PIN, LOW);
  digitalWrite(HEATER_RELAY_PIN, LOW);
  
  // Initialize PWM
  ledcSetup(0, 1000, 8);
  ledcAttachPin(LIGHT_PWM_PIN, 0);
  
  // Water flow interrupt
  attachInterrupt(digitalPinToInterrupt(WATER_FLOW_PIN), waterPulseISR, FALLING);
  lastWaterPulse = millis();
  
   // Initialize gas sensor warmup
   initGasWarmup();
   
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
  
  // === LOAD RULES BASED ON FARM TYPE ===
  Serial.println("\n╔═══════════════════════════════════════════════════════════════╗");
  Serial.println("║  📋 BOOT STEP 2: Loading Automation Rules                     ║");
  Serial.println("╚═══════════════════════════════════════════════════════════════╝");
  
  if (isLayer()) {
    loadLayerRules();
  } else {
    loadBroilerRules();
  }
  
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
   
   lastOnlineCheck = millis();
  
  // Initialize watchdog
  esp_task_wdt_init(WDT_TIMEOUT, true);
  esp_task_wdt_add(NULL);
  
  Serial.println("\n╔════════════════════════════════════════════════════════════╗");
  Serial.println("║  ✅ BOOT COMPLETE                                          ║");
  Serial.printf("║  Profile: %s", getFarmTypeStr().c_str());
  if (isBroiler()) Serial.printf(" (Day %d)", broilerAgeDays);
  Serial.println("                                   ║");
  Serial.printf("║  WiFi: %s                                          ║\n", wifiConnected ? "Connected" : "Disconnected");
   Serial.printf("║  Firmware: %s                                           ║\n", firmwareVersion.c_str());
   Serial.printf("║  Safe Mode: %s                                            ║\n", safeModeActive ? "YES" : "NO");
  Serial.println("║  Watchdog: 8 sec timeout                                   ║");
  Serial.println("╚════════════════════════════════════════════════════════════╝\n");
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN LOOP
// ═══════════════════════════════════════════════════════════════════════

void loop() {
  static unsigned long lastSensorRead = 0;
  static unsigned long lastCloudAttempt = 0;
  static unsigned long lastRuleUpdate = 0;
  static unsigned long lastDayCheck = 0;
  unsigned long now = millis();
  
   checkSafeModeExit();
   updateOnlineOfflineDuration();
   
  // Boot fan sequence complete
  if (!bootFanDone && now - bootFanStart >= BOOT_FAN_DURATION) {
    bootFanDone = true;
    Serial.println("✅ Boot fan complete → AUTO mode");
     if (sensorInitOK && temperature < 30 && !safeModeActive) {
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
  
  // ===== CONTROL ENGINE =====
   if (bootFanDone && !safeModeActive) {
    controlLogic();
    
    // Update broiler age & temp rules every hour (Broiler only)
    if (isBroiler() && now - lastRuleUpdate >= 3600000) {
      updateBroilerTempRules();
      lastRuleUpdate = now;
    }
    
    // Auto-increment age every 24 hours (Broiler only)
    // 86400000 ms = 24 hours
    if (isBroiler() && now - lastDayCheck >= 86400000UL) {
      autoIncrementAge();
      lastDayCheck = now;
    }
  }
  
  // Watchdog is now fed in runSafetyChecks()
  
  delay(100);
}