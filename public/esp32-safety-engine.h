/**
 * ESP32 Offline-First Safety Engine v2.0
 * FarmEye Poultry Controller
 * 
 * Hard safety rules that ALWAYS override cloud commands.
 * Works without internet. Stores last valid config in NVS flash.
 * 
 * v2.0 Changes:
 *   - Actuator effect validation (fan must cool, heater must heat)
 *   - Thermal model plausibility (±3°C deviation = sensor invalid)
 *   - Worst-case sensor selection (max temp for cooling, min for heating)
 *   - Post-reboot safety protocol (3 min heater lockout, vent purge, NH3 mute)
 *   - Bird age jump rejection (>2 days/24h blocked)
 *   - Backend safety-engine integration (60s periodic call)
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

// ─── ACTUATOR EFFECT VALIDATION ───
#define EFFECT_VALIDATION_WINDOW_MS  360000UL  // 6 minutes observation window
#define FAN_EXPECTED_COOLING_C       0.5f      // Must drop ≥0.5°C when fan ON 6 min
#define HEATER_EXPECTED_HEATING_C    1.0f      // Must rise ≥1.0°C when heater ON 6 min
#define EFFECT_CHECK_INTERVAL_MS     60000UL   // Check every 60s

// ─── THERMAL MODEL PLAUSIBILITY ───
#define THERMAL_MODEL_MAX_DEVIATION  3.0f      // °C deviation from expected → sensor invalid
#define THERMAL_HEATER_RATE          0.06f     // Expected °C/min when heater ON
#define THERMAL_FAN_RATE            -0.04f     // Expected °C/min when fan ON (cooling)
#define THERMAL_PASSIVE_RATE         0.0f      // Expected °C/min when idle

// ─── POST-REBOOT SAFETY ───
#define REBOOT_HEATER_LOCKOUT_MS     180000UL  // 3 minutes heater disabled after reboot
#define REBOOT_VENT_PURGE_MS         180000UL  // 3 minutes forced ventilation after reboot
#define REBOOT_NH3_ALERT_MUTE_MS     300000UL  // 5 minutes NH3 alerts muted (vent still active)

// ─── BIRD AGE VALIDATION ───
#define AGE_MIN_DAYS             0
#define AGE_MAX_DAYS             60
#define AGE_MAX_JUMP_PER_24H     2

// ─── BACKEND SAFETY ENGINE INTEGRATION ───
#define SAFETY_ENGINE_CALL_INTERVAL_MS  60000UL  // Call backend every 60 seconds

// ─── SAFETY STATES ───
enum SafetyState {
  STATE_NORMAL,
  STATE_SAFE_MODE,
  STATE_OFFLINE_AUTONOMOUS,
  STATE_EMERGENCY_HEAT,
  STATE_EMERGENCY_COOL,
  STATE_SENSOR_FAIL,
  STATE_ACTUATOR_FAIL,
  STATE_SURVIVAL
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

// ─── ACTUATOR EFFECT TRACKER ───
struct ActuatorEffectTracker {
  float tempAtStart;          // Temperature when actuator was turned ON
  unsigned long onSince;      // millis() when turned ON
  bool tracking;              // Currently tracking effect
  int consecutiveFailures;    // How many consecutive effect checks failed
  bool effectVerified;        // Last check passed
};

// ─── THERMAL MODEL STATE ───
struct ThermalModelState {
  float expectedTemp;          // What temp SHOULD be based on actuator activity
  float lastModelUpdate;       // When model was last recalculated
  bool sensorPlausible;        // Is current reading within model bounds
  int implausibleCount;        // Consecutive implausible readings
  String implausibleReason;    // Why sensor is considered implausible
};

// ─── REBOOT SAFETY STATE ───
struct RebootSafetyState {
  bool heaterLocked;           // Heater disabled post-reboot
  bool ventPurgeActive;        // Forced ventilation post-reboot
  bool nh3AlertsMuted;         // NH3 alerts muted (vent still responds)
  unsigned long bootTime;      // millis() at boot
};

// ─── AGE VALIDATION STATE ───
struct AgeValidationState {
  int lastAcceptedAge;
  unsigned long lastAgeChangeTime;  // millis() of last accepted age change
  int rejectedCount;
};

class SafetyEngine {
public:
  SafetyState state;
  ActuatorEffectTracker fanEffect;
  ActuatorEffectTracker heaterEffect;
  ThermalModelState thermalModel;
  RebootSafetyState rebootSafety;
  AgeValidationState ageValidation;
  
  // Worst-case sensor values (from dual DHT22)
  float worstCaseMaxTemp;    // MAX of both sensors (for cooling decisions)
  float worstCaseMinTemp;    // MIN of both sensors (for heating decisions)
  bool dualSensorAvailable;
  
  // Backend safety engine
  unsigned long lastSafetyEngineCall;
  bool backendSafetyActive;
  
  SafetyEngine() : state(STATE_NORMAL) {
    _lastSensorUpdate = 0;
    _lastCloudSync = 0;
    _heaterTimer = {0, 0, false};
    _motorTimers[0] = {0, 0, false};
    _motorTimers[1] = {0, 0, false};
    _motorTimers[2] = {0, 0, false};
    _safetyOverride = false;
    
    fanEffect = {0, 0, false, 0, false};
    heaterEffect = {0, 0, false, 0, false};
    thermalModel = {25.0f, 0, true, 0, ""};
    rebootSafety = {true, true, true, 0};
    ageValidation = {0, 0, 0};
    
    worstCaseMaxTemp = 25.0f;
    worstCaseMinTemp = 25.0f;
    dualSensorAvailable = false;
    lastSafetyEngineCall = 0;
    backendSafetyActive = false;
  }

  // ─── INIT: Call in setup() ───
  void begin() {
    esp_task_wdt_init(WDT_TIMEOUT_SEC, true);
    esp_task_wdt_add(NULL);
    _loadProfile();
    
    _lastSensorUpdate = millis();
    _lastCloudSync = millis();
    rebootSafety.bootTime = millis();
    rebootSafety.heaterLocked = true;
    rebootSafety.ventPurgeActive = true;
    rebootSafety.nh3AlertsMuted = true;
    state = STATE_NORMAL;
    
    // Load last accepted age from NVS
    Preferences prefs;
    prefs.begin("age_safety", true);
    ageValidation.lastAcceptedAge = prefs.getInt("last_age", 0);
    ageValidation.lastAgeChangeTime = 0; // Reset on reboot (millis-based)
    prefs.end();
    
    Serial.println(F("[SAFETY] Engine v2.0 started"));
    Serial.println(F("[SAFETY] Post-reboot: heater LOCKED 3min, vent PURGE 3min, NH3 alerts MUTED 5min"));
  }

  // ─── MAIN TICK ───
  bool tick(float temperature, float humidity, float ammonia, 
            bool sensorValid, bool fanOn, bool heaterOn,
            float temp2 = NAN, bool dht2ok = false) {
    esp_task_wdt_reset();
    unsigned long now = millis();
    _safetyOverride = false;

    // ── Update worst-case sensor values ──
    updateWorstCase(temperature, temp2, dht2ok);
    
    // ── Post-reboot safety protocol ──
    checkRebootSafety(now);
    
    // ── Sensor timeout ──
    if (sensorValid) _lastSensorUpdate = now;
    if ((now - _lastSensorUpdate) > SENSOR_TIMEOUT_MS) {
      _enterSafeMode("SENSOR_TIMEOUT");
      return true;
    }
    if (!sensorValid) return _safetyOverride;

    // ── Thermal model plausibility ──
    checkThermalPlausibility(temperature, fanOn, heaterOn, now);
    
    // ── Actuator effect validation ──
    checkActuatorEffects(temperature, fanOn, heaterOn, now);
    
    // ── Overheat emergency (use WORST CASE max temp) ──
    float safetyTemp = dualSensorAvailable ? worstCaseMaxTemp : temperature;
    if (safetyTemp > SAFE_TEMP_MAX) {
      state = STATE_EMERGENCY_COOL;
      _safetyOverride = true;
      _forceAllFansOn();
      _forceHeaterOff();
      Serial.printf("[SAFETY] EMERGENCY COOL: %.1f°C > %.1f°C (worst-case)\n", 
                    safetyTemp, SAFE_TEMP_MAX);
    }
    // ── Cold emergency (use WORST CASE min temp) ──
    else if (!rebootSafety.heaterLocked) {
      float heatingTemp = dualSensorAvailable ? worstCaseMinTemp : temperature;
      if (heatingTemp < SAFE_TEMP_MIN) {
        state = STATE_EMERGENCY_HEAT;
        _startHeaterSafe(now);
      }
    }
    // ── Normal range ──
    if (state == STATE_EMERGENCY_COOL || state == STATE_EMERGENCY_HEAT) {
      if (safetyTemp <= SAFE_TEMP_MAX && safetyTemp >= SAFE_TEMP_MIN) {
        state = STATE_NORMAL;
      }
    }

    // ── Heater cooldown ──
    _enforceHeaterLimits(now);
    
    // ── Motor runtime limits ──
    for (int i = 0; i < 3; i++) _enforceMotorLimit(i, now);

    // ── Cloud timeout ──
    if ((now - _lastCloudSync) > CLOUD_TIMEOUT_MS) {
      if (state == STATE_NORMAL) state = STATE_OFFLINE_AUTONOMOUS;
    }

    // ── Reboot heater lockout ──
    if (rebootSafety.heaterLocked) {
      _safetyOverride = true;
      _forceHeaterOff();
    }

    return _safetyOverride;
  }

  // ─── WORST-CASE SENSOR SELECTION ───
  void updateWorstCase(float t1, float t2, bool t2ok) {
    dualSensorAvailable = t2ok && !isnan(t2);
    if (dualSensorAvailable) {
      worstCaseMaxTemp = max(t1, t2);  // Use HIGHEST for cooling decisions
      worstCaseMinTemp = min(t1, t2);  // Use LOWEST for heating decisions
    } else {
      worstCaseMaxTemp = t1;
      worstCaseMinTemp = t1;
    }
  }

  // ─── ACTUATOR EFFECT VALIDATION ───
  void checkActuatorEffects(float currentTemp, bool fanOn, bool heaterOn, unsigned long now) {
    // --- Fan effect tracking ---
    if (fanOn && !fanEffect.tracking) {
      fanEffect.tempAtStart = currentTemp;
      fanEffect.onSince = now;
      fanEffect.tracking = true;
    } else if (!fanOn) {
      fanEffect.tracking = false;
    }
    
    if (fanEffect.tracking && (now - fanEffect.onSince >= EFFECT_VALIDATION_WINDOW_MS)) {
      float tempDrop = fanEffect.tempAtStart - currentTemp;
      if (tempDrop < FAN_EXPECTED_COOLING_C) {
        fanEffect.consecutiveFailures++;
        fanEffect.effectVerified = false;
        Serial.printf("[SAFETY] ⚠️ FAN EFFECT FAIL #%d: Expected ≥%.1f°C drop, got %.2f°C\n",
                      fanEffect.consecutiveFailures, FAN_EXPECTED_COOLING_C, tempDrop);
        if (fanEffect.consecutiveFailures >= 2) {
          _enterSurvivalMode("FAN_NO_COOLING_EFFECT");
        }
      } else {
        fanEffect.consecutiveFailures = 0;
        fanEffect.effectVerified = true;
      }
      // Reset tracking for next window
      fanEffect.tempAtStart = currentTemp;
      fanEffect.onSince = now;
    }
    
    // --- Heater effect tracking ---
    if (heaterOn && !heaterEffect.tracking) {
      heaterEffect.tempAtStart = currentTemp;
      heaterEffect.onSince = now;
      heaterEffect.tracking = true;
    } else if (!heaterOn) {
      heaterEffect.tracking = false;
    }
    
    if (heaterEffect.tracking && (now - heaterEffect.onSince >= EFFECT_VALIDATION_WINDOW_MS)) {
      float tempRise = currentTemp - heaterEffect.tempAtStart;
      if (tempRise < HEATER_EXPECTED_HEATING_C) {
        heaterEffect.consecutiveFailures++;
        heaterEffect.effectVerified = false;
        Serial.printf("[SAFETY] ⚠️ HEATER EFFECT FAIL #%d: Expected ≥%.1f°C rise, got %.2f°C\n",
                      heaterEffect.consecutiveFailures, HEATER_EXPECTED_HEATING_C, tempRise);
        if (heaterEffect.consecutiveFailures >= 2) {
          _enterSurvivalMode("HEATER_NO_HEATING_EFFECT");
        }
      } else {
        heaterEffect.consecutiveFailures = 0;
        heaterEffect.effectVerified = true;
      }
      heaterEffect.tempAtStart = currentTemp;
      heaterEffect.onSince = now;
    }
  }

  // ─── THERMAL MODEL PLAUSIBILITY ───
  void checkThermalPlausibility(float actualTemp, bool fanOn, bool heaterOn, unsigned long now) {
    if (thermalModel.lastModelUpdate == 0) {
      thermalModel.expectedTemp = actualTemp;
      thermalModel.lastModelUpdate = now;
      return;
    }
    
    float elapsedMin = (now - (unsigned long)thermalModel.lastModelUpdate) / 60000.0f;
    if (elapsedMin < 1.0f) return; // Only check every minute
    
    // Calculate expected temperature based on actuator activity
    float rate = THERMAL_PASSIVE_RATE;
    if (heaterOn) rate = THERMAL_HEATER_RATE;
    else if (fanOn) rate = THERMAL_FAN_RATE;
    
    thermalModel.expectedTemp += rate * elapsedMin;
    // Clamp to sane range
    thermalModel.expectedTemp = constrain(thermalModel.expectedTemp, 0.0f, 55.0f);
    
    float deviation = abs(actualTemp - thermalModel.expectedTemp);
    
    if (deviation > THERMAL_MODEL_MAX_DEVIATION) {
      thermalModel.implausibleCount++;
      thermalModel.sensorPlausible = false;
      thermalModel.implausibleReason = "Deviation " + String(deviation, 1) + 
        "°C (actual=" + String(actualTemp, 1) + " expected=" + 
        String(thermalModel.expectedTemp, 1) + ")";
      
      Serial.printf("[SAFETY] ⚠️ THERMAL PLAUSIBILITY FAIL #%d: %s\n",
                    thermalModel.implausibleCount, thermalModel.implausibleReason.c_str());
      
      if (thermalModel.implausibleCount >= 3) {
        // 3 consecutive 1-min checks failed = sensor invalid
        _enterSurvivalMode("SENSOR_THERMAL_IMPLAUSIBLE");
      }
    } else {
      // Plausible reading — sync model to actual (prevents drift)
      thermalModel.implausibleCount = 0;
      thermalModel.sensorPlausible = true;
      thermalModel.expectedTemp = actualTemp; // Re-anchor
      thermalModel.implausibleReason = "";
    }
    
    thermalModel.lastModelUpdate = now;
  }

  // ─── POST-REBOOT SAFETY PROTOCOL ───
  void checkRebootSafety(unsigned long now) {
    unsigned long sinceReboot = now - rebootSafety.bootTime;
    
    // Heater lockout: 3 minutes
    if (rebootSafety.heaterLocked && sinceReboot >= REBOOT_HEATER_LOCKOUT_MS) {
      rebootSafety.heaterLocked = false;
      Serial.println(F("[SAFETY] Post-reboot heater lockout EXPIRED — heater now allowed"));
    }
    
    // Ventilation purge: 3 minutes forced fan
    if (rebootSafety.ventPurgeActive) {
      if (sinceReboot >= REBOOT_VENT_PURGE_MS) {
        rebootSafety.ventPurgeActive = false;
        Serial.println(F("[SAFETY] Post-reboot ventilation purge COMPLETE"));
      } else {
        _forceAllFansOn();
        _safetyOverride = true;
      }
    }
    
    // NH3 alert mute: 5 minutes (ventilation still responds to NH3, just no SMS/alerts)
    if (rebootSafety.nh3AlertsMuted && sinceReboot >= REBOOT_NH3_ALERT_MUTE_MS) {
      rebootSafety.nh3AlertsMuted = false;
      Serial.println(F("[SAFETY] Post-reboot NH3 alert mute EXPIRED — alerts now active"));
    }
  }

  // ─── BIRD AGE VALIDATION ───
  // Returns true if age is accepted, false if rejected
  bool validateAgeChange(int newAge, int currentAge) {
    unsigned long now = millis();
    
    // Rule 1: Range check (0–60 days)
    if (newAge < AGE_MIN_DAYS || newAge > AGE_MAX_DAYS) {
      Serial.printf("[SAFETY] AGE REJECTED: %d outside range [%d-%d]\n", 
                    newAge, AGE_MIN_DAYS, AGE_MAX_DAYS);
      ageValidation.rejectedCount++;
      return false;
    }
    
    // Rule 2: Jump check (max 2 days change per 24h)
    int ageDelta = abs(newAge - currentAge);
    if (ageDelta > AGE_MAX_JUMP_PER_24H) {
      // Check if enough time has passed (24h in millis)
      if (ageValidation.lastAgeChangeTime > 0) {
        unsigned long timeSinceLastChange = now - ageValidation.lastAgeChangeTime;
        if (timeSinceLastChange < 86400000UL) { // 24 hours in ms
          Serial.printf("[SAFETY] AGE REJECTED: Jump %d→%d (delta=%d) exceeds max %d in 24h\n",
                        currentAge, newAge, ageDelta, AGE_MAX_JUMP_PER_24H);
          ageValidation.rejectedCount++;
          return false;
        }
      }
    }
    
    // Accepted
    ageValidation.lastAcceptedAge = newAge;
    ageValidation.lastAgeChangeTime = now;
    
    // Persist to NVS
    Preferences prefs;
    prefs.begin("age_safety", false);
    prefs.putInt("last_age", newAge);
    prefs.end();
    
    Serial.printf("[SAFETY] AGE ACCEPTED: %d → %d\n", currentAge, newAge);
    return true;
  }

  // ─── Is NH3 alert currently muted (post-reboot) ───
  bool isNH3AlertMuted() { return rebootSafety.nh3AlertsMuted; }
  
  // ─── Is heater currently locked (post-reboot) ───
  bool isHeaterLocked() { return rebootSafety.heaterLocked; }
  
  // ─── Is vent purge active (post-reboot) ───
  bool isVentPurgeActive() { return rebootSafety.ventPurgeActive; }

  // ─── Should call backend safety engine ───
  bool shouldCallBackendSafety(unsigned long now) {
    return (now - lastSafetyEngineCall >= SAFETY_ENGINE_CALL_INTERVAL_MS);
  }
  
  void markSafetyEngineCalled(unsigned long now) {
    lastSafetyEngineCall = now;
  }

  // ─── Cloud sync notification ───
  void notifyCloudSync() {
    _lastCloudSync = millis();
    if (state == STATE_OFFLINE_AUTONOMOUS) {
      state = STATE_NORMAL;
    }
  }

  void notifySensorUpdate() {
    _lastSensorUpdate = millis();
    if (state == STATE_SAFE_MODE || state == STATE_SENSOR_FAIL) {
      state = STATE_NORMAL;
    }
  }

  // ─── Profile management ───
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
  }

  AutomationProfile getProfile() { return _profile; }

  // ─── Motor/Heater tracking ───
  void notifyMotorOn(int idx) {
    if (idx < 0 || idx >= 3) return;
    if (!_motorTimers[idx].running) {
      _motorTimers[idx].startedAt = millis();
      _motorTimers[idx].running = true;
    }
  }
  void notifyMotorOff(int idx) {
    if (idx < 0 || idx >= 3) return;
    _motorTimers[idx].running = false;
    _motorTimers[idx].stoppedAt = millis();
  }
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

  bool isHeaterAllowed() {
    if (rebootSafety.heaterLocked) return false;
    unsigned long now = millis();
    if (_heaterTimer.running) {
      return (now - _heaterTimer.startedAt) < (HEATER_MAX_RUN_SEC * 1000UL);
    }
    if (_heaterTimer.stoppedAt > 0) {
      return (now - _heaterTimer.stoppedAt) > (HEATER_COOLDOWN_SEC * 1000UL);
    }
    return true;
  }

  bool isMotorAllowed(int idx) {
    if (idx < 0 || idx >= 3) return false;
    if (!_motorTimers[idx].running) return true;
    return (millis() - _motorTimers[idx].startedAt) < (MOTOR_MAX_RUN_SEC * 1000UL);
  }

  // ─── Override function pointers ───
  void (*onForceAllFansOn)()  = nullptr;
  void (*onForceHeaterOn)()   = nullptr;
  void (*onForceHeaterOff)()  = nullptr;
  void (*onForceMotorOff)(int motorIdx) = nullptr;

  const char* getStateName() {
    switch (state) {
      case STATE_NORMAL:              return "NORMAL";
      case STATE_SAFE_MODE:           return "SAFE_MODE";
      case STATE_OFFLINE_AUTONOMOUS:  return "OFFLINE_AUTO";
      case STATE_EMERGENCY_HEAT:      return "EMERGENCY_HEAT";
      case STATE_EMERGENCY_COOL:      return "EMERGENCY_COOL";
      case STATE_SENSOR_FAIL:         return "SENSOR_FAIL";
      case STATE_ACTUATOR_FAIL:       return "ACTUATOR_FAIL";
      case STATE_SURVIVAL:            return "SURVIVAL";
      default:                        return "UNKNOWN";
    }
  }

private:
  unsigned long _lastSensorUpdate;
  unsigned long _lastCloudSync;
  DeviceTimer _heaterTimer;
  DeviceTimer _motorTimers[3];
  AutomationProfile _profile;
  bool _safetyOverride;

  void _enterSafeMode(const char* reason) {
    if (state != STATE_SAFE_MODE) {
      state = STATE_SAFE_MODE;
      Serial.printf("[SAFETY] SAFE MODE: %s\n", reason);
      _forceAllFansOn();
      _forceHeaterOff();
    }
    _safetyOverride = true;
  }

  void _enterSurvivalMode(const char* reason) {
    if (state != STATE_SURVIVAL) {
      state = STATE_SURVIVAL;
      Serial.printf("[SAFETY] 🔴 SURVIVAL MODE: %s\n", reason);
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
    }
  }

  void _enforceHeaterLimits(unsigned long now) {
    if (!_heaterTimer.running) return;
    if ((now - _heaterTimer.startedAt) > (HEATER_MAX_RUN_SEC * 1000UL)) {
      _forceHeaterOff();
      _safetyOverride = true;
    }
  }

  void _enforceMotorLimit(int idx, unsigned long now) {
    if (!_motorTimers[idx].running) return;
    if ((now - _motorTimers[idx].startedAt) > (MOTOR_MAX_RUN_SEC * 1000UL)) {
      _motorTimers[idx].running = false;
      _motorTimers[idx].stoppedAt = now;
      if (onForceMotorOff) onForceMotorOff(idx);
      _safetyOverride = true;
    }
  }

  void _loadProfile() {
    Preferences prefs;
    prefs.begin("safety", true);
    size_t len = prefs.getBytesLength("profile");
    if (len == sizeof(AutomationProfile)) {
      prefs.getBytes("profile", &_profile, sizeof(AutomationProfile));
      if (_profile.checksum != _calcChecksum(_profile)) _setDefaults();
    } else {
      _setDefaults();
    }
    prefs.end();
  }

  void _setDefaults() {
    _profile = {22.0f, 32.0f, 40.0f, 80.0f, 25.0f, true, true, false, false, 0};
    _profile.checksum = _calcChecksum(_profile);
  }

  uint32_t _calcChecksum(AutomationProfile& p) {
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
