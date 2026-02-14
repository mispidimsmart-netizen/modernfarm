/**
 * ESP32 Offline-First Safety Engine v1.0
 * FarmEye Poultry Controller
 * 
 * Hard safety rules that ALWAYS override cloud commands.
 * Works without internet. Stores last valid config in NVS flash.
 * 
 * Include this header in your main esp32-industrial.ino
 * Usage: #include "esp32-safety-engine.h"
 */

#ifndef SAFETY_ENGINE_H
#define SAFETY_ENGINE_H

#include <Preferences.h>

// ─── SAFETY CONSTANTS (non-negotiable) ───
#define SAFE_TEMP_MAX          38.0f   // °C → force all fans ON
#define SAFE_TEMP_MIN          28.0f   // °C → heater ON
#define HEATER_MAX_RUN_SEC     300     // 5 minutes max continuous
#define HEATER_COOLDOWN_SEC    120     // 2 minutes cooldown
#define MOTOR_MAX_RUN_SEC      120     // 2 minutes max continuous
#define SENSOR_TIMEOUT_MS      20000   // 20s no update → SAFE MODE
#define CLOUD_TIMEOUT_MS       60000   // 60s no cloud → OFFLINE MODE
#define WDT_TIMEOUT_SEC        10      // Watchdog: 10s loop stuck → reset
#define RELAY_ACTIVE           LOW     // Active-LOW relay logic

// ─── SAFETY STATES ───
enum SafetyState {
  STATE_NORMAL,
  STATE_SAFE_MODE,
  STATE_OFFLINE_AUTONOMOUS,
  STATE_EMERGENCY_HEAT,
  STATE_EMERGENCY_COOL,
  STATE_SENSOR_FAIL
};

// ─── STORED AUTOMATION PROFILE ───
struct AutomationProfile {
  float temp_min;
  float temp_max;
  float humidity_min;
  float humidity_max;
  float ammonia_max;
  bool  fan_enabled;
  bool  heater_enabled;
  bool  fogger_enabled;
  bool  light_on;
  uint32_t checksum;
};

// ─── DEVICE TIMERS ───
struct DeviceTimer {
  unsigned long startedAt;
  unsigned long stoppedAt;
  bool running;
};

class SafetyEngine {
public:
  SafetyState state;
  
  SafetyEngine() : state(STATE_NORMAL) {
    _lastSensorUpdate = 0;
    _lastCloudSync = 0;
    _heaterTimer = {0, 0, false};
    _motorTimers[0] = {0, 0, false}; // exhaust fan
    _motorTimers[1] = {0, 0, false}; // circulation fan
    _motorTimers[2] = {0, 0, false}; // fogger pump
    _safetyOverride = false;
  }

  // ─── INIT: Call in setup() ───
  void begin() {
    // Enable hardware watchdog
    esp_task_wdt_init(WDT_TIMEOUT_SEC, true);
    esp_task_wdt_add(NULL);

    // Load last valid profile from flash
    _loadProfile();
    
    _lastSensorUpdate = millis();
    _lastCloudSync = millis();
    state = STATE_NORMAL;
    
    Serial.println(F("[SAFETY] Engine started v1.0"));
    Serial.printf("[SAFETY] Profile loaded: temp %.1f-%.1f\n", 
                  _profile.temp_min, _profile.temp_max);
  }

  // ─── MAIN TICK: Call every loop() iteration ───
  // Returns true if safety override is active (cloud commands blocked)
  bool tick(float temperature, float humidity, float ammonia, bool sensorValid) {
    esp_task_wdt_reset(); // Feed watchdog
    
    unsigned long now = millis();
    _safetyOverride = false;

    // ── Rule 3: Sensor timeout → SAFE MODE ──
    if (sensorValid) {
      _lastSensorUpdate = now;
    }
    if ((now - _lastSensorUpdate) > SENSOR_TIMEOUT_MS) {
      _enterSafeMode("SENSOR_TIMEOUT");
      return true;
    }

    if (!sensorValid) {
      // Don't process rules with bad data
      return _safetyOverride;
    }

    // ── Rule 1: Overheat emergency ──
    if (temperature > SAFE_TEMP_MAX) {
      state = STATE_EMERGENCY_COOL;
      _safetyOverride = true;
      _forceAllFansOn();
      _forceHeaterOff();
      Serial.printf("[SAFETY] EMERGENCY COOL: %.1f°C > %.1f°C\n", 
                    temperature, SAFE_TEMP_MAX);
    }
    // ── Rule 2: Cold emergency ──
    else if (temperature < SAFE_TEMP_MIN) {
      state = STATE_EMERGENCY_HEAT;
      _startHeaterSafe(now);
    }
    // ── Normal range ──
    else {
      if (state == STATE_EMERGENCY_COOL || state == STATE_EMERGENCY_HEAT) {
        state = STATE_NORMAL;
        Serial.println(F("[SAFETY] Returned to NORMAL"));
      }
    }

    // ── Rule 5: Heater cooldown enforcement ──
    _enforceHeaterLimits(now);

    // ── Rule 4: Motor runtime limits ──
    for (int i = 0; i < 3; i++) {
      _enforceMotorLimit(i, now);
    }

    // ── Rule 7: Cloud timeout → Offline Autonomous ──
    if ((now - _lastCloudSync) > CLOUD_TIMEOUT_MS) {
      if (state == STATE_NORMAL) {
        state = STATE_OFFLINE_AUTONOMOUS;
        Serial.println(F("[SAFETY] OFFLINE AUTONOMOUS MODE"));
      }
    }

    return _safetyOverride;
  }

  // ─── Call when cloud responds successfully ───
  void notifyCloudSync() {
    _lastCloudSync = millis();
    if (state == STATE_OFFLINE_AUTONOMOUS) {
      state = STATE_NORMAL;
      Serial.println(F("[SAFETY] Cloud restored → NORMAL"));
    }
  }

  // ─── Call when sensor produces valid reading ───
  void notifySensorUpdate() {
    _lastSensorUpdate = millis();
    if (state == STATE_SAFE_MODE || state == STATE_SENSOR_FAIL) {
      state = STATE_NORMAL;
      Serial.println(F("[SAFETY] Sensor restored → NORMAL"));
    }
  }

  // ─── Rule 8: Save current automation profile to flash ───
  void saveProfile(float tMin, float tMax, float hMin, float hMax, float aMax,
                   bool fan, bool heater, bool fogger, bool light) {
    _profile.temp_min = tMin;
    _profile.temp_max = tMax;
    _profile.humidity_min = hMin;
    _profile.humidity_max = hMax;
    _profile.ammonia_max = aMax;
    _profile.fan_enabled = fan;
    _profile.heater_enabled = heater;
    _profile.fogger_enabled = fogger;
    _profile.light_on = light;
    _profile.checksum = _calcChecksum(_profile);

    Preferences prefs;
    prefs.begin("safety", false);
    prefs.putBytes("profile", &_profile, sizeof(AutomationProfile));
    prefs.end();
    Serial.println(F("[SAFETY] Profile saved to flash"));
  }

  // ─── Get stored profile for offline operation ───
  AutomationProfile getProfile() { return _profile; }

  // ─── Track motor ON/OFF for Rule 4 ───
  void notifyMotorOn(int motorIdx) {
    if (motorIdx < 0 || motorIdx >= 3) return;
    if (!_motorTimers[motorIdx].running) {
      _motorTimers[motorIdx].startedAt = millis();
      _motorTimers[motorIdx].running = true;
    }
  }
  void notifyMotorOff(int motorIdx) {
    if (motorIdx < 0 || motorIdx >= 3) return;
    _motorTimers[motorIdx].running = false;
    _motorTimers[motorIdx].stoppedAt = millis();
  }

  // ─── Track heater ON/OFF for Rules 2,5 ───
  void notifyHeaterOn() {
    if (!_heaterTimer.running) {
      _heaterTimer.startedAt = millis();
      _heaterTimer.running = true;
    }
  }
  void notifyHeaterOff() {
    _heaterTimer.running = false;
    _heaterTimer.stoppedAt = millis();
  }

  // ─── Check if heater is allowed (cooldown respected) ───
  bool isHeaterAllowed() {
    unsigned long now = millis();
    if (_heaterTimer.running) {
      // Rule 2: Max 5 min continuous
      return (now - _heaterTimer.startedAt) < (HEATER_MAX_RUN_SEC * 1000UL);
    }
    if (_heaterTimer.stoppedAt > 0) {
      // Rule 5: 2 min cooldown
      return (now - _heaterTimer.stoppedAt) > (HEATER_COOLDOWN_SEC * 1000UL);
    }
    return true;
  }

  // ─── Check if motor is allowed (2 min limit) ───
  bool isMotorAllowed(int motorIdx) {
    if (motorIdx < 0 || motorIdx >= 3) return false;
    if (!_motorTimers[motorIdx].running) return true;
    unsigned long runtime = millis() - _motorTimers[motorIdx].startedAt;
    return runtime < (MOTOR_MAX_RUN_SEC * 1000UL);
  }

  // ─── Override outputs (called by safety engine) ───
  // Set these function pointers in setup() to connect to your relay pins
  void (*onForceAllFansOn)()  = nullptr;
  void (*onForceHeaterOn)()   = nullptr;
  void (*onForceHeaterOff)()  = nullptr;
  void (*onForceMotorOff)(int motorIdx) = nullptr;

  // ─── Status for telemetry ───
  const char* getStateName() {
    switch (state) {
      case STATE_NORMAL:              return "NORMAL";
      case STATE_SAFE_MODE:           return "SAFE_MODE";
      case STATE_OFFLINE_AUTONOMOUS:  return "OFFLINE_AUTO";
      case STATE_EMERGENCY_HEAT:      return "EMERGENCY_HEAT";
      case STATE_EMERGENCY_COOL:      return "EMERGENCY_COOL";
      case STATE_SENSOR_FAIL:         return "SENSOR_FAIL";
      default:                        return "UNKNOWN";
    }
  }

private:
  unsigned long _lastSensorUpdate;
  unsigned long _lastCloudSync;
  DeviceTimer _heaterTimer;
  DeviceTimer _motorTimers[3]; // exhaust, circulation, fogger pump
  AutomationProfile _profile;
  bool _safetyOverride;

  void _enterSafeMode(const char* reason) {
    if (state != STATE_SAFE_MODE) {
      state = STATE_SAFE_MODE;
      Serial.printf("[SAFETY] SAFE MODE: %s\n", reason);
      // In safe mode: fans ON low, heater OFF — bird survival priority
      _forceAllFansOn();
      _forceHeaterOff();
    }
    _safetyOverride = true;
  }

  void _forceAllFansOn() {
    if (onForceAllFansOn) onForceAllFansOn();
  }

  void _forceHeaterOff() {
    _heaterTimer.running = false;
    _heaterTimer.stoppedAt = millis();
    if (onForceHeaterOff) onForceHeaterOff();
  }

  void _startHeaterSafe(unsigned long now) {
    if (isHeaterAllowed()) {
      _safetyOverride = true;
      if (!_heaterTimer.running) {
        _heaterTimer.startedAt = now;
        _heaterTimer.running = true;
      }
      if (onForceHeaterOn) onForceHeaterOn();
      Serial.println(F("[SAFETY] EMERGENCY HEAT: Heater ON (safe)"));
    } else {
      Serial.println(F("[SAFETY] Heater blocked (cooldown/limit)"));
    }
  }

  void _enforceHeaterLimits(unsigned long now) {
    if (!_heaterTimer.running) return;
    unsigned long runtime = now - _heaterTimer.startedAt;
    if (runtime > (HEATER_MAX_RUN_SEC * 1000UL)) {
      Serial.println(F("[SAFETY] Heater MAX TIME → forced OFF"));
      _forceHeaterOff();
      _safetyOverride = true;
    }
  }

  void _enforceMotorLimit(int idx, unsigned long now) {
    if (!_motorTimers[idx].running) return;
    unsigned long runtime = now - _motorTimers[idx].startedAt;
    if (runtime > (MOTOR_MAX_RUN_SEC * 1000UL)) {
      Serial.printf("[SAFETY] Motor %d MAX TIME → forced OFF\n", idx);
      _motorTimers[idx].running = false;
      _motorTimers[idx].stoppedAt = now;
      if (onForceMotorOff) onForceMotorOff(idx);
      _safetyOverride = true;
    }
  }

  void _loadProfile() {
    Preferences prefs;
    prefs.begin("safety", true); // read-only
    size_t len = prefs.getBytesLength("profile");
    if (len == sizeof(AutomationProfile)) {
      prefs.getBytes("profile", &_profile, sizeof(AutomationProfile));
      uint32_t expected = _calcChecksum(_profile);
      if (_profile.checksum != expected) {
        Serial.println(F("[SAFETY] Profile checksum FAIL → defaults"));
        _setDefaults();
      }
    } else {
      Serial.println(F("[SAFETY] No saved profile → defaults"));
      _setDefaults();
    }
    prefs.end();
  }

  void _setDefaults() {
    _profile.temp_min = 22.0f;
    _profile.temp_max = 32.0f;
    _profile.humidity_min = 40.0f;
    _profile.humidity_max = 80.0f;
    _profile.ammonia_max = 25.0f;
    _profile.fan_enabled = true;
    _profile.heater_enabled = true;
    _profile.fogger_enabled = false;
    _profile.light_on = false;
    _profile.checksum = _calcChecksum(_profile);
  }

  uint32_t _calcChecksum(AutomationProfile& p) {
    // Simple Fletcher-16 over profile bytes (excluding checksum field)
    uint8_t* data = (uint8_t*)&p;
    size_t len = sizeof(AutomationProfile) - sizeof(uint32_t);
    uint32_t sum1 = 0, sum2 = 0;
    for (size_t i = 0; i < len; i++) {
      sum1 = (sum1 + data[i]) % 255;
      sum2 = (sum2 + sum1) % 255;
    }
    return (sum2 << 8) | sum1;
  }
};

#endif // SAFETY_ENGINE_H
