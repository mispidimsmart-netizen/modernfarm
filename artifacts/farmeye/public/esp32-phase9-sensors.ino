/*
 * ════════════════════════════════════════════════════════════════════════════
 * FarmEye ESP32 — Phase 9 Sensor Upgrade Firmware
 * ════════════════════════════════════════════════════════════════════════════
 *
 * BOARD: ESP32-WROOM-32 38-pin DevKit V1 (LOCKED)
 *
 * SUPPORTED SENSORS (auto-detected at boot):
 *   Tier 1 (must):     SHT31  (temp+humidity, I²C 0x44)
 *                      BH1750 (lux,            I²C 0x23)
 *   Tier 2 (high val): ZE03-NH3 (NH3, UART)
 *   Tier 3 (premium):  SCD41    (CO₂, I²C 0x62)
 *                      PMS5003  (PM2.5/PM10, UART)
 *
 * FALLBACK: DHT22 (GPIO 4) + MQ-135 (GPIO 34) + LDR (GPIO 35) — used only
 *           when the corresponding upgrade sensor is not detected.
 *
 * RELAY GPIO MAP (LOCKED, NEVER CHANGE):
 *   GPIO 5,18,19,21,22,23,25,26 — 8-channel relay
 *
 * NEW SENSOR PIN MAP (uses only pins NOT used by relay):
 *   I²C Bus 2 (SHT31 + BH1750 + SCD41 share):
 *     SDA = GPIO 16
 *     SCL = GPIO 17
 *   ZE03-NH3 (UART2): RX = GPIO 32, TX = GPIO 4 (rare TX, NH3 mostly receives)
 *   PMS5003 (UART1):  RX = GPIO 13, TX = GPIO 33
 *
 * TELEMETRY (every 30s):
 *   POST /functions/v1/esp32-api/sensor-data
 *   Body extends legacy schema with:
 *     temp_precise, humidity_precise, lux_precise, nh3_ppm_precise,
 *     co2_ppm, pm25_ugm3, pm10_ugm3, sensor_source
 * ════════════════════════════════════════════════════════════════════════════
 */

#include <Wire.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ─── Optional libraries — install via Library Manager ───
// Adafruit SHT31 Library
// BH1750 by Christopher Laws
// Sensirion I2C SCD4x
// PMS Library by Mariusz Kacki
// (ZE03 uses raw UART, no library needed)

#include <Adafruit_SHT31.h>
#include <BH1750.h>
#include <SensirionI2cScd4x.h>
#include <PMS.h>
#include <DHT.h>

// ──────────── PIN MAP ────────────
#define I2C2_SDA          16
#define I2C2_SCL          17
#define ZE03_RX           32
#define ZE03_TX           4    // shared w/ DHT22 fallback (NH3 mostly RX-only)
#define PMS_RX            13
#define PMS_TX            33

// Legacy fallback pins (DO NOT use upgrade sensor pins)
#define DHT22_PIN         4
#define MQ135_PIN         34   // ADC1
#define LDR_PIN           35   // ADC1

// ──────────── SENSOR INSTANCES ────────────
Adafruit_SHT31 sht31 = Adafruit_SHT31();
BH1750 bh1750;
SensirionI2cScd4x scd41;
HardwareSerial PMSSerial(1);
HardwareSerial ZE03Serial(2);
PMS pms(PMSSerial);
PMS::DATA pmsData;
DHT dht22(DHT22_PIN, DHT22);

// ──────────── DETECTION FLAGS ────────────
struct SensorPresence {
  bool sht31  = false;
  bool bh1750 = false;
  bool scd41  = false;
  bool pms5003 = false;
  bool ze03   = false;
  bool dht22  = false;   // fallback
  bool mq135  = false;   // fallback
  bool ldr    = false;   // fallback
} sensors;

// ──────────── DETECTION (call once at boot) ────────────
void detectSensors() {
  Wire1.begin(I2C2_SDA, I2C2_SCL, 100000);
  delay(100);

  // SHT31
  if (sht31.begin(0x44, &Wire1)) {
    sensors.sht31 = true;
    Serial.println("[OK] SHT31 detected (I²C 0x44)");
  }

  // BH1750
  if (bh1750.begin(BH1750::CONTINUOUS_HIGH_RES_MODE, 0x23, &Wire1)) {
    sensors.bh1750 = true;
    Serial.println("[OK] BH1750 detected (I²C 0x23)");
  }

  // SCD41
  scd41.begin(Wire1, 0x62);
  uint64_t serial = 0;
  if (scd41.getSerialNumber(serial) == 0) {
    sensors.scd41 = true;
    scd41.startPeriodicMeasurement();
    Serial.printf("[OK] SCD41 detected, serial=%llu\n", serial);
  }

  // PMS5003 (UART1)
  PMSSerial.begin(9600, SERIAL_8N1, PMS_RX, PMS_TX);
  pms.passiveMode();
  delay(500);
  pms.requestRead();
  if (pms.readUntil(pmsData, 2000)) {
    sensors.pms5003 = true;
    Serial.println("[OK] PMS5003 detected (UART1)");
  }

  // ZE03-NH3 (UART2) — read 9-byte frame starting with 0xFF
  ZE03Serial.begin(9600, SERIAL_8N1, ZE03_RX, ZE03_TX);
  delay(500);
  uint32_t t0 = millis();
  while (millis() - t0 < 3000) {
    if (ZE03Serial.available() >= 9 && ZE03Serial.read() == 0xFF) {
      sensors.ze03 = true;
      Serial.println("[OK] ZE03-NH3 detected (UART2)");
      break;
    }
  }

  // Fallbacks: only enable if upgrade sensor missing
  if (!sensors.sht31) {
    dht22.begin();
    float tt = dht22.readTemperature();
    if (!isnan(tt)) {
      sensors.dht22 = true;
      Serial.println("[FALLBACK] DHT22 active");
    }
  }
  if (!sensors.ze03) {
    pinMode(MQ135_PIN, INPUT);
    int v = analogRead(MQ135_PIN);
    if (v > 100 && v < 4000) {
      sensors.mq135 = true;
      Serial.println("[FALLBACK] MQ-135 active");
    }
  }
  if (!sensors.bh1750) {
    pinMode(LDR_PIN, INPUT);
    int v = analogRead(LDR_PIN);
    if (v >= 0) {
      sensors.ldr = true;
      Serial.println("[FALLBACK] LDR active");
    }
  }
}

// ──────────── READ + BUILD JSON PAYLOAD ────────────
String buildSensorPayload(const String& deviceId, const String& shedId) {
  StaticJsonDocument<512> doc;
  JsonObject src = doc.createNestedObject("sensor_source");

  // Required legacy fields (server validation)
  float temperature = 25.0, humidity = 60.0, ammonia = 0.0;

  // ── Temperature + Humidity ──
  if (sensors.sht31) {
    float t = sht31.readTemperature();
    float h = sht31.readHumidity();
    if (!isnan(t)) {
      temperature = t;
      doc["temp_precise"] = t;
      src["temp"] = "SHT31";
    }
    if (!isnan(h)) {
      humidity = h;
      doc["humidity_precise"] = h;
      src["humidity"] = "SHT31";
    }
  } else if (sensors.dht22) {
    float t = dht22.readTemperature();
    float h = dht22.readHumidity();
    if (!isnan(t)) { temperature = t; src["temp"] = "DHT22"; }
    if (!isnan(h)) { humidity = h; src["humidity"] = "DHT22"; }
  }

  // ── Ammonia ──
  if (sensors.ze03) {
    // Read 9-byte ZE03 frame: FF 17 04 [HH] [LL] ... checksum
    if (ZE03Serial.available() >= 9) {
      uint8_t buf[9];
      ZE03Serial.readBytes(buf, 9);
      if (buf[0] == 0xFF && buf[1] == 0x17) {
        float ppm = (buf[4] * 256 + buf[5]) * 0.1f;
        ammonia = ppm;
        doc["nh3_ppm_precise"] = ppm;
        src["nh3"] = "ZE03";
      }
    }
  } else if (sensors.mq135) {
    int raw = analogRead(MQ135_PIN);
    ammonia = raw * (50.0 / 4095.0);  // very rough
    src["nh3"] = "MQ-135";
  }

  // ── Light ──
  if (sensors.bh1750) {
    float lux = bh1750.readLightLevel();
    if (lux >= 0) {
      doc["lux_precise"] = lux;
      doc["light_lux"] = lux;
      src["light"] = "BH1750";
    }
  } else if (sensors.ldr) {
    int raw = analogRead(LDR_PIN);
    float approx = (raw / 4095.0) * 1000.0;
    doc["light_lux"] = approx;
    src["light"] = "LDR";
  }

  // ── CO₂ (SCD41) ──
  if (sensors.scd41) {
    uint16_t co2 = 0; float t = 0, rh = 0;
    bool ready = false;
    scd41.getDataReadyStatus(ready);
    if (ready && scd41.readMeasurement(co2, t, rh) == 0 && co2 > 0) {
      doc["co2_ppm"] = co2;
      src["co2"] = "SCD41";
    }
  }

  // ── PM2.5 / PM10 (PMS5003) ──
  if (sensors.pms5003) {
    pms.requestRead();
    if (pms.readUntil(pmsData, 1000)) {
      doc["pm25_ugm3"] = pmsData.PM_AE_UG_2_5;
      doc["pm10_ugm3"] = pmsData.PM_AE_UG_10_0;
      src["pm25"] = "PMS5003";
      src["pm10"] = "PMS5003";
    }
  }

  // Required fields
  doc["temperature"] = temperature;
  doc["humidity"] = humidity;
  doc["ammonia"] = ammonia;
  doc["device_id"] = deviceId;
  if (shedId.length() > 0) doc["shed_id"] = shedId;

  String out;
  serializeJson(doc, out);
  return out;
}

// ──────────── EXAMPLE setup() / loop() ────────────
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\nFarmEye ESP32 — Phase 9 Sensor Upgrade");

  detectSensors();

  // ... your WiFi connect + auth token setup here ...
}

void loop() {
  // Build & POST every 30 seconds
  String json = buildSensorPayload("FE-DEMO-001", "");
  Serial.println(json);

  // HTTPClient http; http.begin(SUPABASE_URL "/functions/v1/esp32-api/sensor-data");
  // http.addHeader("Content-Type", "application/json");
  // http.addHeader("Authorization", "Bearer " + DEVICE_TOKEN);
  // int code = http.POST(json);
  // http.end();

  delay(30000);
}
