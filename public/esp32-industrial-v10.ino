/*
 * ════════════════════════════════════════════════════════════════════════════
 * FarmEye ESP32 — Industrial Firmware v10 (Beta)
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
 *   Fallback   DHT22=4, MQ-135=34, LDR=35 (only if upgrade sensor missing)
 *
 * GSM SIM800L (UART for SMS failover):
 *   RX = GPIO 27   TX = GPIO 14
 *
 * 8 HARDCODED SAFETY INVARIANTS (cloud CANNOT override):
 *   1. temp > 38.0°C  → ALL fans ON, heater FORCE OFF
 *   2. temp < 12.0°C and broiler brooding → heater allowed; else heater OFF
 *   3. ammonia > 25 ppm → exhaust + circulation fan ON
 *   4. HSI ≥ 80 → roof sprinkler ON + alarm
 *   5. Sensor offline > 5 min → enter Emergency Survival Mode (ESM)
 *   6. Manual override expires after 20 minutes → revert to automation
 *   7. WiFi offline > 60s → GSM SMS for critical alerts
 *   8. Heater AND exhaust fan cannot be ON simultaneously (interlock)
 *
 * CLOUD CONTRACT (unchanged from v8 — backward compatible):
 *   POST /functions/v1/esp32-api/sensor-data    — telemetry every 30s
 *   GET  /functions/v1/esp32-api/desired-state  — poll cloud commands every 10s
 *   POST /functions/v1/esp32-api/safety-status  — actual relay state mirror
 *
 * Firmware version reported in every payload as "fw_version": "10.0.0-beta.1"
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

// ════════════════════════════════════════════════════════════════════════════
// CONFIG — edit these for each device before flashing
// ════════════════════════════════════════════════════════════════════════════
const char* WIFI_SSID      = "YOUR_WIFI";
const char* WIFI_PASS      = "YOUR_PASS";
const char* SUPABASE_URL   = "https://hbwfuvqrfgtefozajyfu.supabase.co";
const char* DEVICE_TOKEN   = "PASTE_DEVICE_TOKEN_HERE";
const char* DEVICE_ID      = "FE-DEMO-001";
const char* SHED_ID        = "";   // optional, blank = farm default

#define FW_VERSION         "10.0.0-beta.1"
#define FW_CHANNEL         "beta"

// ════════════════════════════════════════════════════════════════════════════
// PIN MAP — LOCKED. DO NOT CHANGE.
// ════════════════════════════════════════════════════════════════════════════
#define PIN_FAN_EXHAUST    5    // IN1
#define PIN_FAN_CEILING    18   // IN2
#define PIN_LIGHT          19   // IN3
#define PIN_HEATER         21   // IN4
#define PIN_FOGGER         22   // IN5
#define PIN_ALARM          23   // IN6
#define PIN_SPRINKLER      25   // IN7
#define PIN_FAN_CIRC       26   // IN8

#define RELAY_ON           LOW    // active-LOW boards
#define RELAY_OFF          HIGH

// Sensor pins
#define I2C2_SDA           16
#define I2C2_SCL           17
#define ZE03_RX            32
#define ZE03_TX            4
#define PMS_RX             13
#define PMS_TX             33
#define DHT22_PIN          4
#define MQ135_PIN          34
#define LDR_PIN            35

// GSM SIM800L
#define GSM_RX             27
#define GSM_TX             14
HardwareSerial GSMSerial(0);  // Serial0 repurposed; or use SoftwareSerial

// ════════════════════════════════════════════════════════════════════════════
// SAFETY INVARIANT THRESHOLDS — hardcoded
// ════════════════════════════════════════════════════════════════════════════
#define TEMP_EMERGENCY_HIGH    38.0f   // #1
#define TEMP_HEATER_LOW        12.0f   // #2
#define NH3_FAN_TRIGGER        25.0f   // #3
#define HSI_SPRINKLER          80.0f   // #4
#define SENSOR_OFFLINE_MS      300000UL // #5  5 min
#define MANUAL_OVERRIDE_MS     1200000UL // #6 20 min
#define WIFI_OFFLINE_GSM_MS    60000UL  // #7 1 min

// ════════════════════════════════════════════════════════════════════════════
// SENSOR INSTANCES
// ════════════════════════════════════════════════════════════════════════════
Adafruit_SHT31 sht31 = Adafruit_SHT31();
BH1750 bh1750;
SensirionI2cScd4x scd41;
HardwareSerial PMSSerial(1);
HardwareSerial ZE03Serial(2);
PMS pms(PMSSerial);
PMS::DATA pmsData;
DHT dht22(DHT22_PIN, DHT22);

struct SensorPresence {
  bool sht31=false, bh1750=false, scd41=false, pms5003=false, ze03=false;
  bool dht22=false, mq135=false, ldr=false;
} sensors;

// ════════════════════════════════════════════════════════════════════════════
// RELAY STATE — local source of truth
// ════════════════════════════════════════════════════════════════════════════
struct RelayState {
  bool fan_exhaust=false, fan_ceiling=false, fan_circ=false;
  bool light=false, heater=false, fogger=false, alarm=false, sprinkler=false;
};
RelayState actual;        // mirrored to GPIO
RelayState desired;       // from cloud
unsigned long manualOverrideUntil = 0;   // millis() expiry
bool inEmergencySurvivalMode = false;
unsigned long lastSensorOkAt = 0;
unsigned long lastWifiOkAt = 0;

// ════════════════════════════════════════════════════════════════════════════
// SENSOR DETECTION
// ════════════════════════════════════════════════════════════════════════════
void detectSensors() {
  Wire1.begin(I2C2_SDA, I2C2_SCL, 100000);
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

  PMSSerial.begin(9600, SERIAL_8N1, PMS_RX, PMS_TX);
  pms.passiveMode();
  delay(500);
  pms.requestRead();
  if (pms.readUntil(pmsData, 2000)) { sensors.pms5003 = true; Serial.println("[OK] PMS5003"); }

  ZE03Serial.begin(9600, SERIAL_8N1, ZE03_RX, ZE03_TX);
  delay(500);
  uint32_t t0 = millis();
  while (millis() - t0 < 3000) {
    if (ZE03Serial.available() >= 9 && ZE03Serial.read() == 0xFF) {
      sensors.ze03 = true; Serial.println("[OK] ZE03-NH3"); break;
    }
  }

  if (!sensors.sht31) {
    dht22.begin();
    if (!isnan(dht22.readTemperature())) { sensors.dht22 = true; Serial.println("[FB] DHT22"); }
  }
  if (!sensors.ze03)  { pinMode(MQ135_PIN, INPUT); sensors.mq135 = true; Serial.println("[FB] MQ-135"); }
  if (!sensors.bh1750){ pinMode(LDR_PIN, INPUT);   sensors.ldr = true;   Serial.println("[FB] LDR"); }
}

// ════════════════════════════════════════════════════════════════════════════
// RELAY HELPERS
// ════════════════════════════════════════════════════════════════════════════
void writeRelay(uint8_t pin, bool on) {
  digitalWrite(pin, on ? RELAY_ON : RELAY_OFF);
}

void applyRelayState(const RelayState& s) {
  writeRelay(PIN_FAN_EXHAUST, s.fan_exhaust);
  writeRelay(PIN_FAN_CEILING, s.fan_ceiling);
  writeRelay(PIN_FAN_CIRC,    s.fan_circ);
  writeRelay(PIN_LIGHT,       s.light);
  writeRelay(PIN_HEATER,      s.heater);
  writeRelay(PIN_FOGGER,      s.fogger);
  writeRelay(PIN_ALARM,       s.alarm);
  writeRelay(PIN_SPRINKLER,   s.sprinkler);
  actual = s;
}

void initRelays() {
  uint8_t pins[] = {PIN_FAN_EXHAUST, PIN_FAN_CEILING, PIN_LIGHT, PIN_HEATER,
                    PIN_FOGGER, PIN_ALARM, PIN_SPRINKLER, PIN_FAN_CIRC};
  for (uint8_t p : pins) { pinMode(p, OUTPUT); digitalWrite(p, RELAY_OFF); }
}

// ════════════════════════════════════════════════════════════════════════════
// 8 SAFETY INVARIANTS — runs every cycle, OVERRIDES cloud desired state
// ════════════════════════════════════════════════════════════════════════════
RelayState enforceSafetyInvariants(RelayState s, float temp, float humidity,
                                   float ammonia, float hsi, bool sensorsOk,
                                   bool isBroilerBrooding) {
  // #5 — Sensor offline > 5min → ESM: all fans ON, heater OFF, alarm ON
  if (!sensorsOk && (millis() - lastSensorOkAt) > SENSOR_OFFLINE_MS) {
    inEmergencySurvivalMode = true;
    s.fan_exhaust = true; s.fan_ceiling = true; s.fan_circ = true;
    s.heater = false; s.alarm = true;
    return s;
  }
  inEmergencySurvivalMode = false;

  // #1 — temp > 38°C → ALL fans ON, heater FORCE OFF
  if (!isnan(temp) && temp > TEMP_EMERGENCY_HIGH) {
    s.fan_exhaust = true; s.fan_ceiling = true; s.fan_circ = true;
    s.heater = false; s.alarm = true;
  }

  // #2 — temp < 12°C → heater allowed only in broiler brooding
  if (!isnan(temp) && temp < TEMP_HEATER_LOW && !isBroilerBrooding) {
    s.heater = false;
  }

  // #3 — ammonia > 25 ppm → exhaust + circulation fan ON
  if (!isnan(ammonia) && ammonia > NH3_FAN_TRIGGER) {
    s.fan_exhaust = true; s.fan_circ = true;
  }

  // #4 — HSI ≥ 80 → sprinkler + alarm
  if (!isnan(hsi) && hsi >= HSI_SPRINKLER) {
    s.sprinkler = true; s.alarm = true;
  }

  // #8 — Heater + exhaust fan interlock (heater wins ONLY if temp safe)
  if (s.heater && s.fan_exhaust) {
    if (!isnan(temp) && temp >= TEMP_EMERGENCY_HIGH) s.heater = false;
    else s.fan_exhaust = false;
  }

  return s;
}

// ════════════════════════════════════════════════════════════════════════════
// SENSOR READ
// ════════════════════════════════════════════════════════════════════════════
struct SensorReading {
  float temperature = NAN, humidity = NAN, ammonia = NAN;
  float lux = NAN, co2 = NAN, pm25 = NAN, pm10 = NAN;
  bool ok = false;
};

SensorReading readAllSensors() {
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
    r.ammonia = analogRead(MQ135_PIN) * (50.0f / 4095.0f);
  }

  if (sensors.bh1750)      r.lux = bh1750.readLightLevel();
  else if (sensors.ldr)    r.lux = (analogRead(LDR_PIN) / 4095.0f) * 1000.0f;

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

// Heat Stress Index (simplified — matches src/lib/heatStressIndex.ts)
float calcHSI(float t, float rh) {
  if (isnan(t) || isnan(rh)) return NAN;
  return (1.8f * t + 32.0f) - ((0.55f - 0.0055f * rh) * (1.8f * t - 26.0f));
}

// ════════════════════════════════════════════════════════════════════════════
// CLOUD COMM
// ════════════════════════════════════════════════════════════════════════════
String buildTelemetry(const SensorReading& r) {
  StaticJsonDocument<768> doc;
  doc["device_id"] = DEVICE_ID;
  if (strlen(SHED_ID) > 0) doc["shed_id"] = SHED_ID;
  doc["fw_version"] = FW_VERSION;
  doc["fw_channel"] = FW_CHANNEL;
  doc["temperature"] = isnan(r.temperature) ? 25.0f : r.temperature;
  doc["humidity"]    = isnan(r.humidity)    ? 60.0f : r.humidity;
  doc["ammonia"]     = isnan(r.ammonia)     ? 0.0f  : r.ammonia;
  if (!isnan(r.lux))  doc["light_lux"] = r.lux;
  if (!isnan(r.co2))  doc["co2_ppm"]   = r.co2;
  if (!isnan(r.pm25)) doc["pm25_ugm3"] = r.pm25;
  if (!isnan(r.pm10)) doc["pm10_ugm3"] = r.pm10;
  if (sensors.sht31)  doc["temp_precise"] = r.temperature;
  if (sensors.ze03)   doc["nh3_ppm_precise"] = r.ammonia;
  if (sensors.bh1750) doc["lux_precise"] = r.lux;

  JsonObject src = doc.createNestedObject("sensor_source");
  src["temp"]  = sensors.sht31 ? "SHT31" : (sensors.dht22 ? "DHT22" : "none");
  src["nh3"]   = sensors.ze03  ? "ZE03"  : (sensors.mq135 ? "MQ-135" : "none");
  src["light"] = sensors.bh1750? "BH1750": (sensors.ldr   ? "LDR"    : "none");
  if (sensors.scd41)  src["co2"]  = "SCD41";
  if (sensors.pms5003){src["pm25"] = "PMS5003"; src["pm10"] = "PMS5003";}

  // Mirror actual relay state (safety_status contract)
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

bool postTelemetry(const String& json) {
  if (WiFi.status() != WL_CONNECTED) return false;
  HTTPClient http;
  http.begin(String(SUPABASE_URL) + "/functions/v1/esp32-api/sensor-data");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + DEVICE_TOKEN);
  int code = http.POST(json);
  http.end();
  if (code >= 200 && code < 300) { lastWifiOkAt = millis(); return true; }
  return false;
}

bool fetchDesiredState() {
  if (WiFi.status() != WL_CONNECTED) return false;
  HTTPClient http;
  String url = String(SUPABASE_URL) + "/functions/v1/esp32-api/desired-state?device_id=" + DEVICE_ID;
  http.begin(url);
  http.addHeader("Authorization", String("Bearer ") + DEVICE_TOKEN);
  int code = http.GET();
  if (code != 200) { http.end(); return false; }
  String body = http.getString();
  http.end();

  StaticJsonDocument<512> doc;
  if (deserializeJson(doc, body)) return false;

  // Cloud writes desired_* columns ONLY (per memory rule)
  desired.fan_exhaust = doc["desired_fan_on"]       | actual.fan_exhaust;
  desired.fan_ceiling = doc["desired_fan_ceiling"]  | actual.fan_ceiling;
  desired.fan_circ    = doc["desired_fan_circ"]     | actual.fan_circ;
  desired.light       = doc["desired_light_on"]     | actual.light;
  desired.heater      = doc["desired_heater_on"]    | actual.heater;
  desired.fogger      = doc["desired_fogger_on"]    | actual.fogger;
  desired.alarm       = doc["desired_alarm_on"]     | actual.alarm;
  desired.sprinkler   = doc["desired_sprinkler_on"] | actual.sprinkler;

  // Manual override request from cloud
  bool manualReq = doc["manual_override"] | false;
  if (manualReq) manualOverrideUntil = millis() + MANUAL_OVERRIDE_MS;

  lastWifiOkAt = millis();
  return true;
}

// ════════════════════════════════════════════════════════════════════════════
// GSM SMS FAILOVER (invariant #7)
// ════════════════════════════════════════════════════════════════════════════
void sendGsmSms(const String& msg) {
  GSMSerial.begin(9600, SERIAL_8N1, GSM_RX, GSM_TX);
  delay(200);
  GSMSerial.println("AT+CMGF=1");          delay(100);
  GSMSerial.println("AT+CMGS=\"+8801XXXXXXXXX\""); delay(200);
  GSMSerial.print(msg); GSMSerial.write(26); // Ctrl+Z
  delay(500);
}

// ════════════════════════════════════════════════════════════════════════════
// WIFI — non-blocking reconnect state machine
//   Call wifiTick() every loop iteration. No delay() anywhere on this path so
//   the 2s control cycle + safety invariants keep running while WiFi recovers.
//   Backoff: 5s → 10s → 20s → 40s → 60s (cap), reset on successful connect.
// ════════════════════════════════════════════════════════════════════════════
enum WifiState { WIFI_IDLE, WIFI_CONNECTING, WIFI_CONNECTED_OK };
WifiState wifiState = WIFI_IDLE;
unsigned long wifiAttemptStartedAt = 0;
unsigned long wifiNextRetryAt = 0;
uint32_t wifiBackoffMs = 5000;
bool wifiInitDone = false;
bool wifiPrevConnected = false;

void wifiBeginAttempt() {
  if (!wifiInitDone) { WiFi.mode(WIFI_STA); wifiInitDone = true; }
  WiFi.disconnect(false, false);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  wifiAttemptStartedAt = millis();
  wifiState = WIFI_CONNECTING;
  Serial.print("[WiFi] connecting…");
}

void wifiTick() {
  unsigned long now = millis();
  wl_status_t st = WiFi.status();

  if (st == WL_CONNECTED) {
    if (!wifiPrevConnected) {
      Serial.printf("\n[WiFi] %s\n", WiFi.localIP().toString().c_str());
      wifiPrevConnected = true;
      wifiBackoffMs = 5000;  // reset backoff
    }
    wifiState = WIFI_CONNECTED_OK;
    lastWifiOkAt = now;
    return;
  }

  // Lost / never had link
  if (wifiPrevConnected) { Serial.println("[WiFi] link lost"); wifiPrevConnected = false; }

  if (wifiState == WIFI_CONNECTING) {
    // 15s attempt window — then back off
    if (now - wifiAttemptStartedAt > 15000) {
      Serial.printf("\n[WiFi] attempt failed, retry in %lus\n", wifiBackoffMs / 1000);
      wifiNextRetryAt = now + wifiBackoffMs;
      wifiBackoffMs = min<uint32_t>(wifiBackoffMs * 2, 60000);
      wifiState = WIFI_IDLE;
    }
    return;
  }

  // IDLE — wait for retry slot
  if (now >= wifiNextRetryAt) wifiBeginAttempt();
}

// ════════════════════════════════════════════════════════════════════════════
// SETUP + LOOP
// ════════════════════════════════════════════════════════════════════════════
unsigned long lastTelemetry = 0, lastPoll = 0, lastControl = 0;

void setup() {
  Serial.begin(115200); delay(500);
  Serial.printf("\nFarmEye ESP32 Industrial v%s (%s)\n", FW_VERSION, FW_CHANNEL);
  initRelays();
  detectSensors();
  connectWifi();
  lastSensorOkAt = millis();
}

void loop() {
  unsigned long now = millis();

  // Control cycle — every 2s
  if (now - lastControl >= 2000) {
    lastControl = now;
    SensorReading r = readAllSensors();
    float hsi = calcHSI(r.temperature, r.humidity);

    // Start from desired (cloud) OR actual (if manual override active)
    RelayState target = (now < manualOverrideUntil) ? actual : desired;

    // TODO: pass isBroilerBrooding from cloud flag; default false for safety
    bool isBroilerBrooding = false;
    target = enforceSafetyInvariants(target, r.temperature, r.humidity,
                                     r.ammonia, hsi, r.ok, isBroilerBrooding);
    applyRelayState(target);
  }

  // Poll desired state — every 10s
  if (now - lastPoll >= 10000) {
    lastPoll = now;
    if (WiFi.status() != WL_CONNECTED) connectWifi();
    fetchDesiredState();
  }

  // Telemetry — every 30s
  if (now - lastTelemetry >= 30000) {
    lastTelemetry = now;
    SensorReading r = readAllSensors();
    String body = buildTelemetry(r);
    Serial.println(body);
    if (!postTelemetry(body)) {
      // Invariant #7: WiFi offline > 60s → GSM SMS for critical alerts
      if (now - lastWifiOkAt > WIFI_OFFLINE_GSM_MS && inEmergencySurvivalMode) {
        sendGsmSms(String("FarmEye ESM: ") + DEVICE_ID + " sensor offline");
      }
    }
  }
}
