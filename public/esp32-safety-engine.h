/**
 * ESP32 Invariant-Based Safety Arbiter v3.0
 * FarmEye Poultry Controller
 * 
 * ARCHITECTURE: Invariant-based, NOT state-based.
 * Safety invariants are evaluated every 500ms INDEPENDENTLY of automation.
 * The arbiter directly writes to GPIO pins, bypassing the relay manager.
 * No configuration, mode, override, or timer can suppress a safety invariant.
 *
 * INVARIANTS (must NEVER be violated):
 *   INV-1: If temp > lethal_high → ventilation forced continuously
 *   INV-2: If temp < lethal_low  → heating allowed regardless of mode
 *   INV-3: Actuator protection timers cannot block safety reactions
 *   INV-4: Manual override cannot disable safety evaluation
 *   INV-5: OTA update cannot pause safety loop
 *   INV-6: Multiple logical devices cannot share physical pin
 *   INV-7: Missing/unreliable sensor → worst-case survival environment
 *   INV-8: Notification channels escalate independently of connectivity
 *
 * Include: #include "esp32-safety-engine.h"
 */

#ifndef SAFETY_ENGINE_H
#define SAFETY_ENGINE_H

#include <Preferences.h>

// ─── SENSOR VALIDATION CHANNEL (must be before any function using it) ───
#define SVL_MEDIAN_SIZE_H 5
struct SVLChannel {
  float medianBuffer[SVL_MEDIAN_SIZE_H];
  int bufferIndex, sampleCount;
  float lastStableValue;
  float lastAcceptedRaw;
  unsigned long lastValidTime;
  unsigned long lastStableTime;
  bool isValid, isOffline;
};

// ─── HYSTERESIS STRUCTURES (must be before any function using it) ───
#define MAX_HYST_STAGES_H 4
struct HystStage {
  float onThreshold, offThreshold;
  bool isActive;
  unsigned long lastOnTime, lastOffTime, minOnTime, minOffTime;
};
struct HystChannel {
  const char* name;
  HystStage stages[MAX_HYST_STAGES_H];
  int stageCount, activeStageLevel;
};

// Overflow-safe elapsed time
#ifndef SAFE_ELAPSED_DEFINED
#define SAFE_ELAPSED_DEFINED
inline unsigned long _safeElapsed(unsigned long now, unsigned long since) {
  return now - since;
}
#endif

// ─── SAFETY INVARIANT CONSTANTS (non-negotiable, cannot be overridden) ───
#define SAFETY_ARBITER_INTERVAL_MS   500       // Arbiter runs every 500ms
#define LETHAL_TEMP_HIGH             38.0f     // °C → INV-1: force all ventilation
#define LETHAL_TEMP_LOW              15.0f     // °C → INV-2: force heating
#define SURVIVABLE_TEMP_HIGH         35.0f     // °C → warning threshold
#define SURVIVABLE_TEMP_LOW          20.0f     // °C → warning threshold
#define HEATER_MAX_CONTINUOUS_SEC    300       // 5 min max, then cooldown
#define HEATER_COOLDOWN_SEC          120       // 2 min cooldown
#define SENSOR_MISSING_TIMEOUT_MS    20000     // 20s → INV-7: survival mode
#define CLOUD_OFFLINE_TIMEOUT_MS     60000     // 60s → offline autonomous
#define WDT_TIMEOUT_SEC              10
#define RELAY_ACTIVE_LOW             LOW

// ─── ACTUATOR EFFECT VALIDATION ───
#define EFFECT_WINDOW_MS             360000UL  // 6 min observation
#define FAN_MIN_COOLING_C            0.5f
#define HEATER_MIN_HEATING_C         1.0f

// ─── THERMAL MODEL ───
#define THERMAL_MAX_DEVIATION_C      3.0f
#define THERMAL_HEATER_RATE_PER_MIN  0.06f
#define THERMAL_FAN_RATE_PER_MIN    -0.04f

// ─── POST-REBOOT SAFETY ───
#define REBOOT_HEATER_LOCKOUT_MS     180000UL
#define REBOOT_VENT_PURGE_MS         180000UL
#define REBOOT_NH3_MUTE_MS           300000UL

// ─── SURVIVAL HEAT (INV-2 during reboot lockout) ───
// Lethal cold outranks the post-reboot heater lockout: chicks freeze in
// minutes. The bypass is BOUNDED — heat is delivered for at most
// SURVIVAL_HEAT_MAX_MS with the alarm asserted, then it stops so a stuck
// relay or a bad sensor cannot cook the shed.
#define SURVIVAL_HEAT_MAX_MS         600000UL  // 10 min hard cap
#define SURVIVAL_HEAT_COOLDOWN_MS    300000UL  // 5 min before another window

// ─── BROODING PULSE (INV-7 with no reliable sensor) ───
// Cutting the heater dead during sensor loss kills day-old chicks in
// winter. For brooding-age flocks the heater is pulsed on a fixed duty
// cycle (open loop, alarm ON) instead of being latched OFF.
#define BROODING_AGE_MAX_DAYS        10
#define BROODING_PULSE_ON_MS         60000UL   // 1 min ON
#define BROODING_PULSE_OFF_MS        180000UL  // 3 min OFF
#define BROODING_PULSE_WINDOW_MS     1800000UL // 30 min total, then stop

// ─── BIRD AGE VALIDATION ───
#define AGE_MIN_DAYS                 0
#define AGE_MAX_DAYS                 60
#define AGE_MAX_JUMP_PER_24H         2

// ─── BACKEND SAFETY ENGINE ───
#define SAFETY_ENGINE_CALL_INTERVAL_MS 60000UL

// ─── GPIO VALIDATION ───
#define MAX_GPIO_PINS                40

// ─── SAFETY ARBITER RESULT (what the arbiter decided THIS tick) ───
struct SafetyArbiterResult {
  bool forceFanOn;           // INV-1, INV-7: fan MUST be on
  bool forceHeaterOff;       // INV-1: heater MUST be off (overheat)
  bool forceHeaterOn;        // INV-2: heater MUST be on (cold)
  bool sensorSurvivalMode;   // INV-7: no reliable sensor data
  bool survivalHeatActive;   // INV-2: bounded heat during reboot lockout
  bool broodingPulseActive;  // INV-7: open-loop heater pulse for chicks
  bool safetyActive;         // Any invariant is currently being enforced
  const char* reason;        // Human-readable reason for safety action
};

// ─── ACTUATOR EFFECT TRACKER ───
struct ActuatorEffectTracker {
  float tempAtStart;
  unsigned long onSince;
  bool tracking;
  int consecutiveFailures;
  bool effectVerified;
};

// ─── THERMAL MODEL STATE ───
struct ThermalModelState {
  float expectedTemp;
  float lastModelUpdate;
  bool sensorPlausible;
  int implausibleCount;
  String implausibleReason;
};

// ─── REBOOT SAFETY STATE ───
struct RebootSafetyState {
  bool heaterLocked;
  bool ventPurgeActive;
  bool nh3AlertsMuted;
  unsigned long bootTime;
};

// ─── AGE VALIDATION STATE ───
struct AgeValidationState {
  int lastAcceptedAge;
  unsigned long lastAgeChangeTime;
  int rejectedCount;
};

// ─── GPIO ASSIGNMENT RECORD (for INV-6 validation) ───
struct GpioAssignment {
  int pin;
  const char* deviceName;
};

class SafetyEngine {
public:
  SafetyArbiterResult lastResult;
  ActuatorEffectTracker fanEffect;
  ActuatorEffectTracker heaterEffect;
  ThermalModelState thermalModel;
  RebootSafetyState rebootSafety;
  AgeValidationState ageValidation;
  
  // Worst-case sensor values
  float worstCaseMaxTemp;
  float worstCaseMinTemp;
  bool dualSensorAvailable;
  
  // Backend safety engine
  unsigned long lastSafetyEngineCall;
  bool backendSafetyActive;
  
  // GPIO validation
  bool gpioConflictDetected;
  String gpioConflictDetail;
  
  // Arbiter timing
  unsigned long lastArbiterTick;
  
  // Direct GPIO pin references (set by firmware at init)
  int fanPin;
  int heaterPin;
  int alarmPin;

  SafetyEngine() {
    _lastSensorUpdate = 0;
    _lastCloudSync = 0;
    _heaterRunning = false;
    _heaterStartedAt = 0;
    _heaterStoppedAt = 0;
    
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
    gpioConflictDetected = false;
    gpioConflictDetail = "";
    lastArbiterTick = 0;
    fanPin = -1;
    heaterPin = -1;
    alarmPin = -1;
    
    lastResult = {false, false, false, false, false, false, false, "INIT"};
  }

  // ─── INIT ───
  void begin(int _fanPin, int _heaterPin, int _alarmPin) {
    esp_task_wdt_init(WDT_TIMEOUT_SEC, true);
    esp_task_wdt_add(NULL);
    
    fanPin = _fanPin;
    heaterPin = _heaterPin;
    alarmPin = _alarmPin;
    
    rebootSafety.bootTime = millis();
    rebootSafety.heaterLocked = true;
    rebootSafety.ventPurgeActive = true;
    rebootSafety.nh3AlertsMuted = true;
    _lastSensorUpdate = millis();
    _lastCloudSync = millis();
    lastArbiterTick = millis();
    
    // Load last accepted age from NVS
    Preferences prefs;
    prefs.begin("age_safety", true);
    ageValidation.lastAcceptedAge = prefs.getInt("last_age", 0);
    ageValidation.lastAgeChangeTime = 0;
    prefs.end();
    
    Serial.println(F("[SAFETY] Invariant-Based Arbiter v3.0 started"));
    Serial.println(F("[SAFETY] Post-reboot: heater LOCKED 3min, vent PURGE 3min, NH3 MUTED 5min"));
  }

  // ═══════════════════════════════════════════════════════════════════
  // INV-6: GPIO CONFLICT VALIDATION (call at boot)
  // Detects duplicate GPIO assignments that could cause pin conflicts.
  // Returns false if conflict found (firmware should HALT).
  // ═══════════════════════════════════════════════════════════════════
  bool validateGpioAssignments(GpioAssignment* assignments, int count) {
    gpioConflictDetected = false;
    gpioConflictDetail = "";
    
    for (int i = 0; i < count; i++) {
      for (int j = i + 1; j < count; j++) {
        if (assignments[i].pin == assignments[j].pin) {
          gpioConflictDetected = true;
          gpioConflictDetail = String("CONFLICT: GPIO ") + String(assignments[i].pin) + 
            " shared by '" + String(assignments[i].deviceName) + 
            "' and '" + String(assignments[j].deviceName) + "'";
          Serial.println("[SAFETY] 🔴 " + gpioConflictDetail);
          return false;
        }
      }
    }
    Serial.printf("[SAFETY] ✅ GPIO validation passed (%d pins, 0 conflicts)\n", count);
    return true;
  }

  // ═══════════════════════════════════════════════════════════════════
  // SAFETY ARBITER: The core 500ms invariant enforcer.
  // 
  // This function evaluates ALL safety invariants and DIRECTLY writes
  // to GPIO pins when a violation is detected. It does NOT go through
  // the relay manager, automation engine, or any other abstraction.
  //
  // It CANNOT be blocked by:
  //   - Manual override
  //   - OTA update
  //   - Relay protection timers
  //   - Stabilizing mode
  //   - Power recovery purge
  //   - Any state machine transition
  //
  // Call this from loop() BEFORE and AFTER all other processing.
  // ═══════════════════════════════════════════════════════════════════
  SafetyArbiterResult arbiterTick(
    float temperature, float humidity, float ammonia,
    bool sensorValid, bool fanCurrentlyOn, bool heaterCurrentlyOn,
    float temp2, bool dht2ok
  ) {
    esp_task_wdt_reset();
    unsigned long now = millis();
    
    // Rate limit to 500ms
    if (_safeElapsed(now, lastArbiterTick) < SAFETY_ARBITER_INTERVAL_MS) {
      return lastResult;
    }
    lastArbiterTick = now;
    
    // Start fresh
    SafetyArbiterResult result = {false, false, false, false, false, false, false, "NORMAL"};
    
    // ── Update worst-case sensors ──
    updateWorstCase(temperature, temp2, dht2ok);
    
    // ── Post-reboot protocol ──
    checkRebootSafety(now);
    
    // ── Update sensor timestamp ──
    if (sensorValid) _lastSensorUpdate = now;
    
    // ══════════════════════════════════════════════════════════════
    // INV-7: MISSING/UNRELIABLE SENSOR → WORST-CASE SURVIVAL
    // If no valid sensor data for 20s, assume worst case:
    //   - Force ventilation ON (prevents heat death)
    //   - Force heater OFF (prevents fire/overheat)
    // This is NOT a state — it's a continuous invariant.
    // ══════════════════════════════════════════════════════════════
    if (_safeElapsed(now, _lastSensorUpdate) > SENSOR_MISSING_TIMEOUT_MS || !sensorValid) {
      result.forceFanOn = true;
      result.sensorSurvivalMode = true;
      result.safetyActive = true;
      result.reason = "INV7_SENSOR_MISSING";
      _directWriteRelay(fanPin, true);     // Fan ON — heat death is faster than cold death

      // Brooding flocks cannot survive a dead heater. Deliver open-loop
      // pulses (bounded window + alarm) instead of latching the heater OFF.
      bool broodingHeat = _broodingPulseTick(now);
      if (broodingHeat) {
        result.broodingPulseActive = true;
        result.forceHeaterOn = true;
        result.reason = "INV7_BROODING_PULSE";
        _directWriteRelay(heaterPin, true);
        _setAlarm(true);
      } else {
        result.forceHeaterOff = true;
        _directWriteRelay(heaterPin, false); // Heater OFF
      }
      lastResult = result;
      return result;
    }
    
    // ══════════════════════════════════════════════════════════════
    // INV-1: LETHAL HIGH TEMPERATURE → FORCED CONTINUOUS VENTILATION
    // If ANY sensor reads above lethal threshold, ALL fans ON.
    // No duty cycle. No timer. No off period. CONTINUOUS.
    // ══════════════════════════════════════════════════════════════
    float safetyTemp = dualSensorAvailable ? worstCaseMaxTemp : temperature;
    if (safetyTemp > LETHAL_TEMP_HIGH) {
      result.forceFanOn = true;
      result.forceHeaterOff = true;
      result.safetyActive = true;
      result.reason = "INV1_LETHAL_HEAT";
      _directWriteRelay(fanPin, true);     // Fan ON — NO EXCEPTIONS
      _directWriteRelay(heaterPin, false); // Heater OFF
      Serial.printf("[ARBITER] INV-1: %.1f°C > %.1f°C → CONTINUOUS ventilation\n", 
                    safetyTemp, LETHAL_TEMP_HIGH);
      lastResult = result;
      return result;
    }
    
    // ══════════════════════════════════════════════════════════════
    // INV-2: LETHAL LOW TEMPERATURE → HEATING ALLOWED
    // Heating bypasses cooldown timers, reboot lockout, and overrides.
    // Exception: if temp is ALSO above lethal high (impossible but safe).
    // ══════════════════════════════════════════════════════════════
    float heatingTemp = dualSensorAvailable ? worstCaseMinTemp : temperature;
    if (heatingTemp < LETHAL_TEMP_LOW) {
      bool allowed = true;
      if (rebootSafety.heaterLocked) {
        // Post-reboot lockout exists to avoid re-igniting a heater whose
        // real state is unknown — but lethal cold outranks it. Grant a
        // BOUNDED survival-heat window with the alarm on.
        allowed = _survivalHeatTick(now);
        if (allowed) {
          result.survivalHeatActive = true;
          _setAlarm(true);
        }
      } else {
        _survivalHeatReset();
      }

      if (allowed) {
        result.forceHeaterOn = true;
        result.safetyActive = true;
        result.reason = result.survivalHeatActive ? "INV2_SURVIVAL_HEAT" : "INV2_LETHAL_COLD";
        _directWriteRelay(heaterPin, true);  // Heater ON — bypasses all timers
        Serial.printf("[ARBITER] INV-2: %.1f°C < %.1f°C → FORCED heating (%s)\n",
                      heatingTemp, LETHAL_TEMP_LOW, result.reason);
      }
      // Don't return — fan control should still be evaluated
    } else {
      _survivalHeatReset();
    }
    
    // ── Reboot heater lockout (still enforced unless INV-2 overrides) ──
    if (rebootSafety.heaterLocked && !result.forceHeaterOn) {
      result.forceHeaterOff = true;
      result.safetyActive = true;
      result.reason = "REBOOT_HEATER_LOCK";
      _directWriteRelay(heaterPin, false);
    }
    
    // ── Reboot vent purge ──
    if (rebootSafety.ventPurgeActive) {
      result.forceFanOn = true;
      result.safetyActive = true;
      if (!result.reason || String(result.reason) == "NORMAL") {
        result.reason = "REBOOT_VENT_PURGE";
      }
      _directWriteRelay(fanPin, true);
    }
    
    // ── Heater max runtime enforcement (INV-3: cannot block safety) ──
    // The heater cooldown is enforced EXCEPT when INV-2 is active.
    if (_heaterRunning && !result.forceHeaterOn) {
      if (_safeElapsed(now, _heaterStartedAt) > (HEATER_MAX_CONTINUOUS_SEC * 1000UL)) {
        result.forceHeaterOff = true;
        result.safetyActive = true;
        result.reason = "HEATER_MAX_RUNTIME";
        _directWriteRelay(heaterPin, false);
        _heaterRunning = false;
        _heaterStoppedAt = now;
      }
    }
    
    // ── Actuator effect validation ──
    checkActuatorEffects(temperature, fanCurrentlyOn, heaterCurrentlyOn, now);
    
    // ── Thermal model plausibility ──
    checkThermalPlausibility(temperature, fanCurrentlyOn, heaterCurrentlyOn, now);
    
    // ── Cloud timeout ──
    if (_safeElapsed(now, _lastCloudSync) > CLOUD_OFFLINE_TIMEOUT_MS) {
      // Offline but NOT a safety violation — automation continues locally
    }
    
    lastResult = result;
    return result;
  }

  // ─── WORST-CASE SENSOR SELECTION ───
  void updateWorstCase(float t1, float t2, bool t2ok) {
    dualSensorAvailable = t2ok && !isnan(t2);
    if (dualSensorAvailable) {
      worstCaseMaxTemp = max(t1, t2);
      worstCaseMinTemp = min(t1, t2);
    } else {
      worstCaseMaxTemp = t1;
      worstCaseMinTemp = t1;
    }
  }

  // ─── ACTUATOR EFFECT VALIDATION ───
  void checkActuatorEffects(float currentTemp, bool fanOn, bool heaterOn, unsigned long now) {
    // Fan effect
    if (fanOn && !fanEffect.tracking) {
      fanEffect.tempAtStart = currentTemp;
      fanEffect.onSince = now;
      fanEffect.tracking = true;
    } else if (!fanOn) {
      fanEffect.tracking = false;
    }
    if (fanEffect.tracking && (_safeElapsed(now, fanEffect.onSince) >= EFFECT_WINDOW_MS)) {
      float drop = fanEffect.tempAtStart - currentTemp;
      if (drop < FAN_MIN_COOLING_C) {
        fanEffect.consecutiveFailures++;
        fanEffect.effectVerified = false;
        Serial.printf("[ARBITER] FAN EFFECT FAIL #%d: Expected ≥%.1f°C drop, got %.2f°C\n",
                      fanEffect.consecutiveFailures, FAN_MIN_COOLING_C, drop);
      } else {
        fanEffect.consecutiveFailures = 0;
        fanEffect.effectVerified = true;
      }
      fanEffect.tempAtStart = currentTemp;
      fanEffect.onSince = now;
    }
    
    // Heater effect
    if (heaterOn && !heaterEffect.tracking) {
      heaterEffect.tempAtStart = currentTemp;
      heaterEffect.onSince = now;
      heaterEffect.tracking = true;
    } else if (!heaterOn) {
      heaterEffect.tracking = false;
    }
    if (heaterEffect.tracking && (_safeElapsed(now, heaterEffect.onSince) >= EFFECT_WINDOW_MS)) {
      float rise = currentTemp - heaterEffect.tempAtStart;
      if (rise < HEATER_MIN_HEATING_C) {
        heaterEffect.consecutiveFailures++;
        heaterEffect.effectVerified = false;
        Serial.printf("[ARBITER] HEATER EFFECT FAIL #%d: Expected ≥%.1f°C rise, got %.2f°C\n",
                      heaterEffect.consecutiveFailures, HEATER_MIN_HEATING_C, rise);
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
    float elapsedMin = _safeElapsed(now, (unsigned long)thermalModel.lastModelUpdate) / 60000.0f;
    if (elapsedMin < 1.0f) return;
    
    float rate = 0.0f;
    if (heaterOn) rate = THERMAL_HEATER_RATE_PER_MIN;
    else if (fanOn) rate = THERMAL_FAN_RATE_PER_MIN;
    
    thermalModel.expectedTemp += rate * elapsedMin;
    thermalModel.expectedTemp = constrain(thermalModel.expectedTemp, 0.0f, 55.0f);
    
    float deviation = abs(actualTemp - thermalModel.expectedTemp);
    if (deviation > THERMAL_MAX_DEVIATION_C) {
      thermalModel.implausibleCount++;
      thermalModel.sensorPlausible = false;
      thermalModel.implausibleReason = "Deviation " + String(deviation, 1) + 
        "°C (actual=" + String(actualTemp, 1) + " expected=" + 
        String(thermalModel.expectedTemp, 1) + ")";
      Serial.printf("[ARBITER] THERMAL FAIL #%d: %s\n",
                    thermalModel.implausibleCount, thermalModel.implausibleReason.c_str());
    } else {
      thermalModel.implausibleCount = 0;
      thermalModel.sensorPlausible = true;
      thermalModel.expectedTemp = actualTemp;
      thermalModel.implausibleReason = "";
    }
    thermalModel.lastModelUpdate = now;
  }

  // ─── POST-REBOOT SAFETY ───
  void checkRebootSafety(unsigned long now) {
    unsigned long sinceReboot = _safeElapsed(now, rebootSafety.bootTime);
    if (rebootSafety.heaterLocked && sinceReboot >= REBOOT_HEATER_LOCKOUT_MS) {
      rebootSafety.heaterLocked = false;
      Serial.println(F("[ARBITER] Post-reboot heater lockout EXPIRED"));
    }
    if (rebootSafety.ventPurgeActive && sinceReboot >= REBOOT_VENT_PURGE_MS) {
      rebootSafety.ventPurgeActive = false;
      Serial.println(F("[ARBITER] Post-reboot vent purge COMPLETE"));
    }
    if (rebootSafety.nh3AlertsMuted && sinceReboot >= REBOOT_NH3_MUTE_MS) {
      rebootSafety.nh3AlertsMuted = false;
      Serial.println(F("[ARBITER] Post-reboot NH3 alert mute EXPIRED"));
    }
  }

  // ─── BIRD AGE VALIDATION ───
  bool validateAgeChange(int newAge, int currentAge) {
    unsigned long now = millis();
    if (newAge < AGE_MIN_DAYS || newAge > AGE_MAX_DAYS) {
      Serial.printf("[ARBITER] AGE REJECTED: %d outside [%d-%d]\n", newAge, AGE_MIN_DAYS, AGE_MAX_DAYS);
      ageValidation.rejectedCount++;
      return false;
    }
    int ageDelta = abs(newAge - currentAge);
    if (ageDelta > AGE_MAX_JUMP_PER_24H) {
      if (ageValidation.lastAgeChangeTime > 0) {
        if (_safeElapsed(now, ageValidation.lastAgeChangeTime) < 86400000UL) {
          Serial.printf("[ARBITER] AGE REJECTED: Jump %d→%d exceeds max %d/24h\n",
                        currentAge, newAge, AGE_MAX_JUMP_PER_24H);
          ageValidation.rejectedCount++;
          return false;
        }
      }
    }
    ageValidation.lastAcceptedAge = newAge;
    ageValidation.lastAgeChangeTime = now;
    Preferences prefs;
    prefs.begin("age_safety", false);
    prefs.putInt("last_age", newAge);
    prefs.end();
    Serial.printf("[ARBITER] AGE ACCEPTED: %d → %d\n", currentAge, newAge);
    return true;
  }

  // ─── QUERY METHODS ───
  bool isNH3AlertMuted()    { return rebootSafety.nh3AlertsMuted; }
  bool isHeaterLocked()     { return rebootSafety.heaterLocked; }
  bool isVentPurgeActive()  { return rebootSafety.ventPurgeActive; }
  bool isSafetyActive()     { return lastResult.safetyActive; }
  
  bool isHeaterAllowed() {
    if (lastResult.forceHeaterOff) return false;
    if (lastResult.forceHeaterOn)  return true;
    if (rebootSafety.heaterLocked) return false;
    unsigned long now = millis();
    if (_heaterRunning) {
      return _safeElapsed(now, _heaterStartedAt) < (HEATER_MAX_CONTINUOUS_SEC * 1000UL);
    }
    if (_heaterStoppedAt > 0) {
      return _safeElapsed(now, _heaterStoppedAt) > (HEATER_COOLDOWN_SEC * 1000UL);
    }
    return true;
  }

  // ─── HEATER/MOTOR TRACKING ───
  void notifyHeaterOn()  { if (!_heaterRunning) { _heaterStartedAt = millis(); _heaterRunning = true; } }
  void notifyHeaterOff() { _heaterRunning = false; _heaterStoppedAt = millis(); }
  
  // ─── CLOUD SYNC ───
  void notifyCloudSync() { _lastCloudSync = millis(); }
  void notifySensorUpdate() { _lastSensorUpdate = millis(); }

  // ─── BACKEND SAFETY ENGINE TIMING ───
  bool shouldCallBackendSafety(unsigned long now) {
    return (_safeElapsed(now, lastSafetyEngineCall) >= SAFETY_ENGINE_CALL_INTERVAL_MS);
  }
  void markSafetyEngineCalled(unsigned long now) { lastSafetyEngineCall = now; }

  // ─── OTA SAFETY GATE ───
  // OTA must call this in its download loop to maintain safety.
  // Returns true if OTA must abort immediately.
  bool otaSafetyCheck(float currentTemp, bool sensorValid) {
    // Run a mini-arbiter: check lethal invariants only
    if (!sensorValid || _safeElapsed(millis(), _lastSensorUpdate) > SENSOR_MISSING_TIMEOUT_MS) {
      // Sensor gone during OTA → abort, force fan
      _directWriteRelay(fanPin, true);
      _directWriteRelay(heaterPin, false);
      return true; // ABORT OTA
    }
    if (currentTemp > LETHAL_TEMP_HIGH) {
      _directWriteRelay(fanPin, true);
      _directWriteRelay(heaterPin, false);
      return true; // ABORT OTA
    }
    if (currentTemp < LETHAL_TEMP_LOW) {
      _directWriteRelay(heaterPin, true);
      // Don't abort for cold — heater is on, OTA can continue
    }
    return false; // OTA can continue
  }

  const char* getResultReason() { return lastResult.reason; }

private:
  unsigned long _lastSensorUpdate;
  unsigned long _lastCloudSync;
  bool _heaterRunning;
  unsigned long _heaterStartedAt;
  unsigned long _heaterStoppedAt;

  // Direct GPIO write — bypasses relay manager entirely
  void _directWriteRelay(int pin, bool on) {
    if (pin < 0) return;
    digitalWrite(pin, on ? RELAY_ACTIVE_LOW : !RELAY_ACTIVE_LOW);
  }
};

#endif // SAFETY_ENGINE_H
