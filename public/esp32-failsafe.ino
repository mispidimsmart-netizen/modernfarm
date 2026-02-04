/*
 * Smart Layer Farm - ESP32 Fail-Safe Controller
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
 * ARCHITECTURE:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                        CLOUD (Supervisor)                        │
 * │         - Advanced analytics & predictions                       │
 * │         - Cross-shed coordination (optional)                     │
 * │         - Historical data & reports                              │
 * │         - NOT a single point of failure!                         │
 * └─────────────────────────────────────────────────────────────────┘
 *                    ↕ Internet (may fail)
 * ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
 * │   SHED A       │  │   SHED B       │  │   SHED C       │
 * │   ESP32-A      │  │   ESP32-B      │  │   ESP32-C      │
 * │   (Guardian)   │  │   (Guardian)   │  │   (Guardian)   │
 * │                │  │                │  │                │
 * │  ✓ Own sensors │  │  ✓ Own sensors │  │  ✓ Own sensors │
 * │  ✓ Own rules   │  │  ✓ Own rules   │  │  ✓ Own rules   │
 * │  ✓ Own relays  │  │  ✓ Own relays  │  │  ✓ Own relays  │
 * │  ✓ Own backup  │  │  ✓ Own backup  │  │  ✓ Own backup  │
 * └────────────────┘  └────────────────┘  └────────────────┘
 *        ↑                   ↑                   ↑
 *   INDEPENDENT         INDEPENDENT         INDEPENDENT
 * 
 * KEY PRINCIPLES:
 * 1. Each ESP32 = One Shed's Guardian
 * 2. Cloud failure → Local rules take over (5 min timeout)
 * 3. Sensor failure → "When in doubt, Fan ON"
 * 4. Manual override button → ALWAYS works (physical)
 * 5. HSI = Temperature + (Humidity × 0.1)
 * 6. 🔧 WATCHDOG PROTECTION:
 *    - Firmware freeze > 8 sec → Auto Restart → Fan ON default
 *    - Prevents indefinite hangs from killing birds
 * 7. 🛡️ DEFAULT SAFE STATE (সবচেয়ে গুরুত্বপূর্ণ!):
 *    - যেকোনো অজানা error → Fan ON + Alarm periodic + NEVER stay OFF
 *    - This is the ultimate fallback for any unknown condition
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <DHT.h>
#include <esp_task_wdt.h>       // 🔧 Watchdog Timer
#include <esp_system.h>         // 🔧 For esp_reset_reason()
#include <rom/rtc.h>            // 🔧 For rtc_get_reset_reason()

// ================ WATCHDOG CONFIGURATION ================
// 🛡️ WATCHDOG PROTECTION:
//    Firmware freeze > 8 sec → Auto Restart → After restart → Fan ON default
//    This prevents indefinite hangs from killing birds
#define WDT_TIMEOUT 8  // 8 seconds watchdog timeout

// 🛡️ WATCHDOG RESTART DETECTION
// After WDT reset, system starts with Fan ON for safety
bool wasWatchdogReset = false;  // True if ESP32 was reset by watchdog

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

// 🔥 HEATER RELAY PIN (for Broiler cold temperature control)
// Enable heater when temp < target - 2°C (for young chicks)
#define HEATER_RELAY_PIN 13          // Heater relay control (optional)
bool heaterOn = false;               // Heater state

// 🔘 LOCAL MANUAL OVERRIDE BUTTON (CRITICAL!)
// This button bypasses ALL automation and Cloud commands
// Press and hold for 3 seconds to toggle manual override
#define MANUAL_OVERRIDE_BTN_PIN 32
#define MANUAL_FAN_BTN_PIN 14        // Direct fan control in manual mode
#define MANUAL_ALARM_BTN_PIN 12      // Direct alarm control in manual mode

// ================ SHED CONFIGURATION ================
// ⚠️ IMPORTANT: Each ESP32 belongs to ONE shed only!
// This ensures isolation - one shed fail ≠ whole farm fail
const char* SHED_ID = "YOUR_SHED_ID";       // UUID from app
const char* SHED_NAME = "Shed A";           // Human readable name
const char* FARM_ID = "YOUR_FARM_ID";       // Farm identifier

// ================ NETWORK CONFIGURATION ================
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* API_URL = "https://hbwfuvqrfgtefozajyfu.supabase.co/functions/v1/esp32-api";
const char* DEVICE_TOKEN = "YOUR_DEVICE_TOKEN";

// ================ TIMING CONSTANTS ================
const unsigned long CLOUD_SYNC_INTERVAL = 30000;      // 30 seconds
const unsigned long SENSOR_READ_INTERVAL = 5000;      // 5 seconds
const unsigned long FAILSAFE_CHECK_INTERVAL = 10000;  // 10 seconds
const unsigned long WIFI_RECONNECT_INTERVAL = 60000;  // 1 minute
const unsigned long CLOUD_TIMEOUT = 300000;           // ⚠️ 5 MINUTES = FAILSAFE MODE
const unsigned long MANUAL_OVERRIDE_HOLD_TIME = 3000; // 3 seconds to toggle manual mode

// ================ OBJECTS ================
DHT dht(DHT_PIN, DHT_TYPE);
Preferences preferences;

// ================ STATE VARIABLES ================
// Connection state
bool wifiConnected = false;
bool cloudConnected = false;
bool failsafeMode = false;
unsigned long lastCloudSync = 0;
unsigned long lastWifiAttempt = 0;
unsigned long failsafeActivatedAt = 0;
int cloudFailCount = 0;

// 🔘 LOCAL MANUAL OVERRIDE STATE
// When enabled, ALL automation is bypassed - human is in control
bool localManualOverride = false;
unsigned long manualOverrideBtnPressTime = 0;
bool manualOverrideBtnWasPressed = false;
bool manualFanState = false;        // Fan state in manual mode
bool manualAlarmState = false;      // Alarm state in manual mode

// 🧠 STATE MEMORY (Very Important!)
// These values are remembered even when cloud is down
float lastSafeTemp = 25.0;           // Last known safe temperature
bool lastSafeFanState = false;        // Last known fan state from cloud
String lastSafeFanSpeed = "OFF";      // Last known fan speed from cloud
unsigned long lastCloudContactTime = 0;  // When cloud was last contacted (millis)
bool lastSafeLightState = false;      // Last known light state
int lastSafeLightBrightness = 0;      // Last known brightness
bool cloudEverConnected = false;      // Has cloud ever connected since boot?

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
int lightBrightness = 0;

// 🏭 SHED ISOLATION STATUS
// Each shed reports its own status independently
String currentMode = "AUTO";      // AUTO, MANUAL, FAIL_SAFE
String systemState = "NORMAL";    // NORMAL, MILD_STRESS, HIGH_STRESS, DANGER
float currentHSI = 0;

// 🔧 FAN RELAY HEALTH CHECK (Watchdog)
bool fanRelayHealthy = true;
unsigned long lastFanToggleTime = 0;
bool expectedFanState = false;
int fanHealthCheckFailCount = 0;
const int FAN_HEALTH_CHECK_INTERVAL = 60000;  // Check every 60 seconds
const int MAX_FAN_HEALTH_FAILURES = 3;        // 3 failures = relay problem

// 🔥 SENSOR FAILURE PROTECTION
// যদি 15 sec data না আসে → Sensor Error Mode → Fan ON + Alarm slow beep
unsigned long lastValidSensorRead = 0;        // Last time valid sensor data received
const unsigned long SENSOR_TIMEOUT = 15000;   // 15 seconds timeout
bool sensorErrorMode = false;                 // Sensor error mode active
unsigned long lastSlowBeep = 0;               // For slow beep pattern

// 💧 WATER INTAKE SAFETY
// ৬ ঘন্টা pulse না থাকলে → Water Failure Alert + Buzzer intermittent
unsigned long lastWaterPulseTime = 0;         // Last time water pulse detected
const unsigned long WATER_TIMEOUT = 21600000; // 6 hours in milliseconds (6 * 60 * 60 * 1000)
bool waterFailureMode = false;                // Water failure alert active
unsigned long lastWaterBeep = 0;              // For intermittent buzzer pattern
volatile unsigned long waterPulseCount = 0;   // ISR counter for water pulses
unsigned long lastWaterPulseCheck = 0;        // For tracking pulse changes

// 🛡️ DEFAULT SAFE STATE (সবচেয়ে গুরুত্বপূর্ণ!)
// যেকোনো অজানা error হলে → Fan ON + Alarm periodic + Never stay OFF
bool defaultSafeStateActive = false;          // Default safe state active
unsigned long lastDefaultSafeAlarm = 0;       // For periodic alarm pattern
const unsigned long DEFAULT_SAFE_ALARM_ON = 500;   // Alarm ON 0.5 sec
const unsigned long DEFAULT_SAFE_ALARM_OFF = 5000; // Alarm OFF 5 sec
bool defaultSafeAlarmPhase = false;           // false = OFF phase, true = ON phase
unsigned long defaultSafePhaseStart = 0;      // Phase start time

// 💡 LAYER LIGHTING PROTECTION (Alert Only)
// Lighting schedule cloud দিবে - ESP32 শুধু detect করবে
// Daytime detected AND light OFF > 10 min → Production warning beep
bool isDaytime = false;                       // Synced from cloud or time-based
unsigned long lightOffStartTime = 0;          // When light turned OFF
bool lightWasOn = false;                      // Previous light state
bool lightingAlertActive = false;             // Lighting alert currently active
const unsigned long LIGHT_OFF_ALERT_TIMEOUT = 600000;  // 10 minutes in milliseconds
unsigned long lastLightingAlertBeep = 0;      // For warning beep pattern
// ================ FARM TYPE CONFIGURATION ================
// 🐔 FARM_TYPE: "LAYER" or "BROILER" - synced from cloud
// BROILER uses age-based temperature thresholds
// LAYER uses fixed HSI thresholds
// ⚠️ These values are auto-synced from cloud on first connection
String FARM_TYPE = "LAYER";  // Default: LAYER (synced from cloud)
int BROILER_AGE_DAYS = 1;    // Current broiler batch age in days (synced from cloud)
bool farmTypeSyncedFromCloud = false;  // Track if we've synced from cloud

// ================ BROILER TEMPERATURE CURVE ================
// Age-based temperature thresholds for broilers
struct BroilerTempCurve {
  int minDays;
  int maxDays;
  float minTemp;
  float maxTemp;
};

const BroilerTempCurve BROILER_TEMP_CURVE[] = {
  { 1,  3, 33, 34 },   // Day 1-3: 33-34°C
  { 4,  7, 32, 32 },   // Day 4-7: 32°C
  { 8, 14, 30, 30 },   // Day 8-14: 30°C
  { 15, 21, 28, 28 },  // Day 15-21: 28°C
  { 22, 28, 26, 26 },  // Day 22-28: 26°C
  { 29, 35, 24, 24 },  // Day 29-35: 24°C
  { 36, 999, 22, 23 }  // Day 36+: 22-23°C
};
const int BROILER_CURVE_SIZE = 7;

// ================ BROILER THRESHOLDS ================
// These match the web app's BROILER_THRESHOLDS
const float BROILER_TEMP_FAN_HIGH_DEV = 2.0;    // +2°C → fan HIGH
const float BROILER_TEMP_HEATER_DEV = 2.0;      // -2°C → heater ON
const float BROILER_TEMP_ALARM_DEV = 4.0;       // +4°C → alarm
const float BROILER_HUMIDITY_LOW = 40.0;        // <40% → warning
const float BROILER_HUMIDITY_HIGH = 75.0;       // >75% → ventilation
const float BROILER_AMMONIA_FAN = 20.0;         // >20ppm → fan ON
const float BROILER_AMMONIA_ALARM = 30.0;       // >30ppm → alarm
const float BROILER_HSI_FAN_HIGH = 38.0;        // >38 → fan HIGH
const float BROILER_HSI_EMERGENCY = 42.0;       // >42 → fan MAX + alarm
const float BROILER_HSI_CRITICAL = 45.0;        // >45 → emergency mode (continuous alarm)

// ================ LAYER TEMPERATURE THRESHOLDS ================
// 👉 Layer sudden heat change সহ্য করতে পারে না!
// More strict thresholds for layer farms
const float LAYER_TEMP_HEATER_ON = 18.0;      // <18°C → Heater ON (cold protection)
const float LAYER_TEMP_IDEAL_MIN = 18.0;      // 18-27°C = Ideal range
const float LAYER_TEMP_IDEAL_MAX = 27.0;      
const float LAYER_TEMP_FAN_HIGH = 30.0;       // >30°C → Fan HIGH
const float LAYER_TEMP_ALARM = 33.0;          // >33°C → Alarm + Max Ventilation

// ================ LAYER HUMIDITY THRESHOLDS ================
// Layer needs stable humidity for egg production
const float LAYER_HUMIDITY_LOW = 40.0;        // <40% → Warning beep
const float LAYER_HUMIDITY_IDEAL_MIN = 50.0;  // 50-70% = Ideal range
const float LAYER_HUMIDITY_IDEAL_MAX = 70.0;
const float LAYER_HUMIDITY_HIGH = 75.0;       // >75% → Ventilation increase

// ================ LAYER AMMONIA THRESHOLDS ================
// Ammonia is dangerous gas - immediate action required
const float LAYER_AMMONIA_FAN_ON = 15.0;      // >15 ppm → Fan ON
const float LAYER_AMMONIA_ALARM = 25.0;       // >25 ppm → Alarm + Fan HIGH

// ================ LAYER HSI THRESHOLDS ================
// 🔥 CRITICAL: These run LOCALLY without waiting for cloud!
// HSI = Temperature + (Humidity × 0.1)
// 📌 Layer এ heat stress = egg production drop
const float LAYER_HSI_NORMAL = 30.0;      // < 30 → Normal (no action)
const float LAYER_HSI_FAN_LOW = 30.0;     // 30-35 → Fan LOW
const float LAYER_HSI_FAN_HIGH = 35.0;    // 35-40 → Fan HIGH
const float LAYER_HSI_EMERGENCY = 40.0;   // > 40 → Emergency Alarm + Max Ventilation

// ================ CACHED SETTINGS (EEPROM) ================
struct CachedSettings {
  // Temperature thresholds (Layer)
  float tempMin = 18.0;
  float tempMax = 32.0;
  
  // Humidity thresholds
  float humidityMin = 40.0;
  float humidityMax = 80.0;
  
  // Ammonia threshold
  float ammoniaMax = 25.0;
  
  // Fan speed thresholds (Layer)
  float fanLowTempMin = 28.0;
  float fanLowTempMax = 30.0;
  float fanMedTempMin = 30.0;
  float fanMedTempMax = 33.0;
  float fanHighTempMin = 33.0;
  
  // 🔥 HSI Thresholds (Layer - Simple Formula: HSI = Temp + Humidity × 0.1)
  // Layer: HSI < 30 = Normal, 30-35 = Mild, 35-40 = High, > 40 = Danger
  float hsiNormal = 30.0;      // < 30: Normal → Fan OFF or LOW
  float hsiMild = 35.0;        // 30-35: Mild Stress → Fan LOW
  float hsiHigh = 40.0;        // 35-40: High Stress → Fan HIGH
  float hsiDanger = 40.0;      // > 40: Danger → Fan HIGH + Alert
  
  // Cloud HSI thresholds (THI Formula) - mapped for compatibility
  float hsiMildCloud = 70.0;      // Cloud mild threshold
  float hsiModerateCloud = 75.0;  // Cloud moderate threshold
  float hsiSevereCloud = 80.0;    // Cloud severe threshold
  float hsiEmergencyCloud = 85.0; // Cloud emergency threshold
  
  // Lighting schedule
  int lightStartHour = 5;
  int lightStartMinute = 0;
  int lightEndHour = 21;
  int lightEndMinute = 0;
  int fadeInMinutes = 30;
  int fadeOutMinutes = 30;
  int minBrightness = 0;
  int maxBrightness = 100;
  
  // Version for sync tracking
  int version = 0;
  
  // Checksum for validation
  uint32_t checksum = 0;
} cachedSettings;

// Get broiler target temperature based on age
void getBroilerTargetTemp(int ageDays, float &minTemp, float &maxTemp) {
  for (int i = 0; i < BROILER_CURVE_SIZE; i++) {
    if (ageDays >= BROILER_TEMP_CURVE[i].minDays && ageDays <= BROILER_TEMP_CURVE[i].maxDays) {
      minTemp = BROILER_TEMP_CURVE[i].minTemp;
      maxTemp = BROILER_TEMP_CURVE[i].maxTemp;
      return;
    }
  }
  // Default to last curve entry
  minTemp = BROILER_TEMP_CURVE[BROILER_CURVE_SIZE - 1].minTemp;
  maxTemp = BROILER_TEMP_CURVE[BROILER_CURVE_SIZE - 1].maxTemp;
}

// ================ BOOT BEHAVIOUR ================
// Power ON → Initialize sensors → Load last saved settings → 
// Fan ON for 30 sec (air refresh) → Enter AUTO mode
// If sensor not found: FAIL-SAFE MODE → Fan ON

bool sensorInitSuccess = true;
bool bootFanDone = false;
unsigned long bootFanStartTime = 0;
const unsigned long BOOT_FAN_DURATION = 20000;  // 20 seconds air refresh (air refresh for boot)

void setup() {
  Serial.begin(115200);
  Serial.println("\n╔══════════════════════════════════════════════════════════════╗");
  Serial.println("║    Smart Farm - ESP32 Fail-Safe Controller v4.1              ║");
  Serial.println("║    🏭 BIG FARM ARCHITECTURE: Each Shed = Independent Unit    ║");
  Serial.println("╚══════════════════════════════════════════════════════════════╝\n");
  Serial.printf("  Shed: %s (%s)\n", SHED_NAME, SHED_ID);
  Serial.printf("  Farm: %s\n\n", FARM_ID);
  
  // ========== STEP 0: CHECK RESET REASON (Watchdog Protection) ==========
  // 🛡️ Firmware freeze > 8 sec → Auto Restart → After restart → Fan ON
  esp_reset_reason_t resetReason = esp_reset_reason();
  RESET_REASON rtcResetReason = rtc_get_reset_reason(0);  // Core 0
  
  Serial.println("▶ Step 0: Checking reset reason...");
  Serial.printf("  ESP Reset Reason: %d, RTC Reason: %d\n", resetReason, rtcResetReason);
  
  // Check if reset was caused by watchdog
  if (resetReason == ESP_RST_TASK_WDT ||    // Task watchdog
      resetReason == ESP_RST_WDT ||         // Other watchdog
      resetReason == ESP_RST_INT_WDT ||     // Interrupt watchdog
      rtcResetReason == TG0WDT_SYS_RESET || // Timer Group 0 WDT
      rtcResetReason == TG1WDT_SYS_RESET || // Timer Group 1 WDT
      rtcResetReason == RTCWDT_SYS_RESET || // RTC WDT
      rtcResetReason == RTCWDT_CPU_RESET) { // RTC CPU reset
    
    wasWatchdogReset = true;
    Serial.println("\n╔════════════════════════════════════════════════════════════╗");
    Serial.println("║  ⚠️🔧 WATCHDOG RESTART DETECTED!                            ║");
    Serial.println("║  Firmware freeze > 8 sec → Auto Restart → Fan ON default   ║");
    Serial.println("║  যেকোনো unknown error: Fan ON — Never keep ventilation OFF  ║");
    Serial.println("╚════════════════════════════════════════════════════════════╝\n");
  } else if (resetReason == ESP_RST_PANIC) {
    wasWatchdogReset = true;  // Treat panic as critical too
    Serial.println("\n⚠️ PANIC RESTART DETECTED! Activating safe mode...\n");
  } else {
    Serial.println("  ✓ Normal boot (not watchdog reset)");
  }
  
  // ========== STEP 1: Initialize Output Pins ==========
  Serial.println("\n▶ Step 1: Initializing output pins...");
  pinMode(FAN_RELAY_PIN, OUTPUT);
  pinMode(LIGHT_PWM_PIN, OUTPUT);
  pinMode(ALARM_RELAY_PIN, OUTPUT);
  pinMode(STATUS_LED_PIN, OUTPUT);
  pinMode(HEATER_RELAY_PIN, OUTPUT);  // 🔥 Heater for Broiler cold temps
  
  // 🛡️ WATCHDOG RESTART: Start with Fan ON for safety
  if (wasWatchdogReset) {
    digitalWrite(FAN_RELAY_PIN, HIGH);   // Fan ON immediately!
    digitalWrite(ALARM_RELAY_PIN, LOW);  // Alarm off initially
    digitalWrite(HEATER_RELAY_PIN, LOW); // Heater OFF
    digitalWrite(STATUS_LED_PIN, HIGH);
    Serial.println("🛡️ WATCHDOG SAFETY: Fan forced ON after restart!");
  } else {
    // Normal boot: fan OFF, will turn on after sensor check
    digitalWrite(FAN_RELAY_PIN, LOW);
    digitalWrite(ALARM_RELAY_PIN, LOW);
    digitalWrite(HEATER_RELAY_PIN, LOW);
    digitalWrite(STATUS_LED_PIN, HIGH);  // LED on during boot
  }
  
  // Initialize input pins
  pinMode(POWER_SENSE_PIN, INPUT);
  pinMode(WATER_FLOW_PIN, INPUT_PULLUP);
  
  // 💧 Attach water flow meter interrupt for pulse counting
  attachInterrupt(digitalPinToInterrupt(WATER_FLOW_PIN), waterPulseISR, FALLING);
  lastWaterPulseTime = millis();  // Initialize water pulse tracking
  Serial.println("✓ Water flow meter interrupt attached");
  
  // 🔘 Initialize manual override buttons (CRITICAL for big farm safety)
  pinMode(MANUAL_OVERRIDE_BTN_PIN, INPUT_PULLUP);
  pinMode(MANUAL_FAN_BTN_PIN, INPUT_PULLUP);
  pinMode(MANUAL_ALARM_BTN_PIN, INPUT_PULLUP);
  
  // Initialize PWM for light
  ledcSetup(0, 1000, 8);  // Channel 0, 1kHz, 8-bit
  ledcAttachPin(LIGHT_PWM_PIN, 0);
  Serial.println("✓ Output pins initialized");
  
  // ========== STEP 2: Initialize Sensors ==========
  Serial.println("\n▶ Step 2: Initializing sensors...");
  dht.begin();
  delay(2000);  // Wait for DHT sensor to stabilize
  
  // Test DHT sensor
  float testTemp = dht.readTemperature();
  float testHum = dht.readHumidity();
  
  if (isnan(testTemp) || isnan(testHum)) {
    Serial.println("⚠️ DHT22 SENSOR ERROR - Cannot read temperature/humidity!");
    sensorInitSuccess = false;
  } else {
    Serial.printf("✓ DHT22 OK: Temp=%.1f°C, Humidity=%.1f%%\n", testTemp, testHum);
    lastValidSensorRead = millis();  // Initialize sensor timeout tracking
  }
  
  // Test MQ135 ammonia sensor
  int ammoniaRaw = analogRead(MQ135_PIN);
  if (ammoniaRaw < 10 || ammoniaRaw > 4090) {  // ADC out of range
    Serial.println("⚠️ MQ135 SENSOR WARNING - Ammonia reading abnormal");
    // Don't fail for ammonia, but log warning
  } else {
    Serial.printf("✓ MQ135 OK: Raw ADC=%d\n", ammoniaRaw);
  }
  
  // ========== STEP 3: Load Cached Settings ==========
  Serial.println("\n▶ Step 3: Loading cached settings from EEPROM...");
  loadCachedSettings();
  Serial.printf("✓ Settings loaded (version: %d)\n", cachedSettings.version);
  
  // ========== STEP 4: Watchdog Restart or Sensor Fail = FAILSAFE MODE ==========
  // 🛡️ Watchdog restart → Fan ON immediately (already done in Step 1)
  if (wasWatchdogReset) {
    Serial.println("\n╔════════════════════════════════════════════════════════════╗");
    Serial.println("║  ⚠️🔧 WATCHDOG RESTART - ENTERING SAFE MODE                 ║");
    Serial.println("║  Firmware freeze > 8 sec → Auto Restart → Fan ON default   ║");
    Serial.println("║  যেকোনো unknown error: Fan ON — Never keep ventilation OFF  ║");
    Serial.println("╚════════════════════════════════════════════════════════════╝\n");
    
    failsafeMode = true;
    failsafeActivatedAt = millis();
    fanOn = true;
    fanSpeed = "HIGH";
    systemState = "WATCHDOG_RESTART";
    
    // Alert beeps for watchdog restart (distinctive pattern: 2 quick beeps)
    for (int i = 0; i < 2; i++) {
      digitalWrite(ALARM_RELAY_PIN, HIGH);
      delay(200);
      digitalWrite(ALARM_RELAY_PIN, LOW);
      delay(200);
    }
    Serial.println("🔥 Fan ON (WATCHDOG RESTART) - Safe mode active until cloud sync");
  }
  
  if (!sensorInitSuccess) {
    Serial.println("\n╔════════════════════════════════════════════════════════════╗");
    Serial.println("║  ⚠️ SENSOR INITIALIZATION FAILED - ENTERING FAIL-SAFE     ║");
    Serial.println("║  যদি sensor না পাওয়া যায়: FAIL-SAFE MODE → Fan ON          ║");
    Serial.println("╚════════════════════════════════════════════════════════════╝\n");
    failsafeMode = true;
    failsafeActivatedAt = millis();
    
    // Turn on fan immediately for safety
    digitalWrite(FAN_RELAY_PIN, HIGH);
    fanOn = true;
    fanSpeed = "HIGH";
    
    // 🔊 SLOW ALARM PATTERN - sensor not detected at boot
    // Slow beep: 1 sec ON, 2 sec OFF - continuous until sensor restored
    sensorErrorMode = true;
    Serial.println("🔥 Fan ON (FAILSAFE) + SLOW ALARM - Sensor not detected at boot");
    Serial.println("   Alarm pattern: 1 sec ON, 2 sec OFF (continuous)");
    
    // Initial alarm notification (3 slow beeps)
    for (int i = 0; i < 3; i++) {
      digitalWrite(ALARM_RELAY_PIN, HIGH);
      delay(1000);  // 1 sec ON
      digitalWrite(ALARM_RELAY_PIN, LOW);
      delay(2000);  // 2 sec OFF
    }
  }
  
  // ========== STEP 5: Boot Fan Sequence (20 sec air refresh) ==========
  Serial.println("\n▶ Step 5: Starting boot fan sequence (20 sec air refresh)...");
  digitalWrite(FAN_RELAY_PIN, HIGH);
  fanOn = true;
  fanSpeed = "HIGH";
  bootFanStartTime = millis();
  bootFanDone = false;
  Serial.println("🌀 Fan ON for 20 seconds - Air refresh sequence");
  
  // ========== STEP 6: Connect WiFi ==========
  Serial.println("\n▶ Step 6: Connecting to WiFi...");
  connectWiFi();
  
  // ========== STEP 7: Initial Cloud Sync ==========
  if (wifiConnected) {
    Serial.println("\n▶ Step 7: Initial cloud sync...");
    syncWithCloud();
  } else {
    Serial.println("\n⚠️ Step 7: Skipped cloud sync (no WiFi)");
  }
  
  // ========== STEP 8: Initialize Watchdog Timer ==========
  // 🛡️ Firmware freeze > 8 sec → Auto Restart → After restart → Fan ON
  Serial.println("\n▶ Step 8: Initializing Watchdog Timer (8 sec)...");
  esp_task_wdt_init(WDT_TIMEOUT, true);  // Enable panic so ESP32 restarts
  esp_task_wdt_add(NULL);                // Add current thread to WDT watch
  Serial.println("✓ Watchdog Timer initialized (8 sec timeout)");
  Serial.println("  → If loop freezes > 8 sec, WDT will restart ESP32");
  Serial.println("  → After restart, Fan will be ON by default (safety)");
  
  // ========== BOOT COMPLETE ==========
  digitalWrite(STATUS_LED_PIN, LOW);  // LED off after boot
  
  // Determine boot mode string
  String bootMode = "AUTO";
  if (wasWatchdogReset) bootMode = "WATCHDOG_RESTART (Fan ON)";
  else if (failsafeMode) bootMode = "FAIL_SAFE (Sensor Error)";
  
  Serial.println("\n╔════════════════════════════════════════════════════════════╗");
  Serial.println("║  ✅ BOOT SEQUENCE COMPLETE                                 ║");
  Serial.println("╠════════════════════════════════════════════════════════════╣");
  Serial.printf("║  Mode: %s\n", bootMode.c_str());
  Serial.printf("║  Sensors: %s\n", sensorInitSuccess ? "OK" : "ERROR - Fan ON");
  Serial.printf("║  WiFi: %s\n", wifiConnected ? "Connected" : "Disconnected");
  Serial.println("║  Watchdog: Enabled (8 sec timeout → restart → Fan ON)");
  Serial.println("║  Default Safe State: Ready (unknown error → Fan ON)");
  Serial.printf("║  Watchdog Restart: %s\n", wasWatchdogReset ? "YES - Fan forced ON" : "No");
  Serial.printf("║  Boot Fan: Running (20 sec remaining)\n");
  Serial.println("╚════════════════════════════════════════════════════════════╝\n");
}

// ================ MAIN LOOP ================
void loop() {
  static unsigned long lastSensorRead = 0;
  static unsigned long lastCloudAttempt = 0;
  static unsigned long lastFailsafeCheck = 0;
  static unsigned long lastStateReport = 0;
  
  unsigned long now = millis();
  
  // ========== CHECK BOOT FAN SEQUENCE ==========
  // After 30 seconds, turn off boot fan and enter AUTO mode
  if (!bootFanDone && now - bootFanStartTime >= BOOT_FAN_DURATION) {
    bootFanDone = true;
    Serial.println("\n✅ Boot fan sequence complete (20 sec)");
    Serial.println("▶ Entering AUTO mode...\n");
    
    // Only turn off fan if sensors are OK and temperature is normal
    if (sensorInitSuccess) {
      float currentTemp = dht.readTemperature();
      if (!isnan(currentTemp) && currentTemp < cachedSettings.fanMedTempMin) {
        digitalWrite(FAN_RELAY_PIN, LOW);
        fanOn = false;
        fanSpeed = "OFF";
        Serial.println("✓ Boot fan OFF - Temperature normal, entering AUTO");
      } else {
        Serial.printf("⚠️ Boot fan remains ON - Temp=%.1f°C (threshold: %.1f°C)\n", 
                      currentTemp, cachedSettings.fanMedTempMin);
      }
    } else {
      Serial.println("⚠️ Boot fan remains ON - Sensor error (FAILSAFE)");
    }
  }
  
  // 🔘 ALWAYS CHECK MANUAL OVERRIDE BUTTON FIRST!
  // This must work even if everything else fails
  checkManualOverrideButton();
  
  // 1. Read sensors regularly
  if (now - lastSensorRead >= SENSOR_READ_INTERVAL) {
    readSensors();
    
    // ⚠️ SENSOR ERROR CHECK - "সন্দেহ হলে Fan ON"
    if (isnan(temperature) || isnan(humidity)) {
      // Sensor read failed, but don't trigger immediately
      // Wait for SENSOR_TIMEOUT (15 sec) before entering error mode
    } else {
      // Valid sensor read - reset timeout
      lastValidSensorRead = now;
      if (sensorErrorMode) {
        // Exit sensor error mode
        sensorErrorMode = false;
        Serial.println("✅ Sensor data restored - Exiting Sensor Error Mode");
        // Only clear alarm if other conditions are safe
        if (currentHSI < HSI_FAN_MAX_ALARM && ammonia < BROILER_AMMONIA_ALARM) {
          alarmOn = false;
          digitalWrite(ALARM_RELAY_PIN, LOW);
        }
      }
    }
    
    lastSensorRead = now;
  }
  
  // 🔥 SENSOR FAILURE PROTECTION (15 sec timeout)
  // যদি 15 sec data না আসে → Sensor Error Mode → Fan ON + Alarm slow beep
  if (!sensorErrorMode && lastValidSensorRead > 0 && 
      (now - lastValidSensorRead >= SENSOR_TIMEOUT)) {
    sensorErrorMode = true;
    
    Serial.println("\n╔════════════════════════════════════════════════════════════╗");
    Serial.println("║  ⚠️ SENSOR FAILURE MODE - No data for 15 seconds!          ║");
    Serial.println("║  যদি 15 sec sensor data না আসে:                            ║");
    Serial.println("║  → Sensor Failure Mode                                      ║");
    Serial.println("║  → Fan ON                                                   ║");
    Serial.println("║  → Alarm pulse every 20 sec                                 ║");
    Serial.println("╚════════════════════════════════════════════════════════════╝\n");
    
    // Activate failsafe
    if (!failsafeMode) {
      activateFailsafe("Sensor timeout - no data for 15 seconds");
    }
    
    // Fan ON (HIGH) for safety
    digitalWrite(FAN_RELAY_PIN, HIGH);
    fanOn = true;
    fanSpeed = "HIGH";
    systemState = "SENSOR_FAILURE";
  }
  
  // 🔊 SENSOR FAILURE ALARM PATTERN (pulse every 20 sec)
  // যদি 15 sec sensor data না আসে: Fan ON + Alarm pulse every 20 sec
  if (sensorErrorMode) {
    static unsigned long lastSensorAlarmPulse = 0;
    
    // Alarm pulse: 0.5 sec ON, every 20 sec
    if (now - lastSensorAlarmPulse >= 20000) {
      digitalWrite(ALARM_RELAY_PIN, HIGH);
      delay(500);  // 0.5 sec pulse
      digitalWrite(ALARM_RELAY_PIN, LOW);
      lastSensorAlarmPulse = now;
      Serial.println("🔔 Sensor Failure Alarm pulse (every 20 sec)");
    }
  }
  
  // 2. If in local manual override, skip all automation
  if (localManualOverride) {
    handleLocalManualMode();
    updateStatusLED();
    delay(100);
    return;  // Skip cloud sync and automation
  }
  
  // 3. Check connection status
  checkConnectionStatus();
  
  // 4. Try cloud sync if connected
  if (wifiConnected && now - lastCloudAttempt >= CLOUD_SYNC_INTERVAL) {
    syncWithCloud();
    lastCloudAttempt = now;
  }
  
  // 5. Check failsafe status
  if (now - lastFailsafeCheck >= FAILSAFE_CHECK_INTERVAL) {
    checkFailsafeStatus();
    lastFailsafeCheck = now;
  }
  
  // 💧 6. WATER INTAKE SAFETY CHECK
  // ৬ ঘন্টা pulse না থাকলে → Water Failure Alert + Buzzer intermittent
  checkWaterIntakeSafety(now);
  
  // 🛡️ 7. DEFAULT SAFE STATE CHECK (সবচেয়ে গুরুত্বপূর্ণ!)
  // যেকোনো অজানা error হলে → Fan ON + Alarm periodic + Never stay OFF
  checkDefaultSafeState(now);
  
  // 8. Run automation (cloud or local)
  runAutomation();
  
  // 9. Update status LED
  updateStatusLED();
  
  // 🔧 10. Feed Watchdog Timer - prevents auto restart
  // If loop freezes > 8 sec, WDT will restart ESP32
  esp_task_wdt_reset();
  
  // Small delay
  delay(100);
}

// ================ WIFI FUNCTIONS ================
void connectWiFi() {
  Serial.print("Connecting to WiFi");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.println("\n✓ WiFi connected!");
    Serial.printf("  IP: %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("  RSSI: %d dBm\n", WiFi.RSSI());
  } else {
    wifiConnected = false;
    Serial.println("\n✗ WiFi connection failed");
    activateFailsafe("WiFi connection failed");
  }
}

void checkConnectionStatus() {
  bool wasConnected = wifiConnected;
  wifiConnected = (WiFi.status() == WL_CONNECTED);
  
  if (wasConnected && !wifiConnected) {
    Serial.println("⚠ WiFi disconnected!");
    cloudConnected = false;
  }
  
  // Try to reconnect if disconnected
  if (!wifiConnected && millis() - lastWifiAttempt >= WIFI_RECONNECT_INTERVAL) {
    Serial.println("Attempting WiFi reconnection...");
    WiFi.disconnect();
    WiFi.reconnect();
    lastWifiAttempt = millis();
  }
}

// ================ CLOUD SYNC FUNCTIONS ================
void syncWithCloud() {
  if (!wifiConnected) return;
  
  Serial.println("\n→ Syncing with cloud...");
  
  HTTPClient http;
  String url = String(API_URL) + "/sync";
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-token", DEVICE_TOKEN);
  http.setTimeout(10000);
  
  // Create sync payload
  StaticJsonDocument<768> doc;  // Increased size for new fields
  doc["temperature"] = temperature;
  doc["humidity"] = humidity;
  doc["ammonia"] = ammonia;
  doc["water_usage"] = waterFlow;
  doc["power_on"] = powerOn;
  doc["fan_on"] = fanOn;
  doc["light_on"] = lightOn;
  doc["alarm_on"] = alarmOn;
  doc["fan_speed"] = fanSpeed;
  doc["light_brightness"] = lightBrightness;
  doc["failsafe_mode"] = failsafeMode;
  doc["default_safe_active"] = defaultSafeStateActive;  // 🛡️ Report default safe state
  doc["sensor_error_mode"] = sensorErrorMode;
  doc["water_failure_mode"] = waterFailureMode;
  doc["cached_settings_version"] = cachedSettings.version;
  doc["wifi_rssi"] = WiFi.RSSI();
  doc["uptime_seconds"] = millis() / 1000;
  doc["free_memory"] = ESP.getFreeHeap();
  
  String payload;
  serializeJson(doc, payload);
  
  int httpCode = http.POST(payload);
  
  if (httpCode == 200) {
    String response = http.getString();
    handleCloudResponse(response);
    
    cloudConnected = true;
    lastCloudSync = millis();
    lastCloudContactTime = millis();  // 🧠 Update state memory
    cloudFailCount = 0;
    cloudEverConnected = true;
    
    // 🧠 Save current safe state from cloud
    lastSafeTemp = temperature;
    lastSafeFanState = fanOn;
    lastSafeFanSpeed = fanSpeed;
    lastSafeLightState = lightOn;
    lastSafeLightBrightness = lightBrightness;
    
    // Exit failsafe mode if we were in it
    if (failsafeMode) {
      exitFailsafe();
    }
    
    Serial.println("✓ Cloud sync successful");
    Serial.printf("🧠 State saved: Temp=%.1f, Fan=%s(%s)\n", 
                  lastSafeTemp, lastSafeFanState ? "ON" : "OFF", lastSafeFanSpeed.c_str());
  } else {
    cloudFailCount++;
    Serial.printf("✗ Cloud sync failed: %d (attempt %d)\n", httpCode, cloudFailCount);
    
    if (cloudFailCount >= 3) {
      cloudConnected = false;
    }
  }
  
  http.end();
}

void handleCloudResponse(String response) {
  StaticJsonDocument<1536> doc;  // Increased for farm_type and broiler data
  DeserializationError error = deserializeJson(doc, response);
  
  if (error) {
    Serial.printf("JSON parse error: %s\n", error.c_str());
    return;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 🐔 FARM TYPE AUTO-SYNC FROM CLOUD
  // Automatically syncs LAYER/BROILER mode and broiler age from cloud
  // ═══════════════════════════════════════════════════════════════
  if (doc.containsKey("farm_type")) {
    String cloudFarmType = doc["farm_type"] | "layer";
    cloudFarmType.toUpperCase();
    
    if (cloudFarmType != FARM_TYPE) {
      Serial.printf("\n🔄 FARM TYPE CHANGED: %s → %s\n", FARM_TYPE.c_str(), cloudFarmType.c_str());
      FARM_TYPE = cloudFarmType;
      farmTypeSyncedFromCloud = true;
      
      // Log the change
      Serial.println(FARM_TYPE == "BROILER" ? 
        "🐔 Switched to BROILER mode (age-based temp)" : 
        "🥚 Switched to LAYER mode (fixed HSI thresholds)");
    } else if (!farmTypeSyncedFromCloud) {
      farmTypeSyncedFromCloud = true;
      Serial.printf("✓ Farm type confirmed: %s\n", FARM_TYPE.c_str());
    }
  }
  
  // 🐔 BROILER AGE AUTO-SYNC (from active batch start_date)
  if (doc.containsKey("broiler_age_days")) {
    int cloudAgeDays = doc["broiler_age_days"] | 1;
    if (cloudAgeDays != BROILER_AGE_DAYS && cloudAgeDays > 0) {
      Serial.printf("🐔 BROILER AGE UPDATED: %d → %d days\n", BROILER_AGE_DAYS, cloudAgeDays);
      BROILER_AGE_DAYS = cloudAgeDays;
      
      // Show new target temperature
      float targetMin, targetMax;
      getBroilerTargetTemp(BROILER_AGE_DAYS, targetMin, targetMax);
      Serial.printf("   New Target Temp: %.1f-%.1f°C\n", targetMin, targetMax);
    }
  }
  
  // Check if settings need update
  if (doc.containsKey("settings_version")) {
    int serverVersion = doc["settings_version"];
    if (serverVersion > cachedSettings.version) {
      Serial.println("→ Updating cached settings...");
      updateCachedSettings(doc["settings"]);
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 🛡️ FAILSAFE MODE = IGNORE REMOTE COMMANDS
  // Bird safety কখনো internet depend করবে না!
  // ═══════════════════════════════════════════════════════════════
  if (failsafeMode) {
    Serial.println("⚠️ FAILSAFE MODE: Ignoring remote commands - using LOCAL SAFE RULES");
    Serial.println("   📌 Bird safety কখনো internet depend করবে না!");
    return;  // Don't apply cloud commands in failsafe mode
  }
  
  // Apply cloud commands (only when NOT in failsafe mode)
  if (doc.containsKey("commands")) {
    JsonArray commands = doc["commands"].as<JsonArray>();
    for (JsonObject cmd : commands) {
      executeCommand(cmd);
    }
  }
  
  // Update device controls if not in manual override (only when NOT in failsafe mode)
  if (doc.containsKey("device_status") && !doc["manual_override"].as<bool>()) {
    JsonObject status = doc["device_status"];
    fanOn = status["fan_on"] | false;
    lightOn = status["light_on"] | false;
    alarmOn = status["alarm_on"] | false;
    fanSpeed = status["fan_speed"] | "OFF";
    
    // 🧠 Update last safe state from cloud
    lastSafeFanState = fanOn;
    lastSafeFanSpeed = fanSpeed;
    lastSafeLightState = lightOn;
    
    applyDeviceStates();
  }
}

void updateCachedSettings(JsonObject settings) {
  cachedSettings.tempMin = settings["temperature_min"] | 18.0;
  cachedSettings.tempMax = settings["temperature_max"] | 32.0;
  cachedSettings.humidityMin = settings["humidity_min"] | 40.0;
  cachedSettings.humidityMax = settings["humidity_max"] | 80.0;
  cachedSettings.ammoniaMax = settings["ammonia_max"] | 25.0;
  
  cachedSettings.fanLowTempMin = settings["fan_low_temp_min"] | 28.0;
  cachedSettings.fanLowTempMax = settings["fan_low_temp_max"] | 30.0;
  cachedSettings.fanMedTempMin = settings["fan_medium_temp_min"] | 30.0;
  cachedSettings.fanMedTempMax = settings["fan_medium_temp_max"] | 33.0;
  cachedSettings.fanHighTempMin = settings["fan_high_temp_min"] | 33.0;
  
  // Cloud HSI thresholds (THI formula)
  cachedSettings.hsiMildCloud = settings["hsi_mild_threshold"] | 70.0;
  cachedSettings.hsiModerateCloud = settings["hsi_moderate_threshold"] | 75.0;
  cachedSettings.hsiSevereCloud = settings["hsi_severe_threshold"] | 80.0;
  cachedSettings.hsiEmergencyCloud = settings["hsi_emergency_threshold"] | 85.0;
  
  // Convert cloud THI thresholds to simple HSI for local use
  // Simple HSI = Temp + (Humidity × 0.1) 
  // Cloud THI = 0.8×T + (RH/100)×(T-14.4) + 46.4
  // Approximation for 32°C, 70% humidity: Simple HSI ≈ 39, THI ≈ 80
  // So we map: THI 70 → Simple 30, THI 85 → Simple 42
  cachedSettings.hsiNormal = 30.0;  // Fixed threshold
  cachedSettings.hsiMild = 35.0;    // Fixed threshold  
  cachedSettings.hsiHigh = 40.0;    // Fixed threshold
  cachedSettings.hsiDanger = 40.0;  // Fixed threshold
  
  // Lighting schedule
  String startTime = settings["light_start_time"] | "05:00";
  String endTime = settings["light_end_time"] | "21:00";
  parseTime(startTime, cachedSettings.lightStartHour, cachedSettings.lightStartMinute);
  parseTime(endTime, cachedSettings.lightEndHour, cachedSettings.lightEndMinute);
  
  cachedSettings.fadeInMinutes = settings["fade_in_minutes"] | 30;
  cachedSettings.fadeOutMinutes = settings["fade_out_minutes"] | 30;
  cachedSettings.minBrightness = settings["min_brightness"] | 0;
  cachedSettings.maxBrightness = settings["max_brightness"] | 100;
  
  cachedSettings.version = settings["version"] | (cachedSettings.version + 1);
  
  // Save to EEPROM
  saveCachedSettings();
  
  Serial.printf("✓ Settings updated to version %d\n", cachedSettings.version);
}

void executeCommand(JsonObject cmd) {
  String type = cmd["type"] | "";
  bool value = cmd["value"] | false;
  
  Serial.printf("→ Executing command: %s = %s\n", type.c_str(), value ? "ON" : "OFF");
  
  if (type == "fan") {
    fanOn = value;
    digitalWrite(FAN_RELAY_PIN, fanOn ? HIGH : LOW);
  } else if (type == "light") {
    lightOn = value;
    if (lightOn) {
      ledcWrite(0, map(cachedSettings.maxBrightness, 0, 100, 0, 255));
    } else {
      ledcWrite(0, 0);
    }
  } else if (type == "alarm") {
    alarmOn = value;
    digitalWrite(ALARM_RELAY_PIN, alarmOn ? HIGH : LOW);
  }
}

// ================ FAILSAFE FUNCTIONS ================
void checkFailsafeStatus() {
  unsigned long now = millis();
  unsigned long timeSinceLastCloud = now - lastCloudContactTime;
  
  // 🧠 5 MINUTE RULE: No cloud contact > 5 min = FAILSAFE MODE
  if (!failsafeMode && lastCloudContactTime > 0 && timeSinceLastCloud > CLOUD_TIMEOUT) {
    String reason = "No cloud contact for " + String(timeSinceLastCloud / 60000) + " minutes";
    activateFailsafe(reason);
  }
  
  // Also activate if WiFi connected but cloud never responded
  if (!failsafeMode && wifiConnected && !cloudEverConnected && now > 120000) {  // 2 min after boot
    activateFailsafe("Cloud never connected after boot");
  }
  
  // Log status periodically in failsafe mode
  if (failsafeMode) {
    static unsigned long lastStatusLog = 0;
    if (now - lastStatusLog > 60000) {  // Every minute
      unsigned long failsafeDuration = (now - failsafeActivatedAt) / 1000;
      Serial.printf("⚠️ FAILSAFE MODE: %lu seconds | Last cloud: %lu min ago\n",
                    failsafeDuration, timeSinceLastCloud / 60000);
      Serial.printf("🧠 Using state: LastTemp=%.1f, LastFan=%s\n",
                    lastSafeTemp, lastSafeFanState ? "ON" : "OFF");
      lastStatusLog = now;
    }
  }
}

void activateFailsafe(String reason) {
  if (failsafeMode) return;  // Already in failsafe
  
  failsafeMode = true;
  failsafeActivatedAt = millis();
  
  Serial.println("\n╔════════════════════════════════════════════════════════════╗");
  Serial.println("║  ⚠️⚠️⚠️ LOCAL AUTO MODE ACTIVATED ⚠️⚠️⚠️                    ║");
  Serial.println("╠════════════════════════════════════════════════════════════╣");
  Serial.printf("║  Reason: %s\n", reason.c_str());
  Serial.println("║                                                            ║");
  Serial.println("║  📌 5 মিনিট cloud update না এলে:                           ║");
  Serial.println("║     → LOCAL AUTO MODE                                      ║");
  Serial.println("║     → Ignore remote commands                               ║");
  Serial.println("║     → Continue local safety rules                          ║");
  Serial.println("║                                                            ║");
  Serial.println("║  🛡️ Bird safety কখনো internet depend করবে না!             ║");
  Serial.println("╚════════════════════════════════════════════════════════════╝\n");
  
  // 🧠 Log last known safe state
  Serial.println("🧠 STATE MEMORY (Last known safe values):");
  Serial.printf("   Last Safe Temp: %.1f°C\n", lastSafeTemp);
  Serial.printf("   Last Fan State: %s (%s)\n", lastSafeFanState ? "ON" : "OFF", lastSafeFanSpeed.c_str());
  Serial.printf("   Last Cloud Contact: %lu seconds ago\n", (millis() - lastCloudContactTime) / 1000);
  Serial.println("\n   ⚠️ Remote commands will be IGNORED until cloud reconnects!");
  
  // Flash LED rapidly to indicate failsafe
  for (int i = 0; i < 10; i++) {
    digitalWrite(STATUS_LED_PIN, HIGH);
    delay(100);
    digitalWrite(STATUS_LED_PIN, LOW);
    delay(100);
  }
  
  // Log failsafe activation (will be synced when connection restored)
  logFailsafeEvent("ACTIVATED", reason);
}

void exitFailsafe() {
  if (!failsafeMode) return;
  
  unsigned long duration = (millis() - failsafeActivatedAt) / 1000;
  
  Serial.println("\n╔════════════════════════════════════════╗");
  Serial.println("║  ✅ CLOUD CONNECTION RESTORED          ║");
  Serial.println("╠════════════════════════════════════════╣");
  Serial.printf("║  Failsafe duration: %lu seconds\n", duration);
  Serial.println("║  Switching back to CLOUD mode          ║");
  Serial.println("╚════════════════════════════════════════╝\n");
  
  failsafeMode = false;
  failsafeActivatedAt = 0;
  
  // Log failsafe exit
  logFailsafeEvent("DEACTIVATED", "Cloud connection restored");
}

void logFailsafeEvent(String eventType, String message) {
  preferences.begin("failsafe_log", false);
  
  int logCount = preferences.getInt("log_count", 0);
  String logKey = "log_" + String(logCount % 100);  // Keep last 100 logs
  
  StaticJsonDocument<256> logEntry;
  logEntry["type"] = eventType;
  logEntry["message"] = message;
  logEntry["timestamp"] = millis() / 1000;
  logEntry["temp"] = temperature;
  logEntry["humidity"] = humidity;
  
  String logJson;
  serializeJson(logEntry, logJson);
  preferences.putString(logKey.c_str(), logJson);
  preferences.putInt("log_count", logCount + 1);
  
  preferences.end();
}

// ================ WATER INTAKE SAFETY ================
// 💧 ৬ ঘন্টা pulse না থাকলে → Water Failure Alert + Buzzer intermittent

// Water pulse interrupt handler (ISR)
void IRAM_ATTR waterPulseISR() {
  waterPulseCount++;
}

void checkWaterIntakeSafety(unsigned long now) {
  static unsigned long previousPulseCount = 0;
  
  // Check if any new water pulses detected since last check
  if (waterPulseCount > previousPulseCount) {
    // Water is flowing - reset timer
    lastWaterPulseTime = now;
    previousPulseCount = waterPulseCount;
    
    // Exit water failure mode if active
    if (waterFailureMode) {
      waterFailureMode = false;
      Serial.println("✅ Water flow restored - Exiting Water Failure Mode");
      // Only clear alarm if other conditions are safe
      if (!sensorErrorMode && currentHSI < HSI_FAN_MAX_ALARM) {
        alarmOn = false;
        digitalWrite(ALARM_RELAY_PIN, LOW);
      }
    }
  }
  
  // Check for 6-hour timeout (only if we've ever received a pulse)
  if (!waterFailureMode && lastWaterPulseTime > 0 && 
      (now - lastWaterPulseTime >= WATER_TIMEOUT)) {
    waterFailureMode = true;
    
    Serial.println("\n╔════════════════════════════════════════════════════════════╗");
    Serial.println("║  💧 WATER FAILURE ALERT - No water pulse for 6 hours!      ║");
    Serial.println("║  ৬ ঘন্টা pulse না থাকলে: Water Failure + Buzzer intermittent ║");
    Serial.println("╚════════════════════════════════════════════════════════════╝\n");
    
    systemState = "WATER_FAILURE";
  }
  
  // Intermittent buzzer pattern in water failure mode (0.5s ON, 2s OFF)
  if (waterFailureMode) {
    static bool buzzerState = false;
    static unsigned long buzzerOnTime = 0;
    
    if (!buzzerState && (now - lastWaterBeep >= 2000)) {  // OFF for 2 seconds
      digitalWrite(ALARM_RELAY_PIN, HIGH);
      buzzerState = true;
      buzzerOnTime = now;
    }
    else if (buzzerState && (now - buzzerOnTime >= 500)) {  // ON for 0.5 seconds
      digitalWrite(ALARM_RELAY_PIN, LOW);
      buzzerState = false;
      lastWaterBeep = now;
    }
  }
}

// ================ MANUAL OVERRIDE FUNCTIONS ================
// 🔘 LOCAL MANUAL OVERRIDE - ALWAYS WORKS!
// Even if WiFi, Cloud, and automation all fail, human can still control

void checkManualOverrideButton() {
  bool btnPressed = (digitalRead(MANUAL_OVERRIDE_BTN_PIN) == LOW);
  unsigned long now = millis();
  
  if (btnPressed && !manualOverrideBtnWasPressed) {
    // Button just pressed
    manualOverrideBtnPressTime = now;
    manualOverrideBtnWasPressed = true;
  } 
  else if (btnPressed && manualOverrideBtnWasPressed) {
    // Button still held
    if (now - manualOverrideBtnPressTime >= MANUAL_OVERRIDE_HOLD_TIME) {
      // Toggle manual override after 3 second hold
      toggleLocalManualOverride();
      manualOverrideBtnWasPressed = false;  // Reset to prevent multiple toggles
    }
  }
  else if (!btnPressed) {
    manualOverrideBtnWasPressed = false;
  }
}

void toggleLocalManualOverride() {
  localManualOverride = !localManualOverride;
  
  if (localManualOverride) {
    currentMode = "MANUAL";
    Serial.println("\n╔════════════════════════════════════════╗");
    Serial.println("║  🔘 LOCAL MANUAL OVERRIDE ENABLED      ║");
    Serial.println("╠════════════════════════════════════════╣");
    Serial.println("║  All automation is now BYPASSED        ║");
    Serial.println("║  Use physical buttons to control       ║");
    Serial.println("║  Hold 3s again to return to AUTO       ║");
    Serial.println("╚════════════════════════════════════════╝\n");
    
    // Flash LED to indicate manual mode
    for (int i = 0; i < 5; i++) {
      digitalWrite(STATUS_LED_PIN, HIGH);
      delay(200);
      digitalWrite(STATUS_LED_PIN, LOW);
      delay(200);
    }
  } else {
    currentMode = failsafeMode ? "FAIL_SAFE" : "AUTO";
    Serial.println("\n✅ Local manual override DISABLED - returning to automation\n");
    
    // Brief LED flash
    digitalWrite(STATUS_LED_PIN, HIGH);
    delay(500);
    digitalWrite(STATUS_LED_PIN, LOW);
  }
}

void handleLocalManualMode() {
  // In manual mode, physical buttons directly control devices
  
  // Fan button (toggle on press)
  static bool lastFanBtnState = HIGH;
  bool fanBtnState = digitalRead(MANUAL_FAN_BTN_PIN);
  if (fanBtnState == LOW && lastFanBtnState == HIGH) {
    manualFanState = !manualFanState;
    fanOn = manualFanState;
    fanSpeed = manualFanState ? "HIGH" : "OFF";
    digitalWrite(FAN_RELAY_PIN, fanOn ? HIGH : LOW);
    Serial.printf("🔘 MANUAL: Fan %s\n", fanOn ? "ON (HIGH)" : "OFF");
  }
  lastFanBtnState = fanBtnState;
  
  // Alarm button (toggle on press)
  static bool lastAlarmBtnState = HIGH;
  bool alarmBtnState = digitalRead(MANUAL_ALARM_BTN_PIN);
  if (alarmBtnState == LOW && lastAlarmBtnState == HIGH) {
    manualAlarmState = !manualAlarmState;
    alarmOn = manualAlarmState;
    digitalWrite(ALARM_RELAY_PIN, alarmOn ? HIGH : LOW);
    Serial.printf("🔘 MANUAL: Alarm %s\n", alarmOn ? "ON" : "OFF");
  }
  lastAlarmBtnState = alarmBtnState;
  
  // Still read sensors and calculate HSI for display
  currentHSI = calculateHSI(temperature, humidity);
  if (currentHSI > 40) systemState = "DANGER";
  else if (currentHSI >= 35) systemState = "HIGH_STRESS";
  else if (currentHSI >= 30) systemState = "MILD_STRESS";
  else systemState = "NORMAL";
  
  // Log state periodically
  static unsigned long lastManualLog = 0;
  if (millis() - lastManualLog > 10000) {
    Serial.printf("🔘 MANUAL MODE: HSI=%.1f(%s), Fan=%s, Alarm=%s\n",
                  currentHSI, systemState.c_str(),
                  fanOn ? "ON" : "OFF", alarmOn ? "ON" : "OFF");
    lastManualLog = millis();
  }
}

// ================ AUTOMATION FUNCTIONS ================
// 🔐 LOCAL SAFE RULES - "সন্দেহ হলে Fan ON — Always safer"
// These rules run when cloud is unavailable
// Now supports both LAYER and BROILER farm types

void runAutomation() {
  // Update current mode
  currentMode = failsafeMode ? "FAIL_SAFE" : "AUTO";
  
  if (failsafeMode) {
    // Choose automation based on farm type
    if (FARM_TYPE == "BROILER") {
      runBroilerAutomation();
    } else {
      runLocalAutomation();  // Layer automation
    }
    
    // 🔧 Run fan relay health check in failsafe mode
    checkFanRelayHealth();
  }
  // Cloud mode automation is handled in handleCloudResponse
}

// ================ BROILER-SPECIFIC AUTOMATION ================
// Age-based temperature control for broilers
// Matches web app's BROILER_THRESHOLDS

void runBroilerAutomation() {
  Serial.println("\n🐔 Running BROILER AUTOMATION RULES...");
  Serial.printf("   Batch Age: %d days\n", BROILER_AGE_DAYS);
  
  // ========================================
  // RULE 0: SENSOR ERROR = FAN ON (Safe Mode)
  // ========================================
  bool sensorError = isnan(temperature) || isnan(humidity);
  if (sensorError) {
    Serial.println("⚠️ SENSOR ERROR → Fan ON (Safe Mode)");
    setFanState(true, "HIGH");
    return;
  }
  
  // Get target temperature based on broiler age
  float targetMin, targetMax;
  getBroilerTargetTemp(BROILER_AGE_DAYS, targetMin, targetMax);
  float targetTemp = (targetMin + targetMax) / 2.0;
  float deviation = temperature - targetTemp;
  
  Serial.printf("   Target Temp: %.1f°C (%.1f-%.1f), Current: %.1f°C, Deviation: %+.1f°C\n",
                targetTemp, targetMin, targetMax, temperature, deviation);
  
  // ========================================
  // BROILER RULE 1: TEMP > target +4°C = ALARM
  // ========================================
  if (deviation >= BROILER_TEMP_ALARM_DEV) {
    Serial.printf("🚨 BROILER TEMP ALARM! (%.1f°C > target +4°C) → Fan HIGH + Alarm\n", temperature);
    setFanState(true, "HIGH");
    alarmOn = true;
    digitalWrite(ALARM_RELAY_PIN, HIGH);
    systemState = "DANGER";
  }
  // ========================================
  // BROILER RULE 2: TEMP > target +2°C = FAN HIGH
  // ========================================
  else if (deviation >= BROILER_TEMP_FAN_HIGH_DEV) {
    Serial.printf("🌡️ BROILER TEMP HIGH (%.1f°C > target +2°C) → Fan HIGH\n", temperature);
    setFanState(true, "HIGH");
    systemState = "HIGH_STRESS";
  }
  // ========================================
  // BROILER RULE 3: TEMP < target -2°C = HEATER ON
  // ========================================
  else if (deviation <= -BROILER_TEMP_HEATER_DEV) {
    Serial.printf("🥶 BROILER TEMP LOW (%.1f°C < target -2°C) → HEATER ON!\n", temperature);
    setFanState(false, "OFF");  // Don't cool when cold
    
    // 🔥 HEATER CONTROL - Turn ON heater relay
    if (!heaterOn) {
      heaterOn = true;
      digitalWrite(HEATER_RELAY_PIN, HIGH);
      Serial.println("🔥 Heater turned ON (GPIO 13)");
    }
    
    // Critical cold (deviation <= -4°C) = Alarm
    if (deviation <= -BROILER_TEMP_ALARM_DEV) {
      alarmOn = true;
      digitalWrite(ALARM_RELAY_PIN, HIGH);
      systemState = "DANGER";
    } else {
      systemState = "COLD";
    }
  }
  // ========================================
  // BROILER RULE 4: TEMP NORMAL
  // ========================================
  else {
    systemState = "NORMAL";
    
    // 🔥 Turn OFF heater if temp is normal
    if (heaterOn) {
      heaterOn = false;
      digitalWrite(HEATER_RELAY_PIN, LOW);
      Serial.println("🔥 Heater turned OFF (temp normal)");
    }
    
    // Only turn off fan if humidity and ammonia are also OK
    if (humidity < BROILER_HUMIDITY_HIGH && ammonia < BROILER_AMMONIA_FAN) {
      setFanState(false, "OFF");
    }
  }
  
  // ========================================
  // BROILER HUMIDITY CHECK
  // <40% = warning, >75% = ventilation
  // ========================================
  if (humidity < BROILER_HUMIDITY_LOW) {
    Serial.printf("⚠️ BROILER HUMIDITY LOW (%.1f%%) - Need more moisture\n", humidity);
    // Just warning, no fan action needed for low humidity
  }
  else if (humidity > BROILER_HUMIDITY_HIGH) {
    Serial.printf("💨 BROILER HUMIDITY HIGH (%.1f%%) → Increase ventilation\n", humidity);
    if (!fanOn) {
      setFanState(true, "LOW");
    }
  }
  
  // ========================================
  // BROILER AMMONIA CHECK
  // >20ppm = fan ON, >30ppm = alarm
  // ========================================
  if (ammonia >= BROILER_AMMONIA_ALARM) {
    Serial.printf("🚨 BROILER AMMONIA DANGER (%.1f ppm > 30) → Fan HIGH + Alarm\n", ammonia);
    setFanState(true, "HIGH");
    alarmOn = true;
    digitalWrite(ALARM_RELAY_PIN, HIGH);
    systemState = "DANGER";
  }
  else if (ammonia >= BROILER_AMMONIA_FAN) {
    Serial.printf("⚠️ BROILER AMMONIA HIGH (%.1f ppm > 20) → Fan ON\n", ammonia);
    if (!fanOn || fanSpeed == "OFF") {
      setFanState(true, "MEDIUM");
    }
  }
  
  // ========================================
  // 🔥 BROILER HSI CHECK (Heat Stress Index) - CRITICAL!
  // 👉 Cloud এর অপেক্ষা করবে না - Runs LOCALLY!
  // >38 = fan HIGH, >42 = fan MAX + alarm, >45 = emergency
  // ========================================
  float hsi = calculateHSI(temperature, humidity);
  currentHSI = hsi;
  
  // ⚠️ HSI >= 45: EMERGENCY MODE - Continuous alarm, bird life at risk!
  if (hsi >= BROILER_HSI_CRITICAL) {
    Serial.println("\n╔═══════════════════════════════════════════════════════════╗");
    Serial.println("║  🚨🚨🚨 HSI EMERGENCY MODE - CRITICAL HEAT STRESS! 🚨🚨🚨  ║");
    Serial.printf("║  HSI: %.1f >= 45 → CONTINUOUS ALARM ACTIVATED!             ║\n", hsi);
    Serial.println("║  মুরগি মারা যেতে পারে! জরুরি ব্যবস্থা নিন!                  ║");
    Serial.println("╚═══════════════════════════════════════════════════════════╝\n");
    setFanState(true, "MAX");
    alarmOn = true;
    digitalWrite(ALARM_RELAY_PIN, HIGH);
    systemState = "EMERGENCY";
    
    // Continuous alarm pattern - don't stop until HSI drops
    static unsigned long lastAlarmBeep = 0;
    if (millis() - lastAlarmBeep > 500) {  // Beep every 500ms
      digitalWrite(ALARM_RELAY_PIN, !digitalRead(ALARM_RELAY_PIN));
      lastAlarmBeep = millis();
    }
  }
  // HSI >= 42: Fan MAX + Alarm (one-time)
  else if (hsi >= BROILER_HSI_EMERGENCY) {
    Serial.printf("🚨 BROILER HSI DANGER (%.1f >= 42) → Fan MAX + Alarm!\n", hsi);
    setFanState(true, "MAX");
    alarmOn = true;
    digitalWrite(ALARM_RELAY_PIN, HIGH);
    systemState = "DANGER";
  }
  // HSI >= 38: Fan HIGH
  else if (hsi >= BROILER_HSI_FAN_HIGH) {
    Serial.printf("🔥 BROILER HSI HIGH (%.1f >= 38) → Fan HIGH\n", hsi);
    setFanState(true, "HIGH");
    if (systemState == "NORMAL") systemState = "HIGH_STRESS";
  }
  
  // ========================================
  // ALARM AUTO-CLEAR (only if ALL conditions safe)
  // ========================================
  if (alarmOn && deviation < BROILER_TEMP_ALARM_DEV && deviation > -BROILER_TEMP_ALARM_DEV &&
      ammonia < BROILER_AMMONIA_ALARM && hsi < BROILER_HSI_EMERGENCY) {
    alarmOn = false;
    digitalWrite(ALARM_RELAY_PIN, LOW);
    Serial.println("✅ All broiler conditions safe → Alarm cleared");
  }
  
  // ========================================
  // LIGHTING CONTROL
  // ========================================
  controlLighting();
  
  // ========================================
  // BROILER STATUS REPORT
  // ========================================
  Serial.printf("\n🐔 [%s] BROILER Status (Day %d):\n", SHED_NAME, BROILER_AGE_DAYS);
  Serial.printf("   Target: %.1f°C | Current: %.1f°C | Deviation: %+.1f°C\n", 
                targetTemp, temperature, deviation);
  Serial.printf("   HSI: %.1f | Hum: %.1f%% | NH3: %.1f ppm\n", currentHSI, humidity, ammonia);
  Serial.printf("   Fan: %s (%s) | Alarm: %s | State: %s\n",
                fanOn ? "ON" : "OFF", fanSpeed.c_str(),
                alarmOn ? "ON" : "OFF", systemState.c_str());
}


void runLocalAutomation() {
  Serial.println("\n🐔 Running LAYER LOCAL SAFE RULES...");
  Serial.println("   👉 Layer sudden heat change সহ্য করতে পারে না!");
  
  // ========================================
  // RULE 0: SENSOR ERROR = FAN ON (Safe Mode)
  // ========================================
  bool sensorError = isnan(temperature) || isnan(humidity);
  if (sensorError) {
    Serial.println("⚠️ SENSOR ERROR → Fan ON (Safe Mode)");
    setFanState(true, "HIGH");
    return;  // Don't process other rules with bad data
  }
  
  // ========================================
  // RULE 1: POWER OFF = ALARM ON
  // ========================================
  if (!powerOn) {
    Serial.println("🔴 POWER OFF → Alarm ON");
    if (!alarmOn) {
      alarmOn = true;
      digitalWrite(ALARM_RELAY_PIN, HIGH);
    }
  }
  
  // ========================================
  // 🌡️ LAYER TEMPERATURE CONTROL (Stable Range ভিত্তিক)
  // 📌 লক্ষ্য: sudden airflow না দিয়ে ধাপে ধাপে control
  // Layer sudden heat change সহ্য করতে পারে না!
  // ========================================
  
  // TEMP > 33°C = ALARM + MAX VENTILATION (CRITICAL!)
  if (temperature >= LAYER_TEMP_ALARM) {
    Serial.printf("🚨 LAYER TEMP ALARM! (%.1f°C >= 33) → ALARM + MAX Ventilation!\n", temperature);
    setFanState(true, "MAX");
    alarmOn = true;
    digitalWrite(ALARM_RELAY_PIN, HIGH);
    systemState = "DANGER";
    
    // 🔥 Turn OFF heater if it was on
    if (heaterOn) {
      heaterOn = false;
      digitalWrite(HEATER_RELAY_PIN, LOW);
    }
  }
  // TEMP > 30°C = FAN HIGH
  else if (temperature > LAYER_TEMP_FAN_HIGH) {
    Serial.printf("🔥 LAYER TEMP HIGH (%.1f°C > 30) → Fan HIGH\n", temperature);
    setFanState(true, "HIGH");
    systemState = "HIGH_STRESS";
    
    // 🔥 Turn OFF heater
    if (heaterOn) {
      heaterOn = false;
      digitalWrite(HEATER_RELAY_PIN, LOW);
    }
  }
  // TEMP 27-30°C = FAN LOW (Gradual step)
  else if (temperature > LAYER_TEMP_IDEAL_MAX && temperature <= LAYER_TEMP_FAN_HIGH) {
    Serial.printf("⚠️ LAYER TEMP BORDERLINE (%.1f°C, 27-30°C) → Fan LOW (gradual)\n", temperature);
    setFanState(true, "LOW");
    systemState = "MILD_STRESS";
    
    // 🔥 Turn OFF heater
    if (heaterOn) {
      heaterOn = false;
      digitalWrite(HEATER_RELAY_PIN, LOW);
    }
  }
  // TEMP 18-27°C = IDEAL (No fan change needed)
  else if (temperature >= LAYER_TEMP_IDEAL_MIN && temperature <= LAYER_TEMP_IDEAL_MAX) {
    Serial.printf("✅ LAYER TEMP IDEAL (%.1f°C, 18-27°C range) → No change\n", temperature);
    systemState = "NORMAL";
    
    // 🔥 Turn OFF heater - temp is good
    if (heaterOn) {
      heaterOn = false;
      digitalWrite(HEATER_RELAY_PIN, LOW);
      Serial.println("🔥 Heater OFF (temp in ideal range)");
    }
    
    // Only turn off fan if humidity and ammonia are also OK
    if (humidity <= LAYER_HUMIDITY_HIGH && ammonia < cachedSettings.ammoniaMax) {
      setFanState(false, "OFF");
    }
  }
  // TEMP < 18°C = HEATER ON (Cold protection)
  else if (temperature < LAYER_TEMP_HEATER_ON) {
    Serial.printf("🥶 LAYER TEMP LOW (%.1f°C < 18) → HEATER ON!\n", temperature);
    setFanState(false, "OFF");  // Don't cool when cold
    systemState = "COLD";
    
    // 🔥 HEATER CONTROL - Turn ON heater relay
    if (!heaterOn) {
      heaterOn = true;
      digitalWrite(HEATER_RELAY_PIN, HIGH);
      Serial.println("🔥 Heater turned ON (GPIO 13) - Layer cold protection");
    }
  }
  
  // ========================================
  // 💧 LAYER HUMIDITY CONTROL
  // ⚠️ Humidity alone fan চালাবে না — temp/HSI priority
  // Humidity শুধু existing fan speed বাড়াতে পারে
  // ========================================
  
  // HUMIDITY < 40% = Warning beep (dry litter risk)
  if (humidity < LAYER_HUMIDITY_LOW) {
    Serial.printf("⚠️ LAYER HUMIDITY LOW (%.1f%% < 40%%) → Warning beep (dry litter risk)\n", humidity);
    
    // Short warning beep pattern (0.2s ON, 5s OFF) - not continuous
    static unsigned long lastHumidityBeep = 0;
    if (millis() - lastHumidityBeep >= 5000) {
      digitalWrite(ALARM_RELAY_PIN, HIGH);
      delay(200);
      digitalWrite(ALARM_RELAY_PIN, LOW);
      lastHumidityBeep = millis();
      Serial.println("   🔔 Warning beep: Dry litter risk!");
    }
  }
  // HUMIDITY 50-70% = IDEAL
  else if (humidity >= LAYER_HUMIDITY_IDEAL_MIN && humidity <= LAYER_HUMIDITY_IDEAL_MAX) {
    Serial.printf("✅ LAYER HUMIDITY IDEAL (%.1f%%, 50-70%% range)\n", humidity);
  }
  // HUMIDITY > 75% = Increase ventilation (ONLY if fan already ON)
  else if (humidity > LAYER_HUMIDITY_HIGH) {
    Serial.printf("💨 LAYER HUMIDITY HIGH (%.1f%% > 75%%)\n", humidity);
    
    // ⚠️ Humidity alone fan চালাবে না — temp/HSI priority
    // শুধু fan যদি আগে থেকে ON থাকে তাহলে speed বাড়াবে
    if (fanOn) {
      if (fanSpeed == "LOW") {
        Serial.println("   → Fan already ON, increasing to MEDIUM");
        setFanState(true, "MEDIUM");
      } else if (fanSpeed == "MEDIUM") {
        Serial.println("   → Fan already MEDIUM, increasing to HIGH");
        setFanState(true, "HIGH");
      }
      // If already HIGH or MAX, don't change
    } else {
      Serial.println("   → Fan OFF (waiting for temp/HSI trigger first)");
    }
  }
  // HUMIDITY 40-50% or 70-75% = Borderline (no action, just log)
  else {
    Serial.printf("⚠️ LAYER HUMIDITY BORDERLINE (%.1f%%) → No fan action (temp/HSI priority)\n", humidity);
  }
  
  // ========================================
  // 🧪 AMMONIA SAFETY (NH3)
  // Sensor error: assume gas danger → Fan ON
  // ========================================
  
  // Check for ammonia sensor error (value out of range)
  bool ammoniaError = (ammonia < 0 || ammonia > 100);
  
  if (ammoniaError) {
    // ⚠️ Sensor error: assume gas danger → Fan ON
    Serial.println("⚠️ AMMONIA SENSOR ERROR → Assume gas danger → Fan ON!");
    setFanState(true, "HIGH");
  }
  // NH3 > 25 ppm = ALARM + Fan HIGH
  else if (ammonia > LAYER_AMMONIA_ALARM) {
    Serial.printf("🚨 AMMONIA DANGER (%.1f ppm > 25) → ALARM + Fan HIGH!\n", ammonia);
    setFanState(true, "HIGH");
    alarmOn = true;
    digitalWrite(ALARM_RELAY_PIN, HIGH);
    systemState = "DANGER";
  }
  // NH3 > 15 ppm = Fan ON
  else if (ammonia > LAYER_AMMONIA_FAN_ON) {
    Serial.printf("⚠️ AMMONIA HIGH (%.1f ppm > 15) → Fan ON\n", ammonia);
    if (!fanOn || fanSpeed == "OFF") {
      setFanState(true, "MEDIUM");
    }
  }
  // NH3 ≤ 15 ppm = Normal
  else {
    Serial.printf("✅ AMMONIA NORMAL (%.1f ppm)\n", ammonia);
  }
  
  // ========================================
  // 🔥 HEAT STRESS INDEX (HSI) - CRITICAL DECISION!
  // HSI = Temperature + (Humidity × 0.1)
  // 👉 Cloud এর অপেক্ষা করবে না - Runs LOCALLY!
  // 📌 Layer এ heat stress = egg production drop
  // ========================================
  float hsi = calculateHSI(temperature, humidity);
  currentHSI = hsi;
  Serial.printf("🔥 HSI = %.1f (Temp=%.1f + Hum=%.1f×0.1)\n", hsi, temperature, humidity);
  
  // ========================================
  // HSI > 40: EMERGENCY ALARM + MAX VENTILATION
  // ========================================
  if (hsi > LAYER_HSI_EMERGENCY) {
    systemState = "EMERGENCY";
    Serial.println("\n╔═══════════════════════════════════════════════════════════╗");
    Serial.println("║  🚨🚨🚨 HSI EMERGENCY - HEAT STRESS CRITICAL! 🚨🚨🚨        ║");
    Serial.printf("║  HSI: %.1f > 40 → EMERGENCY ALARM + MAX VENTILATION!       ║\n", hsi);
    Serial.println("║  📌 Layer heat stress = egg production drop!               ║");
    Serial.println("║  মুরগি মারা যেতে পারে! জরুরি ব্যবস্থা নিন!                  ║");
    Serial.println("╚═══════════════════════════════════════════════════════════╝\n");
    setFanState(true, "MAX");
    alarmOn = true;
    digitalWrite(ALARM_RELAY_PIN, HIGH);
    
    // Continuous alarm pattern
    static unsigned long lastAlarmBeep = 0;
    if (millis() - lastAlarmBeep > 500) {
      digitalWrite(ALARM_RELAY_PIN, !digitalRead(ALARM_RELAY_PIN));
      lastAlarmBeep = millis();
    }
  }
  // ========================================
  // HSI 35-40: Fan HIGH
  // ========================================
  else if (hsi >= LAYER_HSI_FAN_HIGH) {
    if (systemState != "DANGER" && systemState != "EMERGENCY") {
      systemState = "HIGH_STRESS";
    }
    Serial.printf("🔥 HSI HIGH STRESS (%.1f, 35-40 range) → Fan HIGH\n", hsi);
    setFanState(true, "HIGH");
  }
  // ========================================
  // HSI 30-35: Fan LOW
  // ========================================
  else if (hsi >= LAYER_HSI_FAN_LOW) {
    if (systemState == "NORMAL") {
      systemState = "MILD_STRESS";
    }
    Serial.printf("⚠️ HSI MILD STRESS (%.1f, 30-35 range) → Fan LOW\n", hsi);
    // Only set to LOW if not already at higher speed
    if (!fanOn || fanSpeed == "OFF") {
      setFanState(true, "LOW");
    }
  }
  // ========================================
  // HSI < 30: NORMAL (No HSI-based action)
  // ========================================
  else {
    Serial.printf("✅ HSI NORMAL (%.1f < 30) → No HSI action needed\n", hsi);
    // Don't change fan state here - let temp/ammonia rules control
  }
  
  // ========================================
  // ALARM AUTO-CLEAR (only if ALL conditions safe)
  // ========================================
  if (alarmOn && powerOn && 
      ammonia <= LAYER_AMMONIA_FAN_ON && 
      temperature < LAYER_TEMP_ALARM && 
      hsi <= LAYER_HSI_EMERGENCY) {
    alarmOn = false;
    digitalWrite(ALARM_RELAY_PIN, LOW);
    Serial.println("✅ All conditions safe → Alarm cleared");
  }
  
  // ========================================
  // 💡 LAYER LIGHTING PROTECTION (Alert Only)
  // Lighting schedule cloud দিবে - ESP32 শুধু detect করবে
  // Daytime AND light OFF > 10 min → Production warning beep
  // ========================================
  checkLayerLightingProtection();
  
  // ========================================
  // LIGHTING CONTROL (from cloud schedule)
  // ========================================
  controlLighting();
  
  // ========================================
  // 🐔 LAYER STATUS REPORT
  // ========================================
  Serial.printf("\n📊 [%s] LAYER Status Report:\n", SHED_NAME);
  Serial.printf("   Mode: %s | State: %s\n", currentMode.c_str(), systemState.c_str());
  Serial.printf("   Temp: %.1f°C | Ideal: 18-27°C | Heater: %s\n", 
                temperature, heaterOn ? "ON" : "OFF");
  Serial.printf("   Hum: %.1f%% | Ideal: 50-70%% | HSI: %.1f\n", humidity, currentHSI);
  Serial.printf("   Fan: %s (%s) | Alarm: %s | Light: %s (%d%%)\n",
                fanOn ? "ON" : "OFF", fanSpeed.c_str(),
                alarmOn ? "ON" : "OFF",
                lightOn ? "ON" : "OFF", lightBrightness);
}

// 🔥 HEAT STRESS INDEX CALCULATION
// Simple & Practical Formula (Perfect for ESP32)
// HSI = Temperature + (Humidity × 0.1)
//
// Example:
// | Temp  | Humidity | HSI |
// |-------|----------|-----|
// | 30°C  | 70%      | 37  |
// | 32°C  | 80%      | 40 ⚠️|
//
float calculateHSI(float temp, float hum) {
  // Validate inputs
  if (isnan(temp) || isnan(hum)) {
    return 50.0;  // Return danger value if sensors fail
  }
  
  // HSI = Temperature + (Humidity × 0.1)
  float hsi = temp + (hum * 0.1);
  return hsi;
}

void controlLighting() {
  // Get current time (would need RTC or NTP in production)
  // For now, use a simple time estimation based on uptime
  // In production, implement proper time sync
  
  // This is a placeholder - in real implementation, use RTC module
  // or sync time from cloud when available
  int currentHour = 12;  // Default to noon
  int currentMinute = 0;
  
  bool shouldLightOn = false;
  int targetBrightness = 0;
  
  // Check if within lighting schedule
  int startMinutes = cachedSettings.lightStartHour * 60 + cachedSettings.lightStartMinute;
  int endMinutes = cachedSettings.lightEndHour * 60 + cachedSettings.lightEndMinute;
  int currentMinutes = currentHour * 60 + currentMinute;
  
  if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
    shouldLightOn = true;
    
    // Calculate brightness for gradual dimming
    int minutesFromStart = currentMinutes - startMinutes;
    int minutesToEnd = endMinutes - currentMinutes;
    
    if (minutesFromStart < cachedSettings.fadeInMinutes) {
      // Fade in
      targetBrightness = map(minutesFromStart, 0, cachedSettings.fadeInMinutes, 
                             cachedSettings.minBrightness, cachedSettings.maxBrightness);
    } else if (minutesToEnd < cachedSettings.fadeOutMinutes) {
      // Fade out
      targetBrightness = map(minutesToEnd, 0, cachedSettings.fadeOutMinutes,
                             cachedSettings.minBrightness, cachedSettings.maxBrightness);
    } else {
      // Full brightness
      targetBrightness = cachedSettings.maxBrightness;
    }
  }
  
  // Apply lighting
  if (shouldLightOn != lightOn || targetBrightness != lightBrightness) {
    lightOn = shouldLightOn;
    lightBrightness = targetBrightness;
    int pwmValue = map(lightBrightness, 0, 100, 0, 255);
    ledcWrite(0, pwmValue);
    Serial.printf("→ Light: %s (Brightness: %d%%)\n", lightOn ? "ON" : "OFF", lightBrightness);
  }
}

// ================ LAYER LIGHTING PROTECTION ================
// 💡 Lighting schedule cloud দিবে - ESP32 শুধু detect করবে
// Daytime detected AND light OFF > 10 min → Production warning beep
// ⚠️ automation না, শুধু alert

void checkLayerLightingProtection() {
  // Only for LAYER farms
  if (FARM_TYPE != "LAYER") return;
  
  unsigned long now = millis();
  
  // Track light state changes
  if (lightOn && !lightWasOn) {
    // Light just turned ON
    lightWasOn = true;
    lightOffStartTime = 0;
    lightingAlertActive = false;
    Serial.println("💡 Light ON - Lighting alert cleared");
  } 
  else if (!lightOn && lightWasOn) {
    // Light just turned OFF
    lightWasOn = false;
    lightOffStartTime = now;
    Serial.println("💡 Light OFF - Starting 10 min timer for daytime check");
  }
  else if (!lightOn && !lightWasOn && lightOffStartTime == 0) {
    // Initialize if light was already OFF at boot
    lightOffStartTime = now;
  }
  
  // Determine if it's daytime (6 AM - 6 PM considered daytime)
  // In production, sync actual time from cloud or RTC
  int currentHour = 12;  // Default estimate (placeholder)
  
  // Try to estimate time based on cloud sync if available
  if (cloudConnected && lastCloudSync > 0) {
    // Use cached lighting schedule to determine daytime
    // If current time is within lighting schedule, it's "expected ON" time
    int startMinutes = cachedSettings.lightStartHour * 60 + cachedSettings.lightStartMinute;
    int endMinutes = cachedSettings.lightEndHour * 60 + cachedSettings.lightEndMinute;
    
    // For now, assume daytime = within lighting schedule
    // (Cloud should sync actual isDaytime flag)
    isDaytime = true;  // Will be overridden by cloud sync
  }
  
  // Check if light has been OFF for > 10 minutes during daytime
  if (isDaytime && !lightOn && lightOffStartTime > 0) {
    unsigned long lightOffDuration = now - lightOffStartTime;
    
    if (lightOffDuration >= LIGHT_OFF_ALERT_TIMEOUT) {
      // ⚠️ Daytime AND light OFF > 10 min → Production warning beep
      if (!lightingAlertActive) {
        lightingAlertActive = true;
        Serial.println("\n╔════════════════════════════════════════════════════════════╗");
        Serial.println("║  💡 LIGHTING PROTECTION ALERT (LAYER)                      ║");
        Serial.println("║  Daytime detected AND light OFF > 10 min!                  ║");
        Serial.println("║  📌 This may affect egg production!                        ║");
        Serial.println("╚════════════════════════════════════════════════════════════╝\n");
      }
      
      // Production warning beep pattern (0.3s ON, 10s OFF) - not continuous
      if (now - lastLightingAlertBeep >= 10000) {
        digitalWrite(ALARM_RELAY_PIN, HIGH);
        delay(300);
        digitalWrite(ALARM_RELAY_PIN, LOW);
        lastLightingAlertBeep = now;
        Serial.println("💡 Production warning beep: Light OFF during daytime!");
      }
    }
  } else {
    // Reset alert if light is ON or not daytime
    if (lightingAlertActive && lightOn) {
      lightingAlertActive = false;
      Serial.println("✅ Lighting alert cleared - Light is now ON");
    }
  }
}

void applyDeviceStates() {
  digitalWrite(FAN_RELAY_PIN, fanOn ? HIGH : LOW);
  digitalWrite(ALARM_RELAY_PIN, alarmOn ? HIGH : LOW);
  
  int pwmValue = lightOn ? map(lightBrightness, 0, 100, 0, 255) : 0;
  ledcWrite(0, pwmValue);
}

// ================ SENSOR FUNCTIONS ================
void readSensors() {
  // Read DHT22
  float newTemp = dht.readTemperature();
  float newHum = dht.readHumidity();
  
  if (!isnan(newTemp)) temperature = newTemp;
  if (!isnan(newHum)) humidity = newHum;
  
  // Read ammonia (MQ135)
  int ammoniaRaw = analogRead(MQ135_PIN);
  ammonia = map(ammoniaRaw, 0, 4095, 0, 100);  // Simplified conversion
  
  // Read power status
  int powerRaw = analogRead(POWER_SENSE_PIN);
  powerOn = (powerRaw > 2000);  // Threshold for mains power detection
  
  // Water flow would need interrupt-based counting in production
  // This is a placeholder
  waterFlow = 0;
  
  Serial.printf("📊 Sensors: T=%.1f°C, H=%.1f%%, NH3=%.1f ppm, Power=%s\n",
                temperature, humidity, ammonia, powerOn ? "ON" : "OFF");
}

// ================ EEPROM FUNCTIONS ================
void loadCachedSettings() {
  preferences.begin("settings", true);  // Read-only mode
  
  if (preferences.isKey("version")) {
    cachedSettings.tempMin = preferences.getFloat("tempMin", 18.0);
    cachedSettings.tempMax = preferences.getFloat("tempMax", 32.0);
    cachedSettings.humidityMin = preferences.getFloat("humMin", 40.0);
    cachedSettings.humidityMax = preferences.getFloat("humMax", 80.0);
    cachedSettings.ammoniaMax = preferences.getFloat("ammMax", 25.0);
    
    cachedSettings.fanLowTempMin = preferences.getFloat("fanLowMin", 28.0);
    cachedSettings.fanLowTempMax = preferences.getFloat("fanLowMax", 30.0);
    cachedSettings.fanMedTempMin = preferences.getFloat("fanMedMin", 30.0);
    cachedSettings.fanMedTempMax = preferences.getFloat("fanMedMax", 33.0);
    cachedSettings.fanHighTempMin = preferences.getFloat("fanHighMin", 33.0);
    
    cachedSettings.hsiMild = preferences.getFloat("hsiMild", 70.0);
    cachedSettings.hsiModerate = preferences.getFloat("hsiMod", 75.0);
    cachedSettings.hsiSevere = preferences.getFloat("hsiSev", 80.0);
    cachedSettings.hsiEmergency = preferences.getFloat("hsiEmg", 85.0);
    
    cachedSettings.lightStartHour = preferences.getInt("lightSH", 5);
    cachedSettings.lightStartMinute = preferences.getInt("lightSM", 0);
    cachedSettings.lightEndHour = preferences.getInt("lightEH", 21);
    cachedSettings.lightEndMinute = preferences.getInt("lightEM", 0);
    cachedSettings.fadeInMinutes = preferences.getInt("fadeIn", 30);
    cachedSettings.fadeOutMinutes = preferences.getInt("fadeOut", 30);
    cachedSettings.minBrightness = preferences.getInt("minBright", 0);
    cachedSettings.maxBrightness = preferences.getInt("maxBright", 100);
    
    cachedSettings.version = preferences.getInt("version", 0);
    
    Serial.printf("✓ Loaded cached settings (version %d)\n", cachedSettings.version);
  } else {
    Serial.println("→ No cached settings found, using defaults");
  }
  
  preferences.end();
}

void saveCachedSettings() {
  preferences.begin("settings", false);  // Read-write mode
  
  preferences.putFloat("tempMin", cachedSettings.tempMin);
  preferences.putFloat("tempMax", cachedSettings.tempMax);
  preferences.putFloat("humMin", cachedSettings.humidityMin);
  preferences.putFloat("humMax", cachedSettings.humidityMax);
  preferences.putFloat("ammMax", cachedSettings.ammoniaMax);
  
  preferences.putFloat("fanLowMin", cachedSettings.fanLowTempMin);
  preferences.putFloat("fanLowMax", cachedSettings.fanLowTempMax);
  preferences.putFloat("fanMedMin", cachedSettings.fanMedTempMin);
  preferences.putFloat("fanMedMax", cachedSettings.fanMedTempMax);
  preferences.putFloat("fanHighMin", cachedSettings.fanHighTempMin);
  
  preferences.putFloat("hsiMild", cachedSettings.hsiMild);
  preferences.putFloat("hsiMod", cachedSettings.hsiModerate);
  preferences.putFloat("hsiSev", cachedSettings.hsiSevere);
  preferences.putFloat("hsiEmg", cachedSettings.hsiEmergency);
  
  preferences.putInt("lightSH", cachedSettings.lightStartHour);
  preferences.putInt("lightSM", cachedSettings.lightStartMinute);
  preferences.putInt("lightEH", cachedSettings.lightEndHour);
  preferences.putInt("lightEM", cachedSettings.lightEndMinute);
  preferences.putInt("fadeIn", cachedSettings.fadeInMinutes);
  preferences.putInt("fadeOut", cachedSettings.fadeOutMinutes);
  preferences.putInt("minBright", cachedSettings.minBrightness);
  preferences.putInt("maxBright", cachedSettings.maxBrightness);
  
  preferences.putInt("version", cachedSettings.version);
  
  preferences.end();
  
  Serial.println("✓ Settings saved to EEPROM");
}

// ================ DEFAULT SAFE STATE (সবচেয়ে গুরুত্বপূর্ণ!) ================
// 🛡️ যেকোনো অজানা error হলে → Fan ON + Alarm periodic + Never stay OFF
// This is the MOST IMPORTANT safety feature - when in doubt, FAN ON!
//
// TRIGGERS:
// 1. Sensor reads invalid/extreme values outside any possible range
// 2. State machine in undefined state
// 3. Multiple conflicting error modes active
// 4. Memory corruption detected (impossible variable values)
// 5. Any unhandled exception scenario
//
// BEHAVIOR:
// - Fan ON (HIGH speed) - never OFF in this state
// - Periodic alarm: 0.5 sec ON, 5 sec OFF
// - systemState = "DEFAULT_SAFE"
// - Can only exit after sensor data normalizes for 60 seconds

unsigned long defaultSafeExitTimer = 0;           // Timer for exit condition
const unsigned long DEFAULT_SAFE_EXIT_DELAY = 60000;  // 60 seconds of normal data to exit
unsigned long previousPulseCountForSafe = 0;      // For pulse tracking

void checkDefaultSafeState(unsigned long now) {
  bool shouldActivateSafe = false;
  String reason = "";
  
  // ============ CHECK FOR UNKNOWN ERROR CONDITIONS ============
  
  // 1. Impossible sensor values (outside physical possibility)
  if (temperature < -40 || temperature > 100) {
    shouldActivateSafe = true;
    reason = "Temperature out of physical range";
  }
  if (humidity < 0 || humidity > 100) {
    shouldActivateSafe = true;
    reason = "Humidity out of physical range";
  }
  if (ammonia < 0 || ammonia > 500) {  // MQ135 can't read > 500ppm
    shouldActivateSafe = true;
    reason = "Ammonia out of physical range";
  }
  
  // 2. NaN values that weren't caught elsewhere
  if (isnan(currentHSI) && !sensorErrorMode) {
    shouldActivateSafe = true;
    reason = "HSI calculation resulted in NaN";
  }
  
  // 3. Invalid state machine states
  if (currentMode != "AUTO" && currentMode != "MANUAL" && 
      currentMode != "FAIL_SAFE" && currentMode != "OFFLINE") {
    shouldActivateSafe = true;
    reason = "Invalid system mode state";
  }
  
  // 4. Multiple critical error modes active simultaneously (unusual)
  int errorModeCount = 0;
  if (sensorErrorMode) errorModeCount++;
  if (waterFailureMode) errorModeCount++;
  if (failsafeMode) errorModeCount++;
  if (!fanRelayHealthy) errorModeCount++;
  
  if (errorModeCount >= 3 && !defaultSafeStateActive) {
    shouldActivateSafe = true;
    reason = "Multiple simultaneous error conditions";
  }
  
  // 5. Fan relay claims OFF but sensor shows extreme danger
  if (!fanOn && temperature > 40 && !localManualOverride) {
    shouldActivateSafe = true;
    reason = "Extreme temp but fan reported OFF";
  }
  
  // 6. Uptime overflow protection (very rare, ~50 days)
  if (now < lastSensorRead && lastSensorRead > 0 && now > 1000) {
    // millis() has wrapped around
    lastSensorRead = 0;
    lastValidSensorRead = 0;
    lastCloudSync = 0;
    Serial.println("⚠️ millis() overflow detected - timers reset");
  }
  
  // ============ ACTIVATE DEFAULT SAFE STATE IF NEEDED ============
  
  if (shouldActivateSafe && !defaultSafeStateActive) {
    defaultSafeStateActive = true;
    defaultSafePhaseStart = now;
    defaultSafeAlarmPhase = true;  // Start with alarm ON
    defaultSafeExitTimer = 0;      // Reset exit timer
    
    Serial.println("\n╔════════════════════════════════════════════════════════════╗");
    Serial.println("║  🛡️ DEFAULT SAFE STATE ACTIVATED (সবচেয়ে গুরুত্বপূর্ণ!)      ║");
    Serial.println("║  যেকোনো অজানা error → Fan ON + Alarm periodic + Never OFF  ║");
    Serial.printf("║  Reason: %-48s ║\n", reason.c_str());
    Serial.println("╚════════════════════════════════════════════════════════════╝\n");
    
    // Immediately turn on Fan HIGH - NEVER OFF in this state
    digitalWrite(FAN_RELAY_PIN, HIGH);
    fanOn = true;
    fanSpeed = "HIGH";
    expectedFanState = true;
    systemState = "DEFAULT_SAFE";
    
    // Activate failsafe mode as well
    if (!failsafeMode) {
      activateFailsafe(reason);
    }
    
    // Log the event
    logFailsafeEvent("DEFAULT_SAFE", reason);
    
    // Try SMS alert
    #ifdef GSM_ENABLED
    sendGsmSms("🛡️ EMERGENCY: Default Safe State activated - " + reason);
    #endif
  }
  
  // ============ MAINTAIN SAFE STATE WHILE ACTIVE ============
  
  if (defaultSafeStateActive) {
    // 🔥 CRITICAL: Fan must ALWAYS be ON in this state
    if (!fanOn || digitalRead(FAN_RELAY_PIN) != HIGH) {
      digitalWrite(FAN_RELAY_PIN, HIGH);
      fanOn = true;
      fanSpeed = "HIGH";
      expectedFanState = true;
      Serial.println("🛡️ DEFAULT SAFE: Forced Fan ON (never OFF!)");
    }
    
    // Periodic alarm pattern: 0.5 sec ON, 5 sec OFF
    if (defaultSafeAlarmPhase) {
      // Alarm ON phase
      digitalWrite(ALARM_RELAY_PIN, HIGH);
      alarmOn = true;
      
      if (now - defaultSafePhaseStart >= DEFAULT_SAFE_ALARM_ON) {
        defaultSafeAlarmPhase = false;  // Switch to OFF phase
        defaultSafePhaseStart = now;
      }
    } else {
      // Alarm OFF phase
      digitalWrite(ALARM_RELAY_PIN, LOW);
      alarmOn = false;
      
      if (now - defaultSafePhaseStart >= DEFAULT_SAFE_ALARM_OFF) {
        defaultSafeAlarmPhase = true;  // Switch to ON phase
        defaultSafePhaseStart = now;
      }
    }
    
    // ============ CHECK FOR EXIT CONDITIONS ============
    // Can only exit if ALL conditions are normal for 60 seconds
    
    bool canExit = true;
    
    // Check sensor values are normal
    if (isnan(temperature) || isnan(humidity)) canExit = false;
    if (temperature < 10 || temperature > 50) canExit = false;
    if (humidity < 20 || humidity > 95) canExit = false;
    if (isnan(currentHSI)) canExit = false;
    
    // Check state machine is valid
    if (currentMode != "AUTO" && currentMode != "MANUAL" && 
        currentMode != "FAIL_SAFE" && currentMode != "OFFLINE") canExit = false;
    
    // Check sensor error mode is cleared
    if (sensorErrorMode) canExit = false;
    
    if (canExit) {
      // Start or continue exit timer
      if (defaultSafeExitTimer == 0) {
        defaultSafeExitTimer = now;
        Serial.println("🛡️ DEFAULT SAFE: Conditions normalizing, starting 60s exit timer...");
      }
      
      // Check if 60 seconds have passed
      if (now - defaultSafeExitTimer >= DEFAULT_SAFE_EXIT_DELAY) {
        // Safe to exit
        defaultSafeStateActive = false;
        digitalWrite(ALARM_RELAY_PIN, LOW);
        alarmOn = false;
        
        Serial.println("\n╔════════════════════════════════════════════════════════════╗");
        Serial.println("║  ✅ DEFAULT SAFE STATE CLEARED                              ║");
        Serial.println("║  Conditions normal for 60 seconds - resuming normal ops     ║");
        Serial.println("╚════════════════════════════════════════════════════════════╝\n");
        
        logFailsafeEvent("DEFAULT_SAFE_CLEARED", "Conditions normalized");
        
        // Note: Fan stays ON until automation decides to turn it off
        // This is intentional - let the normal logic decide
      }
    } else {
      // Reset exit timer if conditions are not normal
      if (defaultSafeExitTimer > 0) {
        defaultSafeExitTimer = 0;
        Serial.println("🛡️ DEFAULT SAFE: Exit timer reset - conditions not yet normal");
      }
    }
  }
}

// ================ FAN RELAY HEALTH CHECK ================
// 🔧 Tests if the fan relay is actually responding
// This detects "stuck relay" problems

void checkFanRelayHealth() {
  static unsigned long lastHealthCheck = 0;
  unsigned long now = millis();
  
  // Run health check periodically
  if (now - lastHealthCheck < FAN_HEALTH_CHECK_INTERVAL) return;
  lastHealthCheck = now;
  
  // Only check in failsafe mode or when critical
  if (!failsafeMode && temperature < 35.0) return;
  
  Serial.println("\n🔧 FAN RELAY HEALTH CHECK...");
  
  // Read actual GPIO state
  bool actualState = digitalRead(FAN_RELAY_PIN) == HIGH;
  
  // Compare expected vs actual
  if (actualState != expectedFanState) {
    fanHealthCheckFailCount++;
    Serial.printf("❌ MISMATCH! Expected: %s, Actual: %s (Fail #%d)\n",
                  expectedFanState ? "ON" : "OFF",
                  actualState ? "ON" : "OFF",
                  fanHealthCheckFailCount);
    
    // Try to force correct state
    digitalWrite(FAN_RELAY_PIN, expectedFanState ? HIGH : LOW);
    delay(100);
    
    // Re-check
    actualState = digitalRead(FAN_RELAY_PIN) == HIGH;
    if (actualState == expectedFanState) {
      Serial.println("✓ Relay recovered after retry");
    }
  } else {
    // Reset fail count on success
    if (fanHealthCheckFailCount > 0) {
      fanHealthCheckFailCount = 0;
      Serial.println("✓ Fan relay operating normally");
    }
  }
  
  // Check for stuck relay
  if (fanHealthCheckFailCount >= MAX_FAN_HEALTH_FAILURES) {
    fanRelayHealthy = false;
    Serial.println("\n🚨🚨🚨 FAN RELAY STUCK! 🚨🚨🚨");
    Serial.println("Hardware problem detected!");
    
    // Trigger alarm for stuck relay
    alarmOn = true;
    digitalWrite(ALARM_RELAY_PIN, HIGH);
    
    // Log the issue
    logFailsafeEvent("RELAY_STUCK", "Fan relay not responding after 3 attempts");
    
    // Try GSM SMS if available
    #ifdef GSM_ENABLED
    sendGsmSms("⚠️ HARDWARE ALERT: Fan relay stuck! Manual intervention required.");
    #endif
  }
}

// Update expected state when setting fan
void setFanState(bool state, String speed) {
  fanOn = state;
  fanSpeed = speed;
  expectedFanState = state;
  lastFanToggleTime = millis();
  
  digitalWrite(FAN_RELAY_PIN, state ? HIGH : LOW);
  
  Serial.printf("🌀 Fan → %s (%s)\n", state ? "ON" : "OFF", speed.c_str());
}

// ================ UTILITY FUNCTIONS ================
void parseTime(String timeStr, int &hour, int &minute) {
  int colonIndex = timeStr.indexOf(':');
  if (colonIndex > 0) {
    hour = timeStr.substring(0, colonIndex).toInt();
    minute = timeStr.substring(colonIndex + 1).toInt();
  }
}

void updateStatusLED() {
  static unsigned long lastBlink = 0;
  static bool ledState = false;
  
  unsigned long now = millis();
  int blinkInterval;
  
  if (failsafeMode) {
    blinkInterval = 250;  // Fast blink in failsafe
  } else if (cloudConnected) {
    blinkInterval = 2000;  // Slow blink when connected
  } else {
    blinkInterval = 500;  // Medium blink when WiFi only
  }
  
  if (now - lastBlink >= blinkInterval) {
    ledState = !ledState;
    digitalWrite(STATUS_LED_PIN, ledState ? HIGH : LOW);
    lastBlink = now;
  }
}
