/*
 * স্মার্ট লেয়ার ফার্ম - ESP32 IoT Controller
 * Smart Layer Farm - ESP32 IoT Controller
 * 
 * This code reads sensor data and sends it to the Smart Farm API
 * 
 * Hardware:
 * - ESP32 DevKit
 * - DHT22 Temperature/Humidity Sensor (GPIO 4)
 * - MQ135 Ammonia Sensor (GPIO 34 - ADC)
 * - YF-S201 Water Flow Sensor (GPIO 27)
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

// Update interval (milliseconds)
#define SEND_INTERVAL 30000  // 30 seconds

// ============= GLOBAL VARIABLES =============
DHT dht(DHT_PIN, DHT_TYPE);

volatile int flowPulseCount = 0;
float flowRate = 0.0;
unsigned long lastFlowTime = 0;

unsigned long lastSendTime = 0;
bool wifiConnected = false;

// ============= SETUP =============
void setup() {
  Serial.begin(115200);
  Serial.println("\n=================================");
  Serial.println("স্মার্ট লেয়ার ফার্ম IoT Controller");
  Serial.println("Smart Layer Farm IoT Controller");
  Serial.println("=================================\n");

  // Initialize sensors
  dht.begin();
  pinMode(MQ135_PIN, INPUT);
  pinMode(FLOW_SENSOR_PIN, INPUT_PULLUP);
  
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
 * ============= NOTES =============
 * 
 * 1. Before uploading, set your WiFi credentials above
 * 2. Create a device in the Smart Farm app Settings page
 * 3. Copy the Device ID and paste it in DEVICE_ID above
 * 4. The MQ135 sensor needs 24-48 hours warm-up for accurate readings
 * 5. Calibrate sensors based on your specific environment
 * 
 * ============= API ENDPOINTS =============
 * 
 * POST /esp32-api/data - Send sensor readings
 * POST /esp32-api/device-status - Update device status
 * GET  /esp32-api/settings - Fetch farm threshold settings
 * GET  /esp32-api/automation-rules - Get automation rules
 * GET  /esp32-api/lighting-schedule - Get light schedule
 * 
 */
