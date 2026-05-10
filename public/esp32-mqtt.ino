/*
 * FarmEye ESP32 — MQTT Edition (Phase 4)
 * ============================================
 * Board: ESP32-WROOM-32 38-pin DevKit V1
 * Broker: HiveMQ Cloud Serverless (TLS, port 8883)
 *
 * Topics:
 *   Subscribe: farm/<FARM_ID>/dev/<DEVICE_ID>/cmd     (commands from cloud)
 *   Publish:   farm/<FARM_ID>/dev/<DEVICE_ID>/sensor  (sensor readings)
 *   Publish:   farm/<FARM_ID>/dev/<DEVICE_ID>/status  (device status)
 *
 * Required libraries (Arduino IDE → Library Manager):
 *   - WiFiClientSecure (built-in)
 *   - PubSubClient by Nick O'Leary
 *   - ArduinoJson by Benoit Blanchon
 *   - DHT sensor library by Adafruit
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ============== CONFIG — fill these ==============
const char* WIFI_SSID     = "YOUR_WIFI";
const char* WIFI_PASSWORD = "YOUR_PASSWORD";

const char* MQTT_HOST     = "xxxxx.s1.eu.hivemq.cloud";  // from HiveMQ dashboard
const int   MQTT_PORT     = 8883;
const char* MQTT_USER     = "farmeye_bridge";
const char* MQTT_PASS     = "YOUR_PASSWORD";

const char* FARM_ID       = "YOUR_FARM_UUID";
const char* DEVICE_ID     = "YOUR_DEVICE_TOKEN_UUID";

// Sensor pin
#define DHT_PIN  4
#define DHT_TYPE DHT22
DHT dht(DHT_PIN, DHT_TYPE);

// Relay pins (8-channel mapping per project standard)
#define RELAY_FAN     16
#define RELAY_HEATER  17
#define RELAY_LIGHT   18
#define RELAY_ALARM   19
#define RELAY_PUMP    21
#define RELAY_FOGGER  22
#define RELAY_AUX1    23
#define RELAY_AUX2    25

// ============== STATE ==============
WiFiClientSecure wifiClient;
PubSubClient mqtt(wifiClient);

char topicCmd[128];
char topicSensor[128];
char topicStatus[128];

unsigned long lastSensorPublish = 0;
const unsigned long SENSOR_INTERVAL_MS = 30000; // 30s

// ============== HiveMQ Cloud Root CA (ISRG Root X1 / Let's Encrypt) ==============
const char* HIVEMQ_ROOT_CA = R"EOF(
-----BEGIN CERTIFICATE-----
MIIFazCCA1OgAwIBAgIRAIIQz7DSQONZRGPgu2OCiwAwDQYJKoZIhvcNAQELBQAw
TzELMAkGA1UEBhMCVVMxKTAnBgNVBAoTIEludGVybmV0IFNlY3VyaXR5IFJlc2Vh
cmNoIEdyb3VwMRUwEwYDVQQDEwxJU1JHIFJvb3QgWDEwHhcNMTUwNjA0MTEwNDM4
WhcNMzUwNjA0MTEwNDM4WjBPMQswCQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJu
ZXQgU2VjdXJpdHkgUmVzZWFyY2ggR3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBY
MTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBAK3oJHP0FDfzm54rVygc
h77ct984kIxuPOZXoHj3dcKi/vVqbvYATyjb3miGbESTtrFj/RQSa78f0uoxmyF+
0TM8ukj13Xnfs7j/EvEhmkvBioZxaUpmZmyPfjxwv60pIgbz5MDmgK7iS4+3mX6U
A5/TR5d8mUgjU+g4rk8Kb4Mu0UlXjIB0ttov0DiNewNwIRt18jA8+o+u3dpjq+sW
T8KOEUt+zwvo/7V3LvSye0rgTBIlDHCNAymg4VMk7BPZ7hm/ELNKjD+Jo2FR3qyH
B5T0Y3HsLuJvW5iB4YlcNHlsdu87kGJ55tukmi8mxdAQ4Q7e2RCOFvu396j3x+UC
B5iPNgiV5+I3lg02dZ77DnKxHZu8A/lJBdiB3QW0KtZB6awBdpUKD9jf1b0SHzUv
KBds0pjBqAlkd25HN7rOrFleaJ1/ctaJxQZBKT5ZPt0m9STJEadao0xAH0ahmbWn
OlFuhjuefXKnEgV4We0+UXgVCwOPjdAvBbI+e0ocS3MFEvzG6uBQE3xDk3SzynTn
jh8BCNAw1FtxNrQHusEwMFxIt4I7mKZ9YIqioymCzLq9gwQbooMDQaHWBfEbwrbw
qHyGO0aoSCqI3Haadr8faqU9GY/rOPNk3sgrDQoo//fb4hVC1CLQJ13hef4Y53CI
rU7m2Ys6xt0nUW7/vGT1M0NPAgMBAAGjQjBAMA4GA1UdDwEB/wQEAwIBBjAPBgNV
HRMBAf8EBTADAQH/MB0GA1UdDgQWBBR5tFnme7bl5AFzgAiIyBpY9umbbjANBgkq
hkiG9w0BAQsFAAOCAgEAVR9YqbyyqFDQDLHYGmkgJykIrGF1XIpu+ILlaS/V9lZL
ubhzEFnTIZd+50xx+7LSYK05qAvqFyFWhfFQDlnrzuBZ6brJFe+GnY+EgPbk6ZGQ
3BebYhtF8GaV0nxvwuo77x/Py9auJ/GpsMiu/X1+mvoiBOv/2X/qkSsisRcOj/KK
NFtY2PwByVS5uCbMiogziUwthDyC3+6WVwW6LLv3xLfHTjuCvjHIInNzktHCgKQ5
ORAzI4JMPJ+GslWYHb4phowim57iaztXOoJwTdwJx4nLCgdNbOhdjsnvzqvHu7Ur
TkXWStAmzOVyyghqpZXjFaH3pO3JLF+l+/+sKAIuvtd7u+Nxe5AW0wdeRlN8NwdC
jNPElpzVmbUq4JUagEiuTDkHzsxHpFKVK7q4+63SM1N95R1NbdWhscdCb+ZAJzVc
oyi3B43njTOQ5yOf+1CceWxG1bQVs5ZufpsMljq4Ui0/1lvh+wjChP4kqKOJ2qxq
4RgqsahDYVvTH9w7jXbyLeiNdd8XM2w9U/t7y0Ff/9yi0GE44Za4rF2LN9d11TPA
mRGunUHBcnWEvgJBQl9nJEiU0Zsnvgc/ubhPgXRR4Xq37Z0j4r7g1SgEEzwxA57d
emyPxgcYxn/eR44/KJ4EBs+lVDR3veyJm+kXQ99b21/+jh5Xos1AnX5iItreGCc=
-----END CERTIFICATE-----
)EOF";

// ============== HELPERS ==============
void setRelay(const char* device, bool on) {
  int pin = -1;
  if      (strcmp(device, "fan") == 0)     pin = RELAY_FAN;
  else if (strcmp(device, "heater") == 0)  pin = RELAY_HEATER;
  else if (strcmp(device, "light") == 0)   pin = RELAY_LIGHT;
  else if (strcmp(device, "alarm") == 0)   pin = RELAY_ALARM;
  else if (strcmp(device, "pump") == 0)    pin = RELAY_PUMP;
  else if (strcmp(device, "fogger") == 0)  pin = RELAY_FOGGER;
  if (pin >= 0) digitalWrite(pin, on ? LOW : HIGH); // active-low relays
  Serial.printf("[RELAY] %s = %s\n", device, on ? "ON" : "OFF");
}

void publishStatus() {
  StaticJsonDocument<256> doc;
  doc["uptime_s"]  = millis() / 1000;
  doc["wifi_rssi"] = WiFi.RSSI();
  doc["free_heap"] = ESP.getFreeHeap();
  char buf[256];
  size_t n = serializeJson(doc, buf);
  mqtt.publish(topicStatus, (uint8_t*)buf, n, true); // retained
}

void publishSensor() {
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  if (isnan(t) || isnan(h)) { Serial.println("[DHT] read failed"); return; }

  StaticJsonDocument<200> doc;
  doc["temperature"] = t;
  doc["humidity"]    = h;
  doc["ts"]          = millis();

  char buf[200];
  size_t n = serializeJson(doc, buf);
  bool ok = mqtt.publish(topicSensor, (uint8_t*)buf, n, false);
  Serial.printf("[PUB] sensor t=%.1f h=%.1f → %s\n", t, h, ok ? "OK" : "FAIL");
}

void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  Serial.printf("[CMD] %s: ", topic);
  for (unsigned int i = 0; i < length; i++) Serial.print((char)payload[i]);
  Serial.println();

  StaticJsonDocument<256> doc;
  if (deserializeJson(doc, payload, length)) {
    Serial.println("[CMD] JSON parse failed");
    return;
  }

  const char* type  = doc["command_type"] | "";
  bool        value = doc["command_value"] | false;

  // Apply (subject to safety invariants enforced by safety_engine.h in unified firmware)
  setRelay(type, value);
  publishStatus();
}

void connectWiFi() {
  Serial.printf("[WIFI] Connecting to %s\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.printf("\n[WIFI] OK ip=%s\n", WiFi.localIP().toString().c_str());
}

void connectMqtt() {
  while (!mqtt.connected()) {
    String clientId = "farmeye-" + String(DEVICE_ID).substring(0, 8) + "-" + String(random(0xffff), HEX);
    Serial.printf("[MQTT] Connecting as %s ... ", clientId.c_str());

    // Last-will: publish offline status
    StaticJsonDocument<64> lw;
    lw["online"] = false;
    char lwBuf[64]; size_t lwN = serializeJson(lw, lwBuf);

    if (mqtt.connect(clientId.c_str(), MQTT_USER, MQTT_PASS,
                     topicStatus, 1, true, lwBuf)) {
      Serial.println("OK");
      mqtt.subscribe(topicCmd, 1);
      Serial.printf("[MQTT] Subscribed: %s\n", topicCmd);
      publishStatus();
    } else {
      Serial.printf("FAIL rc=%d, retry in 5s\n", mqtt.state());
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);

  // Build topics
  snprintf(topicCmd,    sizeof(topicCmd),    "farm/%s/dev/%s/cmd",    FARM_ID, DEVICE_ID);
  snprintf(topicSensor, sizeof(topicSensor), "farm/%s/dev/%s/sensor", FARM_ID, DEVICE_ID);
  snprintf(topicStatus, sizeof(topicStatus), "farm/%s/dev/%s/status", FARM_ID, DEVICE_ID);

  // Relays
  int pins[] = { RELAY_FAN, RELAY_HEATER, RELAY_LIGHT, RELAY_ALARM,
                 RELAY_PUMP, RELAY_FOGGER, RELAY_AUX1, RELAY_AUX2 };
  for (int p : pins) { pinMode(p, OUTPUT); digitalWrite(p, HIGH); } // OFF (active-low)

  dht.begin();
  connectWiFi();

  wifiClient.setCACert(HIVEMQ_ROOT_CA);
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(onMqttMessage);
  mqtt.setBufferSize(512);
  mqtt.setKeepAlive(30);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();
  if (!mqtt.connected()) connectMqtt();
  mqtt.loop();

  unsigned long now = millis();
  if (now - lastSensorPublish >= SENSOR_INTERVAL_MS) {
    lastSensorPublish = now;
    publishSensor();
  }
}
