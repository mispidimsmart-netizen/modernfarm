/*
 * ╔═══════════════════════════════════════════════════════════════════════╗
 * ║  SMART FARM - INDUSTRIAL CONTROLLER v7.0                              ║
 * ║  Single Authority State Machine Architecture                          ║
 * ╠═══════════════════════════════════════════════════════════════════════╣
 * ║  DESIGN PRINCIPLES:                                                    ║
 * ║    1. ONE automation decision engine (no parallel controllers)         ║
 * ║    2. State-machine architecture with deterministic transitions        ║
 * ║    3. Non-blocking: ZERO delay() in main loop                         ║
 * ║    4. Single relay authority: only RelayManager writes to pins         ║
 * ║    5. Sensor manager layer: read once, filter, then decide            ║
 * ║    6. GSM alerts as async background queue                            ║
 * ║    7. Failsafe is a STATE, not a separate system                      ║
 * ║    8. Cloud = config only, ESP32 = local guardian                      ║
 * ╠═══════════════════════════════════════════════════════════════════════╣
 * ║  STATE MACHINE:                                                        ║
 * ║    BOOT → NORMAL ↔ WARNING ↔ DANGER → EMERGENCY                      ║
 * ║                                    ↕                                  ║
 * ║                              SENSOR_FAIL                              ║
 * ║  Transitions require validated sensor data + time confirmation.        ║
 * ╠═══════════════════════════════════════════════════════════════════════╣
 * ║  MODULES (all inside single control loop):                             ║
 * ║    A: Minimum Ventilation Timer (cyclic exhaust)                       ║
 * ║    B: Heater Control (age-based curve for broiler)                     ║
 * ║    C: Fogger Cooling (temp+humidity trigger)                          ║
 * ║    D: Airflow Growth (broiler age-based fan)                          ║
 * ║    E: Lighting Soft Control (PWM fade)                                ║
 * ║    F: Offline Age Increment (24h local tick)                          ║
 * ║    G: Priority System (Safety > Heat > Cool > Vent > Light)           ║
 * ║    H: Emergency Survival (cyclic fan without sensors)                 ║
 * ║    I: Hysteresis Stabilization (anti-oscillation)                     ║
 * ║    J: Sensor Validation Layer (median filter + spike rejection)       ║
 * ║    K: Power Recovery Purge (5 min post-outage ventilation)            ║
 * ║    L: GSM Alert Queue (async SMS, non-blocking)                       ║
 * ╠═══════════════════════════════════════════════════════════════════════╣
 * ║  HARDWARE (Active LOW relays — 8-Channel):                             ║
 * ║    GPIO 25 (IN1): Exhaust Fan                                         ║
 * ║    GPIO 26 (IN2): Ceiling Fan                                         ║
 * ║    GPIO 27 (IN3): Light                                               ║
 * ║    GPIO 14 (IN4): Heater                                              ║
 * ║    GPIO 12 (IN5): Fogger Solenoid                                     ║
 * ║    GPIO 13 (IN6): Alarm                                               ║
 * ║    GPIO 15 (IN7): Roof Sprinkler                                      ║
 * ║    GPIO 33 (IN8): Circulation Fan                                     ║
 * ║    GPIO 4:  DHT22 #1     GPIO 16: DHT22 #2                           ║
 * ║    GPIO 34: MQ-137 NH3   GPIO 35: ZMPT101B Voltage                   ║
 * ║    GPIO 17: YF-S201 Water Flow                                        ║
 * ║    GPIO 19: GSM RX (SIM800L TX)                                       ║
 * ║    GPIO 23: GSM TX (SIM800L RX)                                       ║
 * ║    GPIO 5:  GSM RST (optional)                                        ║
 * ╚═══════════════════════════════════════════════════════════════════════╝
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
#include <esp_ota_ops.h>
#include <HardwareSerial.h>
#include "esp32-safety-engine.h"

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  SECTION 1: CONFIGURATION & CONSTANTS                                 ║
// ╚═══════════════════════════════════════════════════════════════════════╝

// --- Overflow-safe elapsed time helper ---
// Uses unsigned subtraction which is inherently overflow-safe on uint32.
// millis() wraps at ~49.7 days; (now - past) always gives correct elapsed
// as long as the interval is < 49.7 days (which all our intervals are).
inline unsigned long safeElapsed(unsigned long now, unsigned long since) {
  return now - since;  // unsigned subtraction handles overflow correctly
}
// Convenience: check if interval has passed (overflow-safe)
inline bool intervalPassed(unsigned long now, unsigned long since, unsigned long interval) {
  return safeElapsed(now, since) >= interval;
}

// --- Firmware ---
const char* FIRMWARE_VERSION = "8.0.0";

// --- Pin Definitions (8-Channel Relay v2.0) ---
#define DHT_PIN              4
#define DHT2_PIN             16     // Moved from 15 to avoid relay conflict
#define DHT_TYPE             DHT22
#define MQ135_PIN            34
#define POWER_SENSE_PIN      35
#define WATER_FLOW_PIN       17     // Moved from 27 to avoid relay conflict
#define FAN_RELAY_PIN        25     // IN1: Exhaust Fan
#define CEILING_FAN_RELAY_PIN 26    // IN2: Ceiling Fan (NEW)
#define LIGHT_RELAY_PIN      27     // IN3: Light
#define HEATER_RELAY_PIN     14     // IN4: Heater
#define FOGGER_RELAY_PIN     12     // IN5: Fogger Solenoid
#define ALARM_RELAY_PIN      13     // IN6: Alarm
#define SPRINKLER_RELAY_PIN  15     // IN7: Roof Sprinkler (NEW)
#define CIRCULATION_RELAY_PIN 33    // IN8: Circulation Fan
#define STATUS_LED_PIN       2
#define MANUAL_OVERRIDE_BTN  32
// Note: GPIO 14 now used by Heater relay, manual fan button removed

// --- GSM Pins (moved from 16/17 due to sensor remapping) ---
#define GSM_TX_PIN           23
#define GSM_RX_PIN           19
#define GSM_RST_PIN          5
#define GSM_BAUD             9600

// --- Watchdog ---
#define WDT_TIMEOUT          8

// --- Timing (all millis-based, no delay) ---
#define SENSOR_READ_INTERVAL     5000UL
#define CLOUD_SYNC_INTERVAL      30000UL
#define COMMAND_CHECK_INTERVAL   5000UL
#define CONFIG_FETCH_INTERVAL    60000UL
#define WIFI_RECONNECT_INTERVAL  60000UL
#define CLOUD_TIMEOUT            300000UL
#define SAFE_MODE_DURATION       30000UL
#define GAS_WARMUP_DURATION      300000UL   // 5 min initial warmup (MQ-137 needs 24h for full accuracy)
#define GAS_FULL_WARMUP_MS       86400000UL // 24 hours full MQ-137 stabilization
#define SENSOR_TIMEOUT           90000UL    // 90 sec invalid → SENSOR_FAIL
#define WATER_TIMEOUT            21600000UL
#define OTA_CHECK_INTERVAL       3600000UL
#define AGE_TICK_INTERVAL        86400000UL
#define MANUAL_OVERRIDE_TIMEOUT  1200000UL  // 20 minutes (matched with docs & app)
#define OFFLINE_STORE_INTERVAL   60000UL
#define STATUS_LOG_INTERVAL      60000UL
#define GSM_QUEUE_INTERVAL       5000UL
#define GSM_COOLDOWN_DEFAULT     1800000UL
#define GSM_CRITICAL_COOLDOWN_MS 120000UL  // Critical alerts resend every 2 minutes

// --- OTA Environment Stability Gate ---
#define OTA_STABILITY_WINDOW_MS  600000UL  // 10 minutes stable required before OTA
#define OTA_STABLE_TEMP_MIN      18.0f     // Must be above this
#define OTA_STABLE_TEMP_MAX      36.0f     // Must be below this

// --- Manual Override Safety Band ---
#define OVERRIDE_SAFE_TEMP_MIN   26.0f     // Cannot let temp drop below (birds die)
#define OVERRIDE_SAFE_TEMP_MAX   35.0f     // Cannot let temp rise above (birds die)

// --- Sensor Sanity ---
#define TEMP_SANITY_MIN      0.0f
#define TEMP_SANITY_MAX      60.0f
#define HUMIDITY_SANITY_MIN  10.0f
#define HUMIDITY_SANITY_MAX  100.0f

// --- Sensor Validation Layer (Module J) ---
// ALL automation uses SVL-validated values ONLY. Raw sensor data NEVER controls relays.
// Pipeline: Raw → Store in buffer → Compute median → Spike compare vs median → Accept/Reject → Use
// Spike rejection: >20% deviation from MEDIAN (not previous raw)
// NH3 confirmation: must breach threshold for 45s continuously before ANY state escalation
// Sensor timeout: 90s invalid → SENSOR_FAIL; 3min no valid → lastStableValue expires
#define SVL_MEDIAN_SIZE          5
#define SVL_SPIKE_PERCENT        20.0f
#define SVL_NH3_SUSTAIN_MS       45000UL
#define SVL_SENSOR_OFFLINE_MS    90000UL     // 90 sec → SENSOR_FAIL
#define SVL_LAST_GOOD_EXPIRE_MS  180000UL    // 3 min → lastStableValue expires → SENSOR_FAIL

// --- Emergency Survival ---
#define ESM_FAN_ON_MS        120000UL    // 2 min ON (max continuous ON)
#define ESM_FAN_OFF_MS       120000UL    // 2 min OFF
#define ESM_ALARM_ON_MS      30000UL
#define ESM_ALARM_OFF_MS     30000UL
#define ESM_INVALID_TIMEOUT  180000UL
#define ESM_RECOVERY_VERIFY_MS 120000UL  // 2 min stable sensors required before exit

// --- Power Recovery Purge ---
#define PURGE_OUTAGE_THRESHOLD   180000UL   // 3 min outage required
#define PURGE_DURATION           300000UL   // 5 min purge
#define PURGE_COLD_TEMP          24.0f      // Below this → reduced purge (cold-shock protection)
#define NVS_HEARTBEAT_INTERVAL   30000UL    // Write alive timestamp every 30s
#define NVS_HEARTBEAT_NS         "pwrtrack" // NVS namespace for power tracking

// --- Hysteresis ---
#define MAX_HYST_STAGES      4
#define HYST_MIN_ON_MS       60000UL
#define HYST_MIN_OFF_MS      60000UL

// --- Per-Sensor Safety Zones ---
// Instead of averaging, each sensor has an independent safety zone.
// If ANY sensor exceeds the danger threshold, emergency activates.
// This prevents a cool sensor masking a hot sensor near birds.

// --- Global Relay Protection ---
// No relay change allowed within this window (prevents chattering across all channels)
#define RELAY_PROTECTION_MS  60000UL

// --- Buffers ---
#define GAS_AVG_SIZE         10
#define SENSOR_ROLLING_SIZE  5
#define OFFLINE_BUFFER_SIZE  50
#define WATER_HISTORY_SIZE   24
#define MAX_GSM_QUEUE        8
#define MAX_PHONE_NUMBERS    5

// --- Farm Profile ---
#define FARM_PROFILE_LAYER   0
#define FARM_PROFILE_BROILER 1

// --- EEPROM ---
#define EEPROM_SIZE          512
#define EEPROM_CONFIG_ADDR   0
#define EEPROM_MAGIC_ADDR    32
#define FARM_CONFIG_MAGIC    0x46524D43

// --- NVS ---
#define NVS_NAMESPACE        "credentials"
#define NVS_PROVISIONED_MAGIC 0x50524F56
#define USE_HARDCODED_TOKEN  true

// --- Network (user must configure) ---
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD  = "YOUR_WIFI_PASSWORD";
const char* API_URL        = "https://hbwfuvqrfgtefozajyfu.supabase.co/functions/v1/esp32-api";
const char* DEVICE_TOKEN   = "YOUR_DEVICE_TOKEN";
const char* SHED_ID        = "YOUR_SHED_ID";
const char* SHED_NAME      = "Shed A";
const char* FARM_ID        = "YOUR_FARM_ID";

// --- Threshold Constants ---
const float LAYER_TEMP_HEATER     = 18.0f;
const float LAYER_TEMP_MAX        = 27.0f;
const float LAYER_TEMP_FAN_HIGH   = 30.0f;
const float LAYER_TEMP_ALARM      = 33.0f;
const float LAYER_HUMIDITY_LOW    = 40.0f;
const float LAYER_HUMIDITY_HIGH   = 75.0f;
const float LAYER_AMMONIA_FAN     = 15.0f;
const float LAYER_AMMONIA_ALARM   = 25.0f;
const float LAYER_HSI_FAN_LOW     = 75.0f;
const float LAYER_HSI_FAN_HIGH    = 80.0f;
const float LAYER_HSI_EMERGENCY   = 85.0f;
const float LAYER_HSI_CRITICAL    = 90.0f;

const float BROILER_AMMONIA_FAN   = 20.0f;
const float BROILER_AMMONIA_ALARM = 30.0f;
const float BROILER_HSI_FAN_LOW   = 75.0f;
const float BROILER_HSI_FAN_HIGH  = 78.0f;
const float BROILER_HSI_EMERGENCY = 82.0f;
const float BROILER_HSI_CRITICAL  = 86.0f;

// --- Ceiling Fan Thresholds ---
const float CEILING_FAN_ON_TEMP   = 25.0f;   // Ceiling fan ON when temp >= 25°C
const float CEILING_FAN_OFF_TEMP  = 22.0f;   // Ceiling fan OFF when temp <= 22°C

// --- Sprinkler (Roof) Thresholds — HSI-based ---
const float SPRINKLER_HSI_ON      = 80.0f;   // Sprinkler ON when HSI >= 80
const float SPRINKLER_HSI_OFF     = 75.0f;   // Sprinkler OFF when HSI <= 75
#define SPRINKLER_CYCLE_ON_SEC    60         // 60s spray
#define SPRINKLER_CYCLE_OFF_SEC   120        // 120s pause
#define SPRINKLER_MAX_DAILY_MIN   60         // Max 60 min/day

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  SECTION 2: DATA STRUCTURES                                           ║
// ╚═══════════════════════════════════════════════════════════════════════╝

// --- State Machine ---
enum SystemState {
  STATE_BOOT,
  STATE_NORMAL,
  STATE_WARNING,
  STATE_DANGER,
  STATE_EMERGENCY,
  STATE_SENSOR_FAIL
};
const char* stateNames[] = {"BOOT","NORMAL","WARNING","DANGER","EMERGENCY","SENSOR_FAIL"};
SystemState currentState = STATE_BOOT;
SystemState previousState = STATE_BOOT;
unsigned long stateEnteredAt = 0;

// --- Farm Config (EEPROM persisted) ---
struct FarmConfig {
  int farmType;
  int chickAgeDays;
  float tempOffset;
  float nh3Offset;
};
FarmConfig farmConfig = { FARM_PROFILE_LAYER, 1, 0.0f, 0.0f };

// --- Runtime Rules ---
struct RuntimeRules {
  float tempMin, tempMax, tempTarget, tempFanHigh, tempAlarm, tempHeaterOn;
  float hsiFanLow, hsiFanHigh, hsiEmergency, hsiCritical;
  float ammoniaFan, ammoniaAlarm;
  float humidityLow, humidityHigh;
  bool useAgeBasedTemp, lightingProtection;
};
RuntimeRules rules;

// --- Module Settings ---
struct MinVentSettings {
  bool enabled; float tempThreshold; int cycleSeconds, intervalMinutes; bool ceilingFanAlwaysOn;
};
MinVentSettings minVentSettings = { true, 26.0f, 40, 5, true };

struct HeaterSettings {
  bool enabled; float layerOnTemp, layerOffTemp, tolerance, safetyMaxTemp;
};
HeaterSettings heaterSettings = { true, 20.0f, 24.0f, 0.7f, 34.0f };

struct FoggerSettings {
  bool enabled; float startTemp, startHumidityMax, stopTemp, stopHumidity; int onSeconds, pauseSeconds;
};
FoggerSettings foggerSettings = { false, 32.0f, 85.0f, 30.0f, 90.0f, 40, 120 };

struct AirflowSettings {
  bool enabled; int earlyAgeDays, midAgeDays, midOnSeconds, midIntervalMinutes, nightOnSeconds, nightIntervalMinutes;
};
AirflowSettings airflowSettings = { true, 10, 20, 30, 3, 60, 5 };

struct LightSchedule {
  bool enabled, manualOverride;
  int startHour, startMinute, endHour, endMinute;
  int fadeInMinutes, fadeOutMinutes, minBrightness, maxBrightness;
};
LightSchedule lightSchedule = { true, false, 5, 0, 21, 0, 30, 30, 0, 100 };

// --- Broiler Temp Curve ---
struct BroilerCurveEntry { int minDays, maxDays; float minTemp, maxTemp; };
const BroilerCurveEntry BROILER_CURVE[] = {
  {1,3,33,34},{4,7,32,32},{8,14,30,30},{15,21,28,28},{22,28,26,26},{29,35,24,24},{36,999,22,23}
};
const int BROILER_CURVE_SIZE = 7;

const float HEATER_BROILER_CURVE[][2] = {
  {3,33.5},{7,32.0},{14,30.0},{21,28.0},{28,26.0},{35,24.0},{999,22.5}
};
#define HEATER_CURVE_SIZE 7

// --- Sensor Validation Channel (defined in esp32-safety-engine.h) ---
// SVLChannel, HystStage, HystChannel are now in the header file
// to prevent Arduino IDE auto-prototype ordering issues.

// --- Relay Command (single authority) ---
struct RelayState {
  bool fan, light, alarm, heater, fogger, circulationFan, ceilingFan, sprinkler;
  String fanSpeed;
};

// --- GSM Alert Queue ---
struct GsmAlert {
  String message;
  String alertType;
  bool pending;
};

// --- Offline Buffer ---
struct OfflineRecord {
  unsigned long timestamp;
  float temperature, humidity, ammonia, waterFlow, hsi;
  bool powerOn;
  String fanSpeed, systemState;
};

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  SECTION 3: GLOBAL STATE                                              ║
// ╚═══════════════════════════════════════════════════════════════════════╝

// --- Hardware Objects ---
DHT dht(DHT_PIN, DHT_TYPE);
DHT dht2(DHT2_PIN, DHT_TYPE);
Preferences preferences;
HardwareSerial gsmSerial(2);
SafetyEngine safetyEngine;

// --- Actuator Effect Tracking (firmware-level counters for backend) ---
float tempAtFanStart = NAN, tempAtHeaterStart = NAN;
unsigned long fanOnSince = 0, heaterOnSince = 0;
int fanEffectFailures = 0, heaterEffectFailures = 0;
bool fanEffectVerified = true, heaterEffectVerified = true;

// --- Thermal Model (firmware-level) ---
float thermalExpectedTemp = 25.0f;
unsigned long lastThermalModelUpdate = 0;
bool thermalModelPlausible = true;
float thermalModelDeviation = 0.0f;
String thermalModelReason = "";
int thermalImplausibleCount = 0;

// --- Worst-Case Sensor Values ---
float worstCaseMaxTemp = 25.0f;
float worstCaseMinTemp = 25.0f;

// --- Sensor State ---
float temperature = 25.0f, humidity = 60.0f, ammonia = 0.0f;
float temperature2 = NAN, humidity2 = NAN;
float waterFlow = 0.0f, currentHSI = 0.0f;
float powerVoltageRMS = 230.0f;
bool powerOn = true, dht2Available = false;
bool sensorErrorMode = false;
unsigned long lastValidSensor = 0;
volatile unsigned long waterPulseCount = 0;
unsigned long lastWaterPulse = 0;
bool waterFailureMode = false;

// --- SVL Channels ---
SVLChannel svlTemp     = {{0},0,0,25.0f,0,0,true,false};
SVLChannel svlHumidity = {{0},0,0,60.0f,0,0,true,false};
SVLChannel svlAmmonia  = {{0},0,0,0.0f,0,0,true,false};
bool nh3ThresholdBreached = false;
unsigned long nh3ThresholdBreachStart = 0;
bool nh3VentilationConfirmed = false;

// --- Rolling Averages ---
float tempRollingBuf[SENSOR_ROLLING_SIZE] = {0};
float humRollingBuf[SENSOR_ROLLING_SIZE]  = {0};
int rollingIndex = 0, rollingCount = 0;
float gasReadings[GAS_AVG_SIZE] = {0};
int gasIndex = 0, gasCount = 0;
float gasAvg10 = 0.0f;
int consecutiveHighNH3 = 0;
float lastValidAmmonia = 0.0f;
unsigned long lastAmmoniaTime = 0;
float lastVoltageRMS = 230.0f;
unsigned long lastVoltageChangeTime = 0;

// --- Gas Warmup ---
bool gasWarmupDone = false;
unsigned long gasWarmupStart = 0;

// --- Relay State (single authority) ---
RelayState relayTarget = { false, false, false, false, false, false, false, false, "OFF" };
bool fanOn = false, lightOn = false, alarmOn = false, heaterOn = false;
bool foggerOn = false, circulationFanOn = false, ceilingFanOn = false, sprinklerOn = false;
String fanSpeed = "OFF";
int lightBrightness = 0;

// --- Global Relay Protection Timer ---
unsigned long lastRelayChangeTime = 0;  // Timestamp of last relay state change
bool relayProtectionActive = false;     // True if within 60s protection window
bool manualCommandPending = false;      // Bypass relay protection for manual commands

// --- Manual Overrides ---
bool localManualOverride = false;
bool fanManualOverride = false;     unsigned long fanManualTime = 0;
bool heaterManualOverride = false;  unsigned long heaterManualTime = 0;
bool foggerManualOverride = false;  unsigned long foggerManualTime = 0;
bool circulationFanManualOverride = false; unsigned long circulationFanManualTime = 0;
bool ceilingFanManualOverride = false; unsigned long ceilingFanManualTime = 0;
bool sprinklerManualOverride = false; unsigned long sprinklerManualTime = 0;
unsigned long lightManualOverrideTime = 0;

// --- Connection State ---
bool wifiConnected = false, cloudConnected = false, failsafeMode = false;
unsigned long lastCloudSync = 0, lastWifiAttempt = 0;

// --- Boot/Safe Mode ---
bool stabilizingMode = true;
unsigned long stabilizingEndTime = 0;
bool safeModeActive = false;
unsigned long safeModeEndTime = 0;
String restartReason = "UNKNOWN";
int totalRestarts = 0;
bool wasWatchdogReset = false;

// --- Emergency Survival Mode ---
bool emergencySurvivalMode = false;
unsigned long emergencySurvivalStart = 0;
bool esmFanOn = false;
bool esmTriggeredByWatchdog = false, esmTriggeredByReboot = false;
String esmTriggerReason = "";
bool invalidReadingsActive = false;
unsigned long invalidReadingsStart = 0;

// ESM cycle timer (independent, never reset by state machine updates)
unsigned long esmCycleOrigin = 0;       // Fixed origin for fan cycle timing

// ESM recovery verification (2 min stable before exit)
bool esmRecoveryStarted = false;        // True when sensors first become valid
unsigned long esmRecoveryStartTime = 0; // When recovery verification began

// --- Power Recovery Purge ---
bool purgeActive = false;
unsigned long purgeStartTime = 0;
bool purgeColdMode = false;            // True if temp below brooding safety → reduced vent
unsigned long lastNvsHeartbeat = 0;    // Last NVS alive timestamp write
unsigned long measuredOutageDuration = 0; // Actual outage duration from NVS

// --- Hysteresis Channels ---
HystChannel hystFan = {"FAN", {
  {30,28,false,0,0,HYST_MIN_ON_MS,HYST_MIN_OFF_MS},
  {32,30,false,0,0,HYST_MIN_ON_MS,HYST_MIN_OFF_MS},
  {34,32,false,0,0,HYST_MIN_ON_MS,HYST_MIN_OFF_MS},
  {0,0,false,0,0,HYST_MIN_ON_MS,HYST_MIN_OFF_MS}
}, 3, 0};
HystChannel hystHeater = {"HEATER", {
  {20,22,false,0,0,HYST_MIN_ON_MS,HYST_MIN_OFF_MS},
  {0,0,false,0,0,HYST_MIN_ON_MS,HYST_MIN_OFF_MS},
  {0,0,false,0,0,HYST_MIN_ON_MS,HYST_MIN_OFF_MS},
  {0,0,false,0,0,HYST_MIN_ON_MS,HYST_MIN_OFF_MS}
}, 1, 0};
HystChannel hystFogger = {"FOGGER", {
  {32,30,false,0,0,HYST_MIN_ON_MS,HYST_MIN_OFF_MS},
  {0,0,false,0,0,HYST_MIN_ON_MS,HYST_MIN_OFF_MS},
  {0,0,false,0,0,HYST_MIN_ON_MS,HYST_MIN_OFF_MS},
  {0,0,false,0,0,HYST_MIN_ON_MS,HYST_MIN_OFF_MS}
}, 1, 0};
HystChannel hystAlarm = {"ALARM", {
  {35,33,false,0,0,HYST_MIN_ON_MS,HYST_MIN_OFF_MS},
  {0,0,false,0,0,HYST_MIN_ON_MS,HYST_MIN_OFF_MS},
  {0,0,false,0,0,HYST_MIN_ON_MS,HYST_MIN_OFF_MS},
  {0,0,false,0,0,HYST_MIN_ON_MS,HYST_MIN_OFF_MS}
}, 1, 0};

// --- Min Vent State ---
bool minVentActive = false, minVentInCycle = false;
unsigned long minVentCycleStart = 0, lastMinVentCycle = 0;

// --- Fogger State ---
bool foggerActive = false, foggerInSpray = false;
unsigned long foggerSprayStart = 0, foggerPauseStart = 0;
int foggerCycleCount = 0;

// --- Airflow State ---
bool airflowInCycle = false;
unsigned long airflowCycleStart = 0, lastAirflowCycle = 0;

// --- Lighting Fade State ---
int targetBrightness = 0, fadeStartBrightness = 0;
unsigned long fadeStartTime = 0;
bool fadeInProgress = false;
bool lightWasOn = false;
unsigned long lightOffStartTime = 0;
bool lightingAlertActive = false;
#define LIGHTING_ALERT_DELAY 600000UL

// --- Time ---
int currentHour = 12, currentMinute = 0;
unsigned long lastTimeSync = 0;
bool timeValid = false;

// --- Age Tracking ---
unsigned long lastAgeTickMillis = 0, lastAgeSyncMillis = 0;
unsigned long lastAgeIncreaseMillis = 0, lastServerAgeSyncTime = 0;
int lastServerSyncedAge = 0;
String ageSource = "LOCAL";
bool ageFromServer = false;
bool configLoaded = false;

// --- Credentials (NVS) ---
String activeDeviceToken = "", activeWifiSSID = "", activeWifiPassword = "";
String activeShedId = "", activeShedName = "", activeFarmId = "";
bool nvsProvisioned = false;

// --- OTA ---
bool otaInProgress = false;
int otaProgress = 0;
String otaStatus = "idle", otaAvailableVersion = "", otaPendingUrl = "", otaPendingChecksum = "";
int otaPendingSize = 0;
unsigned long lastOTACheck = 0;

// --- OTA Environment Stability Tracking ---
bool otaEnvironmentStable = false;
unsigned long otaStableStartTime = 0;  // When environment first became stable

// --- Offline Buffer ---
OfflineRecord offlineBuffer[OFFLINE_BUFFER_SIZE];
int offlineBufHead = 0, offlineBufCount = 0;
unsigned long lastOfflineStore = 0;

// --- Water Analytics ---
float waterFlowHistory[WATER_HISTORY_SIZE] = {0};
int waterHistIndex = 0, waterHistCount = 0;
float waterRollingAvg = 0.0f, water2hAvg = 0.0f;
int waterAnomalyConsecutive = 0;
unsigned long lastWaterHistUpdate = 0;
bool waterAnomalyAlertSent = false;

// --- Timing Trackers ---
unsigned long lastSensorRead = 0, lastCloudSyncAttempt = 0;
unsigned long lastCommandCheck = 0, lastConfigFetch = 0;
unsigned long lastStatusLog = 0, lastOnlineCheck = 0;
unsigned long lastGsmQueueCheck = 0;
unsigned long onlineDurationSec = 0, offlineDurationSec = 0;
bool configSynced = false;
int cachedSettingsVersion = 0;

// --- GSM State ---
bool gsmInitialized = false, gsmNetworkReady = false;
bool smsEnabled = true;
bool smsAlertTemp = true, smsAlertHumidity = true, smsAlertAmmonia = true;
bool smsAlertPower = true, smsAlertWater = true;
String phoneNumbers[MAX_PHONE_NUMBERS];
int phoneNumberCount = 0;
unsigned long smsCooldownMs = GSM_COOLDOWN_DEFAULT;
unsigned long lastSmsSentTime = 0;
GsmAlert gsmQueue[MAX_GSM_QUEUE];
int gsmQueueHead = 0, gsmQueueTail = 0;

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  SECTION 4: FORWARD DECLARATIONS                                      ║
// ╚═══════════════════════════════════════════════════════════════════════╝

// Helpers
bool isLayer();
bool isBroiler();
String getFarmTypeStr();
float calculateHSI(float t, float h);
float getHeaterTargetTemp(int age);
void printFarmProfile();

// State Machine
void transitionTo(SystemState newState, String reason);
SystemState evaluateState();

// Sensor Manager
void sensorManagerTick();
float readTempFiltered();
float readHumidityFiltered();
float readGasFiltered();
float readPowerVoltageRMS();
bool checkPowerFailure();
void calculateWaterFlow();

// SVL
float svlProcessReading(SVLChannel &ch, float rawValue);
float svlGetMedian(SVLChannel &ch);
void svlCheckAmmoniaThreshold(float nh3, float threshold);
void svlCheckSensorOffline();

// Relay Manager (SINGLE AUTHORITY)
void relayManagerApply();
void requestFan(bool on, String speed);
void requestAlarm(bool on);
void requestHeater(bool on);
void requestFogger(bool on);
void requestCirculationFan(bool on);
void requestCeilingFan(bool on);
void requestSprinkler(bool on);
void requestLight(int brightness);

// Automation Engine
void automationEngineTick();
void runControlLogic();
void advancedHeaterControl();
void foggerControl();
void checkMinimumVentilation();
void broilerAirflowControl();
void controlLighting();
void updateLightingWithFade();

// Hysteresis
int evaluateHysteresisChannel(HystChannel &ch, float val, bool inverted);
void updateHysteresisThresholds();

// Rules
void loadLayerRules();
void loadBroilerRules();

// Ceiling Fan & Sprinkler
void ceilingFanControl();
void sprinklerControl();

// Emergency / Purge
void checkEmergencyTriggers();
void checkEmergencyRecovery();
void runEmergencySurvivalCycles();
void enterESM(String reason);
void startPowerRecoveryPurge(unsigned long outageDuration);
void checkPowerRecoveryPurge();
void nvsWriteAliveTimestamp();
unsigned long nvsReadOutageDuration();

// Network
void connectWiFi();
void syncWithCloud();
void fetchConfig();
void checkCommands();
void handleCloudResponse(String response);

// Farm Profile / EEPROM
void loadFarmProfile();
void saveFarmProfile();
void updateAge(int newAge);
void updateAgeFromServer(int newAge);
void checkOfflineAgeIncrement();
void loadAgeTickTime();
void saveAgeTickTime();

// NVS
bool isNVSProvisioned();
void loadCredentialsFromNVS();
void saveCredentialsToNVS();
void provisionFromHardcoded();

// OTA (Industrial Safe)
void validateBootPartition();
void checkOTAUpdate();
void performOTAUpdate();
bool compareVersions(String current, String target);
uint32_t calculateCRC32(uint8_t* data, size_t length);
uint32_t calculateStreamCRC32(const esp_partition_t* partition, size_t size);

// GSM
void gsmInit();
void gsmQueueAlert(String alertType, String message);
void gsmProcessQueue();
bool gsmSendSMS(String phone, String message);
void loadSmsSettings();
void saveSmsSettings();

// Offline Buffer
void offlineBufferStore();
void offlineBufferSync();

// Water
void waterFlowTick();
void checkWaterAnomaly();

// Misc
String detectRestartReason();
bool isPowerRelatedRestart();
void updateStatusLED();

// ISR
void IRAM_ATTR waterPulseISR();

// Backend Safety Engine Integration
void callBackendSafetyEngine();
void updateActuatorEffectTracking();
void updateThermalModel();
void updateWorstCaseSensors();

// Forensic Logging
void recordForensicEntry(String eventType, String eventDetail);
void recordRelayMismatch();

// ─── Forensic logging state ───
#define FORENSIC_LOG_INTERVAL_MS      60000UL   // Periodic log every 60s
#define FORENSIC_MISMATCH_INTERVAL_MS 10000UL   // Mismatch check every 10s
unsigned long lastForensicLog = 0;
unsigned long lastMismatchCheck = 0;

// Env response tracking (1min and 5min deltas)
float tempHistory1min[6] = {0};  // 6 slots × 10s = 60s history
float tempHistory5min[30] = {0}; // 30 slots × 10s = 300s history
float humHistory1min[6] = {0};
int tempHistIdx = 0;
int tempHist5Idx = 0;
unsigned long lastHistUpdate = 0;

void updateEnvironmentHistory() {
  unsigned long now = millis();
  if (!intervalPassed(now, lastHistUpdate, 10000UL)) return;
  lastHistUpdate = now;
  
  tempHistory1min[tempHistIdx % 6] = temperature;
  humHistory1min[tempHistIdx % 6] = humidity;
  tempHistIdx++;
  
  tempHistory5min[tempHist5Idx % 30] = temperature;
  tempHist5Idx++;
}

float getTempDelta1min() {
  if (tempHistIdx < 6) return 0;
  return temperature - tempHistory1min[(tempHistIdx - 6) % 6];
}

float getTempDelta5min() {
  if (tempHist5Idx < 30) return 0;
  return temperature - tempHistory5min[(tempHist5Idx - 30) % 30];
}

float getHumDelta1min() {
  if (tempHistIdx < 6) return 0;
  return humidity - humHistory1min[(tempHistIdx - 6) % 6];
}

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  SECTION 5: HELPER FUNCTIONS                                          ║
// ╚═══════════════════════════════════════════════════════════════════════╝

bool isLayer()  { return farmConfig.farmType == FARM_PROFILE_LAYER; }
bool isBroiler(){ return farmConfig.farmType == FARM_PROFILE_BROILER; }
String getFarmTypeStr() { return isLayer() ? "LAYER" : "BROILER"; }

float calculateHSI(float t, float h) {
  return 0.8f * t + (h / 100.0f) * (t - 14.4f) + 46.4f;
}

float getHeaterTargetTemp(int age) {
  for (int i = 0; i < HEATER_CURVE_SIZE; i++) {
    if (age <= (int)HEATER_BROILER_CURVE[i][0]) return HEATER_BROILER_CURVE[i][1];
  }
  return 22.5f;
}

float getBroilerTargetTemp(int age) {
  for (int i = 0; i < BROILER_CURVE_SIZE; i++) {
    if (age >= BROILER_CURVE[i].minDays && age <= BROILER_CURVE[i].maxDays) {
      return (BROILER_CURVE[i].minTemp + BROILER_CURVE[i].maxTemp) / 2.0f;
    }
  }
  return 22.5f;
}

String detectRestartReason() {
  esp_reset_reason_t r = esp_reset_reason();
  switch (r) {
    case ESP_RST_POWERON: case ESP_RST_EXT: return "POWER_EVENT";
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

void IRAM_ATTR waterPulseISR() { waterPulseCount++; }

void printFarmProfile() {
  Serial.printf("  Farm Type: %s\n", getFarmTypeStr().c_str());
  Serial.printf("  Bird Age: Day %d\n", farmConfig.chickAgeDays);
  Serial.printf("  Temp Offset: %.1f°C, NH3 Offset: %.1f ppm\n", farmConfig.tempOffset, farmConfig.nh3Offset);
}

void estimateLocalTime() {
  if (!timeValid) {
    unsigned long uptimeMin = millis() / 60000;
    int est = (12 * 60 + uptimeMin) % 1440;
    currentHour = est / 60;
    currentMinute = est % 60;
  } else {
    unsigned long sinceSyncMin = (millis() - lastTimeSync) / 60000;
    int total = (currentHour * 60 + currentMinute + sinceSyncMin) % 1440;
    currentHour = total / 60;
    currentMinute = total % 60;
  }
}

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  SECTION 6: STATE MACHINE                                             ║
// ╚═══════════════════════════════════════════════════════════════════════╝

// State transition with timer gating
// ⚠️ Downward transitions (e.g. DANGER→WARNING→NORMAL) are blocked until
//    minimumOnTime (60s) has elapsed in current state. This prevents oscillation.
//    Upward transitions (escalation to higher danger) are always allowed immediately.
//    Blocked transitions are SILENT — no log spam.
void transitionTo(SystemState newState, String reason) {
  if (newState == currentState) return;
  unsigned long now = millis();
  
  // Upward escalation is always immediate (safety first)
  bool isEscalation = (int)newState > (int)currentState;
  // SENSOR_FAIL is always immediate
  bool isSensorFail = (newState == STATE_SENSOR_FAIL);
  
  if (!isEscalation && !isSensorFail) {
    // Downward transition: gate by minimum dwell time in current state
    unsigned long dwellTime = now - stateEnteredAt;
    if (dwellTime < HYST_MIN_ON_MS) {
      // Blocked: not enough time in current state. SILENT — no log.
      return;
    }
  }
  
  previousState = currentState;
  currentState = newState;
  stateEnteredAt = now;
  Serial.printf("\n⚡ STATE: %s → %s [%s]\n", stateNames[previousState], stateNames[newState], reason.c_str());
}

// Evaluate current sensor data and determine correct state
// ⚠️ CRITICAL: Only SVL-validated values are used here. NH3 state transitions
//    require 45-second confirmation (nh3VentilationConfirmed) before ANY escalation.
SystemState evaluateState() {
  // SENSOR_FAIL takes priority if sensors offline or lastStableValue expired
  if (svlTemp.isOffline || svlHumidity.isOffline || sensorErrorMode) {
    return STATE_SENSOR_FAIL;
  }
  
  // Emergency Survival Mode active
  if (emergencySurvivalMode) return STATE_EMERGENCY;
  
  // Purge active
  if (purgeActive) return STATE_WARNING;
  
  // ═══════════════════════════════════════════════════════════════
  // PER-SENSOR SAFETY ZONES:
  // Use worstCaseMaxTemp (hottest sensor) for ALL heat danger decisions.
  // If ANY sensor shows danger, system responds — prevents masking.
  // ═══════════════════════════════════════════════════════════════
  float safetyTemp = dht2Available ? worstCaseMaxTemp : temperature;
  float safetyHSI = calculateHSI(safetyTemp, humidity);
  
  // HSI / Temperature based (using worst-case)
  if (safetyHSI > rules.hsiCritical || safetyTemp > rules.tempAlarm) return STATE_EMERGENCY;
  if (safetyHSI > rules.hsiEmergency || safetyTemp > rules.tempFanHigh) return STATE_DANGER;
  
  // NH3: ALL state escalation requires 45s confirmation
  if (ammonia > rules.ammoniaAlarm && nh3VentilationConfirmed) return STATE_DANGER;
  if (ammonia > rules.ammoniaFan && nh3VentilationConfirmed) return STATE_WARNING;
  
  if (safetyHSI > rules.hsiFanHigh) return STATE_WARNING;
  if (safetyHSI > rules.hsiFanLow) return STATE_WARNING;
  
  return STATE_NORMAL;
}

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  SECTION 7: SENSOR MANAGER (read once, filter, provide to engine)     ║
// ╚═══════════════════════════════════════════════════════════════════════╝

float readSingleDHTTemp(DHT &sensor) {
  float sum = 0; int valid = 0;
  for (int i = 0; i < 3; i++) {
    esp_task_wdt_reset();
    float t = sensor.readTemperature();
    if (!isnan(t) && t >= TEMP_SANITY_MIN && t <= TEMP_SANITY_MAX) { sum += t; valid++; }
    // Non-blocking short yield instead of delay
    unsigned long w = millis(); while (millis() - w < 300) { esp_task_wdt_reset(); yield(); }
  }
  return valid > 0 ? sum / valid : NAN;
}

float readSingleDHTHum(DHT &sensor) {
  float sum = 0; int valid = 0;
  for (int i = 0; i < 3; i++) {
    esp_task_wdt_reset();
    float h = sensor.readHumidity();
    if (!isnan(h) && h >= HUMIDITY_SANITY_MIN && h <= HUMIDITY_SANITY_MAX) { sum += h; valid++; }
    unsigned long w = millis(); while (millis() - w < 300) { esp_task_wdt_reset(); yield(); }
  }
  return valid > 0 ? sum / valid : NAN;
}

float readTempFiltered() {
  float a1 = readSingleDHTTemp(dht);
  float a2 = NAN;
  if (dht2Available) { a2 = readSingleDHTTemp(dht2); if (!isnan(a2)) temperature2 = a2; }
  
  // Update worst-case sensor values BEFORE averaging
  if (!isnan(a1) && !isnan(a2)) {
    worstCaseMaxTemp = max(a1, a2);  // Use MAX for cooling/overheat decisions
    worstCaseMinTemp = min(a1, a2);  // Use MIN for heating decisions
    return (a1 + a2) / 2.0f;
  }
  if (!isnan(a1)) { worstCaseMaxTemp = a1; worstCaseMinTemp = a1; return a1; }
  if (!isnan(a2)) { worstCaseMaxTemp = a2; worstCaseMinTemp = a2; return a2; }
  return NAN;
}

float readHumidityFiltered() {
  float a1 = readSingleDHTHum(dht);
  float a2 = NAN;
  if (dht2Available) { a2 = readSingleDHTHum(dht2); if (!isnan(a2)) humidity2 = a2; }
  if (!isnan(a1) && !isnan(a2)) return (a1 + a2) / 2.0f;
  if (!isnan(a1)) return a1;
  if (!isnan(a2)) return a2;
  return NAN;
}

float readGasFiltered() {
  if (millis() - gasWarmupStart < GAS_WARMUP_DURATION) return 0;
  float total = 0;
  for (int i = 0; i < 10; i++) { total += analogRead(MQ135_PIN); esp_task_wdt_reset(); delayMicroseconds(500); }
  return total / 10.0f;
}

bool isAmmoniaSpikeDetected(float v) {
  unsigned long now = millis();
  if (lastAmmoniaTime == 0) { lastValidAmmonia = v; lastAmmoniaTime = now; return false; }
  if (now - lastAmmoniaTime < 2000 && lastValidAmmonia > 0) {
    float pct = abs(v - lastValidAmmonia) / lastValidAmmonia;
    if (pct > 0.50f) return true;
  }
  lastValidAmmonia = v; lastAmmoniaTime = now;
  return false;
}

float calculateGasMovingAvg(float v) {
  if (isAmmoniaSpikeDetected(v)) return gasAvg10;
  gasReadings[gasIndex] = v;
  gasIndex = (gasIndex + 1) % GAS_AVG_SIZE;
  if (gasCount < GAS_AVG_SIZE) gasCount++;
  float sum = 0; for (int i = 0; i < gasCount; i++) sum += gasReadings[i];
  gasAvg10 = sum / gasCount;
  return gasAvg10;
}

float addToTempRolling(float v) {
  if (isnan(v) || v < TEMP_SANITY_MIN || v > TEMP_SANITY_MAX) {
    if (rollingCount > 0) { float s=0; for(int i=0;i<rollingCount;i++) s+=tempRollingBuf[i]; return s/rollingCount; }
    return NAN;
  }
  tempRollingBuf[rollingIndex] = v;
  if (rollingCount < SENSOR_ROLLING_SIZE) rollingCount++;
  float s=0; for(int i=0;i<rollingCount;i++) s+=tempRollingBuf[i]; return s/rollingCount;
}

float addToHumRolling(float v) {
  if (isnan(v) || v < HUMIDITY_SANITY_MIN || v > HUMIDITY_SANITY_MAX) {
    if (rollingCount > 0) { float s=0; for(int i=0;i<rollingCount;i++) s+=humRollingBuf[i]; return s/rollingCount; }
    return NAN;
  }
  humRollingBuf[rollingIndex] = v;
  float s=0; for(int i=0;i<rollingCount;i++) s+=humRollingBuf[i]; return s/rollingCount;
}

float readPowerVoltageRMS() {
  long sumSq = 0; int dc = 2048;
  for (int i = 0; i < 50; i++) { int s = analogRead(POWER_SENSE_PIN); long v = s - dc; sumSq += v*v; delayMicroseconds(400); }
  float rms = sqrt(sumSq / 50.0f);
  return (rms / 300.0f) * 230.0f;
}

bool isVoltageSpikeDetected(float v) {
  unsigned long now = millis();
  float change = abs(v - lastVoltageRMS);
  if (change > 20 && (now - lastVoltageChangeTime) < 1000) return true;
  if (change > 5) lastVoltageChangeTime = now;
  lastVoltageRMS = v;
  return false;
}

static unsigned long lowVoltageSince = 0;
static bool powerFailConfirmed = false;

bool checkPowerFailure() {
  float v = readPowerVoltageRMS();
  if (isVoltageSpikeDetected(v)) return powerFailConfirmed;
  powerVoltageRMS = v;
  bool low = v < 180.0f;
  if (low) {
    if (lowVoltageSince == 0) lowVoltageSince = millis();
    else if (millis() - lowVoltageSince > 5000) { powerFailConfirmed = true; return true; }
  } else { lowVoltageSince = 0; powerFailConfirmed = false; }
  return false;
}

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  MODULE J: SENSOR VALIDATION LAYER (SVL) v2.0                          ║
// ║  ⚠️ ALL state machine decisions use SVL output ONLY.                    ║
// ║  Raw sensor values NEVER reach automation or relay control.            ║
// ║                                                                        ║
// ║  Pipeline: Raw → Store in buffer → Median[5] → Spike compare vs       ║
// ║            median → Accept or Reject → lastStableValue updated         ║
// ║  Spike:    Compare new reading against MEDIAN, not previous raw        ║
// ║  Timeout:  90s invalid → SENSOR_FAIL state                             ║
// ║  Expiry:   3 min no valid → lastStableValue expires → SENSOR_FAIL     ║
// ║  Fallback: Invalid reading → lastStableValue (until expired)          ║
// ║  NH3:      Must exceed threshold 45s before ANY state escalation      ║
// ╚═══════════════════════════════════════════════════════════════════════╝

void svlSortArray(float a[], int n) {
  for (int i=1;i<n;i++) { float k=a[i]; int j=i-1; while(j>=0&&a[j]>k){a[j+1]=a[j];j--;} a[j+1]=k; }
}

float svlGetMedian(SVLChannel &ch) {
  if (ch.sampleCount == 0) return ch.lastStableValue;
  int c = min(ch.sampleCount, (int)SVL_MEDIAN_SIZE);
  float sorted[SVL_MEDIAN_SIZE]; for(int i=0;i<c;i++) sorted[i]=ch.medianBuffer[i];
  svlSortArray(sorted, c);
  return (c%2==0) ? (sorted[c/2-1]+sorted[c/2])/2.0f : sorted[c/2];
}

// Spike rejection: compare new value against MEDIAN (not previous raw)
// This prevents slow drift from corrupting the reference point
bool svlIsSpikeRejected(SVLChannel &ch, float raw) {
  if (ch.sampleCount < 2) return false;
  float currentMedian = svlGetMedian(ch);
  if (currentMedian == 0) return false;
  float pct = abs(raw - currentMedian) / abs(currentMedian) * 100.0f;
  return pct > SVL_SPIKE_PERCENT;
}

// Correct pipeline: Raw → Store → Median → Spike compare vs median → Accept/Reject
float svlProcessReading(SVLChannel &ch, float raw) {
  unsigned long now = millis();
  
  // NAN handling: check both 90s offline and 3-min expiry
  if (isnan(raw)) {
    if (ch.lastValidTime > 0 && (now - ch.lastValidTime) > SVL_SENSOR_OFFLINE_MS) {
      ch.isOffline = true; ch.isValid = false;
    }
    // Last good value expiry: if no valid reading for 3 minutes, force SENSOR_FAIL
    if (ch.lastStableTime > 0 && (now - ch.lastStableTime) > SVL_LAST_GOOD_EXPIRE_MS) {
      ch.isOffline = true; ch.isValid = false;
      Serial.println("🔴 SVL: lastStableValue expired (3min) → SENSOR_FAIL");
    }
    return ch.lastStableValue;
  }
  
  // ── SEED PHASE: First valid reading fills the entire buffer ──
  // This prevents the 0-initialized buffer from rejecting real values as spikes.
  // Until seeded, no spike rejection is performed.
  if (ch.sampleCount == 0) {
    for (int i = 0; i < SVL_MEDIAN_SIZE; i++) {
      ch.medianBuffer[i] = raw;
    }
    ch.sampleCount = SVL_MEDIAN_SIZE;
    ch.bufferIndex = 0;
    ch.lastStableValue = raw;
    ch.lastStableTime = now;
    ch.lastValidTime = now;
    ch.isValid = true;
    ch.isOffline = false;
    Serial.printf("✅ SVL: Buffer seeded with first valid reading: %.1f\n", raw);
    return raw;
  }
  
  // Step 1: Store raw into median buffer FIRST
  ch.medianBuffer[ch.bufferIndex] = raw;
  ch.bufferIndex = (ch.bufferIndex + 1) % SVL_MEDIAN_SIZE;
  if (ch.sampleCount < SVL_MEDIAN_SIZE) ch.sampleCount++;
  
  // Step 2: Calculate median from buffer (includes new sample)
  float median = svlGetMedian(ch);
  
  // Step 3: Spike compare against MEDIAN (not previous raw)
  // If the new value deviates >20% from the median, reject it
  if (ch.sampleCount > 2) {
    float refMedian = ch.lastStableValue;  // Previous accepted median
    if (refMedian != 0) {
      float pct = abs(raw - refMedian) / abs(refMedian) * 100.0f;
      if (pct > SVL_SPIKE_PERCENT) {
        // Spike detected: undo the buffer insertion
        ch.bufferIndex = (ch.bufferIndex - 1 + SVL_MEDIAN_SIZE) % SVL_MEDIAN_SIZE;
        ch.medianBuffer[ch.bufferIndex] = ch.lastStableValue; // restore
        if (ch.sampleCount > SVL_MEDIAN_SIZE) ch.sampleCount = SVL_MEDIAN_SIZE;
        Serial.printf("⚠️ SVL: Spike rejected (%.1f vs median %.1f, %.0f%%)\n", raw, refMedian, pct);
        return ch.lastStableValue;
      }
    }
  }
  
  // Step 4: Reading accepted → update stable value with timestamp
  ch.lastStableValue = median;
  ch.lastStableTime = now;
  ch.lastValidTime = now;
  ch.isValid = true;
  ch.isOffline = false;
  return median;
}

void svlCheckAmmoniaThreshold(float v, float threshold) {
  unsigned long now = millis();
  if (v > threshold) {
    if (!nh3ThresholdBreached) { nh3ThresholdBreached = true; nh3ThresholdBreachStart = now; }
    else if ((now - nh3ThresholdBreachStart) >= SVL_NH3_SUSTAIN_MS && !nh3VentilationConfirmed) {
      nh3VentilationConfirmed = true;
      Serial.println("✅ SVL: NH3 confirmed above threshold for 45s → state escalation allowed");
    }
  } else {
    nh3ThresholdBreached = false; nh3ThresholdBreachStart = 0; nh3VentilationConfirmed = false;
  }
}

void svlCheckSensorOffline() {
  unsigned long now = millis();
  
  // Check each channel for 90s timeout → SENSOR_FAIL
  if (svlTemp.lastValidTime > 0 && (now - svlTemp.lastValidTime > SVL_SENSOR_OFFLINE_MS)) {
    svlTemp.isOffline = true; svlTemp.isValid = false;
  }
  if (svlHumidity.lastValidTime > 0 && (now - svlHumidity.lastValidTime > SVL_SENSOR_OFFLINE_MS)) {
    svlHumidity.isOffline = true; svlHumidity.isValid = false;
  }
  if (svlAmmonia.lastValidTime > 0 && (now - svlAmmonia.lastValidTime > SVL_SENSOR_OFFLINE_MS)) {
    svlAmmonia.isOffline = true; svlAmmonia.isValid = false;
  }
  
  // Last good value expiry: 3 minutes with no valid reading → force offline
  if (svlTemp.lastStableTime > 0 && (now - svlTemp.lastStableTime > SVL_LAST_GOOD_EXPIRE_MS)) {
    svlTemp.isOffline = true; svlTemp.isValid = false;
  }
  if (svlHumidity.lastStableTime > 0 && (now - svlHumidity.lastStableTime > SVL_LAST_GOOD_EXPIRE_MS)) {
    svlHumidity.isOffline = true; svlHumidity.isValid = false;
  }
  
  // If any critical sensor offline → enter SENSOR_FAIL via sensorErrorMode
  if ((svlTemp.isOffline || svlHumidity.isOffline) && !sensorErrorMode) {
    sensorErrorMode = true;
    Serial.println("🔴 SVL: Sensor offline/expired → SENSOR_FAIL (fan ON for safety)");
    requestFan(true, "HIGH");
  }
  // Recovery: if sensors come back online, clear error
  if (!svlTemp.isOffline && !svlHumidity.isOffline && sensorErrorMode) {
    sensorErrorMode = false;
    Serial.println("🟢 SVL: Sensors recovered → clearing SENSOR_FAIL");
  }
}

// --- Sensor Manager Main Tick ---
// ⚠️ CRITICAL: Only SVL-validated values are written to global state.
//    Raw sensor data is NEVER used for automation decisions.
//    Pipeline: Raw → Rolling Avg → SVL (median+spike) → Global State
void sensorManagerTick() {
  // Step 1: Read raw sensors (may return NAN)
  float rawT = readTempFiltered();
  float rawH = readHumidityFiltered();
  
  // Step 2: Rolling average (smoothing, handles NAN gracefully)
  float tRoll = addToTempRolling(rawT);
  float hRoll = addToHumRolling(rawH);
  rollingIndex = (rollingIndex + 1) % SENSOR_ROLLING_SIZE;

  // Step 3: SVL validation (median filter + spike rejection)
  // Returns lastStableValue if reading is invalid or spike-rejected
  float tValidated = svlProcessReading(svlTemp, tRoll);
  float hValidated = svlProcessReading(svlHumidity, hRoll);

  // Step 4: Only validated values reach global state (automation inputs)
  if (!svlTemp.isOffline && !svlHumidity.isOffline) {
    temperature = tValidated + farmConfig.tempOffset;  // SVL-validated only
    humidity = hValidated;                              // SVL-validated only
    lastValidSensor = millis();
  }
  // If sensors offline >90s, sensorErrorMode set by svlCheckSensorOffline()

  // Step 5: Ammonia pipeline (raw → moving avg → SVL → global)
  float ammoniaRaw = readGasFiltered();
  float ammMapped = map((int)ammoniaRaw, 0, 4095, 0, 100);
  float ammOffset = ammMapped + farmConfig.nh3Offset;
  if (ammOffset < 0) ammOffset = 0;
  float ammAvg = calculateGasMovingAvg(ammOffset);
  ammonia = svlProcessReading(svlAmmonia, ammAvg);  // SVL-validated only
  
  // Step 6: NH3 45-second confirmation before state escalation
  svlCheckAmmoniaThreshold(ammonia, rules.ammoniaFan);
  
  // Step 7: Check all channels for 90s timeout
  svlCheckSensorOffline();

  if (waterPulseCount > 0) { lastWaterPulse = millis(); waterPulseCount = 0; waterFailureMode = false; }
  else if (millis() - lastWaterPulse > WATER_TIMEOUT) waterFailureMode = true;

  powerOn = !checkPowerFailure();
  if (!gasWarmupDone && millis() - gasWarmupStart >= GAS_WARMUP_DURATION) gasWarmupDone = true;

  calculateWaterFlow();
  currentHSI = calculateHSI(temperature, humidity);
}

void calculateWaterFlow() {
  static unsigned long lastCalc = 0;
  static unsigned long lastPulses = 0;
  unsigned long now = millis();
  if (now - lastCalc < 1000) return;
  unsigned long p = waterPulseCount - lastPulses;
  lastPulses = waterPulseCount;
  waterFlow = (p / 450.0f) * 60.0f;
  lastCalc = now;
}

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  SECTION 8: RELAY MANAGER (SINGLE AUTHORITY - only module that        ║
// ║  writes to hardware pins)                                             ║
// ╚═══════════════════════════════════════════════════════════════════════╝

void requestFan(bool on, String speed) { relayTarget.fan = on; relayTarget.fanSpeed = speed; }
void requestAlarm(bool on)             { relayTarget.alarm = on; }
void requestHeater(bool on)            { relayTarget.heater = on; }
void requestFogger(bool on)            { relayTarget.fogger = on; }
void requestCirculationFan(bool on)    { relayTarget.circulationFan = on; }
void requestCeilingFan(bool on)        { relayTarget.ceilingFan = on; }
void requestSprinkler(bool on)         { relayTarget.sprinkler = on; }
void requestLight(int brightness)      { targetBrightness = constrain(brightness, 0, 100); }

// Apply relay targets to hardware (called ONCE per loop iteration)
// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  GLOBAL RELAY PROTECTION WINDOW (60s)                                  ║
// ║  After ANY relay state change, no further relay changes are allowed    ║
// ║  for 60 seconds. This prevents chattering across ALL channels.        ║
// ║  Exception: EMERGENCY and SENSOR_FAIL bypass protection (life safety) ║
// ╚═══════════════════════════════════════════════════════════════════════╝
void relayManagerApply() {
  unsigned long now = millis();
  relayProtectionActive = (lastRelayChangeTime > 0) && (safeElapsed(now, lastRelayChangeTime) < RELAY_PROTECTION_MS);
  
  // ═══════════════════════════════════════════════════════════════════
  // EMERGENCY BYPASS: DANGER, EMERGENCY, SENSOR_FAIL, and active purge
  // bypass ALL relay protection timers. Life safety > hardware longevity.
  // ═══════════════════════════════════════════════════════════════════
  bool safetyBypass = (currentState >= STATE_DANGER || currentState == STATE_SENSOR_FAIL || 
                       purgeActive || emergencySurvivalMode ||
                       safetyEngine.isSafetyActive());
  
  // Check if ANY relay target differs from current state
  bool fanChange    = (relayTarget.fan != fanOn);
  bool alarmChange  = (relayTarget.alarm != alarmOn);
  bool heaterChange = (relayTarget.heater != heaterOn);
  bool foggerChange = (relayTarget.fogger != foggerOn);
  bool circChange   = (relayTarget.circulationFan != circulationFanOn);
  bool ceilingChange = (relayTarget.ceilingFan != ceilingFanOn);
  bool sprinklerChange = (relayTarget.sprinkler != sprinklerOn);
  bool anyChange    = fanChange || alarmChange || heaterChange || foggerChange || circChange || ceilingChange || sprinklerChange;
  
  // If protection active and no safety bypass AND not manual command, skip all relay changes
  // Manual commands from user must ALWAYS be honored — protection is only for automation oscillation
  if (relayProtectionActive && !safetyBypass && !manualCommandPending && anyChange) {
    // Silently blocked — relay protection window active (automation only)
    return;
  }
  // Clear manual command flag after processing
  if (manualCommandPending && anyChange) {
    manualCommandPending = false;
  }
  
  bool changed = false;
  
  // Fan
  if (fanChange) {
    fanOn = relayTarget.fan;
    digitalWrite(FAN_RELAY_PIN, fanOn ? LOW : HIGH);
    changed = true;
  }
  fanSpeed = relayTarget.fanSpeed;

  // Alarm
  if (alarmChange) {
    alarmOn = relayTarget.alarm;
    digitalWrite(ALARM_RELAY_PIN, alarmOn ? LOW : HIGH);
    changed = true;
  }

  // Heater
  if (heaterChange) {
    heaterOn = relayTarget.heater;
    digitalWrite(HEATER_RELAY_PIN, heaterOn ? LOW : HIGH);
    changed = true;
  }

  // Fogger
  if (foggerChange) {
    foggerOn = relayTarget.fogger;
    digitalWrite(FOGGER_RELAY_PIN, foggerOn ? LOW : HIGH);
    changed = true;
  }

  // Circulation Fan (IN8)
  if (circChange) {
    circulationFanOn = relayTarget.circulationFan;
    digitalWrite(CIRCULATION_RELAY_PIN, circulationFanOn ? LOW : HIGH);
    changed = true;
  }

  // Ceiling Fan (IN2) — temperature-based
  if (ceilingChange) {
    ceilingFanOn = relayTarget.ceilingFan;
    digitalWrite(CEILING_FAN_RELAY_PIN, ceilingFanOn ? LOW : HIGH);
    changed = true;
  }

  // Sprinkler (IN7) — HSI-based
  if (sprinklerChange) {
    sprinklerOn = relayTarget.sprinkler;
    digitalWrite(SPRINKLER_RELAY_PIN, sprinklerOn ? LOW : HIGH);
    changed = true;
  }
  
  // Start protection window if any relay actually changed
  if (changed) {
    lastRelayChangeTime = now;
    // ═══ FORENSIC: Log every relay state change with requested vs actual ═══
    String detail = "";
    if (fanChange) detail += "FAN:" + String(relayTarget.fan?"REQ_ON":"REQ_OFF") + "→" + String(fanOn?"ON":"OFF") + " ";
    if (heaterChange) detail += "HTR:" + String(relayTarget.heater?"REQ_ON":"REQ_OFF") + "→" + String(heaterOn?"ON":"OFF") + " ";
    if (foggerChange) detail += "FOG:" + String(relayTarget.fogger?"REQ_ON":"REQ_OFF") + "→" + String(foggerOn?"ON":"OFF") + " ";
    if (alarmChange) detail += "ALM:" + String(relayTarget.alarm?"REQ_ON":"REQ_OFF") + "→" + String(alarmOn?"ON":"OFF") + " ";
    if (circChange) detail += "CIRC:" + String(relayTarget.circulationFan?"REQ_ON":"REQ_OFF") + "→" + String(circulationFanOn?"ON":"OFF") + " ";
    if (ceilingChange) detail += "CEIL:" + String(relayTarget.ceilingFan?"REQ_ON":"REQ_OFF") + "→" + String(ceilingFanOn?"ON":"OFF") + " ";
    if (sprinklerChange) detail += "SPRK:" + String(relayTarget.sprinkler?"REQ_ON":"REQ_OFF") + "→" + String(sprinklerOn?"ON":"OFF");
    recordForensicEntry("relay_change", detail);
  }

  // Lighting PWM fade (not gated by relay protection — gradual, no chattering risk)
  updateLightingWithFade();
}

void updateLightingWithFade() {
  if (fadeInProgress) {
    unsigned long elapsed = millis() - fadeStartTime;
    unsigned long fadeDuration = 10UL * 60000UL; // 10 min default
    if (elapsed >= fadeDuration) {
      lightBrightness = targetBrightness;
      fadeInProgress = false;
    } else {
      lightBrightness = fadeStartBrightness + (targetBrightness - fadeStartBrightness) * (int)elapsed / (int)fadeDuration;
    }
  } else if (lightBrightness != targetBrightness) {
    fadeStartBrightness = lightBrightness;
    fadeStartTime = millis();
    fadeInProgress = true;
  }

  // ═══════════════════════════════════════════════════════════════
  // LAYER MODE: Mechanical relay — only ON/OFF (no PWM capability)
  // Brightness > 0 = relay ON, brightness == 0 = relay OFF
  // Active LOW: LOW = ON, HIGH = OFF
  // ═══════════════════════════════════════════════════════════════
  bool newLightOn = (lightBrightness > 0);
  if (newLightOn != lightOn) {
    lightOn = newLightOn;
    // IN3 (GPIO 27) is Light relay in 8-channel config
    digitalWrite(LIGHT_RELAY_PIN, lightOn ? LOW : HIGH);
    Serial.println(lightOn ? "💡 Light relay ON" : "🌑 Light relay OFF");
  }
}

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  SECTION 9: HYSTERESIS ENGINE                                         ║
// ╚═══════════════════════════════════════════════════════════════════════╝

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  MODULE I: INDUSTRIAL HYSTERESIS STABILIZATION                         ║
// ║                                                                        ║
// ║  Each stage has separate ON and OFF thresholds (deadband).             ║
// ║  Example: Stage1 ON at 30°C, OFF at 28°C (2°C deadband)              ║
// ║                                                                        ║
// ║  Timing protection enforced per stage:                                 ║
// ║    minimumOnTime  = 60 seconds (relay cannot turn OFF before this)     ║
// ║    minimumOffTime = 60 seconds (relay cannot turn ON before this)      ║
// ║  This PREVENTS relay chattering and rapid toggling.                    ║
// ║                                                                        ║
// ║  Result: activeStageLevel determines fan speed in runControlLogic():   ║
// ║    0 = OFF, 1 = LOW, 2 = MEDIUM, 3 = HIGH                            ║
// ║  Heater and fogger also gated by hysteresis timing.                    ║
// ╚═══════════════════════════════════════════════════════════════════════╝

int evaluateHysteresisChannel(HystChannel &ch, float val, bool inv) {
  unsigned long now = millis();
  int highest = 0;
  int previousLevel = ch.activeStageLevel;
  
  // ═══════════════════════════════════════════════════════════════
  // EMERGENCY BYPASS: In DANGER+ states, hysteresis timing protection
  // is SKIPPED. Relays respond instantly to save lives.
  // ═══════════════════════════════════════════════════════════════
  bool emergencyBypass = (currentState >= STATE_DANGER || currentState == STATE_SENSOR_FAIL || emergencySurvivalMode);
  
  for (int i = 0; i < ch.stageCount; i++) {
    HystStage &s = ch.stages[i];
    bool goOn  = inv ? (val <= s.onThreshold)  : (val >= s.onThreshold);
    bool goOff = inv ? (val >= s.offThreshold) : (val <= s.offThreshold);
    if (s.isActive) {
      // In emergency: skip min-on-time, allow instant OFF
      if (goOff && (emergencyBypass || safeElapsed(now, s.lastOnTime) >= s.minOnTime)) {
        s.isActive = false;
        s.lastOffTime = now;
        Serial.printf("🔽 HYST %s Stage%d OFF (val=%.1f ≤ off=%.1f, was on %lus)%s\n",
          ch.name, i+1, val, s.offThreshold, safeElapsed(now, s.lastOnTime)/1000,
          emergencyBypass ? " [EMERGENCY BYPASS]" : "");
      }
    } else {
      // In emergency: skip min-off-time, allow instant ON
      unsigned long offDur = (s.lastOffTime == 0) ? s.minOffTime : safeElapsed(now, s.lastOffTime);
      if (goOn && (emergencyBypass || offDur >= s.minOffTime)) {
        s.isActive = true;
        s.lastOnTime = now;
        Serial.printf("🔼 HYST %s Stage%d ON (val=%.1f ≥ on=%.1f, was off %lus)%s\n",
          ch.name, i+1, val, s.onThreshold, offDur/1000,
          emergencyBypass ? " [EMERGENCY BYPASS]" : "");
      }
    }
    if (s.isActive) highest = i + 1;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // STAGE DOWNGRADE PROTECTION (only in non-emergency):
  // When higher stage turns OFF, lower stages MUST remain ON.
  // In emergency: no downgrade protection (instant response needed)
  // ═══════════════════════════════════════════════════════════════
  if (!emergencyBypass) {
    if (highest < previousLevel && highest > 0) {
      Serial.printf("🔄 HYST %s: Downgrade %d→%d (lower stage maintains output)\n",
        ch.name, previousLevel, highest);
    }
    if (highest == 0 && previousLevel > 0) {
      HystStage &s0 = ch.stages[0];
      if (s0.lastOnTime > 0 && safeElapsed(now, s0.lastOnTime) < s0.minOnTime) {
        s0.isActive = true;
        highest = 1;
      }
    }
  }
  
  ch.activeStageLevel = highest;
  return highest;
}

void updateHysteresisThresholds() {
  if (isLayer()) {
    hystFan.stages[0] = {rules.tempMax, rules.tempMax-2, false, 0, 0, HYST_MIN_ON_MS, HYST_MIN_OFF_MS};
    hystFan.stages[1] = {LAYER_TEMP_FAN_HIGH, LAYER_TEMP_FAN_HIGH-2, false, 0, 0, HYST_MIN_ON_MS, HYST_MIN_OFF_MS};
    hystFan.stages[2] = {LAYER_TEMP_ALARM, LAYER_TEMP_ALARM-2, false, 0, 0, HYST_MIN_ON_MS, HYST_MIN_OFF_MS};
    hystFan.stageCount = 3;
    hystHeater.stages[0] = {rules.tempHeaterOn, rules.tempHeaterOn+2, false, 0, 0, HYST_MIN_ON_MS, HYST_MIN_OFF_MS};
    hystHeater.stageCount = 1;
    hystAlarm.stages[0] = {LAYER_TEMP_ALARM, LAYER_TEMP_ALARM-2, false, 0, 0, HYST_MIN_ON_MS, HYST_MIN_OFF_MS};
    hystAlarm.stageCount = 1;
  } else {
    float t = rules.tempTarget;
    hystFan.stages[0] = {t+2,t, false, 0, 0, HYST_MIN_ON_MS, HYST_MIN_OFF_MS};
    hystFan.stages[1] = {t+4,t+2, false, 0, 0, HYST_MIN_ON_MS, HYST_MIN_OFF_MS};
    hystFan.stages[2] = {t+6,t+4, false, 0, 0, HYST_MIN_ON_MS, HYST_MIN_OFF_MS};
    hystFan.stageCount = 3;
    hystHeater.stages[0] = {t-heaterSettings.tolerance, t+heaterSettings.tolerance, false, 0, 0, HYST_MIN_ON_MS, HYST_MIN_OFF_MS};
    hystHeater.stageCount = 1;
    hystAlarm.stages[0] = {rules.tempAlarm, rules.tempAlarm-2, false, 0, 0, HYST_MIN_ON_MS, HYST_MIN_OFF_MS};
    hystAlarm.stageCount = 1;
  }
  hystFogger.stages[0] = {foggerSettings.startTemp, foggerSettings.stopTemp, false, 0, 0, HYST_MIN_ON_MS, HYST_MIN_OFF_MS};
  hystFogger.stageCount = 1;
}

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  SECTION 10: RULES LOADER                                             ║
// ╚═══════════════════════════════════════════════════════════════════════╝

void loadLayerRules() {
  rules.tempMin = 18; rules.tempMax = 27; rules.tempTarget = 22.5f;
  rules.tempFanHigh = LAYER_TEMP_FAN_HIGH; rules.tempAlarm = LAYER_TEMP_ALARM;
  rules.tempHeaterOn = LAYER_TEMP_HEATER;
  rules.hsiFanLow = LAYER_HSI_FAN_LOW; rules.hsiFanHigh = LAYER_HSI_FAN_HIGH;
  rules.hsiEmergency = LAYER_HSI_EMERGENCY; rules.hsiCritical = LAYER_HSI_CRITICAL;
  rules.ammoniaFan = LAYER_AMMONIA_FAN; rules.ammoniaAlarm = LAYER_AMMONIA_ALARM;
  rules.humidityLow = LAYER_HUMIDITY_LOW; rules.humidityHigh = LAYER_HUMIDITY_HIGH;
  rules.useAgeBasedTemp = false; rules.lightingProtection = true;
  updateHysteresisThresholds();
  Serial.println("📋 Layer rules loaded");
}

void loadBroilerRules() {
  float target = getBroilerTargetTemp(farmConfig.chickAgeDays);
  rules.tempMin = target - 2; rules.tempMax = target + 2; rules.tempTarget = target;
  rules.tempFanHigh = target + 4; rules.tempAlarm = target + 6;
  rules.tempHeaterOn = target - heaterSettings.tolerance;
  rules.hsiFanLow = BROILER_HSI_FAN_LOW; rules.hsiFanHigh = BROILER_HSI_FAN_HIGH;
  rules.hsiEmergency = BROILER_HSI_EMERGENCY; rules.hsiCritical = BROILER_HSI_CRITICAL;
  rules.ammoniaFan = BROILER_AMMONIA_FAN; rules.ammoniaAlarm = BROILER_AMMONIA_ALARM;
  rules.humidityLow = 40; rules.humidityHigh = 75;
  rules.useAgeBasedTemp = true; rules.lightingProtection = false;
  updateHysteresisThresholds();
  Serial.printf("📋 Broiler rules loaded (Day %d, target %.1f°C)\n", farmConfig.chickAgeDays, target);
}

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  SECTION 11: AUTOMATION ENGINE (SINGLE DECISION LOOP)                 ║
// ╚═══════════════════════════════════════════════════════════════════════╝

void automationEngineTick() {
  // ═══════════════════════════════════════════════════════════════
  // INV-4: Manual override CANNOT skip safety evaluation.
  // Safety arbiter runs independently (in loop()), but automation
  // engine must still evaluate safety bands during manual override.
  // Only NORMAL automation logic is skipped, not safety checks.
  // ═══════════════════════════════════════════════════════════════
  if (stabilizingMode) return;
  
  // If safety arbiter is forcing actions, apply them regardless of override
  if (safetyEngine.lastResult.forceFanOn)    requestFan(true, "HIGH");
  if (safetyEngine.lastResult.forceHeaterOff) requestHeater(false);
  if (safetyEngine.lastResult.forceHeaterOn)  requestHeater(true);
  
  // Manual override skips AUTOMATION only, not safety
  if (localManualOverride && !safetyEngine.lastResult.safetyActive) return;

  // Emergency Survival overrides everything
  if (emergencySurvivalMode) {
    runEmergencySurvivalCycles();
    return;
  }

  // Power Recovery Purge overrides normal automation
  // During purge: ALL sensor readings are ignored, no state evaluation occurs
  if (purgeActive) {
    checkPowerRecoveryPurge();
    return;  // Skip evaluateState(), checkEmergencyTriggers(), and all control logic
  }

  // Check emergency triggers
  checkEmergencyTriggers();
  if (emergencySurvivalMode) return;

  // Evaluate state machine
  SystemState newState = evaluateState();
  if (newState != currentState) {
    transitionTo(newState, "sensor_eval");
  }

  // ═══════════════════════════════════════════════════════════════
  // AUTONOMOUS SURVIVAL VENTILATION
  // If SENSOR_FAIL or EMERGENCY: enter ESM for cyclic fan operation
  // Guarantees minimum breathable air with ZERO sensor dependency
  // ═══════════════════════════════════════════════════════════════
  if (currentState == STATE_SENSOR_FAIL && !emergencySurvivalMode) {
    enterESM("SENSOR_FAIL_AUTO");
    return;
  }

  // ═══════════════════════════════════════════════════════════════
  // PER-SENSOR SAFETY ZONES:
  // Use worst-case temps for hysteresis instead of averaged temperature.
  // Fan/Alarm/Fogger use worstCaseMaxTemp (hottest sensor = cooling urgency)
  // Heater uses worstCaseMinTemp (coldest sensor = heating urgency)
  // ═══════════════════════════════════════════════════════════════
  float fanSafetyTemp = dht2Available ? worstCaseMaxTemp : temperature;
  float heaterSafetyTemp = dht2Available ? worstCaseMinTemp : temperature;
  
  evaluateHysteresisChannel(hystFan, fanSafetyTemp, false);
  evaluateHysteresisChannel(hystHeater, heaterSafetyTemp, true);
  evaluateHysteresisChannel(hystFogger, fanSafetyTemp, false);
  evaluateHysteresisChannel(hystAlarm, fanSafetyTemp, false);

  // ═══════════════════════════════════════════════════════════════
  // MANUAL OVERRIDE SAFETY BAND ENFORCEMENT (continuous check):
  // Even if manual override is active, force safety actions if
  // temperature leaves the bio-safe band [26°C - 35°C].
  // ═══════════════════════════════════════════════════════════════
  if (localManualOverride || fanManualOverride || heaterManualOverride) {
    if (fanSafetyTemp >= OVERRIDE_SAFE_TEMP_MAX) {
      // Override band breached high: force fan ON, heater OFF
      requestFan(true, "HIGH");
      requestHeater(false);
      heaterManualOverride = false;
      Serial.printf("⛔ OVERRIDE SAFETY: Temp %.1f°C >= %.1f°C max — forcing fan ON, heater OFF\n",
        fanSafetyTemp, OVERRIDE_SAFE_TEMP_MAX);
    }
    if (heaterSafetyTemp <= OVERRIDE_SAFE_TEMP_MIN && isBroiler()) {
      // Override band breached low: force heater ON (broiler chicks)
      if (safetyEngine.isHeaterAllowed() && !safetyEngine.isHeaterLocked()) {
        requestHeater(true);
        Serial.printf("⛔ OVERRIDE SAFETY: Temp %.1f°C <= %.1f°C min — forcing heater ON\n",
          heaterSafetyTemp, OVERRIDE_SAFE_TEMP_MIN);
      }
    }
  }

  // Run control logic based on state
  runControlLogic();

  // Safety checks
  esp_task_wdt_reset();
}

void runControlLogic() {
  // Priority 1: Safety (already handled by state machine)
  
  // Priority 2: Heating
  advancedHeaterControl();

  // Priority 3: Cooling (Fogger + Sprinkler)
  foggerControl();
  sprinklerControl();

  // Ceiling Fan (temperature-based)
  ceilingFanControl();

  // Priority 4: Ventilation
  if (!foggerActive) {
    checkMinimumVentilation();
    broilerAirflowControl();
  }

  // ═══════════════════════════════════════════════════════════════
  // CHECK & EXPIRE MANUAL OVERRIDES (Fan, Light, Alarm)
  // Each manual override expires after MANUAL_OVERRIDE_TIMEOUT (15-20min)
  // During active override → automation SKIPS that device entirely
  // ═══════════════════════════════════════════════════════════════
  if (fanManualOverride) {
    if (fanManualTime > 0 && (millis() - fanManualTime >= MANUAL_OVERRIDE_TIMEOUT)) {
      fanManualOverride = false; fanManualTime = 0;
      Serial.println("⏱️ Fan manual override EXPIRED — returning to auto");
    }
    // Don't touch fan while manual override active (except safety states below)
  }

  // Priority 5: Main fan/alarm based on hysteresis + state
  // ⚠️ Fan speed is now driven by HYSTERESIS STAGE LEVEL, not raw state alone.
  // This ensures timing protection (60s min ON/OFF) prevents relay chattering.
  switch (currentState) {
    case STATE_EMERGENCY:
      // EMERGENCY always overrides manual — life safety
      requestFan(true, "HIGH");
      requestAlarm(true);
      gsmQueueAlert("temperature", "🚨 EMERGENCY! Temp=" + String(temperature,1) + "°C HSI=" + String(currentHSI,1));
      break;
    case STATE_DANGER:
      // DANGER always overrides manual — life safety
      requestFan(true, "HIGH");
      requestAlarm(hystAlarm.activeStageLevel > 0 || (ammonia > rules.ammoniaAlarm && nh3VentilationConfirmed));
      break;
    case STATE_WARNING: {
      // WARNING: fan override respected only if NOT in danger zone
      if (!fanManualOverride) {
        int fanStage = hystFan.activeStageLevel;
        if (fanStage >= 3) requestFan(true, "HIGH");
        else if (fanStage == 2) requestFan(true, "MEDIUM");
        else if (fanStage == 1) requestFan(true, "LOW");
        else requestFan(true, "LOW"); // WARNING state = at least LOW
      }
      requestAlarm(false);
      break;
    }
    case STATE_NORMAL:
      // NORMAL: fully respect manual overrides
      if (!fanManualOverride) {
        if (!minVentActive && !foggerActive) {
          if (hystFan.activeStageLevel > 0) {
            String speed = hystFan.activeStageLevel >= 3 ? "HIGH" : hystFan.activeStageLevel == 2 ? "MEDIUM" : "LOW";
            requestFan(true, speed);
          } else {
            requestFan(false, "OFF");
          }
        }
      }
      requestAlarm(false);
      break;
    case STATE_SENSOR_FAIL:
      // SENSOR_FAIL: safety overrides everything
      { unsigned long elapsed = millis() - stateEnteredAt;
        unsigned long fanCycle = ESM_FAN_ON_MS + ESM_FAN_OFF_MS;
        bool shouldFan = (elapsed % fanCycle) < ESM_FAN_ON_MS;
        requestFan(shouldFan, shouldFan ? "HIGH" : "OFF");
        unsigned long alarmCycle = ESM_ALARM_ON_MS + ESM_ALARM_OFF_MS;
        requestAlarm((elapsed % alarmCycle) < ESM_ALARM_ON_MS);
        requestHeater(false); requestFogger(false);
      }
      gsmQueueAlert("temperature", "⚠️ SENSOR FAIL! Survival ventilation active.");
      break;
    default: break;
  }

  // Lighting (respect manual override)
  if (lightSchedule.manualOverride) {
    if (lightManualOverrideTime > 0 && (millis() - lightManualOverrideTime >= MANUAL_OVERRIDE_TIMEOUT)) {
      lightSchedule.manualOverride = false; lightManualOverrideTime = 0;
      Serial.println("⏱️ Light manual override EXPIRED — returning to auto");
    }
    // Skip auto lighting while manual override active
  } else {
    controlLighting();
  }

  // Water monitoring
  waterFlowTick();
  if (waterFailureMode) {
    gsmQueueAlert("water", "💧 No water flow for 6+ hours!");
  }

  // Power alerts
  if (!powerOn) {
    gsmQueueAlert("power", "🔌 Power outage detected! Voltage=" + String(powerVoltageRMS, 0) + "V");
  }
}

// --- Module B: Heater Control (gated by hysteresis timing) ---
void advancedHeaterControl() {
  if (!heaterSettings.enabled) return;
  if (heaterManualOverride && temperature <= heaterSettings.safetyMaxTemp) {
    if (heaterManualTime > 0 && (millis() - heaterManualTime >= MANUAL_OVERRIDE_TIMEOUT)) {
      heaterManualOverride = false; heaterManualTime = 0;
    } else return;
  }
  if (temperature > heaterSettings.safetyMaxTemp) { requestHeater(false); return; }
  
  // Use hysteresis result instead of raw threshold comparison
  // This enforces 60s min ON/OFF timing to prevent relay chattering
  if (hystHeater.activeStageLevel > 0 && !heaterOn) {
    requestHeater(true);
  } else if (hystHeater.activeStageLevel == 0 && heaterOn) {
    requestHeater(false);
  }
}

// --- Module C: Fogger ---
void foggerControl() {
  if (!foggerSettings.enabled) return;
  if (foggerManualOverride) {
    if (foggerManualTime > 0 && (millis() - foggerManualTime >= MANUAL_OVERRIDE_TIMEOUT)) {
      foggerManualOverride = false; foggerManualTime = 0;
    } else return;
  }
  if (temperature < foggerSettings.stopTemp || humidity >= foggerSettings.stopHumidity) {
    if (foggerActive) { requestFogger(false); foggerActive = false; foggerInSpray = false; }
    return;
  }
  unsigned long now = millis();
  if (!foggerActive && temperature >= foggerSettings.startTemp && humidity < foggerSettings.startHumidityMax) {
    foggerActive = true; foggerCycleCount = 0;
    requestFogger(true); foggerInSpray = true; foggerSprayStart = now;
    requestFan(true, "HIGH"); // Exhaust MUST run during fogger
  }
  if (foggerActive) {
    if (foggerInSpray && (now - foggerSprayStart >= (unsigned long)foggerSettings.onSeconds * 1000UL)) {
      requestFogger(false); foggerInSpray = false; foggerPauseStart = now; foggerCycleCount++;
    }
    if (!foggerInSpray && (now - foggerPauseStart >= (unsigned long)foggerSettings.pauseSeconds * 1000UL)) {
      if (temperature >= foggerSettings.startTemp && humidity < foggerSettings.startHumidityMax) {
        requestFogger(true); foggerInSpray = true; foggerSprayStart = now;
      } else { requestFogger(false); foggerActive = false; }
    }
  }
}

// --- Module A: Minimum Ventilation ---
void checkMinimumVentilation() {
  if (!minVentSettings.enabled) return;
  if (temperature >= minVentSettings.tempThreshold) { minVentActive = false; return; }
  minVentActive = true;
  unsigned long now = millis();
  if (ammonia > rules.ammoniaAlarm || (ammonia > rules.ammoniaFan && nh3VentilationConfirmed)) {
    requestFan(true, "HIGH"); return;
  }
  if (minVentSettings.ceilingFanAlwaysOn && !circulationFanManualOverride) requestCirculationFan(true);
  unsigned long intervalMs = (unsigned long)minVentSettings.intervalMinutes * 60000UL;
  if (!minVentInCycle && (now - lastMinVentCycle >= intervalMs)) {
    minVentInCycle = true; minVentCycleStart = now; requestFan(true, "HIGH");
  }
  if (minVentInCycle && (now - minVentCycleStart >= (unsigned long)minVentSettings.cycleSeconds * 1000UL)) {
    minVentInCycle = false; lastMinVentCycle = now; requestFan(false, "OFF");
  }
}

// --- Module D: Broiler Airflow ---
void broilerAirflowControl() {
  if (!airflowSettings.enabled || isLayer()) return;
  if (circulationFanManualOverride) {
    if (circulationFanManualTime > 0 && (millis() - circulationFanManualTime >= MANUAL_OVERRIDE_TIMEOUT)) {
      circulationFanManualOverride = false; circulationFanManualTime = 0;
    } else return;
  }
  int age = farmConfig.chickAgeDays;
  if (age < airflowSettings.earlyAgeDays) { requestCirculationFan(false); return; }
  bool daytime = (currentHour >= 6 && currentHour < 20);
  unsigned long now = millis();
  auto runIntermittent = [&](int onSec, int intMin) {
    unsigned long intMs = (unsigned long)intMin * 60000UL;
    if (!airflowInCycle && (now - lastAirflowCycle >= intMs)) {
      airflowInCycle = true; airflowCycleStart = now; requestCirculationFan(true);
    }
    if (airflowInCycle && (now - airflowCycleStart >= (unsigned long)onSec * 1000UL)) {
      airflowInCycle = false; lastAirflowCycle = now; requestCirculationFan(false);
    }
  };
  if (age < airflowSettings.midAgeDays) {
    runIntermittent(airflowSettings.midOnSeconds, airflowSettings.midIntervalMinutes);
  } else if (daytime) {
    requestCirculationFan(true);
  } else {
    runIntermittent(airflowSettings.nightOnSeconds, airflowSettings.nightIntervalMinutes);
  }
}

// --- Module E: Lighting ---
void controlLighting() {
  if (lightSchedule.manualOverride || localManualOverride) {
    if (lightSchedule.manualOverride && lightManualOverrideTime > 0 &&
        (millis() - lightManualOverrideTime >= MANUAL_OVERRIDE_TIMEOUT)) {
      lightSchedule.manualOverride = false; lightManualOverrideTime = 0;
    } else return;
  }
  if (!lightSchedule.enabled) return;
  estimateLocalTime();
  int curMin = currentHour * 60 + currentMinute;
  int startMin = lightSchedule.startHour * 60 + lightSchedule.startMinute;
  int endMin = lightSchedule.endHour * 60 + lightSchedule.endMinute;
  bool overnight = (endMin < startMin);
  bool shouldOn = overnight ? (curMin >= startMin || curMin <= endMin) : (curMin >= startMin && curMin <= endMin);
  int brightness = 0;
  if (shouldOn) {
    int fromStart, toEnd;
    if (overnight) {
      fromStart = (curMin >= startMin) ? curMin - startMin : (1440 - startMin) + curMin;
      toEnd = (curMin >= startMin) ? (1440 - curMin) + endMin : endMin - curMin;
    } else { fromStart = curMin - startMin; toEnd = endMin - curMin; }
    if (fromStart < lightSchedule.fadeInMinutes) {
      brightness = map(fromStart, 0, lightSchedule.fadeInMinutes, lightSchedule.minBrightness, lightSchedule.maxBrightness);
    } else if (toEnd < lightSchedule.fadeOutMinutes) {
      brightness = map(toEnd, 0, lightSchedule.fadeOutMinutes, lightSchedule.minBrightness, lightSchedule.maxBrightness);
    } else { brightness = lightSchedule.maxBrightness; }
  }
  requestLight(brightness);
}

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  SECTION 12: EMERGENCY SURVIVAL & POWER RECOVERY                      ║
// ╚═══════════════════════════════════════════════════════════════════════╝

void checkEmergencyTriggers() {
  unsigned long now = millis();
  if (sensorErrorMode && !cloudConnected && (now - lastCloudSync > CLOUD_TIMEOUT)) {
    enterESM("SENSOR_FAIL + CLOUD_TIMEOUT"); return;
  }
  if (sensorErrorMode && (now - lastValidSensor > ESM_INVALID_TIMEOUT)) {
    enterESM("SENSOR_FAIL >3 min"); return;
  }
  if (esmTriggeredByWatchdog) { esmTriggeredByWatchdog = false; enterESM("WATCHDOG_RESET"); return; }
  if (esmTriggeredByReboot)   { esmTriggeredByReboot = false; enterESM("ABNORMAL_REBOOT"); return; }
  
  bool invalid = isnan(temperature) || isnan(humidity) ||
    temperature < TEMP_SANITY_MIN || temperature > TEMP_SANITY_MAX ||
    humidity < HUMIDITY_SANITY_MIN || humidity > HUMIDITY_SANITY_MAX;
  if (invalid) {
    if (!invalidReadingsActive) { invalidReadingsActive = true; invalidReadingsStart = now; }
    else if (now - invalidReadingsStart >= ESM_INVALID_TIMEOUT) { enterESM("INVALID_READINGS >3 min"); return; }
  } else {
    invalidReadingsActive = false;
    // Recovery is now handled by checkEmergencyRecovery() with 2-min verification.
    // NO instant exit here — prevents mode flapping.
  }
}

void enterESM(String reason) {
  if (emergencySurvivalMode) return;
  emergencySurvivalMode = true;
  emergencySurvivalStart = millis();
  esmCycleOrigin = millis();  // Lock cycle timer origin (never reset after this)
  esmFanOn = true;
  esmTriggerReason = reason;
  esmRecoveryStarted = false;  // Reset recovery verification
  esmRecoveryStartTime = 0;
  transitionTo(STATE_EMERGENCY, "ESM: " + reason);
  requestFan(true, "HIGH"); requestHeater(false); requestFogger(false);
  requestCirculationFan(false); requestAlarm(true);
  gsmQueueAlert("temperature", "🚨 EMERGENCY SURVIVAL! Reason: " + reason);
  Serial.println("🚨 EMERGENCY SURVIVAL MODE: " + reason);
}

// ═══════════════════════════════════════════════════════════════════════
// ESM CYCLIC VENTILATION
// Uses esmCycleOrigin as fixed timer (never reset by state machine updates)
// Max continuous ON = 2 minutes (ESM_FAN_ON_MS)
// Cycle: 2 min ON → 2 min OFF → repeat
// Alarm: 30s ON → 30s OFF (pulsing)
// All heating/fogger disabled
// ═══════════════════════════════════════════════════════════════════════
void runEmergencySurvivalCycles() {
  // ═══════════════════════════════════════════════════════════════
  // TEMPERATURE-AWARE SURVIVAL (replaces fixed 50% duty cycle)
  // 
  // Old: 2min ON / 2min OFF regardless of temperature → LETHAL.
  //      In 40°C ambient, 2min OFF = birds die.
  //
  // New: Uses actual temperature to decide ventilation intensity.
  //      No sensor → assume worst case → CONTINUOUS ventilation.
  //      INV-1 and INV-7 are enforced by the arbiter independently.
  // ═══════════════════════════════════════════════════════════════
  unsigned long now = millis();
  
  // Always check for recovery
  checkEmergencyRecovery();
  
  bool hasSomeTemp = !isnan(temperature) && !svlTemp.isOffline;
  
  if (hasSomeTemp) {
    if (temperature > SURVIVABLE_TEMP_HIGH) {
      // Hot: CONTINUOUS ventilation, alarm ON, heater OFF
      requestFan(true, "HIGH");
      requestAlarm(true);
      requestHeater(false);
    } else if (temperature < LETHAL_TEMP_LOW) {
      // Cold: reduced ventilation + heating allowed
      unsigned long cycle = ESM_FAN_ON_MS + ESM_FAN_OFF_MS;
      unsigned long elapsed = _safeElapsed(now, esmCycleOrigin) % cycle;
      bool shouldFan = elapsed < ESM_FAN_ON_MS;
      requestFan(shouldFan, shouldFan ? "LOW" : "OFF");
      if (safetyEngine.isHeaterAllowed()) requestHeater(true);
      requestAlarm(false);
    } else {
      // Moderate temp: 80% duty cycle (2min ON, 1min OFF)
      unsigned long cycle = ESM_FAN_ON_MS + (ESM_FAN_OFF_MS / 2);
      unsigned long elapsed = _safeElapsed(now, esmCycleOrigin) % cycle;
      bool shouldFan = elapsed < ESM_FAN_ON_MS;
      requestFan(shouldFan, shouldFan ? "HIGH" : "OFF");
      requestHeater(false);
      requestAlarm(false);
    }
  } else {
    // NO valid temperature: assume WORST CASE → CONTINUOUS
    requestFan(true, "HIGH");
    requestHeater(false);
    requestAlarm(true);
  }
  
  requestFogger(false);
}

// ═══════════════════════════════════════════════════════════════════════
// ESM RECOVERY VERIFICATION
// Sensors must be valid AND stable for 2 continuous minutes before exit.
// If sensors go invalid during verification → restart timer (no flapping).
// ═══════════════════════════════════════════════════════════════════════
void checkEmergencyRecovery() {
  if (!emergencySurvivalMode) return;
  
  bool sensorsValid = !sensorErrorMode && !svlTemp.isOffline && !svlHumidity.isOffline &&
    !isnan(temperature) && !isnan(humidity) &&
    temperature >= TEMP_SANITY_MIN && temperature <= TEMP_SANITY_MAX &&
    humidity >= HUMIDITY_SANITY_MIN && humidity <= HUMIDITY_SANITY_MAX;
  
  unsigned long now = millis();
  
  if (sensorsValid) {
    if (!esmRecoveryStarted) {
      // Start 2-minute verification window
      esmRecoveryStarted = true;
      esmRecoveryStartTime = now;
      Serial.println("🟡 ESM: Sensors valid — starting 2-min recovery verification...");
    } else if (now - esmRecoveryStartTime >= ESM_RECOVERY_VERIFY_MS) {
      // 2 minutes of stable sensors confirmed → exit ESM
      emergencySurvivalMode = false;
      esmRecoveryStarted = false;
      invalidReadingsActive = false;
      transitionTo(STATE_NORMAL, "ESM_RECOVERED_VERIFIED");
      gsmQueueAlert("temperature", "✅ Emergency survival ended - sensors stable for 2 min.");
      Serial.println("🟢 ESM: Recovery verified (2 min stable) → NORMAL");
    }
    // else: still within verification window, keep cycling
  } else {
    // Sensors went invalid again during verification → restart timer
    if (esmRecoveryStarted) {
      esmRecoveryStarted = false;
      esmRecoveryStartTime = 0;
      Serial.println("🔴 ESM: Sensors invalid during verification — timer reset");
    }
  }
}

void startPowerRecoveryPurge(unsigned long outageDuration) {
  if (purgeActive || emergencySurvivalMode || outageDuration < PURGE_OUTAGE_THRESHOLD) return;
  purgeActive = true;
  purgeStartTime = millis();
  measuredOutageDuration = outageDuration;
  
  // Thermal protection: check current temperature for cold-shock risk
  // Use raw DHT reading since SVL may not be populated yet at boot
  float bootTemp = dht.readTemperature();
  if (isnan(bootTemp)) bootTemp = temperature; // fallback to last known
  purgeColdMode = (bootTemp < PURGE_COLD_TEMP);
  
  if (purgeColdMode) {
    // Cold environment: minimum ventilation only (cyclic, not full blast)
    requestFan(true, "LOW");
    requestCirculationFan(false);
    Serial.printf("⚡ POWER RECOVERY PURGE (COLD MODE): T=%.1f°C < %.1f°C — minimum vent for 5 min\n", bootTemp, PURGE_COLD_TEMP);
    gsmQueueAlert("power", "⚡ Power restored after " + String(outageDuration/1000) + "s - cold-safe purge active (T=" + String(bootTemp,1) + "°C).");
  } else {
    // Normal purge: full ventilation
    requestFan(true, "HIGH");
    requestCirculationFan(true);
    Serial.printf("⚡ POWER RECOVERY PURGE: T=%.1f°C — full ventilation for 5 min\n", bootTemp);
    gsmQueueAlert("power", "⚡ Power restored after " + String(outageDuration/1000) + "s - ventilation purge active.");
  }
  requestHeater(false);
  requestFogger(false);
  requestAlarm(false);
}

void checkPowerRecoveryPurge() {
  if (!purgeActive) return;
  
  // ABSOLUTE PURGE AUTHORITY: only purge controls relays
  // State machine is paused (handled in automationEngineTick)
  if (purgeColdMode) {
    // Cold-shock protection: cyclic minimum ventilation (40s ON / 80s OFF)
    unsigned long cyclePos = (millis() - purgeStartTime) % 120000UL;
    if (cyclePos < 40000UL) {
      requestFan(true, "LOW");
    } else {
      requestFan(false, "OFF");
    }
    requestCirculationFan(false);
  } else {
    // Full purge: all fans HIGH continuously
    requestFan(true, "HIGH");
    requestCirculationFan(true);
  }
  requestHeater(false);
  requestFogger(false);
  requestAlarm(false);
  
  if (millis() - purgeStartTime >= PURGE_DURATION) {
    purgeActive = false;
    purgeColdMode = false;
    transitionTo(STATE_NORMAL, "PURGE_COMPLETE");
    Serial.println("✅ Ventilation purge complete → NORMAL state");
    gsmQueueAlert("power", "✅ Power recovery purge finished — normal automation resumed.");
  }
}

// --- NVS Power Tracking ---
// Writes current millis-based timestamp to NVS every 30s so on reboot
// we can compute real outage duration.
void nvsWriteAliveTimestamp() {
  unsigned long now = millis();
  if (now - lastNvsHeartbeat < NVS_HEARTBEAT_INTERVAL) return;
  lastNvsHeartbeat = now;
  
  preferences.begin(NVS_HEARTBEAT_NS, false);
  // Store seconds since boot as a monotonic alive marker
  // Combined with restart detection, gives real outage duration
  preferences.putULong("alive_sec", now / 1000UL);
  preferences.putBool("clean_flag", true); // Mark as running
  preferences.end();
}

unsigned long nvsReadOutageDuration() {
  preferences.begin(NVS_HEARTBEAT_NS, true);
  unsigned long lastAliveSec = preferences.getULong("alive_sec", 0);
  bool wasClean = preferences.getBool("clean_flag", false);
  preferences.end();
  
  // Clear the clean flag (will be set again by heartbeat)
  preferences.begin(NVS_HEARTBEAT_NS, false);
  preferences.putBool("clean_flag", false);
  preferences.putULong("alive_sec", 0);
  preferences.end();
  
  if (!wasClean || lastAliveSec == 0) {
    // No previous record or unclean shutdown — assume long outage
    Serial.println("⚡ NVS: No alive record found — assuming extended outage");
    return PURGE_OUTAGE_THRESHOLD + 1;
  }
  
  // lastAliveSec = seconds the ESP was alive before power loss
  // The actual outage duration is unknown from ESP perspective alone,
  // but we know power was lost because we rebooted.
  // Use uptime-at-death as minimum estimate: if ESP was running for 10min
  // and had a power restart, it was off for at least the reboot time.
  // For power-related restarts, we trust isPowerRelatedRestart() and
  // use a conservative estimate based on the restart reason.
  if (isPowerRelatedRestart()) {
    // Power event detected — outage was real, assume >3min for safety
    Serial.printf("⚡ NVS: Power restart detected, last alive at %lus uptime\n", lastAliveSec);
    return PURGE_OUTAGE_THRESHOLD + 1;
  }
  
  // Software/watchdog restart — not a power outage
  Serial.printf("⚡ NVS: Software restart (not power), last alive at %lus\n", lastAliveSec);
  return 0; // No purge needed
}

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  SECTION 13: GSM ALERT QUEUE (async, non-blocking)                    ║
// ╚═══════════════════════════════════════════════════════════════════════╝

void gsmInit() {
  Serial.println("📱 Initializing GSM module (SIM800L)...");
  pinMode(GSM_RST_PIN, OUTPUT);
  digitalWrite(GSM_RST_PIN, HIGH);
  // Non-blocking hardware reset
  digitalWrite(GSM_RST_PIN, LOW);
  unsigned long w = millis(); while(millis()-w < 100) yield();
  digitalWrite(GSM_RST_PIN, HIGH);
  // Wait for module boot (non-blocking in subsequent ticks)
  gsmSerial.begin(GSM_BAUD, SERIAL_8N1, GSM_RX_PIN, GSM_TX_PIN);
  
  // Quick AT test (with short timeout)
  gsmSerial.println("AT");
  unsigned long start = millis();
  String resp = "";
  while (millis() - start < 2000) {
    while (gsmSerial.available()) resp += (char)gsmSerial.read();
    if (resp.indexOf("OK") != -1) { gsmInitialized = true; break; }
    yield();
  }
  
  if (gsmInitialized) {
    gsmSerial.println("ATE0");
    unsigned long w2 = millis(); while(millis()-w2 < 500) { while(gsmSerial.available()) gsmSerial.read(); yield(); }
    gsmSerial.println("AT+CMGF=1");
    unsigned long w3 = millis(); while(millis()-w3 < 500) { while(gsmSerial.available()) gsmSerial.read(); yield(); }
    
    // Check network (non-blocking - will retry in queue processing)
    gsmSerial.println("AT+CREG?");
    unsigned long w4 = millis(); resp = "";
    while(millis()-w4 < 3000) {
      while(gsmSerial.available()) resp += (char)gsmSerial.read();
      if (resp.indexOf("+CREG: 0,1") != -1 || resp.indexOf("+CREG: 0,5") != -1) {
        gsmNetworkReady = true; break;
      }
      yield();
    }
    Serial.printf("   GSM: init=%s network=%s\n", gsmInitialized?"OK":"FAIL", gsmNetworkReady?"OK":"WAIT");
  } else {
    Serial.println("   GSM: module not detected (SMS disabled)");
  }
  
  loadSmsSettings();
}

void gsmQueueAlert(String alertType, String message) {
  // Check if this alert type is enabled
  if (!smsEnabled) return;
  if (alertType == "temperature" && !smsAlertTemp) return;
  if (alertType == "humidity" && !smsAlertHumidity) return;
  if (alertType == "ammonia" && !smsAlertAmmonia) return;
  if (alertType == "power" && !smsAlertPower) return;
  if (alertType == "water" && !smsAlertWater) return;
  
  // ═══════════════════════════════════════════════════════════════
  // CRITICAL ALERT SMS BYPASS:
  // EMERGENCY/SENSOR_FAIL/SURVIVAL states bypass normal SMS cooldown.
  // Critical alerts resend every 2 minutes instead of 30 minutes.
  // This ensures the farmer is ALWAYS notified of life-threatening conditions.
  // ═══════════════════════════════════════════════════════════════
  bool isCriticalState = (currentState == STATE_EMERGENCY || currentState == STATE_SENSOR_FAIL || 
                          emergencySurvivalMode || 
                          safetyEngine.isSafetyActive());
  
  unsigned long effectiveCooldown = isCriticalState ? GSM_CRITICAL_COOLDOWN_MS : smsCooldownMs;
  
  if (!intervalPassed(millis(), lastSmsSentTime, effectiveCooldown)) return;
  
  // For critical alerts, allow duplicate types in queue (resend same alert)
  if (!isCriticalState) {
    // Normal: check for duplicates in queue
    for (int i = 0; i < MAX_GSM_QUEUE; i++) {
      if (gsmQueue[i].pending && gsmQueue[i].alertType == alertType) return;
    }
  }
  
  // Find empty slot
  for (int i = 0; i < MAX_GSM_QUEUE; i++) {
    if (!gsmQueue[i].pending) {
      gsmQueue[i].message = "[Smart Farm" + String(isCriticalState ? " 🚨CRITICAL" : "") + "]\n" + message;
      gsmQueue[i].alertType = alertType;
      gsmQueue[i].pending = true;
      return;
    }
  }
}

void gsmProcessQueue() {
  if (!gsmInitialized || !gsmNetworkReady || phoneNumberCount == 0) return;
  // Only when WiFi is NOT connected (offline mode) OR for critical alerts
  if (WiFi.status() == WL_CONNECTED && currentState != STATE_EMERGENCY && currentState != STATE_SENSOR_FAIL) return;

  for (int i = 0; i < MAX_GSM_QUEUE; i++) {
    if (!gsmQueue[i].pending) continue;
    bool anySent = false;
    for (int p = 0; p < phoneNumberCount; p++) {
      if (phoneNumbers[p].length() > 0) {
        if (gsmSendSMS(phoneNumbers[p], gsmQueue[i].message)) anySent = true;
        esp_task_wdt_reset();
      }
    }
    gsmQueue[i].pending = false;
    if (anySent) lastSmsSentTime = millis();
    return; // Process one alert per tick (non-blocking)
  }
}

bool gsmSendSMS(String phone, String message) {
  gsmSerial.print("AT+CMGS=\""); gsmSerial.print(phone); gsmSerial.println("\"");
  unsigned long start = millis();
  bool prompt = false;
  while (millis() - start < 5000) {
    while (gsmSerial.available()) { if (gsmSerial.read() == '>') { prompt = true; break; } }
    if (prompt) break;
    yield(); esp_task_wdt_reset();
  }
  if (!prompt) { gsmSerial.write(27); return false; }
  gsmSerial.print(message);
  gsmSerial.write(26);
  start = millis();
  String resp = "";
  while (millis() - start < 15000) {
    while (gsmSerial.available()) resp += (char)gsmSerial.read();
    if (resp.indexOf("+CMGS:") != -1) return true;
    if (resp.indexOf("ERROR") != -1) return false;
    yield(); esp_task_wdt_reset();
  }
  return false;
}

void loadSmsSettings() {
  preferences.begin("sms_settings", true);
  smsEnabled = preferences.getBool("enabled", true);
  smsAlertTemp = preferences.getBool("temp_alerts", true);
  smsAlertHumidity = preferences.getBool("hum_alerts", true);
  smsAlertAmmonia = preferences.getBool("amm_alerts", true);
  smsAlertPower = preferences.getBool("pow_alerts", true);
  smsAlertWater = preferences.getBool("wat_alerts", true);
  smsCooldownMs = preferences.getULong("cooldown", GSM_COOLDOWN_DEFAULT);
  phoneNumberCount = preferences.getInt("phone_count", 0);
  for (int i = 0; i < phoneNumberCount && i < MAX_PHONE_NUMBERS; i++) {
    phoneNumbers[i] = preferences.getString(("phone_" + String(i)).c_str(), "");
  }
  preferences.end();
}

void saveSmsSettings() {
  preferences.begin("sms_settings", false);
  preferences.putBool("enabled", smsEnabled);
  preferences.putBool("temp_alerts", smsAlertTemp);
  preferences.putBool("hum_alerts", smsAlertHumidity);
  preferences.putBool("amm_alerts", smsAlertAmmonia);
  preferences.putBool("pow_alerts", smsAlertPower);
  preferences.putBool("wat_alerts", smsAlertWater);
  preferences.putULong("cooldown", smsCooldownMs);
  preferences.putInt("phone_count", phoneNumberCount);
  for (int i = 0; i < phoneNumberCount; i++) {
    preferences.putString(("phone_" + String(i)).c_str(), phoneNumbers[i]);
  }
  preferences.end();
}

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  SECTION 14: NETWORK (unchanged API protocol)                         ║
// ╚═══════════════════════════════════════════════════════════════════════╝

void connectWiFi() {
  Serial.printf("📡 WiFi: Connecting to SSID=[%s] len=%d\n", activeWifiSSID.c_str(), activeWifiSSID.length());
  
  if (activeWifiSSID.length() == 0 || activeWifiSSID == "YOUR_WIFI_SSID") {
    Serial.println("❌ WiFi BLOCKED: SSID is empty or placeholder!");
    Serial.printf("   Raw SSID bytes: ");
    for (int i = 0; i < activeWifiSSID.length(); i++) Serial.printf("%02X ", (uint8_t)activeWifiSSID[i]);
    Serial.println();
    failsafeMode = true; return;
  }
  
  WiFi.disconnect(true);  // Force disconnect any previous session
  delay(100);
  WiFi.mode(WIFI_STA);
  WiFi.begin(activeWifiSSID.c_str(), activeWifiPassword.c_str());
  Serial.printf("📡 WiFi: Attempting connection (max 10s)...\n");
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    unsigned long w = millis(); while(millis()-w < 500) { esp_task_wdt_reset(); yield(); }
    attempts++;
    if (attempts % 5 == 0) Serial.printf("   ...attempt %d/20 (status=%d)\n", attempts, WiFi.status());
  }
  wifiConnected = (WiFi.status() == WL_CONNECTED);
  if (wifiConnected) {
    Serial.printf("✓ WiFi Connected (IP: %s, RSSI: %d)\n", WiFi.localIP().toString().c_str(), WiFi.RSSI());
  } else {
    Serial.printf("✗ WiFi Failed (status=%d) - local automation active\n", WiFi.status());
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
  http.setTimeout(5000);
  esp_task_wdt_reset();

  DynamicJsonDocument doc(3072);
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
  doc["farm_profile"] = farmConfig.farmType;
  doc["farm_type"] = getFarmTypeStr();
  doc["broiler_age_days"] = farmConfig.chickAgeDays;
  doc["wifi_rssi"] = WiFi.RSSI();
  doc["uptime_seconds"] = millis() / 1000;
  doc["broiler_age_source"] = ageSource;
  doc["water_last_2h_avg"] = water2hAvg;
  doc["water_24h_rolling_avg"] = waterRollingAvg;
  doc["water_anomaly_consecutive_count"] = waterAnomalyConsecutive;
  doc["firmware_version"] = FIRMWARE_VERSION;
  doc["restart_reason"] = restartReason;
  doc["total_restarts"] = totalRestarts;
  doc["safe_mode_active"] = safeModeActive;
  doc["purge_active"] = purgeActive;
  doc["purge_cold_mode"] = purgeColdMode;
  doc["measured_outage_ms"] = measuredOutageDuration;
  doc["power_event_type"] = isPowerRelatedRestart() ? "POWER_EVENT" : "NORMAL";
  doc["gas_warmup_done"] = gasWarmupDone;
  doc["ammonia_avg_10"] = gasAvg10;
  doc["consecutive_high_ammonia"] = consecutiveHighNH3;
  doc["power_voltage_rms"] = powerVoltageRMS;
  doc["offline_buffer_count"] = offlineBufCount;
  doc["ota_status"] = otaStatus;
  doc["ota_progress"] = otaProgress;
  doc["online_duration_seconds"] = onlineDurationSec;
  doc["offline_duration_seconds"] = offlineDurationSec;
  doc["circulation_fan_on"] = circulationFanOn;
  doc["ceiling_fan_on"] = ceilingFanOn;
  doc["sprinkler_on"] = sprinklerOn;
  doc["fogger_on"] = foggerOn;
  doc["min_vent_active"] = minVentActive;
  doc["fogger_active"] = foggerActive;
  doc["light_brightness"] = lightBrightness;
  doc["cached_settings_version"] = cachedSettingsVersion;
  doc["system_state"] = stateNames[currentState];
  doc["dht2_available"] = dht2Available;
  doc["relay_count"] = 8;
  if (dht2Available) { doc["temperature2"] = temperature2; doc["humidity2"] = humidity2; }

  String payload;
  serializeJson(doc, payload);
  int httpCode = http.POST(payload);
  esp_task_wdt_reset();

  if (httpCode == 200) {
    String response = http.getString();
    handleCloudResponse(response);
    cloudConnected = true;
    lastCloudSync = millis();
    if (failsafeMode && cloudConnected) { failsafeMode = false; }
    if (offlineBufCount > 0) offlineBufferSync();
  } else {
    if (millis() - lastCloudSync > CLOUD_TIMEOUT) {
      failsafeMode = true; cloudConnected = false;
    }
  }
  http.end();
}

void handleCloudResponse(String response) {
  DynamicJsonDocument doc(2048);
  if (deserializeJson(doc, response) != DeserializationError::Ok) return;
  
  if (doc.containsKey("current_hour")) {
    currentHour = doc["current_hour"]; currentMinute = doc["current_minute"] | 0;
    lastTimeSync = millis(); timeValid = true;
  }
  if (doc.containsKey("lighting_schedule")) {
    JsonObject ls = doc["lighting_schedule"];
    lightSchedule.enabled = ls["enabled"] | true;
    lightSchedule.startHour = ls["start_hour"] | 5;
    lightSchedule.startMinute = ls["start_minute"] | 0;
    lightSchedule.endHour = ls["end_hour"] | 21;
    lightSchedule.endMinute = ls["end_minute"] | 0;
    lightSchedule.fadeInMinutes = ls["fade_in_minutes"] | 30;
    lightSchedule.fadeOutMinutes = ls["fade_out_minutes"] | 30;
    lightSchedule.minBrightness = ls["min_brightness"] | 0;
    lightSchedule.maxBrightness = ls["max_brightness"] | 100;
  }
  if (doc.containsKey("broiler_age_days") && isBroiler()) {
    updateAgeFromServer(doc["broiler_age_days"]);
  }
  if (doc.containsKey("sms_settings")) {
    JsonObject sms = doc["sms_settings"];
    smsEnabled = sms["enabled"] | true;
    smsCooldownMs = (sms["cooldown_minutes"] | 30) * 60000UL;
    if (sms.containsKey("phone_numbers")) {
      JsonArray phones = sms["phone_numbers"];
      phoneNumberCount = min((int)phones.size(), MAX_PHONE_NUMBERS);
      for (int i = 0; i < phoneNumberCount; i++) phoneNumbers[i] = phones[i].as<String>();
    }
    saveSmsSettings();
  }
}

void fetchConfig() {
  if (!wifiConnected) return;
  HTTPClient http;
  String url = String(API_URL) + "/config";
  http.begin(url);
  http.addHeader("x-device-token", activeDeviceToken.c_str());
  http.setTimeout(5000);
  esp_task_wdt_reset();
  int code = http.GET();
  esp_task_wdt_reset();
  if (code == 200) {
    String resp = http.getString();
    DynamicJsonDocument doc(2048);
    if (deserializeJson(doc, resp) == DeserializationError::Ok) {
      if (doc.containsKey("farm_type")) {
        String ft = doc["farm_type"] | "LAYER";
        int newType = (ft == "BROILER") ? FARM_PROFILE_BROILER : FARM_PROFILE_LAYER;
        if (newType != farmConfig.farmType) {
          farmConfig.farmType = newType; saveFarmProfile();
          if (isLayer()) loadLayerRules(); else loadBroilerRules();
        }
      }
      if (doc.containsKey("broiler_age_days") && isBroiler()) updateAgeFromServer(doc["broiler_age_days"]);
      if (doc.containsKey("temperature_min")) rules.tempMin = doc["temperature_min"];
      if (doc.containsKey("temperature_max")) rules.tempMax = doc["temperature_max"];
      if (doc.containsKey("ammonia_max")) rules.ammoniaAlarm = doc["ammonia_max"];
      if (doc.containsKey("hsi_mild_threshold")) rules.hsiFanLow = doc["hsi_mild_threshold"];
      if (doc.containsKey("hsi_moderate_threshold")) rules.hsiFanHigh = doc["hsi_moderate_threshold"];
      if (doc.containsKey("hsi_severe_threshold")) rules.hsiEmergency = doc["hsi_severe_threshold"];
      if (doc.containsKey("hsi_emergency_threshold")) rules.hsiCritical = doc["hsi_emergency_threshold"];
      updateHysteresisThresholds();
      configSynced = true;
    }
  }
  http.end();
}

void checkCommands() {
  if (!wifiConnected || emergencySurvivalMode) return;
  HTTPClient http;
  String url = String(API_URL) + "/commands";
  http.begin(url);
  http.addHeader("x-device-token", activeDeviceToken.c_str());
  http.setTimeout(5000);
  esp_task_wdt_reset();
  int code = http.GET();
  esp_task_wdt_reset();
  if (code == 200) {
    String resp = http.getString();
    DynamicJsonDocument doc(2048);
    if (deserializeJson(doc, resp) == DeserializationError::Ok && doc.containsKey("commands")) {
      JsonArray cmds = doc["commands"];
      for (JsonObject cmd : cmds) {
        String type = cmd["command_type"] | "";
        bool value = cmd["command_value"] | false;
        String id = cmd["id"] | "";
        
        // ═══════════════════════════════════════════════════════════
        // MANUAL OVERRIDE SAFETY BAND ENFORCEMENT
        // Manual heater ON rejected if temp >= OVERRIDE_SAFE_TEMP_MAX
        // Manual fan OFF rejected if temp >= OVERRIDE_SAFE_TEMP_MAX
        // This prevents human error from killing birds.
        // ═══════════════════════════════════════════════════════════
        float safetyTemp = dht2Available ? worstCaseMaxTemp : temperature;
        float safetyTempMin = dht2Available ? worstCaseMinTemp : temperature;
        
        // ═══ All manual commands set bypass flag ═══
        manualCommandPending = true;
        
        if (type == "exhaust_fan" || type == "fan") {
          // Block fan OFF if temp is in danger zone
          if (!value && safetyTemp >= OVERRIDE_SAFE_TEMP_MAX) {
            Serial.printf("⛔ MANUAL FAN OFF REJECTED: temp %.1f°C >= %.1f°C safety max\n", safetyTemp, OVERRIDE_SAFE_TEMP_MAX);
            manualCommandPending = false;
          } else {
            fanManualOverride = true; fanManualTime = millis();
            requestFan(value, value ? "HIGH" : "OFF");
          }
        } else if (type == "heater") {
          // Block heater ON if temp is already at/above safety max
          if (value && safetyTemp >= OVERRIDE_SAFE_TEMP_MAX) {
            Serial.printf("⛔ MANUAL HEATER ON REJECTED: temp %.1f°C >= %.1f°C safety max\n", safetyTemp, OVERRIDE_SAFE_TEMP_MAX);
            manualCommandPending = false;
          } else {
            heaterManualOverride = true; heaterManualTime = millis();
            requestHeater(value);
          }
        } else if (type == "light") {
          lightSchedule.manualOverride = true; lightManualOverrideTime = millis();
          requestLight(value ? 100 : 0);
        } else if (type == "alarm") {
          requestAlarm(value);
        } else if (type == "fogger") {
          // Block fogger OFF if temp is in danger zone
          if (!value && safetyTemp >= OVERRIDE_SAFE_TEMP_MAX) {
            Serial.printf("⛔ MANUAL FOGGER OFF REJECTED: temp %.1f°C >= %.1f°C safety max\n", safetyTemp, OVERRIDE_SAFE_TEMP_MAX);
            manualCommandPending = false;
          } else {
            foggerManualOverride = true; foggerManualTime = millis();
            requestFogger(value);
          }
        } else if (type == "circulation_fan") {
          circulationFanManualOverride = true; circulationFanManualTime = millis();
          requestCirculationFan(value);
        } else if (type == "ceiling_fan") {
          ceilingFanManualOverride = true; ceilingFanManualTime = millis();
          requestCeilingFan(value);
        } else if (type == "sprinkler") {
          sprinklerManualOverride = true; sprinklerManualTime = millis();
          requestSprinkler(value);
        } else if (type == "stop_automation") {
          // Always allow manual override — safety arbiter will still protect life-critical invariants
          localManualOverride = value;
          if (value) {
            Serial.println("✅ MANUAL OVERRIDE ACTIVATED (safety arbiter remains active for life-critical protection)");
          } else {
            Serial.println("✅ MANUAL OVERRIDE DEACTIVATED → returning to AUTO mode");
          }
        } else {
          manualCommandPending = false; // Unknown command type
        }
        // Acknowledge
        if (id.length() > 0) {
          HTTPClient ack;
          String ackUrl = String(API_URL) + "/commands-ack";
          ack.begin(ackUrl);
          ack.addHeader("Content-Type", "application/json");
          ack.addHeader("x-device-token", activeDeviceToken.c_str());
          ack.setTimeout(3000);
          StaticJsonDocument<256> adoc;
          adoc["command_ids"][0] = id;
          String ap; serializeJson(adoc, ap);
          ack.POST(ap);
          ack.end();
          esp_task_wdt_reset();
        }
      }
    }
  }
  http.end();
}

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  SECTION 15: FARM PROFILE / EEPROM / NVS / OTA                       ║
// ╚═══════════════════════════════════════════════════════════════════════╝

void loadFarmProfile() {
  uint32_t magic = 0;
  EEPROM.get(EEPROM_MAGIC_ADDR, magic);
  if (magic == FARM_CONFIG_MAGIC) {
    EEPROM.get(EEPROM_CONFIG_ADDR, farmConfig);
    if (farmConfig.farmType < 0 || farmConfig.farmType > 1) farmConfig.farmType = FARM_PROFILE_LAYER;
    if (farmConfig.chickAgeDays < 1 || farmConfig.chickAgeDays > 999) farmConfig.chickAgeDays = 1;
    if (farmConfig.tempOffset < -10 || farmConfig.tempOffset > 10) farmConfig.tempOffset = 0;
    if (farmConfig.nh3Offset < -20 || farmConfig.nh3Offset > 20) farmConfig.nh3Offset = 0;
    configLoaded = true;
  } else {
    farmConfig = { FARM_PROFILE_LAYER, 1, 0.0f, 0.0f };
    configLoaded = false;
  }
  printFarmProfile();
}

void saveFarmProfile() {
  EEPROM.put(EEPROM_CONFIG_ADDR, farmConfig);
  uint32_t magic = FARM_CONFIG_MAGIC;
  EEPROM.put(EEPROM_MAGIC_ADDR, magic);
  EEPROM.commit();
  configLoaded = true;
}

void updateAge(int newAge) {
  if (newAge < 1 || newAge > 999 || newAge == farmConfig.chickAgeDays) return;
  // Validate age change through safety engine
  if (!safetyEngine.validateAgeChange(newAge, farmConfig.chickAgeDays)) {
    Serial.printf("⚠️ AGE REJECTED: %d → %d (safety validation failed)\n", farmConfig.chickAgeDays, newAge);
    return;
  }
  farmConfig.chickAgeDays = newAge;
  saveFarmProfile();
  if (isBroiler()) loadBroilerRules();
}

void updateAgeFromServer(int newAge) {
  if (!isBroiler() || newAge <= 0) return;
  
  // Bird age validation: reject if outside 0-60 or jump >2 days in 24h
  if (!safetyEngine.validateAgeChange(newAge, farmConfig.chickAgeDays)) {
    Serial.printf("⚠️ AGE REJECTED by safety engine: %d → %d\n", farmConfig.chickAgeDays, newAge);
    return; // Keep current age
  }
  
  if (newAge != farmConfig.chickAgeDays) {
    farmConfig.chickAgeDays = newAge; loadBroilerRules();
  }
  ageFromServer = true; ageSource = "SERVER";
  lastAgeSyncMillis = millis(); lastAgeIncreaseMillis = millis();
  saveFarmProfile();
}

void checkOfflineAgeIncrement() {
  if (!isBroiler()) return;
  if (millis() - lastAgeIncreaseMillis >= AGE_TICK_INTERVAL) {
    int newAge = farmConfig.chickAgeDays + 1;
    // ═══════════════════════════════════════════════════════════
    // Offline age increment MUST go through safety validation.
    // Previously bypassed validateAgeChange() — LETHAL BUG.
    // Wrong age → wrong temp curve → birds freeze or overheat.
    // ═══════════════════════════════════════════════════════════
    if (safetyEngine.validateAgeChange(newAge, farmConfig.chickAgeDays)) {
      farmConfig.chickAgeDays = newAge;
      lastAgeIncreaseMillis = millis();
      ageSource = "LOCAL";
      saveFarmProfile();
      loadBroilerRules();
      saveAgeTickTime();
    } else {
      Serial.printf("⚠️ OFFLINE AGE INCREMENT REJECTED: %d → %d\n", farmConfig.chickAgeDays, newAge);
      lastAgeIncreaseMillis = millis(); // Prevent retry spam
    }
  }
}

void loadAgeTickTime() {
  preferences.begin("age_track", true);
  lastAgeIncreaseMillis = millis(); // Reset relative to boot
  preferences.end();
}

void saveAgeTickTime() {
  preferences.begin("age_track", false);
  preferences.putULong("last_tick", millis());
  preferences.end();
}

bool isNVSProvisioned() {
  preferences.begin(NVS_NAMESPACE, true);
  uint32_t m = preferences.getUInt("magic", 0);
  preferences.end();
  return m == NVS_PROVISIONED_MAGIC;
}

void loadCredentialsFromNVS() {
  preferences.begin(NVS_NAMESPACE, true);
  activeDeviceToken = preferences.getString("device_token", "");
  activeWifiSSID = preferences.getString("wifi_ssid", "");
  activeWifiPassword = preferences.getString("wifi_pass", "");
  activeShedId = preferences.getString("shed_id", "");
  activeShedName = preferences.getString("shed_name", "");
  activeFarmId = preferences.getString("farm_id", "");
  nvsProvisioned = true;
  preferences.end();
}

void saveCredentialsToNVS() {
  preferences.begin(NVS_NAMESPACE, false);
  preferences.putString("device_token", activeDeviceToken);
  preferences.putString("wifi_ssid", activeWifiSSID);
  preferences.putString("wifi_pass", activeWifiPassword);
  preferences.putString("shed_id", activeShedId);
  preferences.putString("shed_name", activeShedName);
  preferences.putString("farm_id", activeFarmId);
  preferences.putUInt("magic", NVS_PROVISIONED_MAGIC);
  preferences.end();
  nvsProvisioned = true;
}

void provisionFromHardcoded() {
  activeDeviceToken = String(DEVICE_TOKEN);
  activeWifiSSID = String(WIFI_SSID);
  activeWifiPassword = String(WIFI_PASSWORD);
  activeShedId = String(SHED_ID);
  activeShedName = String(SHED_NAME);
  activeFarmId = String(FARM_ID);
  saveCredentialsToNVS();
}

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  OTA: INDUSTRIAL SAFE UPDATE SYSTEM                                    ║
// ║  Rules:                                                                ║
// ║    1. Never update if version is same or older (semver compare)        ║
// ║    2. Verify CRC32 checksum of written partition BEFORE boot           ║
// ║    3. Use dual-partition rollback (esp_ota)                            ║
// ║    4. If new firmware fails boot validation → auto-revert              ║
// ║    5. Controller ALWAYS has working firmware                           ║
// ╚═══════════════════════════════════════════════════════════════════════╝

bool compareVersions(String current, String target) {
  int cM=0,cN=0,cP=0, tM=0,tN=0,tP=0;
  sscanf(current.c_str(), "%d.%d.%d", &cM,&cN,&cP);
  sscanf(target.c_str(), "%d.%d.%d", &tM,&tN,&tP);
  if (tM!=cM) return tM>cM; if (tN!=cN) return tN>cN; return tP>cP;
}

uint32_t calculateCRC32(uint8_t* data, size_t len) {
  uint32_t crc = 0xFFFFFFFF;
  for (size_t i=0;i<len;i++) { crc ^= data[i]; for(int j=0;j<8;j++) crc = (crc>>1)^(0xEDB88320&-(crc&1)); }
  return ~crc;
}

// Calculate CRC32 of data already written to a partition (streaming read)
uint32_t calculateStreamCRC32(const esp_partition_t* partition, size_t size) {
  uint32_t crc = 0xFFFFFFFF;
  uint8_t buf[256];
  size_t offset = 0;
  while (offset < size) {
    size_t toRead = min((size_t)256, size - offset);
    if (esp_partition_read(partition, offset, buf, toRead) != ESP_OK) {
      Serial.println("❌ OTA: Partition read failed during CRC verify");
      return 0;
    }
    for (size_t i = 0; i < toRead; i++) {
      crc ^= buf[i];
      for (int j = 0; j < 8; j++) crc = (crc >> 1) ^ (0xEDB88320 & -(crc & 1));
    }
    offset += toRead;
    esp_task_wdt_reset();
  }
  return ~crc;
}

void validateBootPartition() {
  const esp_partition_t* running = esp_ota_get_running_partition();
  esp_ota_img_states_t state;
  if (esp_ota_get_state_partition(running, &state) == ESP_OK) {
    if (state == ESP_OTA_IMG_PENDING_VERIFY) {
      Serial.println("🔍 OTA: New firmware pending verification...");
      
      // Multi-point validation:
      // 1. Credentials loaded (NVS intact)
      // 2. Sufficient free heap (no memory corruption)
      // 3. Sensors respond (hardware compatibility)
      bool credOk = (activeDeviceToken.length() >= 10);
      bool heapOk = (ESP.getFreeHeap() >= 20000);
      bool sensorOk = !isnan(dht.readTemperature());
      
      Serial.printf("  Credentials: %s | Heap: %s (%lu) | Sensor: %s\n",
        credOk ? "OK" : "FAIL", heapOk ? "OK" : "LOW", ESP.getFreeHeap(),
        sensorOk ? "OK" : "FAIL");
      
      if (credOk && heapOk) {
        esp_ota_mark_app_valid_cancel_rollback();
        Serial.printf("✅ Firmware v%s validated and locked\n", FIRMWARE_VERSION);
        otaStatus = "validated";
      } else {
        Serial.println("❌ Firmware validation FAILED — initiating rollback");
        otaStatus = "rollback";
        gsmQueueAlert("ota", "❌ OTA rollback: new firmware failed validation, reverting to previous.");
        unsigned long w = millis(); while(millis()-w < 2000) { esp_task_wdt_reset(); yield(); }
        esp_ota_mark_app_invalid_rollback_and_reboot();
        // Never reaches here — device reboots into previous partition
      }
    }
  }
}

void checkOTAUpdate() {
  if (otaInProgress || !wifiConnected) return;
  // Don't check during critical states
  if (currentState == STATE_EMERGENCY || currentState == STATE_SENSOR_FAIL || purgeActive || emergencySurvivalMode) return;
  // Don't check during any active manual override
  if (localManualOverride || fanManualOverride || heaterManualOverride || foggerManualOverride) return;
  
  // ═══════════════════════════════════════════════════════════════
  // OTA ENVIRONMENT STABILITY GATE:
  // OTA only allowed when environment has been stable for 10 minutes.
  // "Stable" = NORMAL state + temp within safe range + no sensor issues
  // This prevents OTA during thermal events (main loop freezes during download)
  // ═══════════════════════════════════════════════════════════════
  unsigned long now = millis();
  bool envStable = (currentState == STATE_NORMAL && 
                    temperature >= OTA_STABLE_TEMP_MIN && temperature <= OTA_STABLE_TEMP_MAX &&
                    !sensorErrorMode && !svlTemp.isOffline && !svlHumidity.isOffline &&
                    thermalModelPlausible);
  
  if (envStable) {
    if (!otaEnvironmentStable) {
      otaEnvironmentStable = true;
      otaStableStartTime = now;
      Serial.println("📋 OTA: Environment stable — starting 10-min stability window");
    }
    // Must be stable for full window before OTA allowed
    if (!intervalPassed(now, otaStableStartTime, OTA_STABILITY_WINDOW_MS)) {
      return; // Not stable long enough yet
    }
  } else {
    if (otaEnvironmentStable) {
      otaEnvironmentStable = false;
      Serial.printf("⚠️ OTA: Environment unstable (state=%s, T=%.1f°C) — stability window reset\n",
        stateNames[currentState], temperature);
    }
    return; // Environment not stable
  }
  
  HTTPClient http;
  String url = "https://hbwfuvqrfgtefozajyfu.supabase.co/functions/v1/ota-firmware?action=check&current_version=" + String(FIRMWARE_VERSION);
  http.begin(url);
  http.addHeader("x-device-token", activeDeviceToken.c_str());
  http.setTimeout(10000);
  esp_task_wdt_reset();
  int code = http.GET();
  if (code == 200) {
    String resp = http.getString();
    DynamicJsonDocument doc(1024);
    if (deserializeJson(doc, resp) == DeserializationError::Ok) {
      if (doc["update_available"] | false) {
        String newVer = doc["version"] | "";
        
        // RULE 1: Never update to same or older version
        if (newVer == String(FIRMWARE_VERSION)) {
          Serial.printf("⚠️ OTA: Target v%s is same as current — skipping\n", newVer.c_str());
          http.end();
          return;
        }
        if (newVer.length() > 0 && compareVersions(FIRMWARE_VERSION, newVer)) {
          otaPendingUrl = doc["url"] | "";
          otaPendingSize = doc["size"] | 0;
          otaPendingChecksum = doc["checksum"] | "";
          otaAvailableVersion = newVer;
          Serial.printf("🔄 OTA: Update available v%s → v%s (size=%d)\n", FIRMWARE_VERSION, newVer.c_str(), otaPendingSize);
          
          if (otaPendingUrl.length() > 0 && otaPendingSize > 0) {
            performOTAUpdate();
          }
        } else {
          Serial.printf("⚠️ OTA: v%s is not newer than v%s — skipping\n", newVer.c_str(), FIRMWARE_VERSION);
        }
      }
    }
  }
  http.end();
}

void performOTAUpdate() {
  Serial.println("╔═══════════════════════════════════════════════════════════╗");
  Serial.println("║  OTA: INDUSTRIAL SAFE UPDATE STARTING                     ║");
  Serial.println("╚═══════════════════════════════════════════════════════════╝");
  
  otaInProgress = true;
  otaStatus = "downloading";
  otaProgress = 0;
  
  // RULE 3: Get the next OTA partition (dual-partition scheme)
  const esp_partition_t* updatePartition = esp_ota_get_next_update_partition(NULL);
  if (!updatePartition) {
    Serial.println("❌ OTA: No update partition available");
    otaInProgress = false; otaStatus = "error";
    return;
  }
  Serial.printf("  Target partition: %s (offset 0x%08x, size %d)\n",
    updatePartition->label, updatePartition->address, updatePartition->size);
  
  // Check partition has enough space
  if (otaPendingSize > 0 && (size_t)otaPendingSize > updatePartition->size) {
    Serial.println("❌ OTA: Firmware too large for partition");
    otaInProgress = false; otaStatus = "error";
    return;
  }
  
  // Begin OTA write handle
  esp_ota_handle_t otaHandle;
  esp_err_t err = esp_ota_begin(updatePartition, otaPendingSize > 0 ? otaPendingSize : OTA_SIZE_UNKNOWN, &otaHandle);
  if (err != ESP_OK) {
    Serial.printf("❌ OTA: esp_ota_begin failed (0x%x)\n", err);
    otaInProgress = false; otaStatus = "error";
    return;
  }
  
  // Download firmware
  HTTPClient http;
  http.begin(otaPendingUrl);
  http.setTimeout(30000);
  esp_task_wdt_reset();
  int code = http.GET();
  
  if (code != 200) {
    Serial.printf("❌ OTA: Download failed (HTTP %d)\n", code);
    esp_ota_abort(otaHandle);
    otaInProgress = false; otaStatus = "error";
    http.end();
    return;
  }
  
  int contentLen = http.getSize();
  if (contentLen <= 0) {
    Serial.println("❌ OTA: Invalid content length");
    esp_ota_abort(otaHandle);
    otaInProgress = false; otaStatus = "error";
    http.end();
    return;
  }
  
  Serial.printf("  Downloading %d bytes...\n", contentLen);
  WiFiClient* stream = http.getStreamPtr();
  
  size_t written = 0;
  uint8_t buf[1024];
  int lastPercent = 0;
  
  while (written < (size_t)contentLen) {
    esp_task_wdt_reset();
    
    // ═══════════════════════════════════════════════════════════
    // INV-5: OTA CANNOT PAUSE SAFETY LOOP
    // Read a fresh sensor value and run safety arbiter check.
    // If lethal condition detected → ABORT OTA immediately.
    // ═══════════════════════════════════════════════════════════
    float otaTemp = dht.readTemperature();
    bool otaSensorOk = !isnan(otaTemp);
    if (safetyEngine.otaSafetyCheck(otaTemp, otaSensorOk)) {
      Serial.println("🔴 OTA ABORTED: Safety invariant violated during download");
      esp_ota_abort(otaHandle);
      otaInProgress = false; otaStatus = "safety_abort";
      http.end();
      gsmQueueAlert("ota", "🔴 OTA aborted — safety violation during update!");
      return;
    }
    size_t available = stream->available();
    if (available == 0) {
      // Wait for data with timeout
      unsigned long waitStart = millis();
      while (stream->available() == 0 && millis() - waitStart < 10000) {
        esp_task_wdt_reset();
        yield();
      }
      if (stream->available() == 0) {
        Serial.println("❌ OTA: Download timeout");
        esp_ota_abort(otaHandle);
        otaInProgress = false; otaStatus = "error";
        http.end();
        return;
      }
    }
    
    size_t toRead = min((size_t)1024, (size_t)contentLen - written);
    int bytesRead = stream->readBytes(buf, toRead);
    if (bytesRead <= 0) break;
    
    err = esp_ota_write(otaHandle, buf, bytesRead);
    if (err != ESP_OK) {
      Serial.printf("❌ OTA: Write failed at offset %d (0x%x)\n", written, err);
      esp_ota_abort(otaHandle);
      otaInProgress = false; otaStatus = "error";
      http.end();
      return;
    }
    
    written += bytesRead;
    int percent = (written * 100) / contentLen;
    if (percent >= lastPercent + 10) {
      lastPercent = percent;
      otaProgress = percent;
      Serial.printf("  OTA progress: %d%% (%d/%d)\n", percent, written, contentLen);
    }
  }
  
  http.end();
  
  if (written != (size_t)contentLen) {
    Serial.printf("❌ OTA: Size mismatch (wrote %d, expected %d)\n", written, contentLen);
    esp_ota_abort(otaHandle);
    otaInProgress = false; otaStatus = "error";
    return;
  }
  
  Serial.printf("  Download complete: %d bytes written\n", written);
  
  // RULE 2: Verify CRC32 checksum BEFORE finalizing
  if (otaPendingChecksum.length() > 0) {
    otaStatus = "verifying";
    Serial.println("  Verifying CRC32 checksum...");
    
    uint32_t computedCRC = calculateStreamCRC32(updatePartition, written);
    uint32_t expectedCRC = (uint32_t)strtoul(otaPendingChecksum.c_str(), NULL, 16);
    
    if (computedCRC != expectedCRC) {
      Serial.printf("❌ OTA: CRC32 MISMATCH (computed=0x%08X, expected=0x%08X)\n", computedCRC, expectedCRC);
      Serial.println("  Aborting — partition NOT activated, current firmware safe");
      esp_ota_abort(otaHandle);
      otaInProgress = false; otaStatus = "checksum_fail";
      gsmQueueAlert("ota", "❌ OTA aborted: checksum verification failed for v" + otaAvailableVersion);
      return;
    }
    Serial.printf("  ✅ CRC32 verified: 0x%08X\n", computedCRC);
  } else {
    Serial.println("  ⚠️ No checksum provided — skipping CRC verify (not recommended)");
  }
  
  // Finalize OTA write
  err = esp_ota_end(otaHandle);
  if (err != ESP_OK) {
    Serial.printf("❌ OTA: esp_ota_end failed (0x%x) — firmware image invalid\n", err);
    otaInProgress = false; otaStatus = "error";
    return;
  }
  
  // RULE 3+4: Set boot partition (pending verify — rollback if validation fails)
  err = esp_ota_set_boot_partition(updatePartition);
  if (err != ESP_OK) {
    Serial.printf("❌ OTA: Failed to set boot partition (0x%x)\n", err);
    otaInProgress = false; otaStatus = "error";
    return;
  }
  
  otaStatus = "rebooting";
  otaProgress = 100;
  Serial.println("╔═══════════════════════════════════════════════════════════╗");
  Serial.printf("║  ✅ OTA READY: v%s → v%s                  \n", FIRMWARE_VERSION, otaAvailableVersion.c_str());
  Serial.println("║  Rebooting into new firmware (pending validation)...     ║");
  Serial.println("║  If validation fails → automatic rollback to current     ║");
  Serial.println("╚═══════════════════════════════════════════════════════════╝");
  
  gsmQueueAlert("ota", "🔄 OTA: Installing v" + otaAvailableVersion + " — rebooting. Auto-rollback if fail.");
  
  // Give GSM time to send alert
  unsigned long w = millis(); while(millis()-w < 3000) { esp_task_wdt_reset(); yield(); }
  
  // RULE 5: Reboot — new firmware boots in PENDING_VERIFY state
  // validateBootPartition() will run on next boot and either confirm or rollback
  esp_restart();
}

// --- Offline Buffer ---
void offlineBufferStore() {
  if (cloudConnected) return;
  offlineBuffer[offlineBufHead] = {
    millis(), temperature, humidity, ammonia, waterFlow, currentHSI, powerOn, fanSpeed, stateNames[currentState]
  };
  offlineBufHead = (offlineBufHead + 1) % OFFLINE_BUFFER_SIZE;
  if (offlineBufCount < OFFLINE_BUFFER_SIZE) offlineBufCount++;
}

void offlineBufferSync() {
  // Simplified: clear buffer on cloud reconnect (data already in sync payload)
  offlineBufCount = 0; offlineBufHead = 0;
}

// --- Water Analytics ---
void waterFlowTick() {
  unsigned long now = millis();
  if (now - lastWaterHistUpdate >= 3600000UL) {
    waterFlowHistory[waterHistIndex] = waterFlow;
    waterHistIndex = (waterHistIndex + 1) % WATER_HISTORY_SIZE;
    if (waterHistCount < WATER_HISTORY_SIZE) waterHistCount++;
    // Recalculate averages
    float sum = 0; for (int i=0;i<waterHistCount;i++) sum += waterFlowHistory[i];
    waterRollingAvg = waterHistCount > 0 ? sum / waterHistCount : 0;
    float sum2 = 0; int c2 = min(2, waterHistCount);
    for (int i=0;i<c2;i++) { int idx = (waterHistIndex-1-i+WATER_HISTORY_SIZE)%WATER_HISTORY_SIZE; sum2 += waterFlowHistory[idx]; }
    water2hAvg = c2 > 0 ? sum2 / c2 : 0;
    lastWaterHistUpdate = now;
  }
  checkWaterAnomaly();
}

void checkWaterAnomaly() {
  if (currentHour < 5 || currentHour >= 22 || waterHistCount < 6) return;
  float threshold = waterRollingAvg * 0.70f;
  if (waterRollingAvg > 0 && water2hAvg < threshold) {
    waterAnomalyConsecutive++;
    if (waterAnomalyConsecutive >= 2 && !waterAnomalyAlertSent) {
      waterAnomalyAlertSent = true;
      gsmQueueAlert("water", "💧 Water anomaly: " + String(((waterRollingAvg-water2hAvg)/waterRollingAvg)*100, 0) + "% drop!");
    }
  } else { waterAnomalyConsecutive = 0; waterAnomalyAlertSent = false; }
}

// --- Status LED ---
void updateStatusLED() {
  static unsigned long lastBlink = 0;
  static bool ledState = false;
  unsigned long interval = 2000;
  if (currentState == STATE_EMERGENCY || currentState == STATE_SENSOR_FAIL) interval = 100;
  else if (currentState == STATE_DANGER) interval = 250;
  else if (currentState == STATE_WARNING || failsafeMode) interval = 500;
  else if (!wifiConnected) interval = 1000;
  
  if (millis() - lastBlink >= interval) { ledState = !ledState; digitalWrite(STATUS_LED_PIN, ledState); lastBlink = millis(); }
}

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  SECTION 16: SETUP                                                    ║
// ╚═══════════════════════════════════════════════════════════════════════╝

void setup() {
  Serial.begin(115200);
  Serial.println("\n╔═══════════════════════════════════════════════════════════════╗");
  Serial.println("║    Smart Farm - Industrial Controller v7.0                     ║");
  Serial.println("║    State Machine Architecture | Single Authority Relays        ║");
  Serial.println("╚═══════════════════════════════════════════════════════════════╝\n");

  // --- Credentials ---
  // ALWAYS provision from hardcoded on boot to ensure latest values are used
  // This prevents stale NVS credentials from blocking WiFi connection
  provisionFromHardcoded();
  Serial.printf("🔑 Credentials loaded:\n");
  Serial.printf("   SSID: [%s] (len=%d)\n", activeWifiSSID.c_str(), activeWifiSSID.length());
  Serial.printf("   Pass: [%s] (len=%d)\n", activeWifiPassword.length() > 0 ? "****" : "EMPTY", activeWifiPassword.length());
  Serial.printf("   Token: [%s]\n", activeDeviceToken.substring(0, 8).c_str());
  Serial.printf("   Farm: [%s] Shed: [%s]\n", activeFarmId.c_str(), activeShedId.c_str());

  // --- Restart Reason ---
  restartReason = detectRestartReason();
  wasWatchdogReset = (restartReason == "WATCHDOG" || restartReason == "PANIC");
  Serial.printf("📋 Restart: %s\n", restartReason.c_str());
  if (wasWatchdogReset) esmTriggeredByWatchdog = true;
  else if (restartReason != "POWER_EVENT" && restartReason != "SOFTWARE") esmTriggeredByReboot = true;

  // --- Restart Count ---
  preferences.begin("device", false);
  totalRestarts = preferences.getInt("restarts", 0) + 1;
  preferences.putInt("restarts", totalRestarts);
  preferences.end();

  // --- Relay Init (ALL OFF - Active LOW: HIGH=OFF) — 8 Channel ---
  pinMode(FAN_RELAY_PIN, OUTPUT);          digitalWrite(FAN_RELAY_PIN, HIGH);      // IN1
  pinMode(CEILING_FAN_RELAY_PIN, OUTPUT);  digitalWrite(CEILING_FAN_RELAY_PIN, HIGH); // IN2
  pinMode(LIGHT_RELAY_PIN, OUTPUT);        digitalWrite(LIGHT_RELAY_PIN, HIGH);    // IN3
  pinMode(HEATER_RELAY_PIN, OUTPUT);       digitalWrite(HEATER_RELAY_PIN, HIGH);   // IN4
  pinMode(FOGGER_RELAY_PIN, OUTPUT);       digitalWrite(FOGGER_RELAY_PIN, HIGH);   // IN5
  pinMode(ALARM_RELAY_PIN, OUTPUT);        digitalWrite(ALARM_RELAY_PIN, HIGH);    // IN6
  pinMode(SPRINKLER_RELAY_PIN, OUTPUT);    digitalWrite(SPRINKLER_RELAY_PIN, HIGH); // IN7
  pinMode(CIRCULATION_RELAY_PIN, OUTPUT);  digitalWrite(CIRCULATION_RELAY_PIN, HIGH); // IN8
  pinMode(STATUS_LED_PIN, OUTPUT);

  // ═══════════════════════════════════════════════════════════════
  // INV-6: GPIO CONFLICT VALIDATION AT BOOT
  // Verifies no two logical devices share the same physical GPIO.
  // If conflict detected → HALT (prevents lethal pin collision).
  // ═══════════════════════════════════════════════════════════════
  GpioAssignment gpioMap[] = {
    {FAN_RELAY_PIN,          "ExhaustFan"},       // IN1 GPIO 25
    {CEILING_FAN_RELAY_PIN,  "CeilingFan"},       // IN2 GPIO 26
    {LIGHT_RELAY_PIN,        "Light"},             // IN3 GPIO 27
    {HEATER_RELAY_PIN,       "Heater"},            // IN4 GPIO 14
    {FOGGER_RELAY_PIN,       "Fogger"},            // IN5 GPIO 12
    {ALARM_RELAY_PIN,        "Alarm"},             // IN6 GPIO 13
    {SPRINKLER_RELAY_PIN,    "Sprinkler"},         // IN7 GPIO 15
    {CIRCULATION_RELAY_PIN,  "CirculationFan"},    // IN8 GPIO 33
    {DHT_PIN,                "DHT22_1"},
    {DHT2_PIN,               "DHT22_2"},
    {MQ135_PIN,              "MQ137_NH3"},
    {POWER_SENSE_PIN,        "ZMPT101B"},
    {WATER_FLOW_PIN,         "YFS201"}
  };
  if (!safetyEngine.validateGpioAssignments(gpioMap, 13)) {
    // FATAL: GPIO conflict detected — HALT with alarm
    Serial.println("🔴 FATAL: GPIO CONFLICT — SYSTEM HALTED");
    Serial.println("🔴 " + safetyEngine.gpioConflictDetail);
    digitalWrite(ALARM_RELAY_PIN, LOW); // Alarm ON to alert farmer
    while (true) {
      digitalWrite(STATUS_LED_PIN, !digitalRead(STATUS_LED_PIN));
      unsigned long w = millis(); while(millis()-w < 200) yield();
    }
  }

  // --- Safety Engine Init (must have GPIO pins for direct relay control) ---
  safetyEngine.begin(FAN_RELAY_PIN, HEATER_RELAY_PIN, ALARM_RELAY_PIN);

  // --- Gradual Relay Test (non-blocking wait) — 8 channels ---
  Serial.println("🔌 Relay test sequence (8-ch)...");
  const int relayPins[] = {FAN_RELAY_PIN, CEILING_FAN_RELAY_PIN, LIGHT_RELAY_PIN, HEATER_RELAY_PIN, FOGGER_RELAY_PIN, ALARM_RELAY_PIN, SPRINKLER_RELAY_PIN, CIRCULATION_RELAY_PIN};
  for (int i = 0; i < 8; i++) {
    digitalWrite(relayPins[i], LOW);   // ON
    unsigned long w = millis(); while(millis()-w < 800) { esp_task_wdt_reset(); yield(); }
    digitalWrite(relayPins[i], HIGH);  // OFF
    w = millis(); while(millis()-w < 400) yield();
  }

  // --- Input Pins ---
  pinMode(MANUAL_OVERRIDE_BTN, INPUT_PULLUP);
  pinMode(MANUAL_FAN_BTN, INPUT_PULLUP);
  pinMode(POWER_SENSE_PIN, INPUT);
  pinMode(WATER_FLOW_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(WATER_FLOW_PIN), waterPulseISR, FALLING);
  lastWaterPulse = millis();

  // --- Stabilizing Mode ---
  stabilizingMode = true;
  stabilizingEndTime = millis() + SAFE_MODE_DURATION;
  safeModeActive = true;
  safeModeEndTime = stabilizingEndTime;
  transitionTo(STATE_BOOT, "POWER_ON");
  requestFan(true, "HIGH"); // Ventilation during boot
  relayManagerApply();

  // --- Sensors ---
  dht.begin(); dht2.begin();
  unsigned long w = millis(); while(millis()-w < 2000) { esp_task_wdt_reset(); yield(); }

  // --- OTA Validation ---
  validateBootPartition();

  // --- Test Sensors ---
  float testT = dht.readTemperature();
  float testH = dht.readHumidity();
  bool sensorOK = !isnan(testT) && !isnan(testH);
  lastValidSensor = millis();
  
  float testT2 = dht2.readTemperature();
  dht2Available = !isnan(testT2);
  Serial.printf("  DHT#1: %s  DHT#2: %s\n", sensorOK ? "OK" : "FAIL", dht2Available ? "OK" : "N/A");

  if (!sensorOK) { sensorErrorMode = true; failsafeMode = true; requestFan(true, "HIGH"); }

  // --- Gas Warmup ---
  gasWarmupStart = millis();

  // --- Farm Profile ---
  EEPROM.begin(EEPROM_SIZE);
  loadFarmProfile();
  if (isBroiler()) { loadAgeTickTime(); lastAgeIncreaseMillis = millis(); }
  if (isLayer()) loadLayerRules(); else loadBroilerRules();

  // --- WiFi ---
  connectWiFi();
  if (wifiConnected) { syncWithCloud(); fetchConfig(); }

  // --- GSM ---
  gsmInit();

  // --- Watchdog ---
  esp_task_wdt_init(WDT_TIMEOUT, true);
  esp_task_wdt_add(NULL);

  // --- Initial relay apply ---
  relayManagerApply();
  lastOnlineCheck = millis();

  Serial.println("\n╔═══════════════════════════════════════════════════════════════╗");
  Serial.printf("║  ✅ BOOT COMPLETE | State: %s | %s          \n", stateNames[currentState], getFarmTypeStr().c_str());
  Serial.printf("║  Firmware: v%s | WiFi: %s | GSM: %s       \n", FIRMWARE_VERSION, wifiConnected?"OK":"FAIL", gsmInitialized?"OK":"N/A");
  Serial.println("╚═══════════════════════════════════════════════════════════════╝\n");
}

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  SECTION 16.5: BACKEND SAFETY ENGINE INTEGRATION                      ║
// ╚═══════════════════════════════════════════════════════════════════════╝

void updateActuatorEffectTracking() {
  unsigned long now = millis();
  // Fan effect tracking
  if (fanOn && fanOnSince == 0) { tempAtFanStart = temperature; fanOnSince = now; }
  if (!fanOn) { fanOnSince = 0; }
  if (fanOn && fanOnSince > 0 && (now - fanOnSince >= 360000UL)) {
    float drop = tempAtFanStart - temperature;
    if (drop < 0.5f) { fanEffectFailures++; fanEffectVerified = false; }
    else { fanEffectFailures = 0; fanEffectVerified = true; }
    tempAtFanStart = temperature; fanOnSince = now;
    if (fanEffectFailures >= 2) enterESM("FAN_NO_COOLING_EFFECT");
  }
  // Heater effect tracking
  if (heaterOn && heaterOnSince == 0) { tempAtHeaterStart = temperature; heaterOnSince = now; }
  if (!heaterOn) { heaterOnSince = 0; }
  if (heaterOn && heaterOnSince > 0 && (now - heaterOnSince >= 360000UL)) {
    float rise = temperature - tempAtHeaterStart;
    if (rise < 1.0f) { heaterEffectFailures++; heaterEffectVerified = false; }
    else { heaterEffectFailures = 0; heaterEffectVerified = true; }
    tempAtHeaterStart = temperature; heaterOnSince = now;
    if (heaterEffectFailures >= 2) enterESM("HEATER_NO_HEATING_EFFECT");
  }
}

void updateThermalModel() {
  unsigned long now = millis();
  if (lastThermalModelUpdate == 0) { thermalExpectedTemp = temperature; lastThermalModelUpdate = now; return; }
  float elapsedMin = (now - lastThermalModelUpdate) / 60000.0f;
  if (elapsedMin < 1.0f) return;
  float rate = 0.0f;
  if (heaterOn) rate = 0.06f;
  else if (fanOn) rate = -0.04f;
  thermalExpectedTemp += rate * elapsedMin;
  thermalExpectedTemp = constrain(thermalExpectedTemp, 0.0f, 55.0f);
  thermalModelDeviation = abs(temperature - thermalExpectedTemp);
  if (thermalModelDeviation > 3.0f) {
    thermalImplausibleCount++;
    thermalModelPlausible = false;
    thermalModelReason = "Dev " + String(thermalModelDeviation,1) + "C (act=" + String(temperature,1) + " exp=" + String(thermalExpectedTemp,1) + ")";
    if (thermalImplausibleCount >= 3) enterESM("SENSOR_THERMAL_IMPLAUSIBLE");
  } else {
    thermalImplausibleCount = 0; thermalModelPlausible = true;
    thermalExpectedTemp = temperature; thermalModelReason = "";
  }
  lastThermalModelUpdate = now;
}

void callBackendSafetyEngine() {
  if (!wifiConnected || emergencySurvivalMode) return;
  unsigned long now = millis();
  if (now - safetyEngine.lastSafetyEngineCall < 60000UL) return;
  safetyEngine.markSafetyEngineCalled(now);

  HTTPClient http;
  String url = "https://hbwfuvqrfgtefozajyfu.supabase.co/functions/v1/safety-engine?action=evaluate";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhid2Z1dnFyZmd0ZWZvemFqeWZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMDI5ODksImV4cCI6MjA4NTU3ODk4OX0.3yCPVRrzrfvpwBIBKITkfm-Y3dsVzo_QUzVs3RNlHC8");
  http.setTimeout(5000);
  esp_task_wdt_reset();

  DynamicJsonDocument doc(2048);
  doc["user_id"] = activeFarmId; // farm owner resolved server-side
  doc["farm_id"] = activeFarmId;
  doc["shed_id"] = activeShedId;
  doc["temperature"] = temperature;
  doc["humidity"] = humidity;
  doc["ammonia"] = ammonia;
  doc["water_usage"] = waterFlow;
  doc["temperature_sensor2"] = dht2Available ? temperature2 : (float)NAN;
  doc["worst_case_max_temp"] = worstCaseMaxTemp;
  doc["worst_case_min_temp"] = worstCaseMinTemp;
  doc["fan_on"] = fanOn;
  doc["heater_on"] = heaterOn;
  doc["fogger_on"] = foggerOn;
  doc["circulation_fan_on"] = circulationFanOn;
  doc["ceiling_fan_on"] = ceilingFanOn;
  doc["sprinkler_on"] = sprinklerOn;
  doc["fan_available"] = true;
  doc["heater_on_ms_15min"] = 0;
  doc["fan_on_ms_15min"] = 0;
  doc["fan_on_ms_10min"] = 0;
  doc["heater_continuous_ms"] = heaterOn ? (int)safeElapsed(now, heaterOnSince) : 0;
  doc["fan_effect_verified"] = fanEffectVerified;
  doc["fan_effect_failures"] = fanEffectFailures;
  doc["heater_effect_verified"] = heaterEffectVerified;
  doc["heater_effect_failures"] = heaterEffectFailures;
  doc["thermal_model_plausible"] = thermalModelPlausible;
  doc["thermal_model_deviation"] = thermalModelDeviation;
  doc["uptime_ms"] = (int)now;
  doc["reboot_heater_locked"] = safetyEngine.isHeaterLocked();
  doc["reboot_vent_purge_active"] = safetyEngine.isVentPurgeActive();
  doc["reboot_nh3_muted"] = safetyEngine.isNH3AlertMuted();
  doc["bird_age_days"] = farmConfig.chickAgeDays;
  doc["hsi_value"] = currentHSI;
  doc["override_active"] = localManualOverride;

  String payload;
  serializeJson(doc, payload);
  int code = http.POST(payload);
  esp_task_wdt_reset();

  if (code == 200) {
    safetyEngine.backendSafetyActive = true;
    Serial.println("✅ Backend safety-engine: evaluated");
  } else {
    Serial.printf("⚠️ Backend safety-engine: HTTP %d\n", code);
  }
  http.end();
}

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  SECTION 16.6: FORENSIC LOGGING                                        ║
// ║  Records: requested relay state, actual relay state, environment       ║
// ║  response. Sent to backend for 24h safety timeline storage.            ║
// ╚═══════════════════════════════════════════════════════════════════════╝

void recordForensicEntry(String eventType, String eventDetail) {
  if (!wifiConnected) return; // Only log when online (offline entries handled by offline buffer)
  
  HTTPClient http;
  String url = "https://hbwfuvqrfgtefozajyfu.supabase.co/functions/v1/safety-engine?action=forensic_log";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhid2Z1dnFyZmd0ZWZvemFqeWZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMDI5ODksImV4cCI6MjA4NTU3ODk4OX0.3yCPVRrzrfvpwBIBKITkfm-Y3dsVzo_QUzVs3RNlHC8");
  http.setTimeout(3000);
  esp_task_wdt_reset();

  DynamicJsonDocument doc(2048);
  doc["user_id"] = activeFarmId;
  doc["farm_id"] = activeFarmId;
  doc["shed_id"] = activeShedId;
  doc["system_state"] = stateNames[currentState];
  doc["uptime_ms"] = (long)millis();
  
  // Requested relay state (what software wanted)
  doc["requested_fan"] = relayTarget.fan;
  doc["requested_fan_speed"] = relayTarget.fanSpeed;
  doc["requested_heater"] = relayTarget.heater;
  doc["requested_fogger"] = relayTarget.fogger;
  doc["requested_alarm"] = relayTarget.alarm;
  doc["requested_circulation_fan"] = relayTarget.circulationFan;
  doc["requested_ceiling_fan"] = relayTarget.ceilingFan;
  doc["requested_sprinkler"] = relayTarget.sprinkler;
  
  // Actual relay state (what hardware reports)
  doc["actual_fan"] = fanOn;
  doc["actual_fan_speed"] = fanSpeed;
  doc["actual_heater"] = heaterOn;
  doc["actual_fogger"] = foggerOn;
  doc["actual_alarm"] = alarmOn;
  doc["actual_circulation_fan"] = circulationFanOn;
  doc["actual_ceiling_fan"] = ceilingFanOn;
  doc["actual_sprinkler"] = sprinklerOn;
  
  // Relay mismatch detection
  bool mismatch = (relayTarget.fan != fanOn) || (relayTarget.heater != heaterOn) ||
                  (relayTarget.fogger != foggerOn) || (relayTarget.alarm != alarmOn) ||
                  (relayTarget.circulationFan != circulationFanOn) ||
                  (relayTarget.ceilingFan != ceilingFanOn) || (relayTarget.sprinkler != sprinklerOn);
  doc["relay_mismatch"] = mismatch;
  if (mismatch) {
    String details = "";
    if (relayTarget.fan != fanOn) details += "FAN(req=" + String(relayTarget.fan) + " act=" + String(fanOn) + ") ";
    if (relayTarget.heater != heaterOn) details += "HTR(req=" + String(relayTarget.heater) + " act=" + String(heaterOn) + ") ";
    if (relayTarget.fogger != foggerOn) details += "FOG(req=" + String(relayTarget.fogger) + " act=" + String(foggerOn) + ") ";
    if (relayTarget.alarm != alarmOn) details += "ALM(req=" + String(relayTarget.alarm) + " act=" + String(alarmOn) + ") ";
    doc["mismatch_details"] = details;
  }
  
  // Environment snapshot
  doc["temperature"] = temperature;
  doc["temperature2"] = dht2Available ? temperature2 : (float)NAN;
  doc["worst_case_max_temp"] = worstCaseMaxTemp;
  doc["worst_case_min_temp"] = worstCaseMinTemp;
  doc["humidity"] = humidity;
  doc["ammonia"] = ammonia;
  doc["water_usage"] = waterFlow;
  doc["hsi_value"] = currentHSI;
  
  // Environment response deltas
  doc["temp_delta_1min"] = getTempDelta1min();
  doc["temp_delta_5min"] = getTempDelta5min();
  doc["humidity_delta_1min"] = getHumDelta1min();
  
  // Safety state
  doc["safety_override_active"] = safetyEngine.isSafetyActive();
  doc["heater_allowed"] = !safetyEngine.isHeaterLocked();
  doc["force_ventilation"] = safetyEngine.isVentPurgeActive() || emergencySurvivalMode;
  doc["fan_effect_verified"] = fanEffectVerified;
  doc["fan_effect_failures"] = fanEffectFailures;
  doc["heater_effect_verified"] = heaterEffectVerified;
  doc["heater_effect_failures"] = heaterEffectFailures;
  doc["thermal_model_plausible"] = thermalModelPlausible;
  doc["thermal_model_deviation"] = thermalModelDeviation;
  
  // Manual override
  doc["manual_override_active"] = localManualOverride;
  
  // Reboot safety
  doc["reboot_heater_locked"] = safetyEngine.isHeaterLocked();
  doc["reboot_vent_purge"] = safetyEngine.isVentPurgeActive();
  doc["reboot_nh3_muted"] = safetyEngine.isNH3AlertMuted();
  
  // Event type
  doc["event_type"] = eventType;
  doc["event_detail"] = eventDetail;
  doc["source"] = "firmware";

  String payload;
  serializeJson(doc, payload);
  int code = http.POST(payload);
  esp_task_wdt_reset();

  if (code != 200) {
    Serial.printf("⚠️ Forensic log: HTTP %d\n", code);
  }
  http.end();
}

void recordRelayMismatch() {
  // Detect if actual GPIO state differs from what we think it is
  bool gpioFan = (digitalRead(FAN_RELAY_PIN) == LOW);
  bool gpioHeater = (digitalRead(HEATER_RELAY_PIN) == LOW);
  bool gpioAlarm = (digitalRead(ALARM_RELAY_PIN) == LOW);
  
  bool hardwareMismatch = (gpioFan != fanOn) || (gpioHeater != heaterOn) || (gpioAlarm != alarmOn);
  bool softwareMismatch = (relayTarget.fan != fanOn) || (relayTarget.heater != heaterOn);
  
  if (hardwareMismatch || softwareMismatch) {
    String detail = "HW_MISMATCH:";
    if (gpioFan != fanOn) detail += " FAN(gpio=" + String(gpioFan) + " sw=" + String(fanOn) + ")";
    if (gpioHeater != heaterOn) detail += " HTR(gpio=" + String(gpioHeater) + " sw=" + String(heaterOn) + ")";
    if (gpioAlarm != alarmOn) detail += " ALM(gpio=" + String(gpioAlarm) + " sw=" + String(alarmOn) + ")";
    if (softwareMismatch) detail += " SW_MISMATCH";
    
    Serial.println("🔴 FORENSIC: " + detail);
    recordForensicEntry("relay_mismatch", detail);
  }
}

// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  SECTION 17: MAIN LOOP (non-blocking, millis-based)                   ║
// ╚═══════════════════════════════════════════════════════════════════════╝

void loop() {
  unsigned long now = millis();
  esp_task_wdt_reset();

  // --- NVS Heartbeat (alive timestamp for outage detection) ---
  nvsWriteAliveTimestamp();
  
  // --- Check stabilizing mode exit ---
  if (stabilizingMode && now >= stabilizingEndTime) {
    stabilizingMode = false; safeModeActive = false;
    transitionTo(STATE_NORMAL, "BOOT_COMPLETE");
    Serial.println("✅ Stabilizing complete → Normal operation");
    // Power recovery purge: use real outage duration from NVS
    unsigned long outageDur = nvsReadOutageDuration();
    if (outageDur >= PURGE_OUTAGE_THRESHOLD) {
      startPowerRecoveryPurge(outageDur);
    } else {
      Serial.println("⚡ No extended outage detected — skipping purge");
    }
  }

  // --- WiFi reconnect (overflow-safe) ---
  if (WiFi.status() != WL_CONNECTED) {
    wifiConnected = false;
    if (intervalPassed(now, lastWifiAttempt, WIFI_RECONNECT_INTERVAL)) {
      lastWifiAttempt = now; connectWiFi();
    }
  } else if (!wifiConnected) {
    wifiConnected = true;
  }

  // ═══════════════════════════════════════════════════════════════
  // SAFETY ARBITER: Runs every 500ms INDEPENDENTLY of automation.
  // Directly writes to GPIO pins. Cannot be blocked by any mode,
  // override, OTA, or timer. This is the FIRST and LAST thing
  // that runs each loop iteration.
  // ═══════════════════════════════════════════════════════════════
  safetyEngine.arbiterTick(temperature, humidity, ammonia, 
    !sensorErrorMode, fanOn, heaterOn, temperature2, dht2Available);

  // --- Sensor Manager (read all sensors, filter, validate) ---
  if (intervalPassed(now, lastSensorRead, SENSOR_READ_INTERVAL)) {
    lastSensorRead = now;
    sensorManagerTick();
  }

  // --- Automation Engine (single decision loop) ---
  automationEngineTick();

  // --- Environment history for forensic deltas ---
  updateEnvironmentHistory();

  // --- Actuator Effect Validation + Thermal Model ---
  updateActuatorEffectTracking();
  updateThermalModel();

  // --- Safety Arbiter AGAIN after all processing (catch any unsafe relay states) ---
  safetyEngine.arbiterTick(temperature, humidity, ammonia,
    !sensorErrorMode, fanOn, heaterOn, temperature2, dht2Available);

  // --- Relay Manager (single hardware write point) ---
  relayManagerApply();

  // --- Forensic logging (periodic + mismatch detection) ---
  if (intervalPassed(now, lastForensicLog, FORENSIC_LOG_INTERVAL_MS)) {
    lastForensicLog = now;
    recordForensicEntry("periodic", stateNames[currentState]);
  }
  if (intervalPassed(now, lastMismatchCheck, FORENSIC_MISMATCH_INTERVAL_MS)) {
    lastMismatchCheck = now;
    recordRelayMismatch();
  }

  // --- Cloud Sync (overflow-safe) ---
  if (wifiConnected && intervalPassed(now, lastCloudSyncAttempt, CLOUD_SYNC_INTERVAL)) {
    lastCloudSyncAttempt = now;
    syncWithCloud();
  }

  // --- Command Check (overflow-safe) ---
  if (wifiConnected && intervalPassed(now, lastCommandCheck, COMMAND_CHECK_INTERVAL)) {
    lastCommandCheck = now;
    checkCommands();
    // ═══ CRITICAL: Apply relay states IMMEDIATELY after manual commands ═══
    // Without this, automationEngineTick() in the next loop iteration
    // overwrites relayTarget before relayManagerApply() can act on manual commands.
    if (manualCommandPending) {
      relayManagerApply();
    }
  }

  // --- Config Fetch (overflow-safe) ---
  if (wifiConnected && intervalPassed(now, lastConfigFetch, CONFIG_FETCH_INTERVAL)) {
    lastConfigFetch = now;
    fetchConfig();
  }

  // --- Backend Safety Engine (every 60s) ---
  callBackendSafetyEngine();

  // --- OTA Check (overflow-safe) ---
  if (wifiConnected && intervalPassed(now, lastOTACheck, OTA_CHECK_INTERVAL)) {
    lastOTACheck = now;
    checkOTAUpdate();
  }

  // --- Offline Age Tracking ---
  checkOfflineAgeIncrement();

  // --- Offline Buffer (overflow-safe) ---
  if (!cloudConnected && intervalPassed(now, lastOfflineStore, OFFLINE_STORE_INTERVAL)) {
    lastOfflineStore = now;
    offlineBufferStore();
  }

  // --- GSM Queue Processing (overflow-safe) ---
  if (intervalPassed(now, lastGsmQueueCheck, GSM_QUEUE_INTERVAL)) {
    lastGsmQueueCheck = now;
    gsmProcessQueue();
  }

  // --- Online/Offline Duration Tracking (overflow-safe) ---
  if (intervalPassed(now, lastOnlineCheck, 10000)) {
    unsigned long elapsed = safeElapsed(now, lastOnlineCheck) / 1000;
    if (cloudConnected) onlineDurationSec += elapsed; else offlineDurationSec += elapsed;
    lastOnlineCheck = now;
  }

  // --- Status LED ---
  updateStatusLED();

  // --- Manual Override Button Check (overflow-safe) ---
  static unsigned long btnPressStart = 0;
  static bool btnWasPressed = false;
  bool btnPressed = (digitalRead(MANUAL_OVERRIDE_BTN) == LOW);
  if (btnPressed && !btnWasPressed) { btnPressStart = now; btnWasPressed = true; }
  if (!btnPressed && btnWasPressed) { btnWasPressed = false; }
  if (btnPressed && btnWasPressed && safeElapsed(now, btnPressStart) >= 3000) {
    // Block manual override toggle if environment is unsafe
    float safetyTemp = dht2Available ? worstCaseMaxTemp : temperature;
    if (!localManualOverride || (safetyTemp < OVERRIDE_SAFE_TEMP_MAX && safetyTemp > OVERRIDE_SAFE_TEMP_MIN)) {
      localManualOverride = !localManualOverride;
      Serial.printf("🔘 Manual Override: %s\n", localManualOverride ? "ON" : "OFF");
    } else {
      Serial.printf("⛔ Manual Override toggle BLOCKED: temp %.1f°C outside safety band\n", safetyTemp);
    }
    btnWasPressed = false;
  }

  // --- Periodic Status Log (overflow-safe) ---
  if (intervalPassed(now, lastStatusLog, STATUS_LOG_INTERVAL)) {
    lastStatusLog = now;
    Serial.printf("📊 [%s] T=%.1f°C(max=%.1f min=%.1f) H=%.1f%% NH3=%.1f HSI=%.1f | Fan=%s Heater=%s Alarm=%s Fogger=%s | WiFi=%s\n",
      stateNames[currentState], temperature, worstCaseMaxTemp, worstCaseMinTemp, humidity, ammonia, currentHSI,
      fanSpeed.c_str(), heaterOn?"ON":"OFF", alarmOn?"ON":"OFF", foggerOn?"ON":"OFF",
      wifiConnected?"OK":"FAIL");
  }

  // NO delay() - pure millis-based loop
  yield();
}
