/*
 * ════════════════════════════════════════════════════════════════════════════
 * FarmEye ESP32 — Industrial Firmware v10.1 (Production)
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Source of truth: this file matches Installation Guide v10 pin map EXACTLY.
 *
 * BOARD:  ESP32-WROOM-32 38-pin DevKit V1 (LOCKED — WROVER/30-pin forbidden)
 * RELAYS: 8-channel, active-LOW, mapped to GPIO 5/18/19/21/22/23/25/26
 *
 *   ┌──────┬─────┬────────────────────────────────────────────┐
 *   │ GPIO │ CH  │ Load                                       │
 *   ├──────┼─────┼────────────────────────────────────────────┤
 *   │  5   │ IN1 │ Exhaust Fan                                │
 *   │ 18   │ IN2 │ Ceiling Fan                                │
 *   │ 19   │ IN3 │ Light (PWM dimming optional)               │
 *   │ 21   │ IN4 │ Heater (broiler brooding)                  │
 *   │ 22   │ IN5 │ Fogger (solenoid valve)                    │
 *   │ 23   │ IN6 │ Alarm / Buzzer                             │
 *   │ 25   │ IN7 │ Roof Sprinkler (HSI ≥ 80)                  │
 *   │ 26   │ IN8 │ Circulation Fan                            │
 *   └──────┴─────┴────────────────────────────────────────────┘
 *
 * SENSORS (auto-detect at boot, Phase 9):
 *   I²C Bus 2  SDA=GPIO 16  SCL=GPIO 17  → SHT31 (0x44), BH1750 (0x23), SCD41 (0x62)
 *   UART2      RX=GPIO 32   TX=GPIO 4    → ZE03-NH3 ammonia
 *   UART1      RX=GPIO 13   TX=GPIO 33   → PMS5003 PM2.5/PM10
 *   Fallback   DHT22=4 (only if SHT31 absent — ZE03 unused in that case)
 *   Fallback   MQ-135=34, LDR=35 (only if upgrade sensor missing)
 *
 * GSM SIM800L (UART for SMS failover):
 *   RX = GPIO 27   TX = GPIO 14
 *   Phone number configured at runtime via NVS Preferences (key "phone").
 *
 * 8 HARDCODED SAFETY INVARIANTS (cloud CANNOT override):
 *   1. temp > 38.0°C  → ALL fans ON, heater FORCE OFF, alarm ON
 *   2. temp < 12.0°C and broiler brooding → heater allowed; else heater OFF
 *   3. ammonia > 25 ppm → exhaust + circulation fan ON
 *   4. HSI ≥ 80 → roof sprinkler ON + alarm
 *   5. Sensor offline > 5 min → enter Emergency Survival Mode (ESM)
 *   6. Manual override expires after 20 minutes → revert to automation
 *   7. WiFi offline > 60s AND critical condition → GSM SMS
 *   8. Heater AND exhaust fan cannot be ON simultaneously (interlock)
 *
 * CLOUD CONTRACT:
 *   POST /functions/v1/esp32-api/sensor-data    — telemetry every 30s
 *   GET  /functions/v1/esp32-api/desired-state  — poll cloud commands every 10s
 *                                                (returns is_broiler_brooding flag)
 *   POST /functions/v1/esp32-api/buffer-sync    — flush LittleFS offline buffer
 *
 * Firmware version reported in every payload as "fw_version": "10.1.0".
 * ════════════════════════════════════════════════════════════════════════════
 */

#include <Wire.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Adafruit_SHT31.h>
#include <BH1750.h>
#include <SensirionI2cScd4x.h>
#include <PMS.h>
#include <DHT.h>
#include <LittleFS.h>
#include <Preferences.h>
#include <esp_task_wdt.h>

// ════════════════════════════════════════════════════════════════════════════
// CONFIG — edit these for each device before flashing
// ════════════════════════════════════════════════════════════════════════════
static const char* WIFI_SSID    = "YOUR_WIFI";
static const char* WIFI_PASS    = "YOUR_PASS";
static const char* SUPABASE_URL = "https://hbwfuvqrfgtefozajyfu.supabase.co";
static const char* DEVICE_TOKEN = "PASTE_DEVICE_TOKEN_HERE";
static const char* DEVICE_ID    = "FE-DEMO-001";
static const char* SHED_ID      = "";   // optional, blank = farm default

#define FW_VERSION  "10.1.1"
#define FW_CHANNEL  "stable"

// ════════════════════════════════════════════════════════════════════════════
// PIN MAP — LOCKED. DO NOT CHANGE.
// ════════════════════════════════════════════════════════════════════════════
namespace pins {
  constexpr uint8_t FAN_EXHAUST = 5;    // IN1
  constexpr uint8_t FAN_CEILING = 18;   // IN2
  constexpr uint8_t LIGHT       = 19;   // IN3
  constexpr uint8_t HEATER      = 21;   // IN4
  constexpr uint8_t FOGGER      = 22;   // IN5
  constexpr uint8_t ALARM       = 23;   // IN6
  constexpr uint8_t SPRINKLER   = 25;   // IN7
  constexpr uint8_t FAN_CIRC    = 26;   // IN8

  constexpr uint8_t I2C2_SDA = 16;
  constexpr uint8_t I2C2_SCL = 17;
  constexpr uint8_t ZE03_RX  = 32;
  constexpr uint8_t ZE03_TX  = 4;   // shared with DHT22 fallback (never both)
  constexpr uint8_t PMS_RX   = 13;
  constexpr uint8_t PMS_TX   = 33;
  constexpr uint8_t DHT22    = 4;
  constexpr uint8_t MQ135    = 34;
  constexpr uint8_t LDR      = 35;
  constexpr uint8_t GSM_RX   = 27;
  constexpr uint8_t GSM_TX   = 14;
}

// Backward-compatible #defines for firmwareVerifier.ts (must remain literal)
#define PIN_FAN_EXHAUST  5
#define PIN_FAN_CEILING  18
#define PIN_LIGHT        19
#define PIN_HEATER       21
#define PIN_FOGGER       22
#define PIN_ALARM        23
#define PIN_SPRINKLER    25
#define PIN_FAN_CIRC     26

constexpr uint8_t RELAY_ON  = LOW;    // active-LOW boards
constexpr uint8_t RELAY_OFF = HIGH;

// ════════════════════════════════════════════════════════════════════════════
// SAFETY INVARIANT THRESHOLDS — hardcoded, also mirrored in cloud
// ════════════════════════════════════════════════════════════════════════════
namespace safety {
  constexpr float    TEMP_EMERGENCY_HIGH   = 38.0f;          // #1
  constexpr float    TEMP_HEATER_LOW       = 12.0f;          // #2
  constexpr float    NH3_FAN_TRIGGER       = 25.0f;          // #3
  constexpr float    HSI_SPRINKLER         = 80.0f;          // #4
  constexpr uint32_t SENSOR_OFFLINE_MS     = 5UL * 60 * 1000;  // #5
  constexpr uint32_t MANUAL_OVERRIDE_MS    = 20UL * 60 * 1000; // #6
  constexpr uint32_t WIFI_OFFLINE_GSM_MS   = 60UL * 1000;      // #7
  constexpr uint32_t GSM_RATE_LIMIT_MS     = 10UL * 60 * 1000; // 1 SMS / 10min / class
}

// ════════════════════════════════════════════════════════════════════════════
// TIMING / WATCHDOG
// ════════════════════════════════════════════════════════════════════════════
namespace timing {
  constexpr uint32_t WDT_TIMEOUT_S       = 15;
  constexpr uint32_t CONTROL_CYCLE_MS    = 2000;
  constexpr uint32_t POLL_DESIRED_MS     = 10000;
  constexpr uint32_t TELEMETRY_MS        = 30000;
  constexpr uint32_t BUFFER_FLUSH_MS     = 60000;
}

// ════════════════════════════════════════════════════════════════════════════
// OFFLINE BUFFER (LittleFS — 24h capacity at 30s telemetry interval = 2880 rows)
// ════════════════════════════════════════════════════════════════════════════
namespace buffer {
  constexpr const char* PATH         = "/tlm.ndjson";
  constexpr size_t      MAX_BYTES    = 700UL * 1024;   // ~700 KB
  constexpr size_t      FLUSH_BATCH  = 20;             // POST 20 rows / flush
}

// ════════════════════════════════════════════════════════════════════════════
// SENSOR INSTANCES
// ════════════════════════════════════════════════════════════════════════════
Adafruit_SHT31    sht31;
BH1750            bh1750;
SensirionI2cScd4x scd41;
HardwareSerial    PMSSerial(1);
HardwareSerial    ZE03Serial(2);
PMS               pms(PMSSerial);
PMS::DATA         pmsData;
DHT               dht22(pins::DHT22, DHT22);
// FIX (v10.1.1): GSM must NOT use UART0 — UART0 is the USB debug console.
// ESP32 has 3 UARTs: 0 = Serial (logs), 1 = PMS5003, 2 = ZE03 / GSM (shared).
// ZE03 and SIM800L are mutually exclusive on UART2: GSM is enabled only when
// no ZE03-NH3 sensor is detected at boot.
HardwareSerial&   GSMSerial = ZE03Serial;
bool              gsmAvailable = false;
Preferences       prefs;

struct SensorPresence {
  bool sht31=false, bh1750=false, scd41=false, pms5003=false, ze03=false;
  bool dht22=false, mq135=false, ldr=false;
} sensors;

// ════════════════════════════════════════════════════════════════════════════
// RUNTIME STATE
// ════════════════════════════════════════════════════════════════════════════
struct RelayState {
  bool fan_exhaust=false, fan_ceiling=false, fan_circ=false;
  bool light=false, heater=false, fogger=false, alarm=false, sprinkler=false;
};
RelayState    actual;
RelayState    desired;
uint32_t      manualOverrideUntil   = 0;
bool          inEmergencySurvivalMode = false;
bool          isBroilerBrooding      = false;   // ← B1: from cloud /desired-state
uint32_t      lastSensorOkAt         = 0;
uint32_t      lastWifiOkAt           = 0;
String        gsmPhone               = "";       // ← B6: from NVS Preferences

enum class GsmAlertClass : uint8_t { TEMP_HIGH=0, NH3_HIGH=1, HSI_HIGH=2, ESM=3, COUNT=4 };
uint32_t gsmLastSentAt[(int)GsmAlertClass::COUNT] = {0,0,0,0};

// ════════════════════════════════════════════════════════════════════════════
// SENSOR READING STRUCT
// ════════════════════════════════════════════════════════════════════════════
struct SensorReading {
  float    temperature = NAN, humidity = NAN, ammonia = NAN;
  float    lux = NAN, co2 = NAN, pm25 = NAN, pm10 = NAN;
  bool     ok = false;
};

// ════════════════════════════════════════════════════════════════════════════
// SENSOR DETECTION (boot-time)
// ════════════════════════════════════════════════════════════════════════════
static void detectSensors() {
  Wire1.begin(pins::I2C2_SDA, pins::I2C2_SCL, 100000);
  delay(100);

  if (sht31.begin(0x44, &Wire1)) { sensors.sht31 = true; Serial.println("[OK] SHT31"); }
  if (bh1750.begin(BH1750::CONTINUOUS_HIGH_RES_MODE, 0x23, &Wire1)) {
    sensors.bh1750 = true; Serial.println("[OK] BH1750");
  }
  scd41.begin(Wire1, 0x62);
  uint64_t sn = 0;
  if (scd41.getSerialNumber(sn) == 0) {
    sensors.scd41 = true;
    scd41.startPeriodicMeasurement();
    Serial.printf("[OK] SCD41 sn=%llu\n", sn);
  }

  PMSSerial.begin(9600, SERIAL_8N1, pins::PMS_RX, pins::PMS_TX);
  pms.passiveMode();
  delay(500);
  pms.requestRead();
  if (pms.readUntil(pmsData, 2000)) { sensors.pms5003 = true; Serial.println("[OK] PMS5003"); }

  // ZE03 and DHT22 share GPIO 4 — only one can be active.
  // Prefer ZE03 (more accurate); fall back to DHT22 only if no SHT31 AND no ZE03 boot frame.
  ZE03Serial.begin(9600, SERIAL_8N1, pins::ZE03_RX, pins::ZE03_TX);
  delay(500);
  const uint32_t deadline = millis() + 3000;
  while (millis() < deadline) {
    if (ZE03Serial.available() >= 9 && ZE03Serial.read() == 0xFF) {
      sensors.ze03 = true; Serial.println("[OK] ZE03-NH3"); break;
    }
    esp_task_wdt_reset();
  }

  // FIX (v10.1.1): UART2 keeps GPIO4 as its TX pin. Release it before the
  // DHT22 fallback, otherwise DHT22 on the shared GPIO4 can never be read.
  if (!sensors.ze03) ZE03Serial.end();

  if (!sensors.sht31 && !sensors.ze03) {
    dht22.begin();
    if (!isnan(dht22.readTemperature())) {
      sensors.dht22 = true;
      Serial.println("[FB] DHT22 (no SHT31 / no ZE03 detected)");
    }
  }
  if (!sensors.ze03)  { pinMode(pins::MQ135, INPUT); sensors.mq135 = true; Serial.println("[FB] MQ-135"); }
  if (!sensors.bh1750){ pinMode(pins::LDR, INPUT);   sensors.ldr   = true; Serial.println("[FB] LDR"); }
}

// ════════════════════════════════════════════════════════════════════════════
// RELAY HELPERS
// ════════════════════════════════════════════════════════════════════════════
static inline void writeRelay(uint8_t pin, bool on) {
  digitalWrite(pin, on ? RELAY_ON : RELAY_OFF);
}

static void applyRelayState(const RelayState& s) {
  writeRelay(pins::FAN_EXHAUST, s.fan_exhaust);
  writeRelay(pins::FAN_CEILING, s.fan_ceiling);
  writeRelay(pins::FAN_CIRC,    s.fan_circ);
  writeRelay(pins::LIGHT,       s.light);
  writeRelay(pins::HEATER,      s.heater);
  writeRelay(pins::FOGGER,      s.fogger);
  writeRelay(pins::ALARM,       s.alarm);
  writeRelay(pins::SPRINKLER,   s.sprinkler);
  actual = s;
}

static void initRelays() {
  const uint8_t pinList[] = {
    pins::FAN_EXHAUST, pins::FAN_CEILING, pins::LIGHT, pins::HEATER,
    pins::FOGGER, pins::ALARM, pins::SPRINKLER, pins::FAN_CIRC,
  };
  for (uint8_t p : pinList) { pinMode(p, OUTPUT); digitalWrite(p, RELAY_OFF); }
}

// ════════════════════════════════════════════════════════════════════════════
// HEAT STRESS INDEX — Steadman formula (mirrored in cloud calculateHSI)
// ════════════════════════════════════════════════════════════════════════════
static float calcHSI(float t, float rh) {
  if (isnan(t) || isnan(rh)) return NAN;
  return (1.8f * t + 32.0f) - ((0.55f - 0.0055f * rh) * (1.8f * t - 26.0f));
}

// ════════════════════════════════════════════════════════════════════════════
// 8 SAFETY INVARIANTS — overrides cloud desired state every control cycle
// ════════════════════════════════════════════════════════════════════════════
static RelayState enforceSafetyInvariants(RelayState s, const SensorReading& r,
                                          float hsi, bool sensorsOk, bool brooding) {
  // #5 — Sensor offline > 5 min → Emergency Survival Mode
  if (!sensorsOk && (millis() - lastSensorOkAt) > safety::SENSOR_OFFLINE_MS) {
    inEmergencySurvivalMode = true;
    s.fan_exhaust = true; s.fan_ceiling = true; s.fan_circ = true;
    s.heater = false; s.alarm = true;
    return s;
  }
  inEmergencySurvivalMode = false;

  // #1 — temp > 38°C → ALL fans ON, heater FORCE OFF
  if (!isnan(r.temperature) && r.temperature > safety::TEMP_EMERGENCY_HIGH) {
    s.fan_exhaust = true; s.fan_ceiling = true; s.fan_circ = true;
    s.heater = false; s.alarm = true;
  }

  // #2 — temp < 12°C: heater allowed ONLY during broiler brooding
  if (!isnan(r.temperature) && r.temperature < safety::TEMP_HEATER_LOW && !brooding) {
    s.heater = false;
  }

  // #3 — ammonia > 25 ppm → exhaust + circulation fan ON
  if (!isnan(r.ammonia) && r.ammonia > safety::NH3_FAN_TRIGGER) {
    s.fan_exhaust = true; s.fan_circ = true;
  }

  // #4 — HSI ≥ 80 → sprinkler + alarm
  if (!isnan(hsi) && hsi >= safety::HSI_SPRINKLER) {
    s.sprinkler = true; s.alarm = true;
  }

  // #8 — Heater + exhaust interlock. If temp is at or above the emergency
  //      threshold the heater MUST lose; otherwise fan loses to keep birds warm.
  if (s.heater && s.fan_exhaust) {
    if (!isnan(r.temperature) && r.temperature >= safety::TEMP_EMERGENCY_HIGH) s.heater = false;
    else s.fan_exhaust = false;
  }
  return s;
}

// ════════════════════════════════════════════════════════════════════════════
// SENSOR READ
// ════════════════════════════════════════════════════════════════════════════
static SensorReading readAllSensors() {
  SensorReading r;
  if (sensors.sht31) {
    r.temperature = sht31.readTemperature();
    r.humidity    = sht31.readHumidity();
  } else if (sensors.dht22) {
    r.temperature = dht22.readTemperature();
    r.humidity    = dht22.readHumidity();
  }

  if (sensors.ze03 && ZE03Serial.available() >= 9) {
    uint8_t buf[9]; ZE03Serial.readBytes(buf, 9);
    if (buf[0] == 0xFF && buf[1] == 0x17) {
      r.ammonia = (buf[4] * 256 + buf[5]) * 0.1f;
    }
  } else if (sensors.mq135) {
    r.ammonia = analogRead(pins::MQ135) * (50.0f / 4095.0f);
  }

  if (sensors.bh1750)      r.lux = bh1750.readLightLevel();
  else if (sensors.ldr)    r.lux = (analogRead(pins::LDR) / 4095.0f) * 1000.0f;

  if (sensors.scd41) {
    uint16_t co2 = 0; float t=0, h=0; bool rd=false;
    scd41.getDataReadyStatus(rd);
    if (rd && scd41.readMeasurement(co2, t, h) == 0 && co2 > 0) r.co2 = co2;
  }

  if (sensors.pms5003) {
    pms.requestRead();
    if (pms.readUntil(pmsData, 1000)) {
      r.pm25 = pmsData.PM_AE_UG_2_5; r.pm10 = pmsData.PM_AE_UG_10_0;
    }
  }

  r.ok = !isnan(r.temperature) && !isnan(r.humidity);
  if (r.ok) lastSensorOkAt = millis();
  return r;
}

// ════════════════════════════════════════════════════════════════════════════
// TELEMETRY JSON
//   No fake fallback values — when a sensor fails we omit the field and set
//   sensor_error=true so the cloud/UI never confuses NaN with valid data.
// ════════════════════════════════════════════════════════════════════════════
static String buildTelemetry(const SensorReading& r) {
  StaticJsonDocument<768> doc;
  doc["device_id"]   = DEVICE_ID;
  if (strlen(SHED_ID) > 0) doc["shed_id"] = SHED_ID;
  doc["fw_version"]  = FW_VERSION;
  doc["fw_channel"]  = FW_CHANNEL;
  doc["ts"]          = millis();

  if (!isnan(r.temperature)) doc["temperature"] = r.temperature;
  if (!isnan(r.humidity))    doc["humidity"]    = r.humidity;
  if (!isnan(r.ammonia))     doc["ammonia"]     = r.ammonia;
  if (!isnan(r.lux))         doc["light_lux"]   = r.lux;
  if (!isnan(r.co2))         doc["co2_ppm"]     = r.co2;
  if (!isnan(r.pm25))        doc["pm25_ugm3"]   = r.pm25;
  if (!isnan(r.pm10))        doc["pm10_ugm3"]   = r.pm10;
  if (sensors.sht31  && !isnan(r.temperature)) doc["temp_precise"]     = r.temperature;
  if (sensors.ze03   && !isnan(r.ammonia))     doc["nh3_ppm_precise"]  = r.ammonia;
  if (sensors.bh1750 && !isnan(r.lux))         doc["lux_precise"]      = r.lux;

  doc["sensor_error"] = !r.ok;

  JsonObject src = doc.createNestedObject("sensor_source");
  src["temp"]  = sensors.sht31 ? "SHT31" : (sensors.dht22 ? "DHT22" : "none");
  src["nh3"]   = sensors.ze03  ? "ZE03"  : (sensors.mq135 ? "MQ-135" : "none");
  src["light"] = sensors.bh1750? "BH1750": (sensors.ldr   ? "LDR"    : "none");
  if (sensors.scd41)  src["co2"]  = "SCD41";
  if (sensors.pms5003){src["pm25"] = "PMS5003"; src["pm10"] = "PMS5003";}

  JsonObject rs = doc.createNestedObject("actual_state");
  rs["fan_exhaust"] = actual.fan_exhaust;
  rs["fan_ceiling"] = actual.fan_ceiling;
  rs["fan_circ"]    = actual.fan_circ;
  rs["light"]       = actual.light;
  rs["heater"]      = actual.heater;
  rs["fogger"]      = actual.fogger;
  rs["alarm"]       = actual.alarm;
  rs["sprinkler"]   = actual.sprinkler;
  rs["esm"]         = inEmergencySurvivalMode;
  rs["manual_override_remaining_ms"] =
      manualOverrideUntil > millis() ? (manualOverrideUntil - millis()) : 0;

  String out; serializeJson(doc, out); return out;
}

// ════════════════════════════════════════════════════════════════════════════
// LITTLEFS 24H OFFLINE BUFFER (B4)
//   Append on POST failure, replay when WiFi recovers.
//   File is truncated once flushed; capped at MAX_BYTES to prevent flash fill.
// ════════════════════════════════════════════════════════════════════════════
static void bufferAppend(const String& json) {
  if (!LittleFS.begin(true)) return;
  File f = LittleFS.open(buffer::PATH, FILE_APPEND);
  if (!f) return;
  if (f.size() < buffer::MAX_BYTES) { f.println(json); }
  f.close();
}

static bool flushOneBatchToCloud() {
  if (WiFi.status() != WL_CONNECTED) return false;
  if (!LittleFS.begin(true)) return false;
  File f = LittleFS.open(buffer::PATH, FILE_READ);
  if (!f || f.size() == 0) { if (f) f.close(); return true; }

  StaticJsonDocument<16384> batchDoc;
  JsonArray arr = batchDoc.createNestedArray("rows");
  size_t n = 0;
  while (f.available() && n < buffer::FLUSH_BATCH) {
    String line = f.readStringUntil('\n');
    line.trim();
    if (line.length() == 0) continue;
    StaticJsonDocument<768> row;
    if (deserializeJson(row, line) == DeserializationError::Ok) {
      arr.add(row); n++;
    }
  }
  const size_t consumed = f.position();
  const size_t total    = f.size();
  f.close();
  if (n == 0) { LittleFS.remove(buffer::PATH); return true; }

  String body; serializeJson(batchDoc, body);
  HTTPClient http;
  http.begin(String(SUPABASE_URL) + "/functions/v1/esp32-api/buffer-sync");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + DEVICE_TOKEN);
  const int code = http.POST(body);
  http.end();
  if (code < 200 || code >= 300) return false;

  // Rewrite file with remaining rows (after `consumed` bytes)
  File src = LittleFS.open(buffer::PATH, FILE_READ);
  if (!src) return true;
  src.seek(consumed);
  File dst = LittleFS.open("/tlm.tmp", FILE_WRITE);
  if (!dst) { src.close(); return true; }
  uint8_t buf[256];
  while (src.available()) {
    const size_t r = src.read(buf, sizeof(buf));
    dst.write(buf, r);
  }
  src.close(); dst.close();
  LittleFS.remove(buffer::PATH);
  LittleFS.rename("/tlm.tmp", buffer::PATH);
  Serial.printf("[BUF] flushed %u rows (%u bytes consumed of %u)\n",
                (unsigned)n, (unsigned)consumed, (unsigned)total);
  return true;
}

// ════════════════════════════════════════════════════════════════════════════
// CLOUD COMM
// ════════════════════════════════════════════════════════════════════════════
static bool postTelemetry(const String& json) {
  if (WiFi.status() != WL_CONNECTED) return false;
  HTTPClient http;
  http.begin(String(SUPABASE_URL) + "/functions/v1/esp32-api/sensor-data");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + DEVICE_TOKEN);
  const int code = http.POST(json);
  http.end();
  if (code >= 200 && code < 300) { lastWifiOkAt = millis(); return true; }
  return false;
}

static bool fetchDesiredState() {
  if (WiFi.status() != WL_CONNECTED) return false;
  HTTPClient http;
  const String url = String(SUPABASE_URL) +
    "/functions/v1/esp32-api/desired-state?device_id=" + DEVICE_ID;
  http.begin(url);
  http.addHeader("Authorization", String("Bearer ") + DEVICE_TOKEN);
  const int code = http.GET();
  if (code != 200) { http.end(); return false; }
  const String body = http.getString();
  http.end();

  StaticJsonDocument<768> doc;
  if (deserializeJson(doc, body)) return false;

  desired.fan_exhaust = doc["desired_fan_on"]       | actual.fan_exhaust;
  desired.fan_ceiling = doc["desired_fan_ceiling"]  | actual.fan_ceiling;
  desired.fan_circ    = doc["desired_fan_circ"]     | actual.fan_circ;
  desired.light       = doc["desired_light_on"]     | actual.light;
  desired.heater      = doc["desired_heater_on"]    | actual.heater;
  desired.fogger      = doc["desired_fogger_on"]    | actual.fogger;
  desired.alarm       = doc["desired_alarm_on"]     | actual.alarm;
  desired.sprinkler   = doc["desired_sprinkler_on"] | actual.sprinkler;

  // B1 — broiler brooding flag from cloud (active broiler batch, age < 21d)
  isBroilerBrooding = doc["is_broiler_brooding"]   | false;

  const bool manualReq = doc["manual_override"] | false;
  if (manualReq) manualOverrideUntil = millis() + safety::MANUAL_OVERRIDE_MS;

  lastWifiOkAt = millis();
  return true;
}

// ════════════════════════════════════════════════════════════════════════════
// GSM SMS FAILOVER (invariant #7)
//   GSMSerial.begin() is called once in setup() — repeated begin() races UART.
//   Per-class rate limiting prevents flooding.
// ════════════════════════════════════════════════════════════════════════════
static bool gsmRateOk(GsmAlertClass c) {
  const uint32_t now = millis();
  if (now - gsmLastSentAt[(int)c] < safety::GSM_RATE_LIMIT_MS &&
      gsmLastSentAt[(int)c] != 0) {
    return false;
  }
  gsmLastSentAt[(int)c] = now;
  return true;
}

static void sendGsmSms(GsmAlertClass c, const String& msg) {
  if (!gsmAvailable) return;                     // UART2 owned by ZE03-NH3
  if (gsmPhone.length() < 6) return;             // B6 — no phone configured
  if (!gsmRateOk(c)) return;
  GSMSerial.println("AT+CMGF=1");          delay(100);
  GSMSerial.printf("AT+CMGS=\"%s\"\r\n", gsmPhone.c_str()); delay(200);
  GSMSerial.print(msg); GSMSerial.write(26); // Ctrl+Z
  delay(500);
}

// B5 — invariant #7: fire SMS for ANY critical condition, not just ESM.
static void maybeSendCriticalSms(const SensorReading& r, float hsi) {
  const uint32_t now = millis();
  if (now - lastWifiOkAt < safety::WIFI_OFFLINE_GSM_MS) return;
  String dev = DEVICE_ID;
  if (inEmergencySurvivalMode) {
    sendGsmSms(GsmAlertClass::ESM,
               "FarmEye ESM: " + dev + " sensors offline");
  }
  if (!isnan(r.temperature) && r.temperature > safety::TEMP_EMERGENCY_HIGH) {
    sendGsmSms(GsmAlertClass::TEMP_HIGH,
               "FarmEye ALERT " + dev + ": temp=" + String(r.temperature,1) + "C");
  }
  if (!isnan(r.ammonia) && r.ammonia > safety::NH3_FAN_TRIGGER) {
    sendGsmSms(GsmAlertClass::NH3_HIGH,
               "FarmEye ALERT " + dev + ": NH3=" + String(r.ammonia,1) + "ppm");
  }
  if (!isnan(hsi) && hsi >= safety::HSI_SPRINKLER) {
    sendGsmSms(GsmAlertClass::HSI_HIGH,
               "FarmEye ALERT " + dev + ": HSI=" + String(hsi,1));
  }
}

// ════════════════════════════════════════════════════════════════════════════
// WIFI — non-blocking reconnect state machine (5→10→20→40→60s backoff)
// ════════════════════════════════════════════════════════════════════════════
enum class WifiState : uint8_t { IDLE, CONNECTING, CONNECTED_OK };
static WifiState wifiState        = WifiState::IDLE;
static uint32_t  wifiAttemptStart = 0;
static uint32_t  wifiNextRetryAt  = 0;
static uint32_t  wifiBackoffMs    = 5000;
static bool      wifiInitDone     = false;
static bool      wifiPrevConnected= false;

static void wifiBeginAttempt() {
  if (!wifiInitDone) { WiFi.mode(WIFI_STA); wifiInitDone = true; }
  WiFi.disconnect(false, false);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  wifiAttemptStart = millis();
  wifiState        = WifiState::CONNECTING;
  Serial.print("[WiFi] connecting…");
}

static void wifiTick() {
  const uint32_t now = millis();
  if (WiFi.status() == WL_CONNECTED) {
    if (!wifiPrevConnected) {
      Serial.printf("\n[WiFi] %s\n", WiFi.localIP().toString().c_str());
      wifiPrevConnected = true;
      wifiBackoffMs     = 5000;
    }
    wifiState    = WifiState::CONNECTED_OK;
    lastWifiOkAt = now;
    return;
  }
  if (wifiPrevConnected) { Serial.println("[WiFi] link lost"); wifiPrevConnected = false; }

  if (wifiState == WifiState::CONNECTING) {
    if (now - wifiAttemptStart > 15000) {
      Serial.printf("\n[WiFi] attempt failed, retry in %lus\n", wifiBackoffMs / 1000);
      wifiNextRetryAt = now + wifiBackoffMs;
      wifiBackoffMs   = min<uint32_t>(wifiBackoffMs * 2, 60000);
      wifiState       = WifiState::IDLE;
    }
    return;
  }
  if (now >= wifiNextRetryAt) wifiBeginAttempt();
}

// ════════════════════════════════════════════════════════════════════════════
// SETUP / LOOP
// ════════════════════════════════════════════════════════════════════════════
static uint32_t lastTelemetry = 0, lastPoll = 0, lastControl = 0, lastBufferFlush = 0;

void setup() {
  Serial.begin(115200); delay(500);
  Serial.printf("\nFarmEye ESP32 Industrial v%s (%s)\n", FW_VERSION, FW_CHANNEL);

  // B3 — Watchdog: panic+reset if main loop wedges for > WDT_TIMEOUT_S
  esp_task_wdt_init(timing::WDT_TIMEOUT_S, true);
  esp_task_wdt_add(NULL);

  // B6 — load configured phone from NVS Preferences
  prefs.begin("farmeye", true);
  gsmPhone = prefs.getString("phone", "");
  prefs.end();
  if (gsmPhone.length() > 0) Serial.printf("[GSM] phone configured: %s\n", gsmPhone.c_str());

  initRelays();
  detectSensors();

  // FIX (v10.1.1): start GSM only after sensor detection, and only when UART2
  // is free (no ZE03-NH3). Never on UART0 — that would corrupt the debug log
  // and push log text into the SIM800L.
  if (!sensors.ze03) {
    GSMSerial.begin(9600, SERIAL_8N1, pins::GSM_RX, pins::GSM_TX);
    gsmAvailable = true;
    Serial.println("[GSM] SIM800L on UART2 (GPIO27 RX / GPIO14 TX)");
  } else {
    Serial.println("[GSM] disabled — UART2 in use by ZE03-NH3");
  }

  if (!LittleFS.begin(true)) Serial.println("[FS] LittleFS mount failed");
  wifiBeginAttempt();
  lastSensorOkAt = millis();
}

void loop() {
  esp_task_wdt_reset();                   // B3 — pet the dog
  const uint32_t now = millis();
  wifiTick();

  // 2s control cycle — sensors + safety arbiter + relay apply
  if (now - lastControl >= timing::CONTROL_CYCLE_MS) {
    lastControl = now;
    const SensorReading r = readAllSensors();
    const float hsi = calcHSI(r.temperature, r.humidity);
    RelayState target = (now < manualOverrideUntil) ? actual : desired;
    target = enforceSafetyInvariants(target, r, hsi, r.ok, isBroilerBrooding);
    applyRelayState(target);
  }

  // 10s desired-state poll (cloud commands + brooding flag)
  if (now - lastPoll >= timing::POLL_DESIRED_MS) {
    lastPoll = now;
    if (WiFi.status() == WL_CONNECTED) fetchDesiredState();
  }

  // 30s telemetry (buffer locally on failure)
  if (now - lastTelemetry >= timing::TELEMETRY_MS) {
    lastTelemetry = now;
    const SensorReading r = readAllSensors();
    const float hsi = calcHSI(r.temperature, r.humidity);
    const String body = buildTelemetry(r);
    Serial.println(body);
    if (!postTelemetry(body)) {
      bufferAppend(body);                 // B4 — preserve data while offline
      maybeSendCriticalSms(r, hsi);       // B5 — SMS for any critical alert
    }
  }

  // 60s offline buffer flush attempt (no-op when buffer empty or WiFi down)
  if (now - lastBufferFlush >= timing::BUFFER_FLUSH_MS) {
    lastBufferFlush = now;
    if (WiFi.status() == WL_CONNECTED) flushOneBatchToCloud();
  }
}
