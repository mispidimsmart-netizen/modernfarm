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
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  🏭 BIG FARM FAIL-SAFE DESIGN RULES (VERY IMPORTANT!)                   ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  ✔ Each shed runs independently                                         ║
 * ║  ✔ One shed fail ≠ whole farm fail                                      ║
 * ║  ✔ Cloud is advisor, ESP32 is guardian                                  ║
 * ║  ✔ Manual override always available locally                             ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  🆕 7-MODULE ADVANCED AUTOMATION SYSTEM (v5.2)                          ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  MODULE A: Minimum Ventilation Timer (cyclic exhaust)                   ║
 * ║  MODULE B: Enhanced Heater Control (age-based curve)                    ║
 * ║  MODULE C: Intelligent Fogger Cooling (temp+humidity trigger)           ║
 * ║  MODULE D: Broiler Airflow Growth Mode (age-based fan control)          ║
 * ║  MODULE E: Lighting Soft Control (10-min PWM fade)                      ║
 * ║  MODULE F: Offline Age Increment (24h local tick)                       ║
 * ║  MODULE G: Priority System (Safety > Heat > Cool > Vent > Light)        ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 * 
 * SAFETY RULES (LOCAL - Cloud এর জন্য অপেক্ষা করে না!):
 * ┌───────────────────────────────────────────────────────────────────┐
 * │  ✓ Watchdog: Firmware freeze > 8 sec → Auto Restart → Fan ON     │
 * │  ✓ Sensor Error: No data > 15 sec → Fan HIGH + Alarm pulse       │
 * │  ✓ Cloud Timeout: No sync > 5 min → LOCAL AUTO MODE              │
 * │  ✓ Water Failure: No pulse > 6 hours → Alert beep                │
 * │  ✓ Default Safe State: Unknown error → Fan ON (never stay OFF)   │
 * │  ✓ Heater Safety: Temp > 34°C → FORCE HEATER OFF                 │
 * │  ✓ Fogger Safety: Always requires exhaust fan running            │
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
// 📡 WIFI CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════
#define WIFI_CONNECT_TIMEOUT     20              // 20 attempts (10 sec)

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
 
 // ═══════════════════════════════════════════════════════════════════════
 // 🛡️ SENSOR SANITY FILTER CONSTANTS
 // Reject impossible readings to prevent false automation
 // ═══════════════════════════════════════════════════════════════════════
 #define TEMP_SANITY_MIN          0.0       // Below 0°C = impossible
 #define TEMP_SANITY_MAX          60.0      // Above 60°C = impossible
 #define HUMIDITY_SANITY_MIN      10.0      // Below 10% = sensor error
 #define HUMIDITY_SANITY_MAX      100.0     // Above 100% = impossible
 #define AMMONIA_JUMP_THRESHOLD   0.50      // 50% change in 2 sec = spike
 #define AMMONIA_JUMP_WINDOW_MS   2000      // 2 second window
 #define VOLTAGE_SPIKE_WINDOW_MS  1000      // Ignore voltage changes < 1 sec
 #define SENSOR_ROLLING_AVG_SIZE  5         // Rolling average for all decisions

// EEPROM Configuration
#define EEPROM_SIZE              512
#define EEPROM_CONFIG_ADDR       0      // Start address for FarmConfig
#define EEPROM_MAGIC_ADDR        32     // Magic number address
#define EEPROM_SETTINGS_START    64     // Settings start after config data
#define EEPROM_ADV_SETTINGS_ADDR 128    // Advanced automation settings address

#define FARM_CONFIG_MAGIC        0x46524D43    // "FRMC" = Farm Config Magic
#define ADV_SETTINGS_MAGIC       0x41445653    // "ADVS" = Advanced Settings Magic

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
// 🆕 MODULE A: MINIMUM VENTILATION SETTINGS
// ═══════════════════════════════════════════════════════════════════════
struct MinVentSettings {
  bool enabled;
  float tempThreshold;          // Activate below this temp (°C)
  int cycleSeconds;             // Fan ON duration per cycle
  int intervalMinutes;          // Cycle interval
  bool ceilingFanAlwaysOn;      // Keep circulation fan on in min vent mode
};

MinVentSettings minVentSettings = {
  .enabled = true,
  .tempThreshold = 26.0,
  .cycleSeconds = 40,
  .intervalMinutes = 5,
  .ceilingFanAlwaysOn = true
};

// Minimum Ventilation State
bool minVentActive = false;
bool minVentInCycle = false;
unsigned long minVentCycleStart = 0;
unsigned long lastMinVentCycle = 0;

// ═══════════════════════════════════════════════════════════════════════
// 🆕 MODULE B: ENHANCED HEATER CONTROL SETTINGS
// ═══════════════════════════════════════════════════════════════════════
struct HeaterSettings {
  bool enabled;
  float layerOnTemp;            // Layer mode: heater ON below this
  float layerOffTemp;           // Layer mode: heater OFF above this
  float tolerance;              // Broiler mode: tolerance from target
  float safetyMaxTemp;          // FORCE OFF above this (safety)
};

HeaterSettings heaterSettings = {
  .enabled = true,
  .layerOnTemp = 20.0,
  .layerOffTemp = 24.0,
  .tolerance = 0.7,
  .safetyMaxTemp = 34.0
};

// 🔧 Broiler Temperature Curve for Heater (MUST match BROILER_CURVE for consistency)
const float HEATER_BROILER_CURVE[][2] = {
  {3, 33.5},    // Day 1-3: 33-34°C midpoint
  {7, 32.0},    // Day 4-7: 32°C
  {14, 30.0},   // Day 8-14: 30°C
  {21, 28.0},   // Day 15-21: 28°C
  {28, 26.0},   // Day 22-28: 26°C
  {35, 24.0},   // Day 29-35: 24°C
  {999, 22.5}   // Day 36+: 22-23°C midpoint
};
#define HEATER_CURVE_SIZE 7

// ═══════════════════════════════════════════════════════════════════════
// 🆕 MODULE C: INTELLIGENT FOGGER COOLING SETTINGS
// ═══════════════════════════════════════════════════════════════════════
struct FoggerSettings {
  bool enabled;
  float startTemp;              // Start fogger when temp >= this
  float startHumidityMax;       // Start only if humidity < this
  int onSeconds;                // Spray duration
  int pauseSeconds;             // Pause between sprays
  float stopTemp;               // Stop fogger when temp < this
  float stopHumidity;           // Stop fogger when humidity >= this
};

FoggerSettings foggerSettings = {
  .enabled = false,             // Default: disabled (needs solenoid valve)
  .startTemp = 32.0,
  .startHumidityMax = 85.0,
  .onSeconds = 40,
  .pauseSeconds = 120,
  .stopTemp = 30.0,
  .stopHumidity = 90.0
};

// Fogger State
bool foggerOn = false;
bool foggerActive = false;
bool foggerInSpray = false;
unsigned long foggerSprayStart = 0;
unsigned long foggerPauseStart = 0;
int foggerCycleCount = 0;

// ═══════════════════════════════════════════════════════════════════════
// 🆕 MODULE D: BROILER AIRFLOW GROWTH MODE SETTINGS
// ═══════════════════════════════════════════════════════════════════════
struct AirflowSettings {
  bool enabled;
  int earlyAgeDays;             // OFF before this age (chicks need warmth)
  int midAgeDays;               // Intermittent until this age
  int midOnSeconds;             // ON duration for mid-age
  int midIntervalMinutes;       // Interval for mid-age
  int nightOnSeconds;           // ON duration for night (21+ days)
  int nightIntervalMinutes;     // Interval for night (21+ days)
};

AirflowSettings airflowSettings = {
  .enabled = true,
  .earlyAgeDays = 10,
  .midAgeDays = 20,
  .midOnSeconds = 30,
  .midIntervalMinutes = 3,
  .nightOnSeconds = 60,
  .nightIntervalMinutes = 5
};

// Circulation Fan State
bool circulationFanOn = false;
bool airflowInCycle = false;
unsigned long airflowCycleStart = 0;
unsigned long lastAirflowCycle = 0;

// ═══════════════════════════════════════════════════════════════════════
// 🆕 MODULE E: LIGHTING SOFT CONTROL (PWM FADE)
// ═══════════════════════════════════════════════════════════════════════
#define LIGHT_PWM_CHANNEL 0
#define LIGHT_PWM_FREQ    5000
#define LIGHT_PWM_RESOLUTION 8

struct LightingFadeSettings {
  int fadeDurationMinutes;      // Fade duration (default: 10 min)
};

LightingFadeSettings lightingFadeSettings = {
  .fadeDurationMinutes = 10
};

// Fade state
int targetBrightness = 0;
unsigned long fadeStartTime = 0;
int fadeStartBrightness = 0;
bool fadeInProgress = false;
unsigned long lightManualOverrideTime = 0;  // When manual override was activated
const unsigned long LIGHT_MANUAL_OVERRIDE_TIMEOUT = 3600000; // 60 min timeout

// ═══════════════════════════════════════════════════════════════════════
// 🆕 MODULE F: CURTAIN ADVISORY (Cloud-synced, not controlled locally)
// ═══════════════════════════════════════════════════════════════════════
struct CurtainAdvisorySettings {
  bool enabled;
  float openTempDiff;           // Suggest open if outdoor temp > indoor + diff
  bool closeOnCold;             // Suggest close if too cold
};

CurtainAdvisorySettings curtainSettings = {
  .enabled = true,
  .openTempDiff = 3.0,
  .closeOnCold = true
};

// ═══════════════════════════════════════════════════════════════════════
// 🆕 MODULE G: WATER ANALYTICS SETTINGS (Enhanced)
// ═══════════════════════════════════════════════════════════════════════
struct WaterAnalyticsSettings {
  int dropThresholdPercent;     // Alert if drop > this %
  bool nightSpikeEnabled;       // Detect night spikes
  bool zeroFlowAlert;           // Alert on zero flow
  int baselineHours;            // Hours for baseline calculation
};

WaterAnalyticsSettings waterAnalyticsSettings = {
  .dropThresholdPercent = 30,
  .nightSpikeEnabled = true,
  .zeroFlowAlert = true,
  .baselineHours = 24
};

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
#define DHT2_PIN 15            // 🆕 Second DHT22 sensor (optional)
#define DHT_TYPE DHT22
#define MQ135_PIN 34
#define WATER_FLOW_PIN 27
// ═══════════════════════════════════════════════════════════════════════
// 🔌 RELAY PIN MAPPING (HW-316 4-Channel Relay - Active LOW)
// LOW = Relay ON, HIGH = Relay OFF
// ═══════════════════════════════════════════════════════════════════════
#define POWER_SENSE_PIN 35
#define FAN_RELAY_PIN 25       // IN1 → GPIO 25 (Main Exhaust Fan)
#define LIGHT_RELAY_PIN 26     // IN2 → GPIO 26 (Circulation/Ceiling Fan OR Light)
#define ALARM_RELAY_PIN 33     // IN3 → GPIO 33 (Heater Gas Brooder)
#define HEATER_RELAY_PIN 13    // IN4 → GPIO 13 (Fogger Solenoid Valve OR Heater)
#define STATUS_LED_PIN 2       // Onboard LED

// 🆕 Extended relay mapping for 7-module system
// Option 1: Use existing 4-channel relay with multiplexing
// Option 2: Add second 4-channel relay module
#define CIRCULATION_RELAY_PIN LIGHT_RELAY_PIN  // Share with light (or external)
#define FOGGER_RELAY_PIN HEATER_RELAY_PIN      // Share with heater (or external)

// Manual Override Buttons
#define MANUAL_OVERRIDE_BTN 32
#define MANUAL_FAN_BTN 14
#define MANUAL_ALARM_BTN 27  // Changed from 12 to avoid conflict

// ================ NETWORK CONFIGURATION ================
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* API_URL = "https://hbwfuvqrfgtefozajyfu.supabase.co/functions/v1/esp32-api";
const char* DEVICE_TOKEN = "YOUR_DEVICE_TOKEN";
const char* SHED_ID = "YOUR_SHED_ID";
const char* SHED_NAME = "Shed A";
const char* FARM_ID = "YOUR_FARM_ID";

// ═══════════════════════════════════════════════════════════════════════
// 🔑 NVS TOKEN STORAGE SYSTEM (OTA-Friendly Architecture)
// ═══════════════════════════════════════════════════════════════════════
// এই সিস্টেম দুইভাবে কাজ করে:
// 1. HARDCODED_TOKEN = true: Code Generator থেকে ডাউনলোড করা কোডে টোকেন হার্ডকোড থাকে
// 2. HARDCODED_TOKEN = false: NVS থেকে টোকেন পড়ে (OTA আপডেটে ব্যবহৃত)
// 
// OTA আপডেটের জন্য:
// - প্রথমবার Code Generator দিয়ে ফ্ল্যাশ করুন (টোকেন NVS-এ সেভ হবে)
// - পরবর্তী OTA আপডেটে টোকেন NVS থেকে পড়বে (হার্ডকোড লাগবে না)
// ═══════════════════════════════════════════════════════════════════════

#define USE_HARDCODED_TOKEN true   // Set to false for OTA-ready generic firmware

// NVS Keys for credential storage
#define NVS_NAMESPACE "credentials"
#define NVS_KEY_TOKEN "device_token"
#define NVS_KEY_WIFI_SSID "wifi_ssid"
#define NVS_KEY_WIFI_PASS "wifi_pass"
#define NVS_KEY_SHED_ID "shed_id"
#define NVS_KEY_SHED_NAME "shed_name"
#define NVS_KEY_FARM_ID "farm_id"
#define NVS_PROVISIONED_MAGIC 0x50524F56  // "PROV" = Provisioned Magic

// Runtime token (will be loaded from NVS or hardcoded)
String activeDeviceToken = "";
String activeWifiSSID = "";
String activeWifiPassword = "";
String activeShedId = "";
String activeShedName = "";
String activeFarmId = "";
bool nvsProvisioned = false;

// ================ TIMING CONSTANTS ================
const unsigned long CLOUD_SYNC_INTERVAL = 30000;      // 30 seconds
const unsigned long SENSOR_READ_INTERVAL = 5000;      // 5 seconds
const unsigned long WIFI_RECONNECT_INTERVAL = 60000;  // 1 minute
const unsigned long CLOUD_TIMEOUT = 300000;           // ⚠️ 5 MINUTES = LOCAL MODE
const unsigned long BOOT_FAN_DURATION = 20000;        // 20 sec air refresh
const unsigned long SENSOR_TIMEOUT = 15000;           // 15 sec sensor timeout
const unsigned long WATER_TIMEOUT = 21600000;         // 6 hours water timeout
const unsigned long COMMAND_CHECK_INTERVAL = 5000;    // ⚡ 5 seconds - REAL-TIME commands

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
// 🔧 THI formula: HSI = 0.8×T + (H/100)×(T-14.4) + 46.4
// At 27°C/85%: HSI≈78.7, At 30°C/70%: HSI≈81.3, At 33°C/80%: HSI≈87.7
const float LAYER_HSI_FAN_LOW = 75.0;     // Mild stress → Fan MEDIUM
const float LAYER_HSI_FAN_HIGH = 80.0;    // High stress → Fan HIGH
const float LAYER_HSI_EMERGENCY = 85.0;   // Emergency → Alarm + MAX ventilation

// --- BROILER THRESHOLDS ---
const float BROILER_TEMP_FAN_DEV = 2.0;      // +2°C → fan HIGH
const float BROILER_TEMP_HEATER_DEV = 2.0;   // -2°C → heater ON
const float BROILER_TEMP_ALARM_DEV = 4.0;    // +4°C → alarm
const float BROILER_HUMIDITY_LOW = 40.0;
const float BROILER_HUMIDITY_HIGH = 75.0;
const float BROILER_AMMONIA_FAN = 20.0;
const float BROILER_AMMONIA_ALARM = 30.0;
// 🔧 Broiler HSI thresholds (THI formula compatible)
const float BROILER_HSI_FAN_HIGH = 78.0;    // Fan HIGH
const float BROILER_HSI_EMERGENCY = 82.0;   // Alarm + MAX
const float BROILER_HSI_CRITICAL = 86.0;    // Critical emergency

// ═══════════════════════════════════════════════════════════════════════
// 💡 LIGHTING SCHEDULE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════
struct LightingSchedule {
  int startHour;          // Light ON time (hour)
  int startMinute;        // Light ON time (minute)
  int endHour;            // Light OFF time (hour)
  int endMinute;          // Light OFF time (minute)
  int fadeInMinutes;      // Gradual fade-in duration
  int fadeOutMinutes;     // Gradual fade-out duration
  int minBrightness;      // Minimum brightness (0-100)
  int maxBrightness;      // Maximum brightness (0-100)
  bool enabled;           // Schedule enabled
  bool manualOverride;    // Manual override active
};

LightingSchedule lightSchedule = {
  .startHour = 5,         // Default: 5:00 AM
  .startMinute = 0,
  .endHour = 21,          // Default: 9:00 PM
  .endMinute = 0,
  .fadeInMinutes = 30,    // 30 min sunrise simulation
  .fadeOutMinutes = 30,   // 30 min sunset simulation
  .minBrightness = 0,
  .maxBrightness = 100,
  .enabled = true,
  .manualOverride = false
};

int lightBrightness = 0;           // Current brightness (0-100)
int lightPWMValue = 0;             // Current PWM value (0-255)
unsigned long lastLightingCheck = 0;
const unsigned long LIGHTING_CHECK_INTERVAL = 10000;  // Check every 10 seconds

// Time tracking (from cloud or estimation)
int currentHour = 12;              // Current hour (0-23)
int currentMinute = 0;             // Current minute (0-59)
unsigned long lastTimeSync = 0;    // Last time sync from cloud
bool timeValid = false;            // Time has been synced from cloud

// Layer lighting protection
bool lightWasOn = false;
unsigned long lightOffStartTime = 0;
bool lightingAlertActive = false;
const unsigned long LIGHTING_ALERT_DELAY = 600000;  // 10 minutes

// ═══════════════════════════════════════════════════════════════════════
// 📋 FUNCTION PROTOTYPES (Required for Arduino C++)
// These must be declared before they are called
// ═══════════════════════════════════════════════════════════════════════
void loadLayerRules();
void loadBroilerRules();
void updateBroilerTempRules();
void saveFarmProfile();
void saveAgeTickTime();
void loadAgeTickTime();
void autoIncrementAge();
void getBroilerTargetTemp(int ageDays, float &minTemp, float &maxTemp);
void handleBroilerAgeIncrement();
void printFarmProfile();
void updateAge(int newAge);
void controlLighting();
void checkLayerLightingProtection();
void updateTimeFromCloud(int hour, int minute);
void estimateLocalTime();
void checkPendingCommands();       // ⚡ Real-time command polling
void acknowledgeCommand(String commandId);  // Mark command as executed

// 🆕 Module function prototypes
void checkMinimumVentilation();
void advancedHeaterControl();
void foggerControl();
void setFogger(bool on);
void startFoggerSpray();
void stopFogger(String reason);
void broilerAirflowControl();
void setCirculationFan(bool on);
void runIntermittentAirflow(int onSeconds, int intervalMinutes);
void updateLightingWithFade();
void setLightWithFade(int newBrightness);
float getHeaterTargetTemp(int ageDays);
void handleAdvancedAutomationSettings(JsonObject& adv);

// 🆕 OTA Update function prototypes
void checkOTAUpdate();
void performOTAUpdate(String firmwareUrl, int firmwareSize, String version);
void reportOTAProgress(int progress, String status, String version = "", String errorMsg = "");

// 🆕 NVS Token Storage function prototypes
void loadCredentialsFromNVS();
void saveCredentialsToNVS();
bool isNVSProvisioned();
void provisionFromHardcoded();
String getActiveToken();

// ================ OBJECTS ================
DHT dht(DHT_PIN, DHT_TYPE);
DHT dht2(DHT2_PIN, DHT_TYPE);  // 🆕 Second DHT22 sensor (optional)
Preferences preferences;

// 🆕 Dual DHT22 state
bool dht2Available = false;        // Whether second sensor responded at boot
float temperature2 = 0;           // Second sensor temperature (individual)
float humidity2 = 0;              // Second sensor humidity (individual)

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
unsigned long lastCommandCheck = 0;  // ⚡ Real-time command check timer
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
 
 // STABILIZING State
 bool stabilizingMode = true;         // True for first 30 seconds after boot
 unsigned long stabilizingEndTime = 0;
 
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
 
 // Sensor Sanity Filter State
 float lastValidAmmonia = 0;
 unsigned long lastAmmoniaTime = 0;
 float tempRollingBuffer[SENSOR_ROLLING_AVG_SIZE] = {0};
 float humRollingBuffer[SENSOR_ROLLING_AVG_SIZE] = {0};
 int sensorRollingIndex = 0;
 int sensorRollingCount = 0;

 // Power Sensor Filter
 float powerVoltageRMS = 230.0;
 unsigned long lowVoltageSince = 0;
 bool powerFailConfirmed = false;
unsigned long lastVoltageChangeTime = 0;
float lastVoltageRMS = 230.0;
 
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
 unsigned long lastAgeTickMillis = 0;          // Track local age increment time
 const unsigned long AGE_TICK_INTERVAL = 86400000UL;  // 24 hours in milliseconds
 bool otaInProgress = false;
 int otaProgress = 0;
 String otaStatus = "idle";
 String otaAvailableVersion = "";
 String otaPendingUrl = "";
 int otaPendingSize = 0;
 unsigned long lastOTACheck = 0;
 const unsigned long OTA_CHECK_INTERVAL = 3600000UL;  // Check every 1 hour
 String firmwareVersion = "5.2.0";  // Updated for 7-module system
  
 // ═══════════════════════════════════════════════════════════════════════
 // 💧 SMART WATER FLOW MONITORING
 // শুধুমাত্র সক্রিয় সময়ে (৫:০০-২২:০০) মনিটরিং
 // Rolling average এর সাথে তুলনা করে false alert প্রতিরোধ
 // ═══════════════════════════════════════════════════════════════════════
 #define WATER_HISTORY_SIZE      24        // 24-hour rolling history
 #define WATER_UPDATE_INTERVAL   3600000UL // 1 hour update interval
 #define WATER_DROP_THRESHOLD    0.20      // 20% drop = anomaly alert
 #define WATER_MIN_DATA_POINTS   6         // Minimum 6 hours data for comparison
#define WATER_2H_WINDOW_SIZE    2         // 2-hour comparison window
#define WATER_CONSECUTIVE_REQ   2         // Require 2 consecutive detection cycles
 
 float waterFlowHistory[WATER_HISTORY_SIZE] = {0};
 int waterHistoryIndex = 0;
 int waterHistoryCount = 0;
 float waterRollingAvg = 0;
float water2hAvg = 0;                     // Last 2 hours average
int waterAnomalyConsecutive = 0;          // Consecutive anomaly detection count
 unsigned long lastWaterHistoryUpdate = 0;
 bool waterAnomalyAlertSent = false;

// ═══════════════════════════════════════════════════════════════════════
// 🐔 BROILER AGE SOURCE TRACKING
// Track whether age came from local tick or server sync
// ═══════════════════════════════════════════════════════════════════════
String ageSource = "LOCAL";                // "LOCAL" or "SERVER"
unsigned long lastServerAgeSyncTime = 0;   // Unix timestamp of last server sync
int lastServerSyncedAge = 0;               // Last age value from server
unsigned long lastAgeSyncMillis = 0;       // Millis timestamp of last server sync
unsigned long lastAgeIncreaseMillis = 0;   // Millis timestamp of last age increment
bool ageFromServer = false;                // True if current age came from server

// ═══════════════════════════════════════════════════════════════════════
// 🆕 ADVANCED AUTOMATION SETTINGS VERSION (for cloud sync)
// ═══════════════════════════════════════════════════════════════════════
int cachedSettingsVersion = 0;

// ═══════════════════════════════════════════════════════════════════════
// 🐔 UPDATE AGE FROM SERVER
// Called when cloud sends broiler_age_days - never decreases age!
// ═══════════════════════════════════════════════════════════════════════
void updateAgeFromServer(int newAge) {
  if (!isBroiler()) return;
  
  // NEVER decrease age - only accept if >= current
  if (newAge > 0 && newAge >= farmConfig.chickAgeDays) {
    if (newAge != farmConfig.chickAgeDays) {
      Serial.printf("\n🐔 AGE SERVER SYNC: Day %d → Day %d\n", farmConfig.chickAgeDays, newAge);
      farmConfig.chickAgeDays = newAge;
      loadBroilerRules();  // Reload temperature rules for new age
    }
    // Update all tracking variables
    ageFromServer = true;
    ageSource = "SERVER";
    lastAgeSyncMillis = millis();
    lastAgeIncreaseMillis = millis();
    lastServerAgeSyncTime = millis() / 1000;  // Unix-style seconds
    lastServerSyncedAge = newAge;
    saveFarmProfile();
    
    Serial.printf("✓ Age synced from server: Day %d (source: SERVER)\n", newAge);
  } else if (newAge > 0 && newAge < farmConfig.chickAgeDays) {
    Serial.printf("⚠️ Server age (%d) < Local age (%d) - IGNORED (never decrease!)\n", 
                  newAge, farmConfig.chickAgeDays);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 📦 ENHANCED OFFLINE DATA BUFFER
// অফলাইন থাকা অবস্থায় ৫০টি রেকর্ড সংরক্ষণ
// পুনরায় সংযোগ হলে ক্লাউডে সিঙ্ক করে
// ═══════════════════════════════════════════════════════════════════════
#define OFFLINE_BUFFER_MAX       50        // Maximum records to store
#define OFFLINE_SYNC_BATCH_SIZE  10        // Records per sync batch

struct OfflineRecord {
  unsigned long timestamp;   // Millis when recorded
  float temperature;
  float humidity;
  float ammonia;
  float waterFlow;
  float hsi;
  bool powerOn;
  String fanSpeed;
  String systemState;
};

OfflineRecord offlineRecords[OFFLINE_BUFFER_MAX];
int offlineRecordHead = 0;          // Next write position (circular)
int offlineRecordTail = 0;          // Next read position for sync
int offlineRecordCount = 0;         // Current count
bool offlineSyncInProgress = false;
unsigned long lastOfflineStore = 0;
const unsigned long OFFLINE_STORE_INTERVAL = 60000;  // Store every 1 minute
 
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

// Auto-increment age daily (called every 24 hours)
void autoIncrementAge() {
  if (!isBroiler()) return;
  
  farmConfig.chickAgeDays++;
  Serial.printf("\n📅 AUTO AGE INCREMENT: Day %d\n", farmConfig.chickAgeDays);
  
  saveFarmProfile();
  saveAgeTickTime();  // Persist to EEPROM
  loadBroilerRules();
}

// ═══════════════════════════════════════════════════════════════════════
// 🐔 BROILER AGE OFFLINE TRACKING
// Internet গেলেও temperature curve ঠিক থাকবে
// প্রতি ২৪ ঘণ্টায় স্বয়ংক্রিয়ভাবে বয়স বাড়বে (EEPROM-এ সেভ থাকে)
// ═══════════════════════════════════════════════════════════════════════

void loadAgeTickTime() {
  preferences.begin("age_track", true);  // Read-only
  lastAgeTickMillis = preferences.getULong("lastTick", 0);
  preferences.end();
  
  if (lastAgeTickMillis == 0) {
    // First time or EEPROM cleared - start from now
    lastAgeTickMillis = millis();
    saveAgeTickTime();
    Serial.println("📅 Age tracking initialized");
  } else {
    Serial.printf("📅 Last age tick loaded: %lu ms ago\n", millis() - lastAgeTickMillis);
  }
}

void saveAgeTickTime() {
  preferences.begin("age_track", false);  // Read-write
  preferences.putULong("lastTick", millis());
  preferences.end();
}

// ═══════════════════════════════════════════════════════════════════════
// 🆕 MODULE F: HANDLE OFFLINE AGE - Local 24h increment (ENHANCED)
// Works without internet - temperature curve never freezes!
// ═══════════════════════════════════════════════════════════════════════
void handleOfflineAge() {
  if (!isBroiler()) return;
  
  const unsigned long DAY = 86400000UL;  // 24 hours in milliseconds
  
  // Handle millis() overflow (every ~49 days) 
  if (millis() < lastAgeIncreaseMillis) {
    lastAgeIncreaseMillis = millis();  // Reset on overflow
    Serial.println("📅 Millis overflow - resetting age tick timer");
  }
  
  if (millis() - lastAgeIncreaseMillis >= DAY) {
    // 24 hours passed - increment age
    int oldAge = farmConfig.chickAgeDays;
    farmConfig.chickAgeDays++;
    lastAgeIncreaseMillis = millis();
    ageSource = "LOCAL";  // Mark as local increment
    
    Serial.printf("\n╔═══════════════════════════════════════════════════════════════╗\n");
    Serial.printf("║  📅 OFFLINE AGE INCREMENT: Day %d → Day %d (LOCAL)            ║\n", 
                  oldAge, farmConfig.chickAgeDays);
    Serial.printf("╚═══════════════════════════════════════════════════════════════╝\n");
    
    saveFarmProfile();
    saveAgeTickTime();
    loadBroilerRules();
  }
}

// Check if 24 hours passed and auto-increment age
// Works even when offline - no internet required!
void ageTick() {
  handleOfflineAge();
}

// ═══════════════════════════════════════════════════════════════════════
// LOAD RULES FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

void loadLayerRules() {
  Serial.println("📋 Loading LAYER rules...");
  
  // Temperature thresholds (fixed for layers)
  rules.tempMin = LAYER_TEMP_IDEAL_MIN;                                 // 18°C
  rules.tempMax = LAYER_TEMP_IDEAL_MAX;                                 // 27°C
  rules.tempTarget = (rules.tempMin + rules.tempMax) / 2.0;             // 22.5°C
  rules.tempFanHigh = LAYER_TEMP_FAN_HIGH;                              // 30°C
  rules.tempAlarm = LAYER_TEMP_ALARM;                                   // 33°C
  rules.tempHeaterOn = LAYER_TEMP_HEATER;                               // 18°C
  
  // HSI thresholds
  rules.hsiFanLow = LAYER_HSI_FAN_LOW;                                  // 75
  rules.hsiFanHigh = LAYER_HSI_FAN_HIGH;                                // 80
  rules.hsiEmergency = LAYER_HSI_EMERGENCY;                             // 85
  rules.hsiCritical = 90;                                               // Critical for layer
  
  // Ammonia
  rules.ammoniaFan = LAYER_AMMONIA_FAN;                                 // 15 ppm
  rules.ammoniaAlarm = LAYER_AMMONIA_ALARM;                             // 25 ppm
  
  // Humidity
  rules.humidityLow = LAYER_HUMIDITY_LOW;                               // 40%
  rules.humidityHigh = LAYER_HUMIDITY_HIGH;                             // 75%
  
  // Feature flags
  rules.useAgeBasedTemp = false;                                        // Fixed temp
  rules.lightingProtection = true;                                      // 10min beep
  
  Serial.println("   ✓ LAYER rules loaded:");
  Serial.printf("     Temp: %.0f-%.0f°C (fixed)\n", rules.tempMin, rules.tempMax);
  Serial.printf("     HSI: %.0f/%.0f/%.0f\n", rules.hsiFanLow, rules.hsiFanHigh, rules.hsiEmergency);
  Serial.printf("     NH3: %.0f/%.0f ppm\n", rules.ammoniaFan, rules.ammoniaAlarm);
}

void loadBroilerRules() {
  Serial.println("📋 Loading BROILER rules...");
  
  // Get age-based temperature from curve
  float tMin, tMax;
  getBroilerTargetTemp(farmConfig.chickAgeDays, tMin, tMax);
  
  rules.tempMin = tMin;
  rules.tempMax = tMax;
  rules.tempTarget = (tMin + tMax) / 2.0;
  rules.tempFanHigh = rules.tempTarget + BROILER_TEMP_FAN_DEV;          // +2°C
  rules.tempAlarm = rules.tempTarget + BROILER_TEMP_ALARM_DEV;          // +4°C
  rules.tempHeaterOn = rules.tempTarget - BROILER_TEMP_HEATER_DEV;      // -2°C
  
  // HSI thresholds (higher tolerance for broilers)
  rules.hsiFanLow = 75;                                           // Mild
  rules.hsiFanHigh = BROILER_HSI_FAN_HIGH;                        // 78
  rules.hsiEmergency = BROILER_HSI_EMERGENCY;                     // 82
  rules.hsiCritical = BROILER_HSI_CRITICAL;                       // 86
  
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

// ═══════════════════════════════════════════════════════════════════════
// 🆕 MODULE B: GET HEATER TARGET TEMP (Broiler Age-Based Curve)
// ═══════════════════════════════════════════════════════════════════════
float getHeaterTargetTemp(int ageDays) {
  for (int i = 0; i < HEATER_CURVE_SIZE; i++) {
    if (ageDays <= HEATER_BROILER_CURVE[i][0]) {
      return HEATER_BROILER_CURVE[i][1];
    }
  }
  return 22.0;  // Default for very old broilers
}

// ================ HSI CALCULATION ================
float calculateHSI(float temp, float hum) {
  // HSI = 0.8 × Temp + (Humidity/100) × (Temp - 14.4) + 46.4
  return 0.8 * temp + (hum / 100.0) * (temp - 14.4) + 46.4;
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
   stabilizingMode = true;
   stabilizingEndTime = safeModeEndTime;
   systemState = "STABILIZING";
   Serial.println("\n🛡️ STABILIZING MODE (30s) - Fan ON, Commands IGNORED, No Alerts");
   pinMode(FAN_RELAY_PIN, OUTPUT);
   digitalWrite(FAN_RELAY_PIN, LOW);  // Active LOW - ON
   fanOn = true;
   fanSpeed = "HIGH";
   delay(BOOT_VENTILATION_DELAY);
 }
 
 void checkSafeModeExit() {
   unsigned long now = millis();
   
   // Check stabilizing mode exit (applies to both safe mode and normal boot)
   if (stabilizingMode && now >= stabilizingEndTime) {
     stabilizingMode = false;
     Serial.println("✅ STABILIZING complete → Normal operation");
   }
   
   if (safeModeActive && now >= safeModeEndTime) {
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

void updateOnlineOfflineDuration() {
  unsigned long now = millis();
  unsigned long elapsed = (now - lastOnlineCheck) / 1000;
  
  if (cloudConnected) {
    onlineDurationSec += elapsed;
  } else {
    offlineDurationSec += elapsed;
  }
  
  lastOnlineCheck = now;
}
 
// ═══════════════════════════════════════════════════════════════════════
// 🛡️ SENSOR SANITY FILTER FUNCTIONS
// Reject impossible readings, use rolling average for all decisions
// ═══════════════════════════════════════════════════════════════════════

// Check if temperature reading is within sane range
bool isTempSane(float temp) {
  return !isnan(temp) && temp >= TEMP_SANITY_MIN && temp <= TEMP_SANITY_MAX;
}

// Check if humidity reading is within sane range
bool isHumiditySane(float hum) {
  return !isnan(hum) && hum >= HUMIDITY_SANITY_MIN && hum <= HUMIDITY_SANITY_MAX;
}

// Check for sudden ammonia spike (>50% change in 2 seconds)
bool isAmmoniaSpikeDetected(float newReading) {
  unsigned long now = millis();
  
  // First reading - no comparison possible
  if (lastAmmoniaTime == 0) {
    lastValidAmmonia = newReading;
    lastAmmoniaTime = now;
    return false;
  }
  
  // Check time window
  if (now - lastAmmoniaTime < AMMONIA_JUMP_WINDOW_MS) {
    // Within 2 second window - check for spike
    if (lastValidAmmonia > 0) {
      float changePercent = abs(newReading - lastValidAmmonia) / lastValidAmmonia;
      if (changePercent > AMMONIA_JUMP_THRESHOLD) {
        Serial.printf("⚠️ AMMONIA SPIKE REJECTED: %.1f → %.1f (%.0f%% change in <2s)\n", 
                      lastValidAmmonia, newReading, changePercent * 100);
        return true;  // Spike detected - reject reading
      }
    }
  }
  
  // Valid reading - update last known values
  lastValidAmmonia = newReading;
  lastAmmoniaTime = now;
  return false;
}

// Check for voltage spike (change <1 second)
bool isVoltageSpikeDetected(float newVoltage) {
  unsigned long now = millis();
  
  // Calculate voltage change
  float voltageChange = abs(newVoltage - lastVoltageRMS);
  
  // If significant change happened too fast, reject it
  if (voltageChange > 20 && (now - lastVoltageChangeTime) < VOLTAGE_SPIKE_WINDOW_MS) {
    Serial.printf("⚠️ VOLTAGE SPIKE REJECTED: %.1fV → %.1fV (<1 sec)\n", 
                  lastVoltageRMS, newVoltage);
    return true;
  }
  
  // Valid change - update tracking
  if (voltageChange > 5) {
    lastVoltageChangeTime = now;
  }
  lastVoltageRMS = newVoltage;
  
  return false;
}

// Add to rolling average buffer and return averaged value
float addToTempRollingAvg(float newValue) {
  if (!isTempSane(newValue)) {
    Serial.printf("⚠️ TEMP REJECTED (sanity): %.1f°C\n", newValue);
    // Return last valid average if we have data
    if (sensorRollingCount > 0) {
      float sum = 0;
      for (int i = 0; i < sensorRollingCount; i++) sum += tempRollingBuffer[i];
      return sum / sensorRollingCount;
    }
    return NAN;
  }
  
  tempRollingBuffer[sensorRollingIndex] = newValue;
  if (sensorRollingCount < SENSOR_ROLLING_AVG_SIZE) sensorRollingCount++;
  
  float sum = 0;
  for (int i = 0; i < sensorRollingCount; i++) sum += tempRollingBuffer[i];
  return sum / sensorRollingCount;
}

float addToHumRollingAvg(float newValue) {
  if (!isHumiditySane(newValue)) {
    Serial.printf("⚠️ HUMIDITY REJECTED (sanity): %.1f%%\n", newValue);
    // Return last valid average if we have data
    if (sensorRollingCount > 0) {
      float sum = 0;
      for (int i = 0; i < sensorRollingCount; i++) sum += humRollingBuffer[i];
      return sum / sensorRollingCount;
    }
    return NAN;
  }
  
  humRollingBuffer[sensorRollingIndex] = newValue;
  
  float sum = 0;
  for (int i = 0; i < sensorRollingCount; i++) sum += humRollingBuffer[i];
  return sum / sensorRollingCount;
}

void advanceSensorRollingIndex() {
  sensorRollingIndex = (sensorRollingIndex + 1) % SENSOR_ROLLING_AVG_SIZE;
}

 // ═══════════════════════════════════════════════════════════════════════
 // 🌡️ DHT22 DUAL SENSOR FILTERED READINGS (3-sample average + WDT safe)
 // দুটি DHT22 থেকে গড় রিডিং নেয়। দ্বিতীয়টি না থাকলে শুধু প্রথমটি ব্যবহার হয়।
 // ═══════════════════════════════════════════════════════════════════════
 
 float readSingleDHTTemp(DHT &sensor) {
   float sum = 0;
   int validCount = 0;
   for (int i = 0; i < 3; i++) {
     esp_task_wdt_reset();
     float t = sensor.readTemperature();
     if (!isnan(t) && t >= TEMP_SANITY_MIN && t <= TEMP_SANITY_MAX) {
       sum += t;
       validCount++;
     }
     delay(300);
   }
   return (validCount > 0) ? sum / validCount : NAN;
 }
 
 float readSingleDHTHum(DHT &sensor) {
   float sum = 0;
   int validCount = 0;
   for (int i = 0; i < 3; i++) {
     esp_task_wdt_reset();
     float h = sensor.readHumidity();
     if (!isnan(h) && h >= HUMIDITY_SANITY_MIN && h <= HUMIDITY_SANITY_MAX) {
       sum += h;
       validCount++;
     }
     delay(300);
   }
   return (validCount > 0) ? sum / validCount : NAN;
 }
 
 float readTempFiltered() {
   float avg1 = readSingleDHTTemp(dht);
   float avg2 = NAN;
   
   if (dht2Available) {
     avg2 = readSingleDHTTemp(dht2);
     if (!isnan(avg2)) temperature2 = avg2;
   }
   
   // Average both if available, fallback to whichever works
   if (!isnan(avg1) && !isnan(avg2)) return (avg1 + avg2) / 2.0;
   if (!isnan(avg1)) return avg1;
   if (!isnan(avg2)) return avg2;
   return NAN;
 }
 
 float readHumidityFiltered() {
   float avg1 = readSingleDHTHum(dht);
   float avg2 = NAN;
   
   if (dht2Available) {
     avg2 = readSingleDHTHum(dht2);
     if (!isnan(avg2)) humidity2 = avg2;
   }
   
   // Average both if available, fallback to whichever works
   if (!isnan(avg1) && !isnan(avg2)) return (avg1 + avg2) / 2.0;
   if (!isnan(avg1)) return avg1;
   if (!isnan(avg2)) return avg2;
   return NAN;
 }
 
 // ═══════════════════════════════════════════════════════════════════════
 // 🧪 MQ137 FILTERED READING (10-sample average + warmup check)
 // ═══════════════════════════════════════════════════════════════════════
 
 bool gasReady() {
   return millis() - gasWarmupStart > GAS_WARMUP_DURATION;
 }
 
 float readGasFiltered() {
   if (!gasReady()) {
     return 0;
   }
 
   float total = 0;
   for (int i = 0; i < 10; i++) {
     total += analogRead(MQ135_PIN);
     esp_task_wdt_reset();
     delay(50);
   }
   return total / 10.0;
 }
 
 float calculateAmmoniaMovingAvg(float newReading) {
   // Check for spike first
   if (isAmmoniaSpikeDetected(newReading)) {
     return ammoniaAvg10;  // Return previous average, reject spike
   }
   
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
   float newVoltage = readPowerVoltageRMS();
   
   // Check for voltage spike
   if (isVoltageSpikeDetected(newVoltage)) {
     return powerFailConfirmed;  // Return previous state, ignore spike
   }
   
   powerVoltageRMS = newVoltage;
   bool lowVoltage = newVoltage < 180.0;
   if (lowVoltage) {
     if (lowVoltageSince == 0) {
       lowVoltageSince = millis();
     } else if (millis() - lowVoltageSince > POWER_PERSIST_DURATION) {
       powerFailConfirmed = true;
       return true;
     }
   } else {
     lowVoltageSince = 0;
     powerFailConfirmed = false;
   }
   return false;
 }

// ═══════════════════════════════════════════════════════════════════════
// 💧 WATER FLOW MONITORING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

void calculateWaterFlow() {
  static unsigned long lastCalc = 0;
  static unsigned long lastPulseCount = 0;
  
  unsigned long now = millis();
  if (now - lastCalc < 1000) return;  // Calculate every second
  
  unsigned long pulses = waterPulseCount - lastPulseCount;
  lastPulseCount = waterPulseCount;
  
  // YF-S201: 450 pulses/liter
  waterFlow = (pulses / 450.0) * 60.0;  // Liters per minute
  lastCalc = now;
}

void updateWaterRollingAverage() {
  if (waterHistoryCount < WATER_HISTORY_SIZE) {
    waterHistoryCount++;
  }
  
  // Calculate 24h rolling average
  float sum = 0;
  for (int i = 0; i < waterHistoryCount; i++) {
    sum += waterFlowHistory[i];
  }
  waterRollingAvg = waterHistoryCount > 0 ? sum / waterHistoryCount : 0;
  
  // Calculate last 2 hours average
  float sum2h = 0;
  int count2h = min(WATER_2H_WINDOW_SIZE, waterHistoryCount);
  for (int i = 0; i < count2h; i++) {
    int idx = (waterHistoryIndex - 1 - i + WATER_HISTORY_SIZE) % WATER_HISTORY_SIZE;
    sum2h += waterFlowHistory[idx];
  }
  water2hAvg = count2h > 0 ? sum2h / count2h : 0;
}

void waterHealthAlert() {
  waterAnomalyAlertSent = true;
  float dropPercent = ((waterRollingAvg - water2hAvg) / waterRollingAvg) * 100;
  
  Serial.printf("\n╔═══════════════════════════════════════════════════════════════╗\n");
  Serial.printf("║  💧 WATER ANOMALY ALERT: %.0f%% drop detected!                 ║\n", dropPercent);
  Serial.printf("║     2h avg: %.1f L/h, 24h avg: %.1f L/h                       ║\n", water2hAvg, waterRollingAvg);
  Serial.printf("╚═══════════════════════════════════════════════════════════════╝\n");
  
  // Short beep to alert
  digitalWrite(ALARM_RELAY_PIN, LOW);   // ON
  delay(200);
  digitalWrite(ALARM_RELAY_PIN, HIGH);  // OFF
}

void checkWaterAnomaly() {
  // Only check during active hours (5:00 - 22:00)
  if (currentHour < 5 || currentHour >= 22) {
    return;
  }
  
  // Need minimum data points for meaningful comparison
  if (waterHistoryCount < WATER_MIN_DATA_POINTS) {
    return;
  }
  
  // Calculate drop threshold
  float threshold = waterRollingAvg * (1.0 - (waterAnalyticsSettings.dropThresholdPercent / 100.0));
  
  if (waterRollingAvg > 0 && water2hAvg < threshold) {
    // Anomaly detected - increment counter
    waterAnomalyConsecutive++;
    
    // Second check passed - trigger alert
    if (waterAnomalyConsecutive >= WATER_CONSECUTIVE_REQ && !waterAnomalyAlertSent) {
      waterHealthAlert();
    }
  } else {
    // Normal water consumption - reset counters
    waterAnomalyConsecutive = 0;
    waterAnomalyAlertSent = false;
  }
}
 
// Main water flow monitoring tick (called in loop)
void waterFlowTick() {
  unsigned long now = millis();
  
  // Update flow reading continuously
  calculateWaterFlow();
  
  // Update hourly history
  if (now - lastWaterHistoryUpdate >= WATER_UPDATE_INTERVAL) {
    // Store current hour's flow in history
    waterFlowHistory[waterHistoryIndex] = waterFlow;
    waterHistoryIndex = (waterHistoryIndex + 1) % WATER_HISTORY_SIZE;
    
    // Recalculate rolling average
    updateWaterRollingAverage();
    
    lastWaterHistoryUpdate = now;
  }
  
  // Check for anomalies during active hours
  checkWaterAnomaly();
}

// ═══════════════════════════════════════════════════════════════════════
// 📦 OFFLINE BUFFER FUNCTIONS
// Store sensor data when offline, sync when reconnected
// ═══════════════════════════════════════════════════════════════════════

void storeOfflineRecord() {
  if (offlineRecordCount >= OFFLINE_BUFFER_MAX) {
    // Buffer full - overwrite oldest (circular)
    offlineRecordTail = (offlineRecordTail + 1) % OFFLINE_BUFFER_MAX;
  } else {
    offlineRecordCount++;
  }
  
  OfflineRecord record;
  record.timestamp = millis() / 1000;  // Seconds since boot
  record.temperature = temperature;
  record.humidity = humidity;
  record.ammonia = ammonia;
  record.waterFlow = waterFlow;
  record.hsi = currentHSI;
  record.powerOn = powerOn;
  record.fanSpeed = fanSpeed;
  record.systemState = systemState;
  
  offlineRecords[offlineRecordHead] = record;
  offlineRecordHead = (offlineRecordHead + 1) % OFFLINE_BUFFER_MAX;
}

void offlineBufferTick() {
  unsigned long now = millis();
  
  // Store data periodically when offline
  if (!cloudConnected && now - lastOfflineStore >= OFFLINE_STORE_INTERVAL) {
    storeOfflineRecord();
    lastOfflineStore = now;
  }
}

// Sync buffered data to cloud (called after reconnection)
bool syncOfflineBuffer() {
  if (offlineRecordCount == 0) {
    return true;
  }
  
  if (!wifiConnected || offlineSyncInProgress) return false;
  
  offlineSyncInProgress = true;
  
  HTTPClient http;
  String url = String(API_URL) + "/sync-buffer";
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-token", activeDeviceToken.c_str());
  http.setTimeout(30000);  // Longer timeout for batch sync
  
  // Build batch of records
  StaticJsonDocument<4096> doc;
  JsonArray records = doc.createNestedArray("records");
  
  int syncCount = min(offlineRecordCount, OFFLINE_SYNC_BATCH_SIZE);
  
  for (int i = 0; i < syncCount; i++) {
    int idx = (offlineRecordTail + i) % OFFLINE_BUFFER_MAX;
    OfflineRecord& rec = offlineRecords[idx];
    
    JsonObject r = records.createNestedObject();
    r["timestamp_offset"] = rec.timestamp;
    r["temperature"] = rec.temperature;
    r["humidity"] = rec.humidity;
    r["ammonia"] = rec.ammonia;
    r["water_flow"] = rec.waterFlow;
    r["hsi"] = rec.hsi;
    r["power_on"] = rec.powerOn;
    r["fan_speed"] = rec.fanSpeed;
    r["system_state"] = rec.systemState;
  }
  
  doc["device_token"] = DEVICE_TOKEN;
  doc["shed_id"] = SHED_ID;
  doc["farm_type"] = getFarmTypeStr();
  doc["total_buffered"] = offlineRecordCount;
  
  String payload;
  serializeJson(doc, payload);
  
  int httpCode = http.POST(payload);
  
  if (httpCode == 200) {
    // Remove synced records from buffer
    offlineRecordTail = (offlineRecordTail + syncCount) % OFFLINE_BUFFER_MAX;
    offlineRecordCount -= syncCount;
    
    offlineSyncInProgress = false;
    
    // If more records, schedule another sync
    if (offlineRecordCount > 0) {
      return false;  // Indicate more work needed
    }
    
    return true;  // All done
  } else {
    offlineSyncInProgress = false;
    http.end();  // 🔧 Moved before return to prevent memory leak
    return false;
  }
}

void clearOfflineBuffer() {
  offlineRecordHead = 0;
  offlineRecordTail = 0;
  offlineRecordCount = 0;
}
 
// ═══════════════════════════════════════════════════════════════════════
// 🔌 DEVICE CONTROL FUNCTIONS
// HW-316 Relay Module: Active LOW (LOW = ON, HIGH = OFF)
// ═══════════════════════════════════════════════════════════════════════
void setFanState(bool on, String speed) {
  fanOn = on;
  fanSpeed = speed;
  digitalWrite(FAN_RELAY_PIN, on ? LOW : HIGH);  // Active LOW
  Serial.printf("🌀 Fan: %s (%s)\n", on ? "ON" : "OFF", speed.c_str());
}

void setLight(bool on) {
  lightOn = on;
  digitalWrite(LIGHT_RELAY_PIN, on ? LOW : HIGH);  // Active LOW
  Serial.printf("💡 Light: %s\n", on ? "ON" : "OFF");
}

void setLightBrightness(int brightness) {
  lightBrightness = constrain(brightness, 0, 100);
  lightPWMValue = map(lightBrightness, 0, 100, 0, 255);
  
  // For PWM dimming (if using LEDC):
  // ledcWrite(LIGHT_PWM_CHANNEL, lightPWMValue);
  
  // For relay (ON/OFF only):
  bool shouldBeOn = (lightBrightness > 0);
  if (shouldBeOn != lightOn) {
    setLight(shouldBeOn);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 🆕 MODULE E: LIGHTING SOFT CONTROL (PWM FADE - 10 MINUTE)
// ═══════════════════════════════════════════════════════════════════════
void updateLightingWithFade() {
  if (!fadeInProgress) return;
  
  // 🔧 FIX: Skip fade if manual override is active (user sent ON/OFF command)
  if (lightSchedule.manualOverride || localManualOverride) {
    fadeInProgress = false;
    return;
  }
  
  unsigned long fadeDurationMs = lightingFadeSettings.fadeDurationMinutes * 60000UL;
  unsigned long elapsed = millis() - fadeStartTime;
  
  if (elapsed >= fadeDurationMs) {
    // Fade complete
    lightBrightness = targetBrightness;
    fadeInProgress = false;
    Serial.printf("💡 Fade complete: brightness = %d%%\n", lightBrightness);
  } else {
    // Calculate current brightness
    float progress = (float)elapsed / fadeDurationMs;
    int diff = targetBrightness - fadeStartBrightness;
    lightBrightness = fadeStartBrightness + (int)(diff * progress);
  }
  
  // Apply PWM (if using LEDC channel)
  int pwmValue = map(lightBrightness, 0, 100, 0, 255);
  // ledcWrite(LIGHT_PWM_CHANNEL, pwmValue);
  
  // For relay mode: switch at 50% threshold
  bool shouldBeOn = (lightBrightness >= 50);
  if (shouldBeOn != lightOn) {
    setLight(shouldBeOn);
  }
}

void setLightWithFade(int newBrightness) {
  if (newBrightness == lightBrightness && !fadeInProgress) return;
  
  targetBrightness = constrain(newBrightness, 0, 100);
  fadeStartBrightness = lightBrightness;
  fadeStartTime = millis();
  fadeInProgress = true;
  
  Serial.printf("💡 Light fading: %d%% → %d%% (%d min)\n", 
                fadeStartBrightness, targetBrightness, lightingFadeSettings.fadeDurationMinutes);
}

// ═══════════════════════════════════════════════════════════════════════
// 💡 LIGHTING SCHEDULE CONTROL
// Cloud থেকে শিডিউল আসে, ESP32 লোকালি এক্সিকিউট করে
// ═══════════════════════════════════════════════════════════════════════

void updateTimeFromCloud(int hour, int minute) {
  currentHour = hour;
  currentMinute = minute;
  lastTimeSync = millis();
  timeValid = true;
}

void estimateLocalTime() {
  // If no time sync, estimate based on uptime
  if (!timeValid) {
    unsigned long uptimeMinutes = millis() / 60000;
    int estimatedMinutes = (12 * 60 + uptimeMinutes) % 1440;  // 1440 = 24*60
    currentHour = estimatedMinutes / 60;
    currentMinute = estimatedMinutes % 60;
  } else {
    // Update time based on millis since last sync
    unsigned long timeSinceSync = millis() - lastTimeSync;
    unsigned long minutesSinceSync = timeSinceSync / 60000;
    
    int totalMinutes = (currentHour * 60 + currentMinute + minutesSinceSync) % 1440;
    currentHour = totalMinutes / 60;
    currentMinute = totalMinutes % 60;
  }
}

void controlLighting() {
  // Skip if manual override is active (with 60-min auto-expire)
  if (lightSchedule.manualOverride || localManualOverride) {
    // Auto-expire light manual override after timeout
    if (lightSchedule.manualOverride && lightManualOverrideTime > 0 &&
        (millis() - lightManualOverrideTime >= LIGHT_MANUAL_OVERRIDE_TIMEOUT)) {
      lightSchedule.manualOverride = false;
      lightManualOverrideTime = 0;
      Serial.println("💡 Light manual override expired → back to schedule");
    } else {
      return;
    }
  }
  
  // Skip if schedule is disabled
  if (!lightSchedule.enabled) {
    return;
  }
  
  // Update local time estimation
  estimateLocalTime();
  
  // Calculate current time in minutes
  int currentMinutes = currentHour * 60 + currentMinute;
  int startMinutes = lightSchedule.startHour * 60 + lightSchedule.startMinute;
  int endMinutes = lightSchedule.endHour * 60 + lightSchedule.endMinute;
  
  bool shouldLightOn = false;
  int scheduledBrightness = 0;
  
  // Handle overnight schedules (e.g., 22:00 - 05:00)
  bool isOvernight = (endMinutes < startMinutes);
  
  if (isOvernight) {
    shouldLightOn = (currentMinutes >= startMinutes || currentMinutes <= endMinutes);
  } else {
    shouldLightOn = (currentMinutes >= startMinutes && currentMinutes <= endMinutes);
  }
  
  if (shouldLightOn) {
    // Calculate minutes from start and to end
    int minutesFromStart, minutesToEnd;
    
    if (isOvernight) {
      if (currentMinutes >= startMinutes) {
        minutesFromStart = currentMinutes - startMinutes;
        minutesToEnd = (1440 - currentMinutes) + endMinutes;
      } else {
        minutesFromStart = (1440 - startMinutes) + currentMinutes;
        minutesToEnd = endMinutes - currentMinutes;
      }
    } else {
      minutesFromStart = currentMinutes - startMinutes;
      minutesToEnd = endMinutes - currentMinutes;
    }
    
    // Calculate brightness with fade in/out
    if (minutesFromStart < lightSchedule.fadeInMinutes) {
      // Fade in (sunrise simulation)
      scheduledBrightness = map(minutesFromStart, 0, lightSchedule.fadeInMinutes,
                             lightSchedule.minBrightness, lightSchedule.maxBrightness);
    } else if (minutesToEnd < lightSchedule.fadeOutMinutes) {
      // Fade out (sunset simulation)
      scheduledBrightness = map(minutesToEnd, 0, lightSchedule.fadeOutMinutes,
                             lightSchedule.minBrightness, lightSchedule.maxBrightness);
    } else {
      // Full brightness
      scheduledBrightness = lightSchedule.maxBrightness;
    }
  } else {
    scheduledBrightness = 0;
  }
  
  // Apply lighting change with soft fade
  if (scheduledBrightness != targetBrightness && !fadeInProgress) {
    setLightWithFade(scheduledBrightness);
  }
}

void checkLayerLightingProtection() {
  // Only for LAYER farms
  if (!isLayer()) return;
  
  unsigned long now = millis();
  
  // Track light state changes
  if (lightOn && !lightWasOn) {
    lightWasOn = true;
    lightOffStartTime = 0;
    lightingAlertActive = false;
  } 
  else if (!lightOn && lightWasOn) {
    lightWasOn = false;
    lightOffStartTime = now;
  }
  else if (!lightOn && !lightWasOn && lightOffStartTime == 0) {
    lightOffStartTime = now;
  }
  
  // Check if light has been OFF too long during scheduled ON time
  if (!lightOn && lightOffStartTime > 0) {
    unsigned long offDuration = now - lightOffStartTime;
    
    // Check if we're within lighting schedule
    int currentMinutes = currentHour * 60 + currentMinute;
    int startMinutes = lightSchedule.startHour * 60 + lightSchedule.startMinute;
    int endMinutes = lightSchedule.endHour * 60 + lightSchedule.endMinute;
    
    bool isScheduledOn = (currentMinutes >= startMinutes && currentMinutes <= endMinutes);
    
    if (isScheduledOn && offDuration > LIGHTING_ALERT_DELAY && !lightingAlertActive) {
      lightingAlertActive = true;
      
      // Short warning beep (not full alarm)
      digitalWrite(ALARM_RELAY_PIN, LOW);   // ON
      delay(200);
      digitalWrite(ALARM_RELAY_PIN, HIGH);  // OFF
      delay(100);
      digitalWrite(ALARM_RELAY_PIN, LOW);   // ON
      delay(200);
      digitalWrite(ALARM_RELAY_PIN, HIGH);  // OFF
    }
  }
}

void setAlarm(bool on) {
  alarmOn = on;
  digitalWrite(ALARM_RELAY_PIN, on ? LOW : HIGH);  // Active LOW
  Serial.printf("🔔 Alarm: %s\n", on ? "ON" : "OFF");
}

void setHeater(bool on) {
  heaterOn = on;
  digitalWrite(HEATER_RELAY_PIN, on ? LOW : HIGH);  // Active LOW
  Serial.printf("🔥 Heater: %s\n", on ? "ON" : "OFF");
}

// ═══════════════════════════════════════════════════════════════════════
// 🆕 MODULE C: INTELLIGENT FOGGER CONTROL
// ═══════════════════════════════════════════════════════════════════════
void setFogger(bool on) {
  foggerOn = on;
  digitalWrite(FOGGER_RELAY_PIN, on ? LOW : HIGH);  // Active LOW
  Serial.printf("💨 Fogger: %s\n", on ? "ON" : "OFF");
}

void startFoggerSpray() {
  setFogger(true);
  foggerInSpray = true;
  foggerSprayStart = millis();
  Serial.printf("💨 Fogger spray ON (%ds)\n", foggerSettings.onSeconds);
}

void stopFogger(String reason) {
  setFogger(false);
  foggerActive = false;
  foggerInSpray = false;
  Serial.printf("💨 Fogger stopped: %s (cycles: %d)\n", reason.c_str(), foggerCycleCount);
}

void foggerControl() {
  if (!foggerSettings.enabled) return;
  
  // Check stop conditions
  if (temperature < foggerSettings.stopTemp || humidity >= foggerSettings.stopHumidity) {
    if (foggerActive) {
      stopFogger("condition_met");
    }
    return;
  }
  
  // Check start conditions
  if (!foggerActive && 
      temperature >= foggerSettings.startTemp && 
      humidity < foggerSettings.startHumidityMax) {
    // Start fogger cycle
    foggerActive = true;
    foggerCycleCount = 0;
    startFoggerSpray();
    
    // Exhaust fan MUST run during fogger
    setFanState(true, "HIGH");
    Serial.println("💨 Fogger activated - Exhaust ON");
  }
  
  // Handle cycle timing
  if (foggerActive) {
    unsigned long now = millis();
    
    if (foggerInSpray) {
      // Check if spray duration complete
      if (now - foggerSprayStart >= (unsigned long)foggerSettings.onSeconds * 1000UL) {
        setFogger(false);
        foggerInSpray = false;
        foggerPauseStart = now;
        foggerCycleCount++;
        Serial.printf("💨 Fogger pause (cycle %d)\n", foggerCycleCount);
      }
    } else {
      // Check if pause duration complete
      if (now - foggerPauseStart >= (unsigned long)foggerSettings.pauseSeconds * 1000UL) {
        // Recheck conditions before next spray
        if (temperature >= foggerSettings.startTemp && humidity < foggerSettings.startHumidityMax) {
          startFoggerSpray();
        } else {
          stopFogger("condition_met");
        }
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 🆕 MODULE D: BROILER AIRFLOW GROWTH MODE
// ═══════════════════════════════════════════════════════════════════════
void setCirculationFan(bool on) {
  circulationFanOn = on;
  digitalWrite(CIRCULATION_RELAY_PIN, on ? LOW : HIGH);  // Active LOW
  Serial.printf("🌀 Circulation Fan: %s\n", on ? "ON" : "OFF");
}

void runIntermittentAirflow(int onSeconds, int intervalMinutes) {
  unsigned long now = millis();
  unsigned long intervalMs = (unsigned long)intervalMinutes * 60000UL;
  
  if (!airflowInCycle && (now - lastAirflowCycle >= intervalMs)) {
    airflowInCycle = true;
    airflowCycleStart = now;
    setCirculationFan(true);
  }
  
  if (airflowInCycle) {
    if (now - airflowCycleStart >= (unsigned long)onSeconds * 1000UL) {
      airflowInCycle = false;
      lastAirflowCycle = now;
      setCirculationFan(false);
    }
  }
}

void broilerAirflowControl() {
  if (!airflowSettings.enabled) return;
  
  // 🔧 Layer mode: Skip - circulation is manual only for layers
  // (Layer farms use minimum ventilation module instead)
  if (isLayer()) {
    return;
  }
  
  // Broiler mode: age-based airflow control
  int age = farmConfig.chickAgeDays;
  
  // Age < 10 days: OFF (chicks need warmth, no draft)
  if (age < airflowSettings.earlyAgeDays) {
    setCirculationFan(false);
    return;
  }
  
  // Determine if day or night (6:00-20:00 = daytime)
  bool isDaytime = (currentHour >= 6 && currentHour < 20);
  
  // Age 10-20 days: Intermittent (30s every 3 min)
  if (age < airflowSettings.midAgeDays) {
    runIntermittentAirflow(
      airflowSettings.midOnSeconds, 
      airflowSettings.midIntervalMinutes
    );
    return;
  }
  
  // Age 21+ days
  if (isDaytime) {
    // Daytime: Continuous ON
    setCirculationFan(true);
  } else {
    // Night: Intermittent (1 min every 5 min)
    runIntermittentAirflow(
      airflowSettings.nightOnSeconds, 
      airflowSettings.nightIntervalMinutes
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 🆕 MODULE A: MINIMUM VENTILATION CONTROL
// ═══════════════════════════════════════════════════════════════════════
void checkMinimumVentilation() {
  // Skip if not enabled or temp above threshold
  if (!minVentSettings.enabled) return;
  if (temperature >= minVentSettings.tempThreshold) {
    minVentActive = false;
    return;
  }
  
  minVentActive = true;
  unsigned long now = millis();
  
  // Ammonia override - continuous exhaust
  if (ammonia > rules.ammoniaFan) {
    setFanState(true, "HIGH");
    Serial.println("🌬️ Min Vent: Ammonia override - continuous exhaust");
    return;
  }
  
  // Ceiling fan always on in min vent mode
  if (minVentSettings.ceilingFanAlwaysOn) {
    setCirculationFan(true);
  }
  
  // Check if time for next cycle
  unsigned long intervalMs = (unsigned long)minVentSettings.intervalMinutes * 60000UL;
  
  if (!minVentInCycle && (now - lastMinVentCycle >= intervalMs)) {
    // Start cycle
    minVentInCycle = true;
    minVentCycleStart = now;
    setFanState(true, "HIGH");
    Serial.printf("🌬️ Min Vent: Exhaust ON (%ds cycle)\n", minVentSettings.cycleSeconds);
  }
  
  // Check if cycle complete
  if (minVentInCycle) {
    unsigned long cycleDuration = (unsigned long)minVentSettings.cycleSeconds * 1000UL;
    if (now - minVentCycleStart >= cycleDuration) {
      minVentInCycle = false;
      lastMinVentCycle = now;
      setFanState(false, "OFF");
      Serial.println("🌬️ Min Vent: Exhaust OFF");
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 🆕 MODULE B: ADVANCED HEATER CONTROL
// ═══════════════════════════════════════════════════════════════════════
void advancedHeaterControl() {
  if (!heaterSettings.enabled) return;
  
  // SAFETY FIRST: Force OFF if too hot
  if (temperature > heaterSettings.safetyMaxTemp) {
    if (heaterOn) {
      setHeater(false);
      Serial.println("🚨 Heater FORCED OFF (>34°C safety limit)");
    }
    return;
  }
  
  if (isLayer()) {
    // Layer mode: Fixed thresholds
    if (temperature < heaterSettings.layerOnTemp && !heaterOn) {
      setHeater(true);
      Serial.printf("🔥 Layer Heater ON (%.1f°C < %.1f°C)\n", temperature, heaterSettings.layerOnTemp);
    }
    else if (temperature > heaterSettings.layerOffTemp && heaterOn) {
      setHeater(false);
      Serial.printf("🔥 Layer Heater OFF (%.1f°C > %.1f°C)\n", temperature, heaterSettings.layerOffTemp);
    }
  } 
  else if (isBroiler()) {
    // Broiler mode: Age-based curve
    float targetTemp = getHeaterTargetTemp(farmConfig.chickAgeDays);
    
    if (temperature < targetTemp - heaterSettings.tolerance && !heaterOn) {
      setHeater(true);
      Serial.printf("🔥 Broiler Heater ON (Day %d, %.1f°C < %.1f°C)\n", 
                    farmConfig.chickAgeDays, temperature, targetTemp - heaterSettings.tolerance);
    }
    else if (temperature > targetTemp + heaterSettings.tolerance && heaterOn) {
      setHeater(false);
      Serial.printf("🔥 Broiler Heater OFF (Day %d, %.1f°C > %.1f°C)\n", 
                    farmConfig.chickAgeDays, temperature, targetTemp + heaterSettings.tolerance);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 🆕 MODULE G: PRIORITY-BASED CONTROL ENGINE
// Priority: Safety > Heating > Cooling (Fogger) > Ventilation > Lighting
// ═══════════════════════════════════════════════════════════════════════
void advancedControlLogic() {
  // ===== PRE-CHECK: Manual Override =====
  if (localManualOverride) {
    Serial.println("⚠️ MANUAL OVERRIDE ACTIVE - Advanced automation skipped");
    return;
  }
  
  // ===== PRE-CHECK: Stabilizing Mode =====
  if (stabilizingMode) {
    return;
  }
  
  Serial.println("\n═══ ADVANCED AUTOMATION (7-Module System) ═══");
  
  // === PRIORITY 1: SAFETY (Always runs first) ===
  // Safety checks are in runSafetyChecks() - already called in main loop
  
  // === PRIORITY 2: HEATING ===
  advancedHeaterControl();
  
  // === PRIORITY 3: COOLING (Fogger) ===
  foggerControl();
  
  // === PRIORITY 4: VENTILATION ===
  if (!foggerActive) {  // Don't override fogger's exhaust control
    checkMinimumVentilation();
    broilerAirflowControl();
  }
  
  // === PRIORITY 5: LIGHTING ===
  // Lighting is handled in main loop (controlLighting + updateLightingWithFade)
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
  
  // ===== PRE-CHECK: Stabilizing Mode =====
  if (stabilizingMode) {
    Serial.println("⏳ STABILIZING MODE - Waiting for boot stabilization...");
    systemState = "STABILIZING";
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
  
  // ===== RUN ADVANCED 7-MODULE AUTOMATION =====
  // 🔧 Advanced modules handle: Heater, Fogger, MinVent, Airflow
  advancedControlLogic();
  
  // ===== MAIN DECISION: Farm Type Based Control =====
  // 🔧 This handles: HSI-based fan speed, Ammonia alarms, Emergency states
  // Note: Heater control is now ONLY in advancedControlLogic() to avoid conflicts
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
  // Temperature control is now handled by advancedHeaterControl()
  // Fan control based on temp/HSI
  
  if (temperature > 33) {
    Serial.printf("🚨 Temp %.1f°C > 33 → ALARM!\n", temperature);
    setFanState(true, "HIGH");
    setAlarm(true);
    systemState = "EMERGENCY";
    return;
  }
  
  if (temperature > 30) {
    Serial.printf("🔥 Temp %.1f°C > 30 → Fan HIGH\n", temperature);
    setFanState(true, "HIGH");
    setAlarm(false);
    systemState = "HOT";
    return;
  }
  
  // HSI-based control
  if (currentHSI > rules.hsiEmergency) {
    setFanState(true, "HIGH");
    setAlarm(true);
    systemState = "HSI_EMERGENCY";
    return;
  }
  
  if (currentHSI > rules.hsiFanHigh) {
    setFanState(true, "HIGH");
    setAlarm(false);
    systemState = "HSI_HIGH";
    return;
  }
  
  if (currentHSI > rules.hsiFanLow) {
    setFanState(true, "MEDIUM");
    setAlarm(false);
    systemState = "MILD_STRESS";
    return;
  }
  
  // Ammonia control
  if (ammonia > rules.ammoniaAlarm) {
    setFanState(true, "HIGH");
    setAlarm(true);
    systemState = "NH3_ALARM";
    return;
  }
  
  if (ammonia > rules.ammoniaFan) {
    setFanState(true, "HIGH");
    setAlarm(false);
    systemState = "NH3_HIGH";
    return;
  }
  
  // All normal
  if (!minVentActive && !foggerActive) {
    setFanState(false, "OFF");
  }
  setAlarm(false);
  systemState = "NORMAL";
}

// ═══════════════════════════════════════════════════════════════════════
// BROILER CONTROL
// Age-based temp, HSI with higher thresholds, no lighting protection
// ═══════════════════════════════════════════════════════════════════════

void broilerControl() {
  float target = rules.tempTarget;
  
  // Temperature control is now handled by advancedHeaterControl()
  
  // ALARM CONDITIONS
  if (currentHSI > rules.hsiCritical) {
    Serial.printf("🚨 HSI %.1f > %.0f → CRITICAL!\n", currentHSI, rules.hsiCritical);
    setFanState(true, "HIGH");
    setAlarm(true);
    systemState = "CRITICAL";
    return;
  }
  
  if (temperature > rules.tempAlarm) {
    Serial.printf("🚨 Temp %.1f°C > %.0f → ALARM!\n", temperature, rules.tempAlarm);
    setFanState(true, "HIGH");
    setAlarm(true);
    systemState = "TEMP_ALARM";
    return;
  }
  
  // HIGH STRESS
  if (currentHSI > rules.hsiEmergency) {
    setFanState(true, "HIGH");
    setAlarm(false);
    systemState = "HSI_EMERGENCY";
    return;
  }
  
  if (temperature > rules.tempFanHigh) {
    setFanState(true, "HIGH");
    setAlarm(false);
    systemState = "HOT";
    return;
  }
  
  // MEDIUM STRESS
  if (currentHSI > rules.hsiFanHigh) {
    setFanState(true, "HIGH");
    setAlarm(false);
    systemState = "HSI_HIGH";
    return;
  }
  
  // Ammonia control
  if (ammonia > rules.ammoniaAlarm) {
    setFanState(true, "HIGH");
    setAlarm(true);
    systemState = "NH3_ALARM";
    return;
  }
  
  if (ammonia > rules.ammoniaFan) {
    setFanState(true, "HIGH");
    setAlarm(false);
    systemState = "NH3_HIGH";
    return;
  }
  
  // MILD STRESS
  if (currentHSI > rules.hsiFanLow) {
    setFanState(true, "MEDIUM");
    setAlarm(false);
    systemState = "MILD_STRESS";
    return;
  }
  
  // IDEAL - ALL NORMAL
  if (!minVentActive && !foggerActive) {
    setFanState(false, "OFF");
  }
  setAlarm(false);
  systemState = "NORMAL";
}

// ═══════════════════════════════════════════════════════════════════════
// 🛡️ FAIL-SAFE COMMON (Profile Independent!)
// এগুলো Layer/Broiler যাই হোক - সবার জন্য একই
// ═══════════════════════════════════════════════════════════════════════

void failSafeCommon() {
  // 1️⃣ SENSOR MISSING → FAN ON
  if (sensorErrorMode) {
    setFanState(true, "HIGH");
    systemState = "SENSOR_ERROR";
    static unsigned long lastSensorBeep = 0;
    if (millis() - lastSensorBeep > 20000) {
      setAlarm(true);
      delay(200);
      setAlarm(false);
      lastSensorBeep = millis();
    }
  }
  
  // 2️⃣ NO INTERNET → LOCAL MODE
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
  
  // 3️⃣ WATER FAILURE → ALERT
  if (waterFailureMode) {
    static unsigned long lastWaterBeep = 0;
    if (millis() - lastWaterBeep > 30000) {
      setAlarm(true);
      delay(100);
      setAlarm(false);
      lastWaterBeep = millis();
    }
  }
  
  // 4️⃣ LIGHTING PROTECTION (Layer Only)
  if (isLayer() && !lightOn) {
    static unsigned long lightOffStart = 0;
    if (lightOffStart == 0) {
      lightOffStart = millis();
    } else if (millis() - lightOffStart > 600000) {
      static unsigned long lastLightBeep = 0;
      if (millis() - lastLightBeep > 60000) {
        setAlarm(true);
        delay(100);
        setAlarm(false);
        lastLightBeep = millis();
      }
    }
  }
  
  // 5️⃣ WATCHDOG FEED
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
   // Use filtered readings (3-sample average from DHT)
   float t = readTempFiltered();
   float h = readHumidityFiltered();
  
  // Apply sanity filter + rolling average
  float tFiltered = addToTempRollingAvg(t);
  float hFiltered = addToHumRollingAvg(h);
  advanceSensorRollingIndex();
  
  if (!isnan(tFiltered) && !isnan(hFiltered)) {
    // Apply calibration offset from FarmConfig to filtered values
    temperature = tFiltered + farmConfig.tempOffset;
    humidity = hFiltered;
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
  
   // Read ammonia with warmup check + filtered
   float ammoniaRaw = readGasFiltered();
   float ammoniaRawMapped = map((int)ammoniaRaw, 0, 4095, 0, 100);
  // Apply calibration offset from FarmConfig
   float ammoniaRaw2 = ammoniaRawMapped + farmConfig.nh3Offset;
   if (ammoniaRaw2 < 0) ammoniaRaw2 = 0;
   ammonia = calculateAmmoniaMovingAvg(ammoniaRaw2);
  
  // Check water flow
  if (waterPulseCount > 0) {
    lastWaterPulse = millis();
    waterPulseCount = 0;
    waterFailureMode = false;
  } else if (millis() - lastWaterPulse > WATER_TIMEOUT) {
    waterFailureMode = true;
  }
  
  // Power sense
   powerOn = !checkPowerFailure();
   checkGasWarmup();
   
   // Store to offline buffer when disconnected
   offlineBufferTick();
}

// ═══════════════════════════════════════════════════════════════════════
// WIFI & CLOUD
// ═══════════════════════════════════════════════════════════════════════

void connectWiFi() {
  // Use active credentials (from NVS or hardcoded)
  if (activeWifiSSID.length() > 0 && activeWifiSSID != "YOUR_WIFI_SSID") {
    Serial.print("📡 Connecting to WiFi: ");
    Serial.println(activeWifiSSID);
    WiFi.mode(WIFI_STA);
    WiFi.begin(activeWifiSSID.c_str(), activeWifiPassword.c_str());
    
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < WIFI_CONNECT_TIMEOUT) {
      delay(500);
      Serial.print(".");
      attempts++;
      esp_task_wdt_reset();
    }
    
    wifiConnected = (WiFi.status() == WL_CONNECTED);
    if (wifiConnected) {
      Serial.println("\n✓ WiFi Connected!");
      Serial.printf("  IP: %s\n", WiFi.localIP().toString().c_str());
      Serial.printf("  RSSI: %d dBm\n", WiFi.RSSI());
    } else {
      Serial.println("\n✗ WiFi Failed - Failsafe mode active");
      failsafeMode = true;
    }
  } else {
    Serial.println("⚠️ No WiFi credentials configured - Failsafe mode active");
    failsafeMode = true;
  }
}

void syncWithCloud() {
  if (!wifiConnected) return;
  
  HTTPClient http;
  String url = String(API_URL) + "/sync";
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-token", activeDeviceToken.c_str());
  http.setTimeout(5000);  // 🔧 Reduced from 10s — WDT is 8s, must be shorter
  esp_task_wdt_reset();   // Feed watchdog before HTTP call
  
  DynamicJsonDocument doc(3072);  // 🔧 Increased from 1024 - 40+ fields need more space
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
  
  // Broiler age source tracking
  doc["broiler_age_source"] = ageSource;
  doc["last_server_age_sync_at"] = lastServerAgeSyncTime;
  
  // Water monitoring fields
  doc["water_last_2h_avg"] = water2hAvg;
  doc["water_24h_rolling_avg"] = waterRollingAvg;
  doc["water_anomaly_consecutive_count"] = waterAnomalyConsecutive;
  
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
  doc["offline_buffer_count"] = offlineRecordCount;
  doc["ota_status"] = otaStatus;
  doc["ota_progress"] = otaProgress;
  doc["online_duration_seconds"] = onlineDurationSec;
  doc["offline_duration_seconds"] = offlineDurationSec;
  
  // 🆕 Advanced automation states
  doc["circulation_fan_on"] = circulationFanOn;
  doc["fogger_on"] = foggerOn;
  doc["min_vent_active"] = minVentActive;
  doc["fogger_active"] = foggerActive;
  doc["fogger_cycle_count"] = foggerCycleCount;
  doc["light_brightness"] = lightBrightness;
  doc["fade_in_progress"] = fadeInProgress;
  doc["cached_settings_version"] = cachedSettingsVersion;
  
  // 🆕 Dual DHT22 sensor data
  doc["dht2_available"] = dht2Available;
  if (dht2Available) {
    doc["temperature2"] = temperature2;
    doc["humidity2"] = humidity2;
  }
  String payload;
  serializeJson(doc, payload);
  
  int httpCode = http.POST(payload);
  esp_task_wdt_reset();  // 🔧 Feed watchdog after HTTP response
  
  if (httpCode == 200) {
    String response = http.getString();
    handleCloudResponse(response);
    cloudConnected = true;
    lastCloudSync = millis();
    
    if (failsafeMode) {
      Serial.println("✓ Cloud restored - exiting failsafe");
      failsafeMode = false;
      
      if (offlineRecordCount > 0) {
        Serial.println("📦 Starting offline buffer sync...");
      }
    }
    
    // Sync any remaining offline buffer data
    if (offlineRecordCount > 0 && !offlineSyncInProgress) {
      syncOfflineBuffer();
    }
  } else {
    Serial.printf("✗ Cloud sync failed: %d\n", httpCode);
    checkFailsafeTimeout();
  }
  
  http.end();
}

// ═══════════════════════════════════════════════════════════════════════
// 🆕 HANDLE ADVANCED AUTOMATION SETTINGS FROM CLOUD
// ═══════════════════════════════════════════════════════════════════════
void handleAdvancedAutomationSettings(JsonObject& adv) {
  Serial.println("📥 Processing advanced automation settings from cloud...");
  
  // Module A: Minimum Ventilation
  if (adv.containsKey("min_vent")) {
    JsonObject mv = adv["min_vent"];
    minVentSettings.enabled = mv["enabled"] | true;
    minVentSettings.tempThreshold = mv["temp_threshold"] | 26.0;
    minVentSettings.cycleSeconds = mv["cycle_seconds"] | 40;
    minVentSettings.intervalMinutes = mv["interval_minutes"] | 5;
    minVentSettings.ceilingFanAlwaysOn = mv["ceiling_fan_always_on"] | true;
    Serial.printf("   Min Vent: %s, Threshold=%.1f°C, Cycle=%ds, Interval=%dmin\n",
                  minVentSettings.enabled ? "ON" : "OFF",
                  minVentSettings.tempThreshold,
                  minVentSettings.cycleSeconds,
                  minVentSettings.intervalMinutes);
  }
  
  // Module B: Heater
  if (adv.containsKey("heater")) {
    JsonObject h = adv["heater"];
    heaterSettings.enabled = h["enabled"] | true;
    heaterSettings.layerOnTemp = h["on_temp"] | 20.0;
    heaterSettings.layerOffTemp = h["off_temp"] | 24.0;
    heaterSettings.tolerance = h["tolerance"] | 0.7;
    Serial.printf("   Heater: %s, Layer ON<%.1f°C OFF>%.1f°C, Tolerance=%.1f\n",
                  heaterSettings.enabled ? "ON" : "OFF",
                  heaterSettings.layerOnTemp,
                  heaterSettings.layerOffTemp,
                  heaterSettings.tolerance);
  }
  
  // Module C: Fogger
  if (adv.containsKey("fogger")) {
    JsonObject f = adv["fogger"];
    foggerSettings.enabled = f["enabled"] | false;
    foggerSettings.startTemp = f["start_temp"] | 32.0;
    foggerSettings.startHumidityMax = f["start_humidity_max"] | 85.0;
    foggerSettings.onSeconds = f["on_seconds"] | 40;
    foggerSettings.pauseSeconds = f["pause_seconds"] | 120;
    foggerSettings.stopTemp = f["stop_temp"] | 30.0;
    foggerSettings.stopHumidity = f["stop_humidity"] | 90.0;
    Serial.printf("   Fogger: %s, Start>=%.1f°C&<%.0f%%, ON=%ds, Pause=%ds\n",
                  foggerSettings.enabled ? "ON" : "OFF",
                  foggerSettings.startTemp,
                  foggerSettings.startHumidityMax,
                  foggerSettings.onSeconds,
                  foggerSettings.pauseSeconds);
  }
  
  // Module D: Airflow
  if (adv.containsKey("airflow")) {
    JsonObject a = adv["airflow"];
    airflowSettings.enabled = a["enabled"] | true;
    airflowSettings.earlyAgeDays = a["early_age_days"] | 10;
    airflowSettings.midAgeDays = a["mid_age_days"] | 20;
    airflowSettings.midOnSeconds = a["mid_on_seconds"] | 30;
    airflowSettings.midIntervalMinutes = a["mid_interval_minutes"] | 3;
    airflowSettings.nightOnSeconds = a["night_on_seconds"] | 60;
    airflowSettings.nightIntervalMinutes = a["night_interval_minutes"] | 5;
    Serial.printf("   Airflow: %s, Early<%dd, Mid<%dd, MidCycle=%ds/%dmin\n",
                  airflowSettings.enabled ? "ON" : "OFF",
                  airflowSettings.earlyAgeDays,
                  airflowSettings.midAgeDays,
                  airflowSettings.midOnSeconds,
                  airflowSettings.midIntervalMinutes);
  }
  
  // Module E: Lighting Fade
  if (adv.containsKey("lighting")) {
    JsonObject l = adv["lighting"];
    lightingFadeSettings.fadeDurationMinutes = l["fade_duration_minutes"] | 10;
    Serial.printf("   Lighting Fade: %d minutes\n", lightingFadeSettings.fadeDurationMinutes);
  }
  
  // Module F: Curtain Advisory
  if (adv.containsKey("curtain_advisory")) {
    JsonObject c = adv["curtain_advisory"];
    curtainSettings.enabled = c["enabled"] | true;
    curtainSettings.openTempDiff = c["open_temp_diff"] | 3.0;
    curtainSettings.closeOnCold = c["close_on_cold"] | true;
  }
  
  // Module G: Water Analytics
  if (adv.containsKey("water_analytics")) {
    JsonObject w = adv["water_analytics"];
    waterAnalyticsSettings.dropThresholdPercent = w["drop_threshold_percent"] | 30;
    waterAnalyticsSettings.nightSpikeEnabled = w["night_spike_enabled"] | true;
    waterAnalyticsSettings.zeroFlowAlert = w["zero_flow_alert"] | true;
    waterAnalyticsSettings.baselineHours = w["baseline_hours"] | 24;
  }
  
  Serial.println("✅ Advanced automation settings synced from cloud");
}

void handleCloudResponse(String response) {
  DynamicJsonDocument doc(2048);
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
    updateAgeFromServer(cloudAge);
  }
  
  // === SET FARM PROFILE COMMAND ===
  if (doc.containsKey("set_farm_profile")) {
    int newProfile = doc["set_farm_profile"] | 0;
    int newAge = doc["set_broiler_age"] | -1;
    setFarmProfileFromAPI(newProfile, newAge);
    Serial.println("✓ Farm profile set from cloud command!");
  }
  
  // === TIME SYNC ===
  if (doc.containsKey("current_hour") && doc.containsKey("current_minute")) {
    int hour = doc["current_hour"] | 12;
    int minute = doc["current_minute"] | 0;
    updateTimeFromCloud(hour, minute);
  }
  
  // === 🆕 ADVANCED AUTOMATION SETTINGS SYNC ===
  if (doc.containsKey("advanced_automation")) {
    JsonObject adv = doc["advanced_automation"];
    handleAdvancedAutomationSettings(adv);
    
    // Update cached version if present
    if (doc.containsKey("settings_version")) {
      cachedSettingsVersion = doc["settings_version"] | 0;
    }
  }
  
  // Ignore device commands in failsafe mode
   if (failsafeMode || safeModeActive || stabilizingMode) {
     Serial.println("⚠️ SAFE/FAILSAFE/STABILIZING MODE: Ignoring cloud commands");
    return;
  }
  
  // Apply device commands from cloud (only when NOT in failsafe/manual override)
  if (doc.containsKey("device_status") && !localManualOverride) {
    JsonObject status = doc["device_status"];
    
    // Fan control
    bool cloudFanOn = status["fan_on"] | false;
    String cloudFanSpeed = status["fan_speed"] | "OFF";
    if (cloudFanOn != fanOn || cloudFanSpeed != fanSpeed) {
      setFanState(cloudFanOn, cloudFanSpeed);
      Serial.printf("☁️ Cloud → Fan: %s (%s)\n", cloudFanOn ? "ON" : "OFF", cloudFanSpeed.c_str());
    }
    
    // Light control (manual override from cloud)
    if (status.containsKey("light_on")) {
      bool cloudLightOn = status["light_on"] | false;
      if (cloudLightOn != lightOn) {
        setLight(cloudLightOn);
        lightSchedule.manualOverride = true;
        lightManualOverrideTime = millis();
        Serial.printf("☁️ Cloud → Light: %s\n", cloudLightOn ? "ON" : "OFF");
      }
    }
    
    // Alarm control
    if (status.containsKey("alarm_on")) {
      bool cloudAlarmOn = status["alarm_on"] | false;
      if (cloudAlarmOn != alarmOn) {
        setAlarm(cloudAlarmOn);
        Serial.printf("☁️ Cloud → Alarm: %s\n", cloudAlarmOn ? "ON" : "OFF");
      }
    }
    
    // Heater control
    if (status.containsKey("heater_on")) {
      bool cloudHeaterOn = status["heater_on"] | false;
      if (cloudHeaterOn != heaterOn) {
        setHeater(cloudHeaterOn);
        Serial.printf("☁️ Cloud → Heater: %s\n", cloudHeaterOn ? "ON" : "OFF");
      }
    }
    
    // 🆕 Fogger control
    if (status.containsKey("fogger_on")) {
      bool cloudFoggerOn = status["fogger_on"] | false;
      if (cloudFoggerOn != foggerOn) {
        setFogger(cloudFoggerOn);
        Serial.printf("☁️ Cloud → Fogger: %s\n", cloudFoggerOn ? "ON" : "OFF");
      }
    }
    
    // 🆕 Circulation fan control
    if (status.containsKey("circulation_fan_on")) {
      bool cloudCircOn = status["circulation_fan_on"] | false;
      if (cloudCircOn != circulationFanOn) {
        setCirculationFan(cloudCircOn);
        Serial.printf("☁️ Cloud → Circulation Fan: %s\n", cloudCircOn ? "ON" : "OFF");
      }
    }
    
    // Manual override flag from cloud
    if (status.containsKey("manual_override")) {
      localManualOverride = status["manual_override"] | false;
      if (localManualOverride) {
        Serial.println("☁️ Cloud → Manual Override ENABLED");
      }
    }
  }
}

void checkFailsafeTimeout() {
  if (millis() - lastCloudSync > CLOUD_TIMEOUT && !failsafeMode) {
    Serial.println("\n⚠️ CLOUD TIMEOUT (5 min) → LOCAL AUTO MODE!");
    failsafeMode = true;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// 📦 OTA (OVER-THE-AIR) FIRMWARE UPDATE SYSTEM
// Check for updates every hour, download and install wirelessly
// ═══════════════════════════════════════════════════════════════════════

void checkOTAUpdate() {
  if (!wifiConnected || otaInProgress) {
    return;
  }
  
  Serial.println("\n📡 [OTA] Checking for firmware updates...");
  
  HTTPClient http;
  String otaApiUrl = "https://hbwfuvqrfgtefozajyfu.supabase.co/functions/v1/ota-firmware";
  String url = otaApiUrl + "?action=check&version=" + firmwareVersion + "&farm_type=" + getFarmTypeStr();
  
  http.begin(url);
  http.addHeader("x-device-token", activeDeviceToken.c_str());
  http.setTimeout(10000);
  
  int httpCode = http.GET();
  
  if (httpCode == 200) {
    String response = http.getString();
    
    DynamicJsonDocument doc(1024);
    DeserializationError error = deserializeJson(doc, response);
    
    if (!error) {
      bool updateAvailable = doc["update_available"] | false;
      
      if (updateAvailable) {
        String newVersion = doc["version"] | "";
        String firmwareUrl = doc["url"] | "";
        int firmwareSize = doc["size"] | 0;
        String releaseNotes = doc["release_notes"] | "";
        
        Serial.println("╔════════════════════════════════════════════════════════════╗");
        Serial.println("║  🆕 NEW FIRMWARE AVAILABLE!                                ║");
        Serial.printf("║  Current: %s → New: %s\n", firmwareVersion.c_str(), newVersion.c_str());
        Serial.printf("║  Size: %d bytes\n", firmwareSize);
        if (releaseNotes.length() > 0) {
          Serial.printf("║  Notes: %s\n", releaseNotes.c_str());
        }
        Serial.println("╚════════════════════════════════════════════════════════════╝");
        
        otaAvailableVersion = newVersion;
        otaPendingUrl = firmwareUrl;
        otaPendingSize = firmwareSize;
        otaStatus = "available";
        
        // Start the update
        performOTAUpdate(firmwareUrl, firmwareSize, newVersion);
      } else {
        Serial.printf("✓ [OTA] Firmware up to date (%s)\n", firmwareVersion.c_str());
        otaStatus = "up_to_date";
      }
    }
  } else {
    Serial.printf("✗ [OTA] Check failed: HTTP %d\n", httpCode);
  }
  
  http.end();
  lastOTACheck = millis();
}

void reportOTAProgress(int progress, String status, String version, String errorMsg) {
  if (!wifiConnected) return;
  
  HTTPClient http;
  String otaApiUrl = "https://hbwfuvqrfgtefozajyfu.supabase.co/functions/v1/ota-firmware";
  String url = otaApiUrl + "?action=progress";
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-token", activeDeviceToken.c_str());
  http.setTimeout(5000);
  
  StaticJsonDocument<256> doc;
  doc["progress"] = progress;
  doc["status"] = status;
  if (version.length() > 0) doc["version"] = version;
  if (errorMsg.length() > 0) doc["error_message"] = errorMsg;
  
  String payload;
  serializeJson(doc, payload);
  
  http.POST(payload);
  http.end();
}

void performOTAUpdate(String firmwareUrl, int firmwareSize, String version) {
  if (otaInProgress) {
    Serial.println("⚠️ [OTA] Update already in progress!");
    return;
  }
  
  Serial.println("\n🚀 [OTA] Starting firmware update...");
  Serial.printf("   URL: %s\n", firmwareUrl.c_str());
  Serial.printf("   Size: %d bytes\n", firmwareSize);
  
  otaInProgress = true;
  otaStatus = "downloading";
  otaProgress = 0;
  
  // Report start
  reportOTAProgress(0, "downloading", version, "");
  
  HTTPClient http;
  http.begin(firmwareUrl);
  http.setTimeout(60000);  // 60 second timeout for download
  
  int httpCode = http.GET();
  
  if (httpCode != 200) {
    Serial.printf("✗ [OTA] Download failed: HTTP %d\n", httpCode);
    otaStatus = "failed";
    otaInProgress = false;
    reportOTAProgress(0, "failed", version, "HTTP error: " + String(httpCode));
    http.end();
    return;
  }
  
  int contentLength = http.getSize();
  if (contentLength <= 0) {
    Serial.println("✗ [OTA] Invalid content length");
    otaStatus = "failed";
    otaInProgress = false;
    reportOTAProgress(0, "failed", version, "Invalid content length");
    http.end();
    return;
  }
  
  Serial.printf("   Content-Length: %d bytes\n", contentLength);
  
  // Check if there's enough space
  if (!Update.begin(contentLength)) {
    Serial.printf("✗ [OTA] Not enough space for update! Error: %s\n", Update.errorString());
    otaStatus = "failed";
    otaInProgress = false;
    reportOTAProgress(0, "failed", version, "Not enough space");
    http.end();
    return;
  }
  
  Serial.println("📥 [OTA] Downloading firmware...");
  otaStatus = "downloading";
  
  WiFiClient* stream = http.getStreamPtr();
  uint8_t buff[1024] = { 0 };
  int bytesWritten = 0;
  int lastProgressReport = 0;
  
  while (http.connected() && bytesWritten < contentLength) {
    size_t available = stream->available();
    
    if (available) {
      int c = stream->readBytes(buff, min(available, sizeof(buff)));
      
      if (Update.write(buff, c) != c) {
        Serial.printf("✗ [OTA] Write failed: %s\n", Update.errorString());
        Update.abort();
        otaStatus = "failed";
        otaInProgress = false;
        reportOTAProgress(otaProgress, "failed", version, "Write error");
        http.end();
        return;
      }
      
      bytesWritten += c;
      otaProgress = (bytesWritten * 100) / contentLength;
      
      // Report progress every 10%
      if (otaProgress >= lastProgressReport + 10) {
        Serial.printf("   Progress: %d%% (%d/%d bytes)\n", otaProgress, bytesWritten, contentLength);
        reportOTAProgress(otaProgress, "downloading", version, "");
        lastProgressReport = otaProgress;
      }
      
      // Feed watchdog during long download
      esp_task_wdt_reset();
    }
    
    delay(1);
  }
  
  http.end();
  
  Serial.println("📦 [OTA] Installing firmware...");
  otaStatus = "installing";
  reportOTAProgress(100, "installing", version, "");
  
  if (Update.end()) {
    if (Update.isFinished()) {
      Serial.println("╔════════════════════════════════════════════════════════════╗");
      Serial.println("║  ✅ OTA UPDATE SUCCESSFUL!                                 ║");
      Serial.printf("║  New Version: %s\n", version.c_str());
      Serial.println("║  Restarting in 3 seconds...                                ║");
      Serial.println("╚════════════════════════════════════════════════════════════╝");
      
      otaStatus = "completed";
      reportOTAProgress(100, "completed", version, "");
      
      delay(3000);
      ESP.restart();
    } else {
      Serial.println("✗ [OTA] Update not finished properly");
      otaStatus = "failed";
      otaInProgress = false;
      reportOTAProgress(100, "failed", version, "Update not finished");
    }
  } else {
    Serial.printf("✗ [OTA] Update failed: %s\n", Update.errorString());
    otaStatus = "failed";
    otaInProgress = false;
    reportOTAProgress(0, "failed", version, Update.errorString());
  }
}

// ═══════════════════════════════════════════════════════════════════════
// ⚡ REAL-TIME COMMAND QUEUE SYSTEM
// Polls device_commands table every 5 seconds for instant control
// Manual Override থাকলে App থেকে ফ্যান/লাইট/অ্যালার্ম/হিটার কন্ট্রোল
// ═══════════════════════════════════════════════════════════════════════

void checkPendingCommands() {
  if (!wifiConnected) {
    return;
  }
  
  if (failsafeMode) {
    return;
  }
  
  HTTPClient http;

  String encodedShedName = activeShedName;
  encodedShedName.replace(" ", "%20");

  String url = String(API_URL) + "/commands?device_id=" + encodedShedName;
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-token", activeDeviceToken.c_str());
  http.setTimeout(5000);
  esp_task_wdt_reset();  // 🔧 Feed watchdog before HTTP call
  
  int httpCode = http.GET();
  esp_task_wdt_reset();  // 🔧 Feed watchdog after HTTP response
  
  if (httpCode == 200) {
    String response = http.getString();
    
    DynamicJsonDocument doc(8192);
    DeserializationError error = deserializeJson(doc, response);
    
    if (error) {
      return;
    }

    if (!doc.containsKey("commands")) {
      return;
    }

    JsonArray commands = doc["commands"].as<JsonArray>();
    if (commands.isNull() || commands.size() == 0) {
      return;
    }
    
    for (JsonObject cmd : commands) {
      String commandId = cmd["id"] | "";
      String commandType = cmd["command_type"] | "";
      bool commandValue = cmd["command_value"] | false;
      
      if (commandType.length() == 0) continue;
      
      Serial.printf("\n⚡ COMMAND RECEIVED: %s → %s\n", commandType.c_str(), commandValue ? "ON" : "OFF");
      
      // Execute command based on type
      if (commandType == "fan") {
        setFanState(commandValue, commandValue ? "HIGH" : "OFF");
      }
      else if (commandType == "light") {
        setLight(commandValue);
        lightSchedule.manualOverride = true;
        lightManualOverrideTime = millis();
      }
      else if (commandType == "alarm") {
        setAlarm(commandValue);
      }
      else if (commandType == "heater") {
        setHeater(commandValue);
      }
      else if (commandType == "fogger") {
        setFogger(commandValue);
      }
      else if (commandType == "circulation_fan") {
        setCirculationFan(commandValue);
      }
      else if (commandType == "manual_override") {
        localManualOverride = commandValue;
      }
      
      // Acknowledge command execution
      if (commandId.length() > 0) {
        acknowledgeCommand(commandId);
      }
    }
  }
  
  http.end();
}

void acknowledgeCommand(String commandId) {
  if (!wifiConnected || commandId.length() == 0) return;
  
  HTTPClient http;
  String url = String(API_URL) + "/commands-ack";
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-token", activeDeviceToken.c_str());
  http.setTimeout(3000);
  esp_task_wdt_reset();  // 🔧 Feed watchdog
  
  StaticJsonDocument<256> doc;
  doc["command_ids"][0] = commandId;
  
  String payload;
  serializeJson(doc, payload);
  
  http.POST(payload);
  esp_task_wdt_reset();  // 🔧 Feed watchdog
  http.end();
}


// ═══════════════════════════════════════════════════════════════════════
// 🔑 NVS TOKEN STORAGE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

bool isNVSProvisioned() {
  preferences.begin(NVS_NAMESPACE, true);  // Read-only
  uint32_t magic = preferences.getUInt("magic", 0);
  preferences.end();
  return magic == NVS_PROVISIONED_MAGIC;
}

void loadCredentialsFromNVS() {
  preferences.begin(NVS_NAMESPACE, true);  // Read-only
  
  activeDeviceToken = preferences.getString(NVS_KEY_TOKEN, "");
  activeWifiSSID = preferences.getString(NVS_KEY_WIFI_SSID, "");
  activeWifiPassword = preferences.getString(NVS_KEY_WIFI_PASS, "");
  activeShedId = preferences.getString(NVS_KEY_SHED_ID, "");
  activeShedName = preferences.getString(NVS_KEY_SHED_NAME, "");
  activeFarmId = preferences.getString(NVS_KEY_FARM_ID, "");
  nvsProvisioned = preferences.getUInt("magic", 0) == NVS_PROVISIONED_MAGIC;
  
  preferences.end();
  
  Serial.println("📦 Loaded credentials from NVS:");
  Serial.printf("   Token: %s...%s\n", 
    activeDeviceToken.substring(0, 8).c_str(),
    activeDeviceToken.length() > 16 ? activeDeviceToken.substring(activeDeviceToken.length()-4).c_str() : "");
  Serial.printf("   WiFi: %s\n", activeWifiSSID.c_str());
  Serial.printf("   Shed: %s\n", activeShedName.c_str());
}

void saveCredentialsToNVS() {
  preferences.begin(NVS_NAMESPACE, false);  // Read-write
  
  // Save all credentials
  preferences.putString(NVS_KEY_TOKEN, activeDeviceToken);
  preferences.putString(NVS_KEY_WIFI_SSID, activeWifiSSID);
  preferences.putString(NVS_KEY_WIFI_PASS, activeWifiPassword);
  preferences.putString(NVS_KEY_SHED_ID, activeShedId);
  preferences.putString(NVS_KEY_SHED_NAME, activeShedName);
  preferences.putString(NVS_KEY_FARM_ID, activeFarmId);
  
  // Set magic number to indicate provisioned
  preferences.putUInt("magic", NVS_PROVISIONED_MAGIC);
  
  preferences.end();
  
  nvsProvisioned = true;
  Serial.println("✅ Credentials saved to NVS (OTA-ready)");
}

void provisionFromHardcoded() {
  // Copy hardcoded values to active variables
  activeDeviceToken = String(DEVICE_TOKEN);
  activeWifiSSID = String(WIFI_SSID);
  activeWifiPassword = String(WIFI_PASSWORD);
  activeShedId = String(SHED_ID);
  activeShedName = String(SHED_NAME);
  activeFarmId = String(FARM_ID);
  
  // Save to NVS for future OTA updates
  saveCredentialsToNVS();
  
  Serial.println("✅ Provisioned from hardcoded credentials");
}

String getActiveToken() {
  return activeDeviceToken;
}

// ═══════════════════════════════════════════════════════════════════════
// SETUP
// ═══════════════════════════════════════════════════════════════════════

void setup() {
  Serial.begin(115200);
  Serial.println("\n╔═══════════════════════════════════════════════════════════════╗");
   Serial.println("║    Smart Farm - ESP32 Unified Controller v5.2                 ║");
  Serial.println("║    🐔 UNIFIED CODEBASE: Farm Profile System                   ║");
   Serial.println("║    🆕 7-MODULE ADVANCED AUTOMATION                            ║");
   Serial.println("║    🛡️ PRODUCTION RELIABILITY: Safe Mode + Filters            ║");
   Serial.println("║    🔑 NVS TOKEN STORAGE: OTA-Ready Architecture              ║");
  Serial.println("╚═══════════════════════════════════════════════════════════════╝\n");
  
  // ═══════════════════════════════════════════════════════════════════════
  // 🔑 LOAD/PROVISION CREDENTIALS (NVS Token Storage System)
  // ═══════════════════════════════════════════════════════════════════════
  Serial.println("╔═══════════════════════════════════════════════════════════════╗");
  Serial.println("║  🔑 CREDENTIAL LOADING SYSTEM                                 ║");
  Serial.println("╚═══════════════════════════════════════════════════════════════╝\n");
  
  if (USE_HARDCODED_TOKEN) {
    // Mode 1: Code Generator firmware - use hardcoded values
    Serial.println("📋 Mode: HARDCODED TOKEN (Code Generator firmware)");
    
    // Check if already provisioned in NVS
    if (isNVSProvisioned()) {
      Serial.println("   NVS already provisioned, loading stored credentials...");
      loadCredentialsFromNVS();
      
      // Verify token matches (if hardcoded is valid)
      String hardcodedToken = String(DEVICE_TOKEN);
      if (hardcodedToken != "YOUR_DEVICE_TOKEN" && activeDeviceToken != hardcodedToken) {
        Serial.println("   ⚠️ Hardcoded token differs from NVS - updating NVS");
        provisionFromHardcoded();
      }
    } else {
      // First boot - provision from hardcoded values
      Serial.println("   First boot detected, provisioning from hardcoded values...");
      provisionFromHardcoded();
    }
  } else {
    // Mode 2: OTA firmware - must load from NVS
    Serial.println("📋 Mode: NVS TOKEN (OTA firmware)");
    
    if (isNVSProvisioned()) {
      loadCredentialsFromNVS();
    } else {
      // ERROR: OTA firmware but no provisioned credentials
      Serial.println("❌ ERROR: No credentials in NVS!");
      Serial.println("   This device must first be flashed with Code Generator firmware");
      Serial.println("   to provision credentials before OTA updates can work.");
      // Enter error state - blink LED rapidly
      while(true) {
        digitalWrite(STATUS_LED_PIN, !digitalRead(STATUS_LED_PIN));
        delay(100);
      }
    }
  }
  
  Serial.printf("\n  Active Token: %s...%s\n", 
    activeDeviceToken.substring(0, 8).c_str(),
    activeDeviceToken.length() > 16 ? activeDeviceToken.substring(activeDeviceToken.length()-4).c_str() : "");
  Serial.printf("  Active WiFi: %s\n", activeWifiSSID.c_str());
  Serial.printf("  Shed: %s (%s)\n", activeShedName.c_str(), activeShedId.c_str());
  Serial.printf("  Farm: %s\n\n", activeFarmId.c_str());
  
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
  
  // ═══════════════════════════════════════════════════════════════════════
  // 🔌 RELAY INITIALIZATION (Active LOW - HIGH = OFF)
  // ═══════════════════════════════════════════════════════════════════════
  
  Serial.println("\n🔌 RELAY PIN SETUP...");
  Serial.printf("   FAN_RELAY_PIN (IN1): GPIO %d\n", FAN_RELAY_PIN);
  Serial.printf("   LIGHT_RELAY_PIN (IN2): GPIO %d\n", LIGHT_RELAY_PIN);
  Serial.printf("   ALARM_RELAY_PIN (IN3): GPIO %d\n", ALARM_RELAY_PIN);
  Serial.printf("   HEATER_RELAY_PIN (IN4): GPIO %d\n", HEATER_RELAY_PIN);
  
  // Set as OUTPUT first
  pinMode(FAN_RELAY_PIN, OUTPUT);
  pinMode(LIGHT_RELAY_PIN, OUTPUT);
  pinMode(ALARM_RELAY_PIN, OUTPUT);
  pinMode(HEATER_RELAY_PIN, OUTPUT);
  pinMode(STATUS_LED_PIN, OUTPUT);
  
  // Immediately set all OFF (Active LOW: HIGH = OFF)
  digitalWrite(FAN_RELAY_PIN, HIGH);
  digitalWrite(LIGHT_RELAY_PIN, HIGH);
  digitalWrite(ALARM_RELAY_PIN, HIGH);
  digitalWrite(HEATER_RELAY_PIN, HIGH);
  
  Serial.println("✅ All relays set to OFF (HIGH)");
  delay(500);
  
  // ═══════════════════════════════════════════════════════════════════════
  // 🧪 GRADUAL DEVICE START - Each relay ON for 1 second
  // Prevents power surge from simultaneous relay activation
  // ═══════════════════════════════════════════════════════════════════════
  Serial.println("\n╔═══════════════════════════════════════════════════════════════╗");
  Serial.println("║  ⏳ BOOT DELAY: 30 SECOND STABILIZATION PERIOD               ║");
  Serial.println("║  🔌 GRADUAL DEVICE START - One relay at a time               ║");
  Serial.println("╚═══════════════════════════════════════════════════════════════╝\n");
  
  // Test IN1 (Fan/Exhaust) - 2 second test
  Serial.printf("   [1/4] Testing Exhaust Fan (IN1) - GPIO %d...\n", FAN_RELAY_PIN);
  digitalWrite(FAN_RELAY_PIN, LOW);  // ON
  delay(2000);
  digitalWrite(FAN_RELAY_PIN, HIGH); // OFF
  Serial.println("   ✓ Exhaust Fan test complete");
  delay(500);
  
  // Test IN2 (Light/Circulation) - 2 second test
  Serial.printf("   [2/4] Testing Circulation Fan (IN2) - GPIO %d...\n", LIGHT_RELAY_PIN);
  digitalWrite(LIGHT_RELAY_PIN, LOW);  // ON
  delay(2000);
  digitalWrite(LIGHT_RELAY_PIN, HIGH); // OFF
  Serial.println("   ✓ Circulation Fan test complete");
  delay(500);
  
  // Test IN3 (Heater) - 2 second test
  Serial.printf("   [3/4] Testing Heater (IN3) - GPIO %d...\n", ALARM_RELAY_PIN);
  digitalWrite(ALARM_RELAY_PIN, LOW);  // ON
  delay(2000);
  digitalWrite(ALARM_RELAY_PIN, HIGH); // OFF
  Serial.println("   ✓ Heater test complete");
  delay(500);
  
  // Test IN4 (Fogger) - 2 second test
  Serial.printf("   [4/4] Testing Fogger (IN4) - GPIO %d...\n", HEATER_RELAY_PIN);
  digitalWrite(HEATER_RELAY_PIN, LOW);  // ON
  delay(2000);
  digitalWrite(HEATER_RELAY_PIN, HIGH); // OFF
  Serial.println("   ✓ Fogger test complete");
  
  Serial.println("\n🧪 GRADUAL DEVICE START COMPLETE!\n");
  delay(500);
  
  // Other input pins
  pinMode(MANUAL_OVERRIDE_BTN, INPUT_PULLUP);
  pinMode(MANUAL_FAN_BTN, INPUT_PULLUP);
  pinMode(MANUAL_ALARM_BTN, INPUT_PULLUP);
  pinMode(POWER_SENSE_PIN, INPUT);
  pinMode(WATER_FLOW_PIN, INPUT_PULLUP);
  
  // ═══════════════════════════════════════════════════════════════════════
  // 🛡️ SAFE MODE / STABILIZING MODE (30 SECONDS)
  // During this period: Fan ON, automation paused, commands accepted
  // ═══════════════════════════════════════════════════════════════════════
  if (isPowerRelatedRestart() || wasWatchdogReset) {
    // Power-related or watchdog restart → Enter safe mode
    enterSafeMode();
    Serial.println("🛡️ SAFE MODE: Power/WDT restart detected - 30s stabilization");
  } else {
    // Normal boot → 30s stabilizing mode with Fan ON for ventilation
    stabilizingMode = true;
    stabilizingEndTime = millis() + SAFE_MODE_DURATION;
    safeModeActive = true;
    safeModeEndTime = stabilizingEndTime;
    systemState = "STABILIZING";
    
    Serial.println("\n╔═══════════════════════════════════════════════════════════════╗");
    Serial.println("║  ⏳ 30 SECOND BOOT DELAY ACTIVE                               ║");
    Serial.println("║  🌀 Fan ON for initial ventilation                            ║");
    Serial.println("║  ⏸️ Automation paused until stabilization complete            ║");
    Serial.println("║  ✅ Manual commands ARE accepted during this period           ║");
    Serial.println("╚═══════════════════════════════════════════════════════════════╝\n");
    
    // Turn ON fan for initial ventilation (Active LOW: LOW = ON)
    digitalWrite(FAN_RELAY_PIN, LOW);
    fanOn = true;
    fanSpeed = "HIGH";
  }
  
  // Water flow interrupt
  attachInterrupt(digitalPinToInterrupt(WATER_FLOW_PIN), waterPulseISR, FALLING);
  lastWaterPulse = millis();
  
   // Initialize gas sensor warmup
   initGasWarmup();
   
  // Initialize DHT sensors
  dht.begin();
  dht2.begin();  // 🆕 Second DHT22 (GPIO 15)
  delay(2000);
  
  // Test primary DHT sensor
  float testTemp = dht.readTemperature();
  float testHum = dht.readHumidity();
  sensorInitOK = !isnan(testTemp) && !isnan(testHum);
  lastValidSensor = millis();
  
  // 🆕 Test second DHT sensor (optional - won't cause failsafe if absent)
  float testTemp2 = dht2.readTemperature();
  float testHum2 = dht2.readHumidity();
  dht2Available = !isnan(testTemp2) && !isnan(testHum2);
  
  if (sensorInitOK) {
    Serial.printf("✓ DHT22 #1 OK: %.1f°C, %.1f%%\n", testTemp, testHum);
  }
  if (dht2Available) {
    Serial.printf("✓ DHT22 #2 OK: %.1f°C, %.1f%% (GPIO %d)\n", testTemp2, testHum2, DHT2_PIN);
    Serial.println("📊 দুটি সেন্সরের গড় তাপমাত্রা ও আর্দ্রতা ব্যবহার করা হবে");
  } else {
    Serial.printf("ℹ️ DHT22 #2 not detected on GPIO %d — single sensor mode\n", DHT2_PIN);
  }
  
  if (!sensorInitOK) {
    Serial.println("⚠️ PRIMARY SENSOR ERROR → Failsafe mode!");
    failsafeMode = true;
    digitalWrite(FAN_RELAY_PIN, LOW);  // Active LOW - ON
    fanOn = true;
    fanSpeed = "HIGH";
  }
  
  // === LOAD FARM PROFILE FROM EEPROM ===
  EEPROM.begin(EEPROM_SIZE);
  loadFarmProfile();
  
  // === LOAD AGE TICK TIME FOR OFFLINE TRACKING ===
  if (isBroiler()) {
    loadAgeTickTime();
    lastAgeIncreaseMillis = millis();  // Prevent overflow after reboot
  }
  
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
  digitalWrite(FAN_RELAY_PIN, LOW);  // Active LOW - ON
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
  Serial.println("║  🆕 7-Module Advanced Automation: ENABLED                  ║");
  Serial.println("╚════════════════════════════════════════════════════════════╝\n");
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN LOOP
// ═══════════════════════════════════════════════════════════════════════

void loop() {
  static unsigned long lastSensorRead = 0;
  static unsigned long lastCloudAttempt = 0;
  static unsigned long lastRuleUpdate = 0;
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
  
  // ⚡ REAL-TIME COMMAND CHECK (every 5 seconds)
  if (now - lastCommandCheck >= COMMAND_CHECK_INTERVAL) {
    if (wifiConnected) {
      checkPendingCommands();
    }
    lastCommandCheck = now;
  }
  
  // Sync with cloud (every 30 seconds)
  if (now - lastCloudAttempt >= CLOUD_SYNC_INTERVAL) {
    if (wifiConnected) {
      syncWithCloud();
    } else {
      checkFailsafeTimeout();
    }
    lastCloudAttempt = now;
  }
  
  // 📦 OTA UPDATE CHECK (every 1 hour)
  if (now - lastOTACheck >= OTA_CHECK_INTERVAL && wifiConnected && !otaInProgress) {
    checkOTAUpdate();
  }
  
  // ===== CONTROL ENGINE =====
   if (bootFanDone && !safeModeActive) {
    controlLogic();
    
    // 💡 LIGHTING SCHEDULE CONTROL + PWM FADE
    if (now - lastLightingCheck >= LIGHTING_CHECK_INTERVAL) {
      controlLighting();
      
      // Layer farm: 10 min light-off protection
      if (isLayer()) {
        checkLayerLightingProtection();
      }
      
      lastLightingCheck = now;
    }
    
    // 🆕 Update lighting fade animation (runs every loop)
    updateLightingWithFade();
    
    // 💧 SMART WATER MONITORING
    waterFlowTick();
    
    // 🐔 OFFLINE AGE TICK (Broiler only)
    ageTick();
    
    // Update broiler age & temp rules every hour (Broiler only)
    if (isBroiler() && now - lastRuleUpdate >= 3600000) {
      updateBroilerTempRules();
      lastRuleUpdate = now;
    }
  }
  
  // ✅ Run safety + feed watchdog every loop
  runSafetyChecks();
  esp_task_wdt_reset();

  delay(100);
}
