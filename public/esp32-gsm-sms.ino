/*
 * ESP32 + SIM800L GSM SMS Alert System
 * =====================================
 * 
 * এই কোড ইন্টারনেট না থাকলেও SMS এলার্ট পাঠাতে পারে
 * 
 * Hardware Connections:
 * ---------------------
 * SIM800L VCC  -> 3.7V-4.2V (Use separate power supply, NOT 3.3V from ESP32)
 * SIM800L GND  -> GND (Common ground with ESP32)
 * SIM800L TXD  -> GPIO 16 (ESP32 RX)
 * SIM800L RXD  -> GPIO 17 (ESP32 TX) 
 * SIM800L RST  -> GPIO 5 (Optional, for hardware reset)
 * 
 * IMPORTANT: SIM800L needs 2A peak current, use proper power supply!
 */

#include <HardwareSerial.h>
#include <WiFi.h>
#include <Preferences.h>

// GSM Serial Configuration
#define GSM_TX 17
#define GSM_RX 16
#define GSM_RST 5
#define GSM_BAUD 9600

HardwareSerial gsmSerial(2);  // Use UART2

// Phone numbers storage (max 5 numbers)
#define MAX_PHONE_NUMBERS 5
String phoneNumbers[MAX_PHONE_NUMBERS];
int phoneNumberCount = 0;

// Alert settings
bool smsEnabled = true;
bool tempAlerts = true;
bool humidityAlerts = true;
bool ammoniaAlerts = true;
bool powerAlerts = true;
bool waterAlerts = true;

// Cooldown management
unsigned long lastSmsSentTime = 0;
unsigned long smsCooldownMs = 30 * 60 * 1000; // 30 minutes default

// Preferences for persistent storage
Preferences preferences;

// GSM State
bool gsmInitialized = false;
bool gsmNetworkReady = false;

void setup() {
  Serial.begin(115200);
  
  // Initialize GSM
  initGSM();
  
  // Load settings from preferences
  loadSmsSettings();
}

void initGSM() {
  Serial.println("Initializing GSM Module (SIM800L)...");
  
  // Reset pin setup
  pinMode(GSM_RST, OUTPUT);
  digitalWrite(GSM_RST, HIGH);
  
  // Hardware reset
  digitalWrite(GSM_RST, LOW);
  delay(100);
  digitalWrite(GSM_RST, HIGH);
  delay(3000);  // Wait for module to boot
  
  // Initialize serial
  gsmSerial.begin(GSM_BAUD, SERIAL_8N1, GSM_RX, GSM_TX);
  delay(1000);
  
  // Test AT command
  if (sendATCommand("AT", "OK", 2000)) {
    Serial.println("GSM Module responding");
    
    // Disable echo
    sendATCommand("ATE0", "OK", 1000);
    
    // Set SMS text mode
    if (sendATCommand("AT+CMGF=1", "OK", 1000)) {
      Serial.println("SMS text mode enabled");
    }
    
    // Check network registration
    if (sendATCommand("AT+CREG?", "+CREG: 0,1", 5000) || 
        sendATCommand("AT+CREG?", "+CREG: 0,5", 5000)) {
      Serial.println("GSM Network registered");
      gsmNetworkReady = true;
    } else {
      Serial.println("GSM Network not ready, will retry...");
    }
    
    gsmInitialized = true;
  } else {
    Serial.println("GSM Module not responding!");
    gsmInitialized = false;
  }
}

bool sendATCommand(String command, String expectedResponse, unsigned long timeout) {
  gsmSerial.println(command);
  
  unsigned long startTime = millis();
  String response = "";
  
  while (millis() - startTime < timeout) {
    while (gsmSerial.available()) {
      char c = gsmSerial.read();
      response += c;
    }
    
    if (response.indexOf(expectedResponse) != -1) {
      return true;
    }
    delay(10);
  }
  
  Serial.println("AT Command failed: " + command);
  Serial.println("Response: " + response);
  return false;
}

void loadSmsSettings() {
  preferences.begin("sms_settings", true);  // Read-only
  
  smsEnabled = preferences.getBool("enabled", true);
  tempAlerts = preferences.getBool("temp_alerts", true);
  humidityAlerts = preferences.getBool("hum_alerts", true);
  ammoniaAlerts = preferences.getBool("amm_alerts", true);
  powerAlerts = preferences.getBool("pow_alerts", true);
  waterAlerts = preferences.getBool("wat_alerts", true);
  smsCooldownMs = preferences.getULong("cooldown", 30 * 60 * 1000);
  
  // Load phone numbers
  phoneNumberCount = preferences.getInt("phone_count", 0);
  for (int i = 0; i < phoneNumberCount && i < MAX_PHONE_NUMBERS; i++) {
    String key = "phone_" + String(i);
    phoneNumbers[i] = preferences.getString(key.c_str(), "");
  }
  
  preferences.end();
  
  Serial.println("SMS Settings loaded:");
  Serial.println("  Enabled: " + String(smsEnabled));
  Serial.println("  Phone numbers: " + String(phoneNumberCount));
}

void saveSmsSettings() {
  preferences.begin("sms_settings", false);  // Read-write
  
  preferences.putBool("enabled", smsEnabled);
  preferences.putBool("temp_alerts", tempAlerts);
  preferences.putBool("hum_alerts", humidityAlerts);
  preferences.putBool("amm_alerts", ammoniaAlerts);
  preferences.putBool("pow_alerts", powerAlerts);
  preferences.putBool("wat_alerts", waterAlerts);
  preferences.putULong("cooldown", smsCooldownMs);
  preferences.putInt("phone_count", phoneNumberCount);
  
  for (int i = 0; i < phoneNumberCount; i++) {
    String key = "phone_" + String(i);
    preferences.putString(key.c_str(), phoneNumbers[i]);
  }
  
  preferences.end();
}

// Call this to update settings from server when online
void updateSmsSettingsFromServer(
  bool enabled,
  bool temp,
  bool humidity,
  bool ammonia,
  bool power,
  bool water,
  unsigned long cooldownMinutes,
  String phones[],
  int count
) {
  smsEnabled = enabled;
  tempAlerts = temp;
  humidityAlerts = humidity;
  ammoniaAlerts = ammonia;
  powerAlerts = power;
  waterAlerts = water;
  smsCooldownMs = cooldownMinutes * 60 * 1000;
  
  phoneNumberCount = min(count, MAX_PHONE_NUMBERS);
  for (int i = 0; i < phoneNumberCount; i++) {
    phoneNumbers[i] = phones[i];
  }
  
  saveSmsSettings();
  Serial.println("SMS Settings updated from server");
}

bool canSendSms() {
  if (!smsEnabled) {
    Serial.println("SMS disabled");
    return false;
  }
  
  if (!gsmInitialized || !gsmNetworkReady) {
    Serial.println("GSM not ready");
    // Try to reinitialize
    initGSM();
    return false;
  }
  
  if (phoneNumberCount == 0) {
    Serial.println("No phone numbers configured");
    return false;
  }
  
  // Check cooldown
  unsigned long now = millis();
  if (now - lastSmsSentTime < smsCooldownMs) {
    unsigned long remainingSec = (smsCooldownMs - (now - lastSmsSentTime)) / 1000;
    Serial.println("SMS cooldown active. Remaining: " + String(remainingSec) + "s");
    return false;
  }
  
  return true;
}

bool sendSMS(String phoneNumber, String message) {
  Serial.println("Sending SMS to: " + phoneNumber);
  Serial.println("Message: " + message);
  
  // Set SMS center (may need adjustment for your carrier)
  // sendATCommand("AT+CSCA=\"+8801701007000\"", "OK", 1000);  // Example for BD
  
  // Start SMS
  gsmSerial.print("AT+CMGS=\"");
  gsmSerial.print(phoneNumber);
  gsmSerial.println("\"");
  delay(100);
  
  // Wait for > prompt
  unsigned long startTime = millis();
  bool promptReceived = false;
  while (millis() - startTime < 5000) {
    while (gsmSerial.available()) {
      char c = gsmSerial.read();
      if (c == '>') {
        promptReceived = true;
        break;
      }
    }
    if (promptReceived) break;
    delay(10);
  }
  
  if (!promptReceived) {
    Serial.println("SMS prompt not received");
    // Cancel SMS
    gsmSerial.write(27);  // ESC
    return false;
  }
  
  // Send message
  gsmSerial.print(message);
  gsmSerial.write(26);  // Ctrl+Z to send
  
  // Wait for response
  delay(1000);
  String response = "";
  startTime = millis();
  while (millis() - startTime < 30000) {  // 30 sec timeout for sending
    while (gsmSerial.available()) {
      response += (char)gsmSerial.read();
    }
    
    if (response.indexOf("+CMGS:") != -1) {
      Serial.println("SMS sent successfully!");
      return true;
    }
    if (response.indexOf("ERROR") != -1) {
      Serial.println("SMS send error: " + response);
      return false;
    }
    delay(100);
  }
  
  Serial.println("SMS send timeout");
  return false;
}

// Main function to send alert to all configured numbers
void sendAlertSMS(String alertType, String message) {
  // Check if this alert type is enabled
  if (alertType == "temperature" && !tempAlerts) return;
  if (alertType == "humidity" && !humidityAlerts) return;
  if (alertType == "ammonia" && !ammoniaAlerts) return;
  if (alertType == "power" && !powerAlerts) return;
  if (alertType == "water" && !waterAlerts) return;
  
  if (!canSendSms()) return;
  
  // Add prefix to message
  String fullMessage = "[Layer Farm Alert]\n" + message;
  
  bool anySent = false;
  for (int i = 0; i < phoneNumberCount; i++) {
    if (phoneNumbers[i].length() > 0) {
      if (sendSMS(phoneNumbers[i], fullMessage)) {
        anySent = true;
      }
      delay(5000);  // Wait between SMS
    }
  }
  
  if (anySent) {
    lastSmsSentTime = millis();
  }
}

// Example usage in your main code:
void checkAndSendAlerts(float temperature, float humidity, float ammonia, bool powerOk, float waterFlow) {
  // Only send SMS if WiFi is not connected (offline mode)
  if (WiFi.status() != WL_CONNECTED) {
    
    // Temperature alert
    if (temperature > 35.0) {
      sendAlertSMS("temperature", 
        "🌡️ High Temperature!\nTemp: " + String(temperature, 1) + "°C\n" +
        "Humidity: " + String(humidity, 1) + "%");
    } else if (temperature < 15.0) {
      sendAlertSMS("temperature", 
        "🌡️ Low Temperature!\nTemp: " + String(temperature, 1) + "°C\n" +
        "Humidity: " + String(humidity, 1) + "%");
    }
    
    // Ammonia alert
    if (ammonia > 25.0) {
      sendAlertSMS("ammonia", 
        "⚠️ High Ammonia!\nLevel: " + String(ammonia, 1) + " ppm\n" +
        "Ventilation required!");
    }
    
    // Power alert
    if (!powerOk) {
      sendAlertSMS("power", 
        "🔌 Power Outage!\n" +
        "Running on battery backup.\n" +
        "Check immediately!");
    }
    
    // Water flow alert
    if (waterFlow < 0.1) {
      sendAlertSMS("water", 
        "💧 No Water Flow!\n" +
        "Water system may be blocked.\n" +
        "Check immediately!");
    }
  }
}

void loop() {
  // Your existing loop code...
  
  // Example sensor reading and alert check
  // float temp = readTemperature();
  // float hum = readHumidity();
  // float amm = readAmmonia();
  // bool power = checkPower();
  // float water = readWaterFlow();
  // 
  // checkAndSendAlerts(temp, hum, amm, power, water);
  
  delay(10000);  // Check every 10 seconds
}
