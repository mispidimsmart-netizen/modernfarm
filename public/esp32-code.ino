/*
 * স্মার্ট লেয়ার ফার্ম - ESP32 IoT Controller
 * Smart Layer Farm - ESP32 IoT Controller
 * 
 * This code reads sensor data and sends it to the Smart Farm API
 * Now with PWM lighting control for smart curve brightness!
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
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ============= CONFIGURATION =============
// WiFi Settings
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// API Settings
const char* API_URL = "https://hbwfuvqrfgtefozajyfu.supabase.co/functions/v1/esp32-api/data";
const char* DEVICE_ID = "ESP32_LAYER_001";  // Match this with your device name in the app

// Sensor Pins
#define DHT_PIN 4
#define DHT_TYPE DHT22
#define MQ135_PIN 34
#define FLOW_SENSOR_PIN 27

// Output Control Pins
#define LIGHT_PWM_PIN 25      // PWM output for light dimmer (MOSFET gate)
#define FAN_RELAY_PIN 26      // Relay for fan control
#define ALARM_PIN 32          // Buzzer/Alarm

// PWM Configuration
#define PWM_FREQUENCY 5000    // 5kHz PWM frequency
#define PWM_CHANNEL 0         // LEDC channel 0
#define PWM_RESOLUTION 8      // 8-bit resolution (0-255)

// Update intervals (milliseconds)
#define SEND_INTERVAL 30000       // 30 seconds for sensor data
#define HEALTH_INTERVAL 60000     // 60 seconds for health report
#define LIGHTING_CHECK_INTERVAL 10000  // 10 seconds for lighting update

// ============= GLOBAL VARIABLES =============
DHT dht(DHT_PIN, DHT_TYPE);

volatile int flowPulseCount = 0;
float flowRate = 0.0;
unsigned long lastFlowTime = 0;

unsigned long lastSendTime = 0;
unsigned long lastHealthTime = 0;
unsigned long lastLightingCheck = 0;
unsigned long startupTime = 0;
bool wifiConnected = false;

// Current device states
int currentBrightness = 0;      // 0-100 percentage
int currentPwmValue = 0;        // 0-255 PWM value
String currentPhase = "off";    // off, fade-in, on, fade-out, manual
bool fanState = false;
bool alarmState = false;

// ============= SETUP =============
void setup() {
  Serial.begin(115200);
  Serial.println("\n=================================");
  Serial.println("স্মার্ট লেয়ার ফার্ম IoT Controller");
  Serial.println("Smart Layer Farm IoT Controller");
  Serial.println("with PWM Lighting Control v2.0");
  Serial.println("=================================\n");

  startupTime = millis();

  // Initialize sensors
  dht.begin();
  pinMode(MQ135_PIN, INPUT);
  pinMode(FLOW_SENSOR_PIN, INPUT_PULLUP);
  
  // Initialize output pins
  pinMode(FAN_RELAY_PIN, OUTPUT);
  pinMode(ALARM_PIN, OUTPUT);
  digitalWrite(FAN_RELAY_PIN, LOW);
  digitalWrite(ALARM_PIN, LOW);
  
  // Configure PWM for light control
  ledcSetup(PWM_CHANNEL, PWM_FREQUENCY, PWM_RESOLUTION);
  ledcAttachPin(LIGHT_PWM_PIN, PWM_CHANNEL);
  ledcWrite(PWM_CHANNEL, 0);  // Start with light off
  
  // Attach interrupt for flow sensor
  attachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_PIN), flowPulseCounter, FALLING);

  // Connect to WiFi
  connectWiFi();

  Serial.println("System ready! Sending data every 30 seconds...\n");
}

// ============= MAIN LOOP =============
void loop() {
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    wifiConnected = false;
    connectWiFi();
  }

  // Calculate flow rate every second
  unsigned long currentTime = millis();
  if (currentTime - lastFlowTime >= 1000) {
    // YF-S201: 7.5 pulses per liter per minute
    flowRate = (flowPulseCount / 7.5);  // Liters per minute
    flowPulseCount = 0;
    lastFlowTime = currentTime;
  }

  // Send sensor data every SEND_INTERVAL
  if (currentTime - lastSendTime >= SEND_INTERVAL) {
    sendSensorData();
    lastSendTime = currentTime;
  }

  // Send health report every HEALTH_INTERVAL
  if (currentTime - lastHealthTime >= HEALTH_INTERVAL) {
    sendDeviceHealth();
    lastHealthTime = currentTime;
  }

  // Check and update lighting every LIGHTING_CHECK_INTERVAL
  if (currentTime - lastLightingCheck >= LIGHTING_CHECK_INTERVAL) {
    fetchAndApplyLighting();
    lastLightingCheck = currentTime;
  }

  delay(100);
}

// ============= WIFI CONNECTION =============
void connectWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.println("\n✓ WiFi Connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n✗ WiFi Connection Failed!");
  }
}

// ============= READ SENSORS =============
float readTemperature() {
  float temp = dht.readTemperature();
  if (isnan(temp)) {
    Serial.println("DHT22 read error - using last value");
    return 25.0;  // Default fallback
  }
  return temp;
}

float readHumidity() {
  float humidity = dht.readHumidity();
  if (isnan(humidity)) {
    Serial.println("DHT22 read error - using last value");
    return 60.0;  // Default fallback
  }
  return humidity;
}

float readAmmonia() {
  // MQ135 analog reading (0-4095 for ESP32 12-bit ADC)
  int rawValue = analogRead(MQ135_PIN);
  
  // Convert to PPM (calibration needed for accurate readings)
  // This is a simplified conversion - adjust based on your sensor calibration
  float voltage = rawValue * (3.3 / 4095.0);
  float ppm = (voltage - 0.1) * 50;  // Rough approximation
  
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
    Serial.println("✗ No WiFi connection - skipping send");
    return;
  }

  // Read all sensors
  float temperature = readTemperature();
  float humidity = readHumidity();
  float ammonia = readAmmonia();
  float waterFlow = flowRate * 60;  // Convert to L/hr

  // Print readings
  Serial.println("----------------------------------------");
  Serial.println("📊 Sensor Readings:");
  Serial.printf("  🌡️  Temperature: %.1f°C\n", temperature);
  Serial.printf("  💧 Humidity: %.1f%%\n", humidity);
  Serial.printf("  ☁️  Ammonia: %.1f ppm\n", ammonia);
  Serial.printf("  🚰 Water Flow: %.1f L/hr\n", waterFlow);

  // Create JSON payload
  StaticJsonDocument<256> doc;
  doc["device_id"] = DEVICE_ID;
  doc["temperature"] = temperature;
  doc["humidity"] = humidity;
  doc["ammonia"] = ammonia;
  doc["water_flow"] = waterFlow;
  doc["power_status"] = "ON";

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  // Send HTTP POST request
  HTTPClient http;
  http.begin(API_URL);
  http.addHeader("Content-Type", "application/json");

  Serial.println("\n📤 Sending data to server...");
  
  int httpResponseCode = http.POST(jsonPayload);

  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.printf("✓ Response Code: %d\n", httpResponseCode);
    Serial.printf("✓ Response: %s\n", response.c_str());
    
    // Parse response to check for alerts
    StaticJsonDocument<256> responseDoc;
    DeserializationError error = deserializeJson(responseDoc, response);
    if (!error) {
      int alertsCreated = responseDoc["alerts_created"] | 0;
      if (alertsCreated > 0) {
        Serial.printf("⚠️  %d alert(s) created!\n", alertsCreated);
        // You could trigger a local buzzer/LED here
      }
    }
  } else {
    Serial.printf("✗ HTTP Error: %s\n", http.errorToString(httpResponseCode).c_str());
  }

  http.end();
  Serial.println("----------------------------------------\n");
}

// ============= SEND DEVICE HEALTH =============
void sendDeviceHealth() {
  if (!wifiConnected) {
    Serial.println("✗ No WiFi connection - skipping health report");
    return;
  }

  // Calculate uptime in seconds
  unsigned long uptimeSeconds = (millis() - startupTime) / 1000;
  
  // Get WiFi signal strength
  int rssi = WiFi.RSSI();
  
  // Get free heap memory
  uint32_t freeHeap = ESP.getFreeHeap();

  // Create JSON payload
  StaticJsonDocument<256> doc;
  doc["wifi_signal_strength"] = rssi;
  doc["uptime_seconds"] = uptimeSeconds;
  doc["free_memory_bytes"] = freeHeap;
  doc["power_source"] = "mains";
  doc["firmware_version"] = "1.0.0";

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  // Send HTTP POST request
  String healthUrl = String(API_URL).substring(0, String(API_URL).lastIndexOf('/')) + "/health";
  HTTPClient http;
  http.begin(healthUrl);
  http.addHeader("Content-Type", "application/json");

  Serial.println("📤 Sending device health...");
  
  int httpResponseCode = http.POST(jsonPayload);

  if (httpResponseCode > 0) {
    Serial.printf("✓ Health report sent (RSSI: %d dBm, Uptime: %lu s)\n", rssi, uptimeSeconds);
  } else {
    Serial.printf("✗ Health report failed: %s\n", http.errorToString(httpResponseCode).c_str());
  }

  http.end();
}

// ============= FETCH AND APPLY LIGHTING =============
void fetchAndApplyLighting() {
  if (!wifiConnected) {
    return;
  }

  String lightingUrl = String(API_URL).substring(0, String(API_URL).lastIndexOf('/')) + "/lighting-schedule?device_id=" + DEVICE_ID;
  HTTPClient http;
  http.begin(lightingUrl);
  http.addHeader("Content-Type", "application/json");

  int httpResponseCode = http.GET();

  if (httpResponseCode == 200) {
    String response = http.getString();
    
    StaticJsonDocument<512> doc;
    DeserializationError error = deserializeJson(doc, response);
    
    if (!error && doc["success"] == true) {
      JsonObject data = doc["data"];
      
      int newBrightness = data["current_brightness"] | 0;
      int newPwmValue = data["pwm_value"] | 0;
      String newPhase = data["current_phase"] | "off";
      
      // Only update if brightness changed
      if (newPwmValue != currentPwmValue) {
        currentBrightness = newBrightness;
        currentPwmValue = newPwmValue;
        currentPhase = newPhase;
        
        // Apply PWM value to light
        ledcWrite(PWM_CHANNEL, currentPwmValue);
        
        Serial.println("----------------------------------------");
        Serial.println("💡 Lighting Update:");
        Serial.printf("  Phase: %s\n", currentPhase.c_str());
        Serial.printf("  Brightness: %d%%\n", currentBrightness);
        Serial.printf("  PWM Value: %d/255\n", currentPwmValue);
        Serial.println("----------------------------------------");
      }
    }
  } else {
    Serial.printf("✗ Failed to fetch lighting: %d\n", httpResponseCode);
  }

  http.end();
}

// ============= SET LIGHT BRIGHTNESS =============
void setLightBrightness(int brightness) {
  // Constrain to 0-100
  brightness = constrain(brightness, 0, 100);
  
  // Convert percentage to PWM value (0-255)
  int pwmValue = map(brightness, 0, 100, 0, 255);
  
  currentBrightness = brightness;
  currentPwmValue = pwmValue;
  
  // Apply PWM
  ledcWrite(PWM_CHANNEL, pwmValue);
  
  Serial.printf("💡 Light set to %d%% (PWM: %d)\n", brightness, pwmValue);
}

// ============= CONTROL FAN =============
void setFan(bool state) {
  fanState = state;
  digitalWrite(FAN_RELAY_PIN, state ? HIGH : LOW);
  Serial.printf("🌀 Fan %s\n", state ? "ON" : "OFF");
}

// ============= CONTROL ALARM =============
void setAlarm(bool state) {
  alarmState = state;
  digitalWrite(ALARM_PIN, state ? HIGH : LOW);
  Serial.printf("🔔 Alarm %s\n", state ? "ON" : "OFF");
}

/*
 * ============= WIRING DIAGRAM =============
 * 
 * DHT22 Sensor:
 *   VCC  -> 3.3V
 *   GND  -> GND
 *   DATA -> GPIO 4 (with 10K pull-up resistor)
 * 
 * MQ135 Sensor:
 *   VCC  -> 5V (some modules need 5V for heater)
 *   GND  -> GND
 *   AO   -> GPIO 34 (Analog output)
 * 
 * YF-S201 Flow Sensor:
 *   Red  -> 5V
 *   Black -> GND
 *   Yellow -> GPIO 27 (Signal)
 * 
 * Light PWM Control (using MOSFET):
 *   GPIO 25 -> 1K resistor -> MOSFET Gate (e.g., IRLZ44N)
 *   MOSFET Drain -> LED Strip/Bulb negative
 *   MOSFET Source -> GND
 *   LED Strip positive -> 12V/24V Power Supply
 * 
 * Fan Relay:
 *   GPIO 26 -> Relay IN
 *   Relay COM -> Fan
 *   Relay NO -> Power Supply
 * 
 * Alarm/Buzzer:
 *   GPIO 32 -> Buzzer positive (through transistor for loud buzzers)
 *   Buzzer negative -> GND
 * 
 * ============= NOTES =============
 * 
 * 1. Before uploading, set your WiFi credentials above
 * 2. Create a device in the Smart Farm app Settings page
 * 3. Copy the Device ID and paste it in DEVICE_ID above
 * 4. The MQ135 sensor needs 24-48 hours warm-up for accurate readings
 * 5. Calibrate sensors based on your specific environment
 * 6. For PWM dimming, use a logic-level MOSFET (IRLZ44N recommended)
 * 
 * ============= API ENDPOINTS =============
 * 
 * POST /esp32-api/data - Send sensor readings
 * POST /esp32-api/device-status - Update device status
 * POST /esp32-api/health - Report device health (WiFi, memory, uptime)
 * GET  /esp32-api/settings - Fetch farm threshold settings
 * GET  /esp32-api/automation-rules - Get automation rules
 * GET  /esp32-api/lighting-schedule - Get light schedule with PWM values
 *      Response includes:
 *        - current_brightness (0-100%)
 *        - current_phase (off, fade-in, on, fade-out, manual)
 *        - pwm_value (0-255 for ESP32 PWM)
 * GET  /esp32-api/commands - Get pending commands
 * POST /esp32-api/commands-ack - Acknowledge executed commands
 * 
 * ============= SMART LIGHTING CURVE =============
 * 
 * The server calculates the current brightness based on:
 * - Start/End times from the app
 * - Fade-in/Fade-out duration (gradual transitions)
 * - Smooth easing for natural light changes
 * 
 * The ESP32 fetches pwm_value every 10 seconds and applies it directly.
 * This gives smooth gradual lighting transitions without complex local logic.
 * 
 */
