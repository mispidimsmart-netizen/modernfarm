/*
 * স্মার্ট লেয়ার ফার্ম - ESP32 IoT Controller
 * Smart Layer Farm - ESP32 IoT Controller
 * 
 * ★★★ FAIL-SAFE AUTOMATION v3.0 ★★★
 * - Runs LOCAL automation when internet is down
 * - Caches settings in EEPROM for persistence
 * - Uses last known safe values
 * 
 * Hardware:
 * - ESP32 DevKit
 * - DHT22 Temperature/Humidity Sensor (GPIO 4)
 * - MQ135 Ammonia Sensor (GPIO 34 - ADC)
 * - YF-S201 Water Flow Sensor (GPIO 27)
 * - MOSFET/LED Driver for Light (GPIO 25 - PWM)
 * - Relay for Fan (GPIO 26)
 * - Buzzer/Alarm (GPIO 32)
 * 
 * Libraries Required:
 * - WiFi.h (built-in)
 * - HTTPClient.h (built-in)
 * - ArduinoJson.h (install via Library Manager)
 * - DHT.h (install via Library Manager - "DHT sensor library")
 * - EEPROM.h (built-in)
 * - Preferences.h (built-in) - for NVS storage
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <EEPROM.h>
#include <Preferences.h>

// ============= CONFIGURATION =============
// WiFi Settings
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// API Settings
const char* API_URL = "https://hbwfuvqrfgtefozajyfu.supabase.co/functions/v1/esp32-api/data";
const char* DEVICE_ID = "ESP32_LAYER_001";
const char* DEVICE_TOKEN = "YOUR_DEVICE_TOKEN";  // Get from Dashboard > Device Management

// Sensor Pins
#define DHT_PIN 4
#define DHT_TYPE DHT22
#define MQ135_PIN 34
#define FLOW_SENSOR_PIN 27

// Output Control Pins
#define LIGHT_PWM_PIN 25
#define FAN_RELAY_PIN 26
#define ALARM_PIN 32

// Status LED (optional - use built-in LED)
#define STATUS_LED_PIN 2

// PWM Configuration
#define PWM_FREQUENCY 5000
#define PWM_CHANNEL 0
#define PWM_RESOLUTION 8

// Update intervals (milliseconds)
#define SEND_INTERVAL 30000
#define HEALTH_INTERVAL 60000
#define LIGHTING_CHECK_INTERVAL 10000
#define LOCAL_AUTOMATION_INTERVAL 5000    // Run local rules every 5 seconds
#define SETTINGS_SYNC_INTERVAL 300000     // Sync settings every 5 minutes
#define WIFI_RETRY_INTERVAL 30000         // Retry WiFi every 30 seconds

// Fail-safe timeout
#define OFFLINE_FAILSAFE_TIMEOUT 60000    // 1 minute without server = failsafe mode

// ============= FAIL-SAFE SETTINGS STRUCTURE =============
struct FailSafeSettings {
  uint32_t magic;                // Magic number to verify valid data
  // Temperature thresholds
  float temp_min;
  float temp_max;
  float temp_fan_low_start;
  float temp_fan_medium_start;
  float temp_fan_high_start;
  // Humidity thresholds
  float humidity_min;
  float humidity_max;
  // Ammonia threshold
  float ammonia_max;
  // HSI thresholds
  float hsi_mild;
  float hsi_moderate;
  float hsi_severe;
  float hsi_emergency;
  // Lighting schedule (minutes from midnight)
  uint16_t light_start_minutes;
  uint16_t light_end_minutes;
  uint8_t light_min_brightness;
  uint8_t light_max_brightness;
  uint16_t fade_in_minutes;
  uint16_t fade_out_minutes;
  // Last update timestamp
  uint32_t last_sync_epoch;
  // Checksum
  uint8_t checksum;
};

#define SETTINGS_MAGIC 0x534D4152  // "SMAR" in hex
#define EEPROM_SIZE 512

// ============= DEFAULT SAFE VALUES =============
// These are used when EEPROM is empty or corrupted
const FailSafeSettings DEFAULT_SETTINGS = {
  SETTINGS_MAGIC,
  18.0,   // temp_min
  32.0,   // temp_max
  28.0,   // fan_low_start
  30.0,   // fan_medium_start
  33.0,   // fan_high_start
  40.0,   // humidity_min
  80.0,   // humidity_max
  25.0,   // ammonia_max
  70.0,   // hsi_mild
  75.0,   // hsi_moderate
  80.0,   // hsi_severe
  85.0,   // hsi_emergency
  300,    // light_start (5:00 AM = 5*60)
  1260,   // light_end (9:00 PM = 21*60)
  0,      // light_min_brightness
  100,    // light_max_brightness
  30,     // fade_in_minutes
  30,     // fade_out_minutes
  0,      // last_sync_epoch
  0       // checksum (calculated later)
};

// ============= GLOBAL VARIABLES =============
DHT dht(DHT_PIN, DHT_TYPE);
Preferences preferences;
FailSafeSettings cachedSettings;

volatile int flowPulseCount = 0;
float flowRate = 0.0;
unsigned long lastFlowTime = 0;

unsigned long lastSendTime = 0;
unsigned long lastHealthTime = 0;
unsigned long lastLightingCheck = 0;
unsigned long lastLocalAutomation = 0;
unsigned long lastSettingsSync = 0;
unsigned long lastWifiRetry = 0;
unsigned long lastServerContact = 0;
unsigned long startupTime = 0;

bool wifiConnected = false;
bool isOfflineMode = false;
bool failsafeActive = false;
int wifiFailCount = 0;

// Current device states
int currentBrightness = 0;
int currentPwmValue = 0;
String currentPhase = "off";
bool fanState = false;
bool alarmState = false;
String fanSpeed = "OFF";  // OFF, LOW, MEDIUM, HIGH

// Last sensor readings (for offline use)
float lastTemperature = 25.0;
float lastHumidity = 60.0;
float lastAmmonia = 10.0;
float lastWaterFlow = 0.0;

// Power monitoring
bool powerOn = true;
bool lastPowerState = true;
unsigned long powerOutageStartTime = 0;
unsigned long lastPowerStatusSend = 0;
#define POWER_STATUS_INTERVAL 15000  // Send power status every 15 seconds when on battery
#define POWER_DETECT_PIN 35          // GPIO for power detection (connect to voltage divider from mains)

// ============= SETUP =============
void setup() {
  Serial.begin(115200);
  Serial.println("\n==========================================");
  Serial.println("স্মার্ট লেয়ার ফার্ম IoT Controller");
  Serial.println("★★★ FAIL-SAFE AUTOMATION v3.0 ★★★");
  Serial.println("==========================================\n");

  startupTime = millis();

  // Initialize status LED
  pinMode(STATUS_LED_PIN, OUTPUT);
  blinkStatusLED(3, 100);  // Boot indication

  // Initialize EEPROM
  EEPROM.begin(EEPROM_SIZE);
  loadSettingsFromEEPROM();

  // Initialize sensors
  dht.begin();
  pinMode(MQ135_PIN, INPUT);
  pinMode(FLOW_SENSOR_PIN, INPUT_PULLUP);
  pinMode(POWER_DETECT_PIN, INPUT);  // Power detection pin
  
  // Initialize output pins
  pinMode(FAN_RELAY_PIN, OUTPUT);
  pinMode(ALARM_PIN, OUTPUT);
  digitalWrite(FAN_RELAY_PIN, LOW);
  digitalWrite(ALARM_PIN, LOW);
  
  // Configure PWM for light control
  ledcSetup(PWM_CHANNEL, PWM_FREQUENCY, PWM_RESOLUTION);
  ledcAttachPin(LIGHT_PWM_PIN, PWM_CHANNEL);
  ledcWrite(PWM_CHANNEL, 0);
  
  // Attach interrupt for flow sensor
  attachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_PIN), flowPulseCounter, FALLING);

  // Try to connect to WiFi
  connectWiFi();

  Serial.println("\n✓ System ready!");
  Serial.println("  - Online Mode: Cloud automation + local backup");
  Serial.println("  - Offline Mode: Local automation with cached settings");
  Serial.println("==========================================\n");
}

// ============= MAIN LOOP =============
void loop() {
  unsigned long currentTime = millis();

  // Check WiFi and manage connection
  manageWiFiConnection(currentTime);

  // Determine if we're in failsafe mode
  updateFailsafeStatus(currentTime);

  // Calculate flow rate every second
  if (currentTime - lastFlowTime >= 1000) {
    flowRate = (flowPulseCount / 7.5);
    flowPulseCount = 0;
    lastFlowTime = currentTime;
  }

  // === ALWAYS RUN: Local Automation (Fail-Safe) ===
  if (currentTime - lastLocalAutomation >= LOCAL_AUTOMATION_INTERVAL) {
    runLocalAutomation();
    lastLocalAutomation = currentTime;
  }

  // === ONLINE MODE: Send data to server ===
  if (wifiConnected && !isOfflineMode) {
    // Send sensor data
    if (currentTime - lastSendTime >= SEND_INTERVAL) {
      sendSensorData();
      lastSendTime = currentTime;
    }

    // Send health report
    if (currentTime - lastHealthTime >= HEALTH_INTERVAL) {
      sendDeviceHealth();
      lastHealthTime = currentTime;
    }

    // Fetch lighting from server
    if (currentTime - lastLightingCheck >= LIGHTING_CHECK_INTERVAL) {
      fetchAndApplyLighting();
      lastLightingCheck = currentTime;
    }

    // Sync settings periodically
    if (currentTime - lastSettingsSync >= SETTINGS_SYNC_INTERVAL) {
      syncSettingsFromServer();
      lastSettingsSync = currentTime;
    }
  }

  // === POWER MONITORING ===
  monitorPowerStatus(currentTime);

  // Update status LED
  updateStatusLED();

  delay(100);
}

// ============= WIFI MANAGEMENT =============
void manageWiFiConnection(unsigned long currentTime) {
  if (WiFi.status() != WL_CONNECTED) {
    if (wifiConnected) {
      // Just disconnected
      wifiConnected = false;
      wifiFailCount++;
      Serial.println("⚠️  WiFi disconnected! Switching to offline mode...");
    }

    // Retry WiFi periodically
    if (currentTime - lastWifiRetry >= WIFI_RETRY_INTERVAL) {
      connectWiFi();
      lastWifiRetry = currentTime;
    }
  } else {
    if (!wifiConnected) {
      // Just reconnected
      wifiConnected = true;
      wifiFailCount = 0;
      Serial.println("✓ WiFi reconnected! Syncing with server...");
      syncSettingsFromServer();
    }
  }
}

void connectWiFi() {
  Serial.printf("📡 Connecting to WiFi: %s", WIFI_SSID);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.println("\n✓ WiFi Connected!");
    Serial.printf("  IP: %s, RSSI: %d dBm\n", WiFi.localIP().toString().c_str(), WiFi.RSSI());
  } else {
    Serial.println("\n✗ WiFi Failed - Running in OFFLINE MODE");
  }
}

// ============= FAILSAFE STATUS =============
void updateFailsafeStatus(unsigned long currentTime) {
  bool wasFailsafe = failsafeActive;

  if (!wifiConnected) {
    isOfflineMode = true;
    failsafeActive = true;
  } else if (currentTime - lastServerContact > OFFLINE_FAILSAFE_TIMEOUT) {
    // WiFi connected but no server response
    isOfflineMode = true;
    failsafeActive = true;
  } else {
    isOfflineMode = false;
    failsafeActive = false;
  }

  // Log status change
  if (failsafeActive && !wasFailsafe) {
    Serial.println("\n🔴 FAILSAFE MODE ACTIVATED");
    Serial.println("   Using cached settings for local automation");
    printCachedSettings();
  } else if (!failsafeActive && wasFailsafe) {
    Serial.println("\n🟢 ONLINE MODE RESTORED");
    Serial.println("   Syncing with server...");
  }
}

// ============= POWER MONITORING =============
void monitorPowerStatus(unsigned long currentTime) {
  // Read power detection pin (HIGH = mains power, LOW = battery/no power)
  // Use voltage divider: Mains 5V -> Divider -> 3.3V logic
  int powerReading = analogRead(POWER_DETECT_PIN);
  powerOn = powerReading > 2000;  // Threshold for ~2.5V (adjust based on your circuit)

  // Detect power state change
  if (powerOn != lastPowerState) {
    if (!powerOn) {
      // Power just went OFF
      powerOutageStartTime = currentTime;
      Serial.println("\n⚡ POWER FAILURE DETECTED!");
      Serial.println("   Switching to battery backup...");
      
      // Send immediate notification to server
      sendPowerStatus(false);
      
      // Sound brief alarm
      digitalWrite(ALARM_PIN, HIGH);
      delay(500);
      digitalWrite(ALARM_PIN, LOW);
      
    } else {
      // Power just came ON
      unsigned long outageDuration = (currentTime - powerOutageStartTime) / 1000;
      Serial.printf("\n✓ POWER RESTORED after %lu seconds\n", outageDuration);
      
      // Send power restored notification
      sendPowerStatus(true);
    }
    lastPowerState = powerOn;
  }

  // Periodically report power status when on battery
  if (!powerOn && wifiConnected) {
    if (currentTime - lastPowerStatusSend >= POWER_STATUS_INTERVAL) {
      sendPowerStatus(false);
      lastPowerStatusSend = currentTime;
    }
  }
}

void sendPowerStatus(bool isPowerOn) {
  if (!wifiConnected) {
    Serial.println("⚠️  Cannot send power status - WiFi disconnected");
    return;
  }

  HTTPClient http;
  String apiUrl = String(API_URL);
  apiUrl.replace("/data", "/power-status");
  
  http.begin(apiUrl);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-token", DEVICE_TOKEN);
  
  StaticJsonDocument<256> doc;
  doc["device_id"] = DEVICE_ID;
  doc["power_on"] = isPowerOn;
  doc["power_source"] = isPowerOn ? "mains" : "battery";
  
  // If we have battery monitoring, include battery level
  // doc["battery_level"] = getBatteryLevel();  // Implement if you have battery monitoring
  
  String payload;
  serializeJson(doc, payload);
  
  Serial.printf("📤 Sending power status: %s\n", isPowerOn ? "ON" : "OFF");
  
  int httpCode = http.POST(payload);
  
  if (httpCode == HTTP_CODE_OK) {
    Serial.println("   ✓ Power status sent successfully");
    lastServerContact = millis();
  } else {
    Serial.printf("   ✗ Power status send failed: %d\n", httpCode);
  }
  
  http.end();
}

// ============= LOCAL AUTOMATION (FAIL-SAFE) =============
void runLocalAutomation() {
  // Read current sensor values
  float temperature = readTemperature();
  float humidity = readHumidity();
  float ammonia = readAmmonia();

  // Store last readings
  lastTemperature = temperature;
  lastHumidity = humidity;
  lastAmmonia = ammonia;
  lastWaterFlow = flowRate * 60;

  // Calculate Heat Stress Index
  float hsi = calculateHSI(temperature, humidity);

  if (failsafeActive) {
    Serial.println("----------------------------------------");
    Serial.println("🔴 FAILSAFE LOCAL AUTOMATION");
    Serial.printf("   Temp: %.1f°C, Humidity: %.1f%%, NH3: %.1f ppm\n", temperature, humidity, ammonia);
    Serial.printf("   HSI: %.1f\n", hsi);
  }

  // === FAN CONTROL ===
  String newFanSpeed = "OFF";
  
  // HSI-based emergency override
  if (hsi >= cachedSettings.hsi_emergency) {
    newFanSpeed = "HIGH";
    if (!alarmState) {
      setAlarm(true);
      Serial.println("🚨 EMERGENCY: HSI critical! Alarm ON");
    }
  } else if (hsi >= cachedSettings.hsi_severe) {
    newFanSpeed = "HIGH";
    setAlarm(false);
  } else if (hsi >= cachedSettings.hsi_moderate) {
    newFanSpeed = "MEDIUM";
    setAlarm(false);
  } else if (hsi >= cachedSettings.hsi_mild) {
    newFanSpeed = "LOW";
    setAlarm(false);
  } else {
    // Temperature-based fan control
    if (temperature >= cachedSettings.temp_fan_high_start) {
      newFanSpeed = "HIGH";
    } else if (temperature >= cachedSettings.temp_fan_medium_start) {
      newFanSpeed = "MEDIUM";
    } else if (temperature >= cachedSettings.temp_fan_low_start) {
      newFanSpeed = "LOW";
    } else {
      newFanSpeed = "OFF";
    }
    setAlarm(false);
  }

  // Ammonia override - high ammonia needs ventilation
  if (ammonia >= cachedSettings.ammonia_max) {
    if (newFanSpeed == "OFF" || newFanSpeed == "LOW") {
      newFanSpeed = "MEDIUM";
    }
    Serial.printf("⚠️  High ammonia (%.1f ppm) - Fan boosted\n", ammonia);
  }

  // Apply fan speed
  if (newFanSpeed != fanSpeed) {
    setFanSpeed(newFanSpeed);
  }

  // === LIGHTING CONTROL (Local calculation) ===
  if (failsafeActive) {
    int localBrightness = calculateLocalBrightness();
    if (localBrightness != currentBrightness) {
      setLightBrightness(localBrightness);
    }
  }

  if (failsafeActive) {
    Serial.printf("   Fan: %s, Light: %d%%, Alarm: %s\n", 
                  fanSpeed.c_str(), currentBrightness, alarmState ? "ON" : "OFF");
    Serial.println("----------------------------------------");
  }
}

// ============= CALCULATE HEAT STRESS INDEX =============
float calculateHSI(float temp, float humidity) {
  // Simplified HSI calculation for poultry
  // HSI = Temperature + (0.3 * Humidity)
  return temp + (0.3 * humidity);
}

// ============= CALCULATE LOCAL BRIGHTNESS =============
int calculateLocalBrightness() {
  // Get current time in minutes from midnight
  // Note: In real implementation, use NTP or RTC for accurate time
  unsigned long uptimeMinutes = (millis() - startupTime) / 60000;
  
  // For demo, use a simple simulation (in real use, get time from RTC/NTP)
  // Assume we track approximate time based on last sync
  uint16_t currentMinutes = (uptimeMinutes + cachedSettings.light_start_minutes) % 1440;

  uint16_t startMinutes = cachedSettings.light_start_minutes;
  uint16_t endMinutes = cachedSettings.light_end_minutes;
  uint16_t fadeIn = cachedSettings.fade_in_minutes;
  uint16_t fadeOut = cachedSettings.fade_out_minutes;
  uint8_t minBright = cachedSettings.light_min_brightness;
  uint8_t maxBright = cachedSettings.light_max_brightness;

  // Before start time
  if (currentMinutes < startMinutes) {
    return minBright;
  }

  // During fade-in
  if (currentMinutes < startMinutes + fadeIn) {
    float progress = (float)(currentMinutes - startMinutes) / fadeIn;
    return minBright + (maxBright - minBright) * progress;
  }

  // Full brightness period
  if (currentMinutes < endMinutes - fadeOut) {
    return maxBright;
  }

  // During fade-out
  if (currentMinutes < endMinutes) {
    float progress = (float)(endMinutes - currentMinutes) / fadeOut;
    return minBright + (maxBright - minBright) * progress;
  }

  // After end time
  return minBright;
}

// ============= EEPROM FUNCTIONS =============
uint8_t calculateChecksum(FailSafeSettings& settings) {
  uint8_t* ptr = (uint8_t*)&settings;
  uint8_t sum = 0;
  for (size_t i = 0; i < sizeof(FailSafeSettings) - 1; i++) {
    sum ^= ptr[i];
  }
  return sum;
}

void loadSettingsFromEEPROM() {
  Serial.println("📦 Loading settings from EEPROM...");

  EEPROM.get(0, cachedSettings);

  // Verify magic number and checksum
  if (cachedSettings.magic != SETTINGS_MAGIC) {
    Serial.println("⚠️  EEPROM empty or corrupted - using defaults");
    cachedSettings = DEFAULT_SETTINGS;
    cachedSettings.checksum = calculateChecksum(cachedSettings);
    saveSettingsToEEPROM();
    return;
  }

  uint8_t storedChecksum = cachedSettings.checksum;
  cachedSettings.checksum = 0;
  uint8_t calculatedChecksum = calculateChecksum(cachedSettings);
  cachedSettings.checksum = storedChecksum;

  if (storedChecksum != calculatedChecksum) {
    Serial.println("⚠️  EEPROM checksum mismatch - using defaults");
    cachedSettings = DEFAULT_SETTINGS;
    cachedSettings.checksum = calculateChecksum(cachedSettings);
    saveSettingsToEEPROM();
    return;
  }

  Serial.println("✓ Settings loaded successfully!");
  printCachedSettings();
}

void saveSettingsToEEPROM() {
  Serial.println("💾 Saving settings to EEPROM...");

  cachedSettings.magic = SETTINGS_MAGIC;
  cachedSettings.checksum = 0;
  cachedSettings.checksum = calculateChecksum(cachedSettings);

  EEPROM.put(0, cachedSettings);
  EEPROM.commit();

  Serial.println("✓ Settings saved!");
}

void printCachedSettings() {
  Serial.println("  ┌─ Cached Settings ─────────────────┐");
  Serial.printf("  │ Temp: %.0f-%.0f°C                    │\n", cachedSettings.temp_min, cachedSettings.temp_max);
  Serial.printf("  │ Fan Low: %.0f°C, Med: %.0f°C, Hi: %.0f°C │\n", 
                cachedSettings.temp_fan_low_start, cachedSettings.temp_fan_medium_start, cachedSettings.temp_fan_high_start);
  Serial.printf("  │ Humidity: %.0f-%.0f%%                 │\n", cachedSettings.humidity_min, cachedSettings.humidity_max);
  Serial.printf("  │ Ammonia Max: %.0f ppm              │\n", cachedSettings.ammonia_max);
  Serial.printf("  │ HSI: %.0f/%.0f/%.0f/%.0f              │\n", 
                cachedSettings.hsi_mild, cachedSettings.hsi_moderate, cachedSettings.hsi_severe, cachedSettings.hsi_emergency);
  Serial.printf("  │ Light: %02d:%02d - %02d:%02d            │\n", 
                cachedSettings.light_start_minutes / 60, cachedSettings.light_start_minutes % 60,
                cachedSettings.light_end_minutes / 60, cachedSettings.light_end_minutes % 60);
  Serial.println("  └────────────────────────────────────┘");
}

// ============= SYNC SETTINGS FROM SERVER =============
void syncSettingsFromServer() {
  if (!wifiConnected) return;

  String settingsUrl = String(API_URL).substring(0, String(API_URL).lastIndexOf('/')) + "/settings?device_id=" + DEVICE_ID;
  HTTPClient http;
  http.begin(settingsUrl);
  http.addHeader("Content-Type", "application/json");

  Serial.println("☁️  Syncing settings from server...");

  int httpResponseCode = http.GET();

  if (httpResponseCode == 200) {
    String response = http.getString();
    lastServerContact = millis();

    StaticJsonDocument<1024> doc;
    DeserializationError error = deserializeJson(doc, response);

    if (!error && doc["success"] == true) {
      JsonObject data = doc["data"];

      // Update cached settings
      cachedSettings.temp_min = data["temperature_min"] | cachedSettings.temp_min;
      cachedSettings.temp_max = data["temperature_max"] | cachedSettings.temp_max;
      cachedSettings.temp_fan_low_start = data["fan_low_temp_min"] | cachedSettings.temp_fan_low_start;
      cachedSettings.temp_fan_medium_start = data["fan_medium_temp_min"] | cachedSettings.temp_fan_medium_start;
      cachedSettings.temp_fan_high_start = data["fan_high_temp_min"] | cachedSettings.temp_fan_high_start;
      cachedSettings.humidity_min = data["humidity_min"] | cachedSettings.humidity_min;
      cachedSettings.humidity_max = data["humidity_max"] | cachedSettings.humidity_max;
      cachedSettings.ammonia_max = data["ammonia_max"] | cachedSettings.ammonia_max;
      cachedSettings.hsi_mild = data["hsi_mild_threshold"] | cachedSettings.hsi_mild;
      cachedSettings.hsi_moderate = data["hsi_moderate_threshold"] | cachedSettings.hsi_moderate;
      cachedSettings.hsi_severe = data["hsi_severe_threshold"] | cachedSettings.hsi_severe;
      cachedSettings.hsi_emergency = data["hsi_emergency_threshold"] | cachedSettings.hsi_emergency;
      cachedSettings.last_sync_epoch = millis() / 1000;

      // Save to EEPROM
      saveSettingsToEEPROM();

      Serial.println("✓ Settings synced and saved!");
    }
  } else {
    Serial.printf("✗ Settings sync failed: %d\n", httpResponseCode);
  }

  http.end();

  // Also sync lighting schedule
  syncLightingSchedule();
}

void syncLightingSchedule() {
  if (!wifiConnected) return;

  String lightingUrl = String(API_URL).substring(0, String(API_URL).lastIndexOf('/')) + "/lighting-schedule?device_id=" + DEVICE_ID;
  HTTPClient http;
  http.begin(lightingUrl);

  int httpResponseCode = http.GET();

  if (httpResponseCode == 200) {
    String response = http.getString();
    lastServerContact = millis();

    StaticJsonDocument<512> doc;
    DeserializationError error = deserializeJson(doc, response);

    if (!error && doc["success"] == true) {
      JsonObject data = doc["data"];

      // Parse time strings to minutes
      String startTime = data["start_time"] | "05:00";
      String endTime = data["end_time"] | "21:00";

      int startHour = startTime.substring(0, 2).toInt();
      int startMin = startTime.substring(3, 5).toInt();
      int endHour = endTime.substring(0, 2).toInt();
      int endMin = endTime.substring(3, 5).toInt();

      cachedSettings.light_start_minutes = startHour * 60 + startMin;
      cachedSettings.light_end_minutes = endHour * 60 + endMin;
      cachedSettings.fade_in_minutes = data["fade_in_minutes"] | 30;
      cachedSettings.fade_out_minutes = data["fade_out_minutes"] | 30;
      cachedSettings.light_min_brightness = data["min_brightness"] | 0;
      cachedSettings.light_max_brightness = data["max_brightness"] | 100;

      saveSettingsToEEPROM();
      Serial.println("✓ Lighting schedule synced!");
    }
  }

  http.end();
}

// ============= STATUS LED =============
void updateStatusLED() {
  static unsigned long lastBlink = 0;
  static bool ledState = false;

  unsigned long interval;
  if (failsafeActive) {
    interval = 250;  // Fast blink = failsafe
  } else if (wifiConnected) {
    interval = 2000;  // Slow blink = online
  } else {
    interval = 500;   // Medium blink = connecting
  }

  if (millis() - lastBlink >= interval) {
    ledState = !ledState;
    digitalWrite(STATUS_LED_PIN, ledState);
    lastBlink = millis();
  }
}

void blinkStatusLED(int times, int duration) {
  for (int i = 0; i < times; i++) {
    digitalWrite(STATUS_LED_PIN, HIGH);
    delay(duration);
    digitalWrite(STATUS_LED_PIN, LOW);
    delay(duration);
  }
}

// ============= READ SENSORS =============
float readTemperature() {
  float temp = dht.readTemperature();
  if (isnan(temp)) {
    return lastTemperature;  // Use last known value
  }
  return temp;
}

float readHumidity() {
  float humidity = dht.readHumidity();
  if (isnan(humidity)) {
    return lastHumidity;  // Use last known value
  }
  return humidity;
}

float readAmmonia() {
  int rawValue = analogRead(MQ135_PIN);
  float voltage = rawValue * (3.3 / 4095.0);
  float ppm = (voltage - 0.1) * 50;
  
  if (ppm < 0) ppm = 0;
  if (ppm > 100) ppm = 100;
  
  return ppm;
}

// ============= FLOW SENSOR INTERRUPT =============
void IRAM_ATTR flowPulseCounter() {
  flowPulseCount++;
}

// ============= SEND DATA TO API =============
void sendSensorData() {
  if (!wifiConnected) {
    Serial.println("✗ No WiFi - data cached locally");
    return;
  }

  StaticJsonDocument<256> doc;
  doc["device_id"] = DEVICE_ID;
  doc["temperature"] = lastTemperature;
  doc["humidity"] = lastHumidity;
  doc["ammonia"] = lastAmmonia;
  doc["water_flow"] = lastWaterFlow;
  doc["power_status"] = "ON";
  doc["failsafe_active"] = failsafeActive;

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  HTTPClient http;
  http.begin(API_URL);
  http.addHeader("Content-Type", "application/json");

  Serial.println("📤 Sending sensor data...");
  
  int httpResponseCode = http.POST(jsonPayload);

  if (httpResponseCode > 0) {
    lastServerContact = millis();
    Serial.printf("✓ Data sent (Code: %d)\n", httpResponseCode);
  } else {
    Serial.printf("✗ Send failed: %s\n", http.errorToString(httpResponseCode).c_str());
  }

  http.end();
}

// ============= SEND DEVICE HEALTH =============
void sendDeviceHealth() {
  if (!wifiConnected) return;

  unsigned long uptimeSeconds = (millis() - startupTime) / 1000;
  
  StaticJsonDocument<512> doc;
  doc["wifi_signal_strength"] = WiFi.RSSI();
  doc["uptime_seconds"] = uptimeSeconds;
  doc["free_memory_bytes"] = ESP.getFreeHeap();
  doc["power_source"] = "mains";
  doc["firmware_version"] = "3.0.0-failsafe";
  doc["failsafe_mode"] = failsafeActive;
  doc["wifi_fail_count"] = wifiFailCount;
  doc["last_sync_epoch"] = cachedSettings.last_sync_epoch;

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  String healthUrl = String(API_URL).substring(0, String(API_URL).lastIndexOf('/')) + "/health";
  HTTPClient http;
  http.begin(healthUrl);
  http.addHeader("Content-Type", "application/json");

  int httpResponseCode = http.POST(jsonPayload);

  if (httpResponseCode > 0) {
    lastServerContact = millis();
    Serial.printf("✓ Health report sent (Failsafe: %s)\n", failsafeActive ? "YES" : "NO");
  }

  http.end();
}

// ============= FETCH AND APPLY LIGHTING =============
void fetchAndApplyLighting() {
  if (!wifiConnected) return;

  String lightingUrl = String(API_URL).substring(0, String(API_URL).lastIndexOf('/')) + "/lighting-schedule?device_id=" + DEVICE_ID;
  HTTPClient http;
  http.begin(lightingUrl);

  int httpResponseCode = http.GET();

  if (httpResponseCode == 200) {
    String response = http.getString();
    lastServerContact = millis();
    
    StaticJsonDocument<512> doc;
    DeserializationError error = deserializeJson(doc, response);
    
    if (!error && doc["success"] == true) {
      JsonObject data = doc["data"];
      
      int newPwmValue = data["pwm_value"] | 0;
      
      if (newPwmValue != currentPwmValue) {
        currentBrightness = data["current_brightness"] | 0;
        currentPwmValue = newPwmValue;
        currentPhase = data["current_phase"] | "off";
        
        ledcWrite(PWM_CHANNEL, currentPwmValue);
        
        Serial.printf("💡 Light: %d%% (PWM: %d, Phase: %s)\n", 
                      currentBrightness, currentPwmValue, currentPhase.c_str());
      }
    }
  }

  http.end();
}

// ============= CONTROL FUNCTIONS =============
void setLightBrightness(int brightness) {
  brightness = constrain(brightness, 0, 100);
  int pwmValue = map(brightness, 0, 100, 0, 255);
  
  currentBrightness = brightness;
  currentPwmValue = pwmValue;
  
  ledcWrite(PWM_CHANNEL, pwmValue);
  Serial.printf("💡 Light: %d%% (PWM: %d)\n", brightness, pwmValue);
}

void setFanSpeed(String speed) {
  fanSpeed = speed;
  
  if (speed == "OFF") {
    setFan(false);
  } else {
    setFan(true);
    // In a real implementation, you'd control multiple relays or a variable speed controller
  }
  
  Serial.printf("🌀 Fan Speed: %s\n", speed.c_str());
}

void setFan(bool state) {
  fanState = state;
  digitalWrite(FAN_RELAY_PIN, state ? HIGH : LOW);
}

void setAlarm(bool state) {
  alarmState = state;
  digitalWrite(ALARM_PIN, state ? HIGH : LOW);
  if (state) {
    Serial.println("🔔 ALARM ACTIVATED!");
  }
}

/*
 * ==========================================
 * FAIL-SAFE AUTOMATION BEHAVIOR
 * ==========================================
 * 
 * ONLINE MODE (WiFi + Server Connected):
 * - Sends sensor data to server every 30 seconds
 * - Receives automation commands from server
 * - Local automation runs as backup
 * - Settings synced every 5 minutes
 * 
 * OFFLINE MODE (No WiFi or Server):
 * - Uses cached settings from EEPROM
 * - Runs local automation every 5 seconds
 * - HSI-based fan control
 * - Temperature-based fan speed tiers
 * - Ammonia-triggered ventilation boost
 * - Time-based lighting (using cached schedule)
 * - Emergency alarm for critical conditions
 * 
 * SAFETY PRIORITIES:
 * 1. HSI Emergency (>85) → All fans HIGH + Alarm
 * 2. HSI Severe (>80) → All fans HIGH
 * 3. HSI Moderate (>75) → Fans MEDIUM
 * 4. HSI Mild (>70) → Fans LOW
 * 5. High Ammonia (>25 ppm) → Boost ventilation
 * 6. Temperature thresholds → Graduated fan control
 * 
 * STATUS LED:
 * - Slow blink (2s) = Online, all good
 * - Medium blink (0.5s) = Connecting
 * - Fast blink (0.25s) = FAILSAFE MODE ACTIVE
 * 
 * ==========================================
 */
