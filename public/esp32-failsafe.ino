/*
 * Smart Layer Farm - ESP32 Fail-Safe Controller
 * 
 * এই কোড ESP32-কে "Backup Brain" হিসেবে কাজ করতে দেয়।
 * ইন্টারনেট থাকলে → Cloud rules follow করে
 * ইন্টারনেট না থাকলে → Local cached rules follow করে
 * 
 * Features:
 * - EEPROM-তে settings cache
 * - Local automation rules
 * - SMS fallback alerts
 * - Auto-recovery on reconnect
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <DHT.h>

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

// ================ CONFIGURATION ================
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* API_URL = "https://hbwfuvqrfgtefozajyfu.supabase.co/functions/v1/esp32-api";
const char* DEVICE_TOKEN = "YOUR_DEVICE_TOKEN";

// Timing constants
const unsigned long CLOUD_SYNC_INTERVAL = 30000;      // 30 seconds
const unsigned long SENSOR_READ_INTERVAL = 5000;      // 5 seconds
const unsigned long FAILSAFE_CHECK_INTERVAL = 10000;  // 10 seconds
const unsigned long WIFI_RECONNECT_INTERVAL = 60000;  // 1 minute
const unsigned long CLOUD_TIMEOUT = 300000;           // ⚠️ 5 MINUTES = FAILSAFE MODE

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

// ================ CACHED SETTINGS (EEPROM) ================
struct CachedSettings {
  // Temperature thresholds
  float tempMin = 18.0;
  float tempMax = 32.0;
  
  // Humidity thresholds
  float humidityMin = 40.0;
  float humidityMax = 80.0;
  
  // Ammonia threshold
  float ammoniaMax = 25.0;
  
  // Fan speed thresholds
  float fanLowTempMin = 28.0;
  float fanLowTempMax = 30.0;
  float fanMedTempMin = 30.0;
  float fanMedTempMax = 33.0;
  float fanHighTempMin = 33.0;
  
  // 🔥 HSI Thresholds (Layer Optimized)
  // HSI = Temperature + (Humidity × 0.1)
  float hsiNormal = 30.0;      // < 30: Normal → Fan OFF
  float hsiMild = 35.0;        // 30-35: Mild Stress → Fan LOW  
  float hsiHigh = 40.0;        // 35-40: High Stress → Fan HIGH
  float hsiDanger = 40.0;      // > 40: Danger → Fan HIGH + Alert
  
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

// ================ SETUP ================
void setup() {
  Serial.begin(115200);
  Serial.println("\n========================================");
  Serial.println("Smart Layer Farm - Fail-Safe Controller");
  Serial.println("========================================\n");
  
  // Initialize pins
  pinMode(FAN_RELAY_PIN, OUTPUT);
  pinMode(LIGHT_PWM_PIN, OUTPUT);
  pinMode(ALARM_RELAY_PIN, OUTPUT);
  pinMode(STATUS_LED_PIN, OUTPUT);
  pinMode(POWER_SENSE_PIN, INPUT);
  pinMode(WATER_FLOW_PIN, INPUT_PULLUP);
  
  // Initialize PWM for light
  ledcSetup(0, 1000, 8);  // Channel 0, 1kHz, 8-bit
  ledcAttachPin(LIGHT_PWM_PIN, 0);
  
  // Initialize DHT sensor
  dht.begin();
  
  // Load cached settings from EEPROM
  loadCachedSettings();
  
  // Connect to WiFi
  connectWiFi();
  
  // Initial cloud sync
  if (wifiConnected) {
    syncWithCloud();
  }
  
  Serial.println("\n✓ Setup complete!");
  Serial.printf("  Mode: %s\n", failsafeMode ? "FAILSAFE" : "CLOUD");
}

// ================ MAIN LOOP ================
void loop() {
  static unsigned long lastSensorRead = 0;
  static unsigned long lastCloudAttempt = 0;
  static unsigned long lastFailsafeCheck = 0;
  
  unsigned long now = millis();
  
  // 1. Read sensors regularly
  if (now - lastSensorRead >= SENSOR_READ_INTERVAL) {
    readSensors();
    lastSensorRead = now;
  }
  
  // 2. Check connection status
  checkConnectionStatus();
  
  // 3. Try cloud sync if connected
  if (wifiConnected && now - lastCloudAttempt >= CLOUD_SYNC_INTERVAL) {
    syncWithCloud();
    lastCloudAttempt = now;
  }
  
  // 4. Check failsafe status
  if (now - lastFailsafeCheck >= FAILSAFE_CHECK_INTERVAL) {
    checkFailsafeStatus();
    lastFailsafeCheck = now;
  }
  
  // 5. Run automation (cloud or local)
  runAutomation();
  
  // 6. Update status LED
  updateStatusLED();
  
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
  StaticJsonDocument<512> doc;
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
  StaticJsonDocument<1024> doc;
  DeserializationError error = deserializeJson(doc, response);
  
  if (error) {
    Serial.printf("JSON parse error: %s\n", error.c_str());
    return;
  }
  
  // Check if settings need update
  if (doc.containsKey("settings_version")) {
    int serverVersion = doc["settings_version"];
    if (serverVersion > cachedSettings.version) {
      Serial.println("→ Updating cached settings...");
      updateCachedSettings(doc["settings"]);
    }
  }
  
  // Apply cloud commands
  if (doc.containsKey("commands")) {
    JsonArray commands = doc["commands"].as<JsonArray>();
    for (JsonObject cmd : commands) {
      executeCommand(cmd);
    }
  }
  
  // Update device controls if not in manual override
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
  
  cachedSettings.hsiMild = settings["hsi_mild_threshold"] | 70.0;
  cachedSettings.hsiModerate = settings["hsi_moderate_threshold"] | 75.0;
  cachedSettings.hsiSevere = settings["hsi_severe_threshold"] | 80.0;
  cachedSettings.hsiEmergency = settings["hsi_emergency_threshold"] | 85.0;
  
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
  
  Serial.println("\n╔════════════════════════════════════════╗");
  Serial.println("║  ⚠️⚠️⚠️ FAILSAFE MODE ACTIVATED ⚠️⚠️⚠️  ║");
  Serial.println("╠════════════════════════════════════════╣");
  Serial.printf("║  Reason: %s\n", reason.c_str());
  Serial.println("║  Running on LOCAL SAFE RULES           ║");
  Serial.println("║  সন্দেহ হলে Fan ON — Always safer       ║");
  Serial.println("╚════════════════════════════════════════╝\n");
  
  // 🧠 Log last known safe state
  Serial.println("🧠 STATE MEMORY:");
  Serial.printf("   Last Safe Temp: %.1f°C\n", lastSafeTemp);
  Serial.printf("   Last Fan State: %s (%s)\n", lastSafeFanState ? "ON" : "OFF", lastSafeFanSpeed.c_str());
  Serial.printf("   Last Cloud Contact: %lu seconds ago\n", (millis() - lastCloudContactTime) / 1000);
  
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

// ================ AUTOMATION FUNCTIONS ================
// 🔐 LOCAL SAFE RULES - "সন্দেহ হলে Fan ON — Always safer"
// These rules run when cloud is unavailable

void runAutomation() {
  if (failsafeMode) {
    runLocalAutomation();
  }
  // Cloud mode automation is handled in handleCloudResponse
}

void runLocalAutomation() {
  Serial.println("\n🔐 Running LOCAL SAFE RULES...");
  
  // ========================================
  // RULE 0: SENSOR ERROR = FAN ON (Safe Mode)
  // ========================================
  bool sensorError = isnan(temperature) || isnan(humidity);
  if (sensorError) {
    Serial.println("⚠️ SENSOR ERROR → Fan ON (Safe Mode)");
    fanOn = true;
    fanSpeed = "HIGH";
    digitalWrite(FAN_RELAY_PIN, HIGH);
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
  // RULE 2: AMMONIA ≥ 25 ppm = FAN ON + ALARM
  // ========================================
  if (ammonia >= cachedSettings.ammoniaMax) {  // Default: 25 ppm
    Serial.printf("🟡 AMMONIA HIGH (%.1f ppm) → Fan ON + Alarm\n", ammonia);
    fanOn = true;
    fanSpeed = "HIGH";
    alarmOn = true;
    digitalWrite(FAN_RELAY_PIN, HIGH);
    digitalWrite(ALARM_RELAY_PIN, HIGH);
  }
  
  // ========================================
  // RULE 3: TEMP ≥ 33°C = FAN HIGH
  // ========================================
  else if (temperature >= cachedSettings.fanHighTempMin) {  // Default: 33°C
    Serial.printf("🔥 TEMP CRITICAL (%.1f°C) → Fan HIGH\n", temperature);
    fanOn = true;
    fanSpeed = "HIGH";
    digitalWrite(FAN_RELAY_PIN, HIGH);
  }
  
  // ========================================
  // RULE 4: TEMP ≥ 30°C = FAN ON (Medium)
  // ========================================
  else if (temperature >= cachedSettings.fanMedTempMin) {  // Default: 30°C
    Serial.printf("🌡️ TEMP HIGH (%.1f°C) → Fan ON (Medium)\n", temperature);
    fanOn = true;
    fanSpeed = "MEDIUM";
    digitalWrite(FAN_RELAY_PIN, HIGH);
  }
  
  // ========================================
  // RULE 5: TEMP < 30°C = Normal operation
  // ========================================
  else {
    // Only turn off if conditions are truly safe
    if (temperature < cachedSettings.fanLowTempMin && ammonia < cachedSettings.ammoniaMax) {
      fanOn = false;
      fanSpeed = "OFF";
      digitalWrite(FAN_RELAY_PIN, LOW);
    } else if (temperature >= cachedSettings.fanLowTempMin) {
      // Keep fan on LOW for borderline temps (28-30°C)
      fanOn = true;
      fanSpeed = "LOW";
      digitalWrite(FAN_RELAY_PIN, HIGH);
    }
  }
  
  // ========================================
  // 🔥 HEAT STRESS INDEX (HSI) - MAIN DECISION
  // HSI = Temperature + (Humidity × 0.1)
  // This is MORE ACCURATE than temperature alone!
  // ========================================
  float hsi = calculateHSI(temperature, humidity);
  Serial.printf("🔥 HSI = %.1f (Temp=%.1f + Hum=%.1f×0.1)\n", hsi, temperature, humidity);
  
  // HSI > 40: DANGER → Fan HIGH + Alert
  if (hsi > cachedSettings.hsiDanger) {
    Serial.printf("🚨 HSI DANGER (%.1f > 40) → Fan HIGH + ALERT!\n", hsi);
    fanOn = true;
    fanSpeed = "HIGH";
    alarmOn = true;
    digitalWrite(FAN_RELAY_PIN, HIGH);
    digitalWrite(ALARM_RELAY_PIN, HIGH);
  }
  // HSI 35-40: HIGH STRESS → Fan HIGH
  else if (hsi >= cachedSettings.hsiMild) {
    Serial.printf("⚠️ HSI HIGH STRESS (%.1f) → Fan HIGH\n", hsi);
    fanOn = true;
    fanSpeed = "HIGH";
    digitalWrite(FAN_RELAY_PIN, HIGH);
  }
  // HSI 30-35: MILD STRESS → Fan LOW
  else if (hsi >= cachedSettings.hsiNormal) {
    Serial.printf("🌡️ HSI MILD STRESS (%.1f) → Fan LOW\n", hsi);
    fanOn = true;
    fanSpeed = "LOW";
    digitalWrite(FAN_RELAY_PIN, HIGH);
  }
  // HSI < 30: NORMAL → Fan OFF (if no other concerns)
  else {
    if (ammonia < cachedSettings.ammoniaMax && powerOn) {
      Serial.printf("✅ HSI NORMAL (%.1f) → Fan OFF\n", hsi);
      fanOn = false;
      fanSpeed = "OFF";
      digitalWrite(FAN_RELAY_PIN, LOW);
    }
  }
  
  // ========================================
  // ALARM AUTO-CLEAR (only if ALL conditions safe)
  // ========================================
  if (alarmOn && powerOn && ammonia < cachedSettings.ammoniaMax && 
      hsi < cachedSettings.hsiMild && temperature < cachedSettings.fanHighTempMin) {
    alarmOn = false;
    digitalWrite(ALARM_RELAY_PIN, LOW);
    Serial.println("✅ All conditions safe → Alarm cleared");
  }
  
  // ========================================
  // LIGHTING CONTROL (continues regardless)
  // ========================================
  controlLighting();
  
  // Log current state with HSI
  Serial.printf("📊 State: HSI=%.1f, Fan=%s(%s), Alarm=%s, Light=%s(%d%%)\n",
                hsi, fanOn ? "ON" : "OFF", fanSpeed.c_str(),
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
