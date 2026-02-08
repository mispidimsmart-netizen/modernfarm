
# FarmEye ESP32 Firmware Update Plan - 7 Module Integration

## সারসংক্ষেপ
বর্তমান `esp32-unified.ino` ফার্মওয়্যারে ৭টি নতুন অটোমেশন মডিউল যোগ করা হবে। কোনো existing লজিক মুছে ফেলা হবে না - শুধুমাত্র নতুন ফিচার এক্সটেন্ড করা হবে।

---

## নতুন পিন ম্যাপিং (Extended)

| রিলে | GPIO | ফাংশন |
|------|------|--------|
| RELAY_1 (IN1) | 25 | Main Exhaust Fan (existing FAN_RELAY_PIN) |
| RELAY_2 (IN2) | 26 | Circulation/Ceiling Fan (was LIGHT_RELAY_PIN) |
| RELAY_3 (IN3) | 33 | Heater (was ALARM_RELAY_PIN, Alarm moves to buzzer) |
| RELAY_4 (IN4) | 13 | Fogger Solenoid Valve (existing HEATER_RELAY_PIN) |
| PWM_LIGHT | 14 | Light PWM (new dedicated pin) |
| BUZZER | 32 | Alarm/Buzzer (move from relay) |

**অথবা (যদি বর্তমান ম্যাপিং রাখতে চান):**
- RELAY_1 (GPIO 25) = Main Exhaust
- RELAY_2 (GPIO 26) = Light (keep)
- RELAY_3 (GPIO 33) = Alarm/Buzzer (keep)
- RELAY_4 (GPIO 13) = Heater (keep)
- New external relay module for Fogger + Circulation Fan

---

## Module A: Minimum Ventilation Timer

### নতুন গ্লোবাল ভেরিয়েবল
```cpp
// Minimum Ventilation State
bool minVentActive = false;
bool minVentInCycle = false;
unsigned long minVentCycleStart = 0;
unsigned long lastMinVentCycle = 0;
bool circulationFanOn = false;
```

### নতুন সেটিংস (Cloud থেকে সিঙ্ক)
```cpp
struct MinVentSettings {
  bool enabled = true;
  float tempThreshold = 26.0;   // Activate below this temp
  int cycleSeconds = 40;        // Fan ON duration
  int intervalMinutes = 5;      // Cycle interval
  bool ceilingFanAlwaysOn = true;
} minVentSettings;
```

### নতুন ফাংশন
```cpp
void checkMinimumVentilation() {
  // Skip if not enabled or temp above threshold
  if (!minVentSettings.enabled) return;
  if (temperature >= minVentSettings.tempThreshold) {
    minVentActive = false;
    return;
  }
  
  minVentActive = true;
  unsigned long now = millis();
  
  // Ammonia override - continuous exhaust
  if (ammonia > rules.ammoniaFan) {
    setFanState(true, "HIGH");
    return;
  }
  
  // Ceiling fan always on in min vent mode
  if (minVentSettings.ceilingFanAlwaysOn) {
    setCirculationFan(true);
  }
  
  // Check if time for next cycle
  unsigned long intervalMs = minVentSettings.intervalMinutes * 60000UL;
  
  if (!minVentInCycle && (now - lastMinVentCycle >= intervalMs)) {
    // Start cycle
    minVentInCycle = true;
    minVentCycleStart = now;
    setFanState(true, "HIGH");
    Serial.println("🌬️ Min Vent: Exhaust ON (40s cycle)");
  }
  
  // Check if cycle complete
  if (minVentInCycle) {
    unsigned long cycleDuration = minVentSettings.cycleSeconds * 1000UL;
    if (now - minVentCycleStart >= cycleDuration) {
      minVentInCycle = false;
      lastMinVentCycle = now;
      setFanState(false, "OFF");
      Serial.println("🌬️ Min Vent: Exhaust OFF");
    }
  }
}
```

---

## Module B: Enhanced Heater Control

### আপডেটেড Broiler Temperature Curve (Day-based)
```cpp
const float HEATER_BROILER_CURVE[][2] = {
  {3, 33.0},    // Day 1-3: 33°C
  {7, 31.0},    // Day 4-7: 31°C
  {14, 29.0},   // Day 8-14: 29°C
  {21, 26.0},   // Day 15-21: 26°C
  {28, 24.0},   // Day 22-28: 24°C
  {999, 22.0}   // Day 29+: 22°C
};

float getHeaterTargetTemp(int ageDays) {
  for (int i = 0; i < 6; i++) {
    if (ageDays <= HEATER_BROILER_CURVE[i][0]) {
      return HEATER_BROILER_CURVE[i][1];
    }
  }
  return 22.0;
}
```

### নতুন সেটিংস
```cpp
struct HeaterSettings {
  bool enabled = true;
  float layerOnTemp = 20.0;
  float layerOffTemp = 24.0;
  float tolerance = 0.7;
  float safetyMaxTemp = 34.0;  // Force OFF above this
} heaterSettings;
```

### উন্নত heaterControl() ফাংশন
```cpp
void heaterControl() {
  if (!heaterSettings.enabled) return;
  
  // SAFETY FIRST: Force OFF if too hot
  if (temperature > heaterSettings.safetyMaxTemp) {
    setHeater(false);
    Serial.println("🚨 Heater FORCED OFF (>34°C)");
    return;
  }
  
  if (isLayer()) {
    // Layer mode: Fixed thresholds
    if (temperature < heaterSettings.layerOnTemp && !heaterOn) {
      setHeater(true);
      Serial.printf("🔥 Layer Heater ON (%.1f < %.1f)\n", temperature, heaterSettings.layerOnTemp);
    }
    else if (temperature > heaterSettings.layerOffTemp && heaterOn) {
      setHeater(false);
      Serial.printf("🔥 Layer Heater OFF (%.1f > %.1f)\n", temperature, heaterSettings.layerOffTemp);
    }
  } 
  else if (isBroiler()) {
    // Broiler mode: Age-based curve
    float targetTemp = getHeaterTargetTemp(broilerAgeDays);
    
    if (temperature < targetTemp - heaterSettings.tolerance && !heaterOn) {
      setHeater(true);
      Serial.printf("🔥 Broiler Heater ON (Day %d, %.1f < %.1f)\n", 
                    broilerAgeDays, temperature, targetTemp - heaterSettings.tolerance);
    }
    else if (temperature > targetTemp + heaterSettings.tolerance && heaterOn) {
      setHeater(false);
      Serial.printf("🔥 Broiler Heater OFF (Day %d, %.1f > %.1f)\n", 
                    broilerAgeDays, temperature, targetTemp + heaterSettings.tolerance);
    }
  }
}
```

---

## Module C: Intelligent Fogger Cooling

### নতুন গ্লোবাল ভেরিয়েবল
```cpp
// Fogger State
bool foggerOn = false;
bool foggerActive = false;
bool foggerInSpray = false;
unsigned long foggerSprayStart = 0;
unsigned long foggerPauseStart = 0;
int foggerCycleCount = 0;
```

### নতুন সেটিংস
```cpp
struct FoggerSettings {
  bool enabled = false;
  float startTemp = 32.0;
  float startHumidityMax = 85.0;
  int onSeconds = 40;
  int pauseSeconds = 120;
  float stopTemp = 30.0;
  float stopHumidity = 90.0;
} foggerSettings;
```

### নতুন ফাংশন
```cpp
void setFogger(bool on) {
  foggerOn = on;
  digitalWrite(FOGGER_RELAY_PIN, on ? LOW : HIGH);  // Active LOW
  Serial.printf("💨 Fogger: %s\n", on ? "ON" : "OFF");
}

void foggerControl() {
  if (!foggerSettings.enabled) return;
  
  // Check stop conditions
  if (temperature < foggerSettings.stopTemp || humidity >= foggerSettings.stopHumidity) {
    if (foggerActive) {
      stopFogger("condition_met");
    }
    return;
  }
  
  // Check start conditions
  if (!foggerActive && 
      temperature >= foggerSettings.startTemp && 
      humidity < foggerSettings.startHumidityMax) {
    // Start fogger cycle
    foggerActive = true;
    foggerCycleCount = 0;
    startFoggerSpray();
    
    // Exhaust fan MUST run during fogger
    setFanState(true, "HIGH");
    Serial.println("💨 Fogger activated - Exhaust ON");
  }
  
  // Handle cycle timing
  if (foggerActive) {
    unsigned long now = millis();
    
    if (foggerInSpray) {
      // Check if spray duration complete
      if (now - foggerSprayStart >= foggerSettings.onSeconds * 1000UL) {
        setFogger(false);
        foggerInSpray = false;
        foggerPauseStart = now;
        foggerCycleCount++;
        Serial.printf("💨 Fogger pause (cycle %d)\n", foggerCycleCount);
      }
    } else {
      // Check if pause duration complete
      if (now - foggerPauseStart >= foggerSettings.pauseSeconds * 1000UL) {
        // Recheck conditions before next spray
        if (temperature >= foggerSettings.startTemp && humidity < foggerSettings.startHumidityMax) {
          startFoggerSpray();
        } else {
          stopFogger("condition_met");
        }
      }
    }
  }
}

void startFoggerSpray() {
  setFogger(true);
  foggerInSpray = true;
  foggerSprayStart = millis();
  Serial.printf("💨 Fogger spray ON (%ds)\n", foggerSettings.onSeconds);
}

void stopFogger(String reason) {
  setFogger(false);
  foggerActive = false;
  foggerInSpray = false;
  Serial.printf("💨 Fogger stopped: %s (cycles: %d)\n", reason.c_str(), foggerCycleCount);
}
```

---

## Module D: Broiler Airflow Growth Mode

### নতুন সেটিংস
```cpp
struct AirflowSettings {
  bool enabled = true;
  int earlyAgeDays = 10;         // OFF before this age
  int midAgeDays = 20;           // Intermittent until this age
  int midOnSeconds = 30;
  int midIntervalMinutes = 3;
  int nightOnSeconds = 60;
  int nightIntervalMinutes = 5;
} airflowSettings;
```

### নতুন ফাংশন
```cpp
void setCirculationFan(bool on) {
  circulationFanOn = on;
  digitalWrite(CIRCULATION_RELAY_PIN, on ? LOW : HIGH);
  Serial.printf("🌀 Circulation Fan: %s\n", on ? "ON" : "OFF");
}

void broilerAirflowControl() {
  if (!airflowSettings.enabled || !isBroiler()) {
    // Layer mode: Optional manual only
    return;
  }
  
  int age = broilerAgeDays;
  
  // Age < 10 days: OFF (chicks need warmth, no draft)
  if (age < airflowSettings.earlyAgeDays) {
    setCirculationFan(false);
    return;
  }
  
  // Determine if day or night
  bool isDaytime = (currentHour >= 6 && currentHour < 20);
  
  // Age 10-20 days: Intermittent (30s every 3 min)
  if (age < airflowSettings.midAgeDays) {
    runIntermittentAirflow(
      airflowSettings.midOnSeconds, 
      airflowSettings.midIntervalMinutes
    );
    return;
  }
  
  // Age 21+ days
  if (isDaytime) {
    // Daytime: Continuous ON
    setCirculationFan(true);
  } else {
    // Night: Intermittent (1 min every 5 min)
    runIntermittentAirflow(
      airflowSettings.nightOnSeconds, 
      airflowSettings.nightIntervalMinutes
    );
  }
}

void runIntermittentAirflow(int onSeconds, int intervalMinutes) {
  static unsigned long lastAirflowCycle = 0;
  static bool airflowInCycle = false;
  static unsigned long airflowCycleStart = 0;
  
  unsigned long now = millis();
  unsigned long intervalMs = intervalMinutes * 60000UL;
  
  if (!airflowInCycle && (now - lastAirflowCycle >= intervalMs)) {
    airflowInCycle = true;
    airflowCycleStart = now;
    setCirculationFan(true);
  }
  
  if (airflowInCycle) {
    if (now - airflowCycleStart >= onSeconds * 1000UL) {
      airflowInCycle = false;
      lastAirflowCycle = now;
      setCirculationFan(false);
    }
  }
}
```

---

## Module E: Lighting Soft Control (PWM)

### উন্নত controlLighting() - 10 Minute Fade
```cpp
// Fade state
int targetBrightness = 0;
unsigned long fadeStartTime = 0;
int fadeStartBrightness = 0;
bool fadeInProgress = false;

void updateLightingWithFade() {
  if (!fadeInProgress) return;
  
  const int FADE_DURATION_MS = 600000; // 10 minutes
  unsigned long elapsed = millis() - fadeStartTime;
  
  if (elapsed >= FADE_DURATION_MS) {
    // Fade complete
    lightBrightness = targetBrightness;
    fadeInProgress = false;
  } else {
    // Calculate current brightness
    float progress = (float)elapsed / FADE_DURATION_MS;
    int diff = targetBrightness - fadeStartBrightness;
    lightBrightness = fadeStartBrightness + (int)(diff * progress);
  }
  
  // Apply PWM
  int pwmValue = map(lightBrightness, 0, 100, 0, 255);
  ledcWrite(LIGHT_PWM_CHANNEL, pwmValue);
}

void setLightWithFade(int newBrightness) {
  if (newBrightness == lightBrightness) return;
  
  targetBrightness = constrain(newBrightness, 0, 100);
  fadeStartBrightness = lightBrightness;
  fadeStartTime = millis();
  fadeInProgress = true;
  
  Serial.printf("💡 Light fading: %d → %d (10 min)\n", fadeStartBrightness, targetBrightness);
}
```

---

## Module F: Offline Age Increment (Already Exists - Enhanced)

Existing `handleOfflineAge()` already handles this. শুধু debug লগ উন্নত করা হবে:

```cpp
void handleOfflineAge() {
  if (!isBroiler()) return;
  
  const unsigned long DAY = 86400000UL;
  
  if (millis() < lastAgeIncreaseMillis) {
    lastAgeIncreaseMillis = millis();
    Serial.println("📅 Millis overflow - resetting age tick timer");
  }
  
  if (millis() - lastAgeIncreaseMillis >= DAY) {
    farmConfig.chickAgeDays++;
    lastAgeIncreaseMillis = millis();
    ageSource = "LOCAL";  // Mark as local increment
    
    Serial.printf("\n╔═══════════════════════════════════════════════════════════════╗\n");
    Serial.printf("║  📅 OFFLINE AGE INCREMENT: Day %d → Day %d (LOCAL)            ║\n", 
                  farmConfig.chickAgeDays - 1, farmConfig.chickAgeDays);
    Serial.printf("╚═══════════════════════════════════════════════════════════════╝\n");
    
    saveFarmProfile();
    saveAgeTickTime();
    loadBroilerRules();
  }
}
```

---

## Module Priority System

### Priority Order (Built into main loop)
```cpp
void controlLogic() {
  // === PRIORITY 1: SAFETY (Always runs first) ===
  if (runSafetyChecks()) return; // Returns true if emergency
  
  // === PRIORITY 2: HEATING ===
  heaterControl();
  
  // === PRIORITY 3: COOLING (Fogger) ===
  foggerControl();
  
  // === PRIORITY 4: VENTILATION ===
  if (!foggerActive) { // Don't override fogger's exhaust control
    checkMinimumVentilation();
    broilerAirflowControl();
  }
  
  // === PRIORITY 5: LIGHTING ===
  controlLighting();
  updateLightingWithFade();
  
  // === MANUAL OVERRIDE: Highest Priority ===
  if (localManualOverride) {
    // Cloud commands override all automation
    return;
  }
}
```

---

## Cloud Sync Updates

### handleCloudResponse() এ নতুন সেটিংস প্রসেসিং
```cpp
if (doc.containsKey("advanced_automation")) {
  JsonObject adv = doc["advanced_automation"];
  
  // Module A: Minimum Ventilation
  if (adv.containsKey("min_vent")) {
    JsonObject mv = adv["min_vent"];
    minVentSettings.enabled = mv["enabled"] | true;
    minVentSettings.tempThreshold = mv["temp_threshold"] | 26.0;
    minVentSettings.cycleSeconds = mv["cycle_seconds"] | 40;
    minVentSettings.intervalMinutes = mv["interval_minutes"] | 5;
    minVentSettings.ceilingFanAlwaysOn = mv["ceiling_fan_always_on"] | true;
  }
  
  // Module B: Heater
  if (adv.containsKey("heater")) {
    JsonObject h = adv["heater"];
    heaterSettings.enabled = h["enabled"] | true;
    heaterSettings.layerOnTemp = h["on_temp"] | 20.0;
    heaterSettings.layerOffTemp = h["off_temp"] | 24.0;
    heaterSettings.tolerance = h["tolerance"] | 0.7;
  }
  
  // Module C: Fogger
  if (adv.containsKey("fogger")) {
    JsonObject f = adv["fogger"];
    foggerSettings.enabled = f["enabled"] | false;
    foggerSettings.startTemp = f["start_temp"] | 32.0;
    foggerSettings.startHumidityMax = f["start_humidity_max"] | 85.0;
    foggerSettings.onSeconds = f["on_seconds"] | 40;
    foggerSettings.pauseSeconds = f["pause_seconds"] | 120;
    foggerSettings.stopTemp = f["stop_temp"] | 30.0;
    foggerSettings.stopHumidity = f["stop_humidity"] | 90.0;
  }
  
  // Module D: Airflow
  if (adv.containsKey("airflow")) {
    JsonObject a = adv["airflow"];
    airflowSettings.enabled = a["enabled"] | true;
    airflowSettings.earlyAgeDays = a["early_age_days"] | 10;
    airflowSettings.midAgeDays = a["mid_age_days"] | 20;
    airflowSettings.midOnSeconds = a["mid_on_seconds"] | 30;
    airflowSettings.midIntervalMinutes = a["mid_interval_minutes"] | 3;
  }
  
  Serial.println("✅ Advanced automation settings synced from cloud");
}
```

---

## নতুন Device Status Sync

### syncWithCloud() payload update
```cpp
doc["circulation_fan_on"] = circulationFanOn;
doc["fogger_on"] = foggerOn;
doc["min_vent_active"] = minVentActive;
doc["fogger_active"] = foggerActive;
doc["fogger_cycle_count"] = foggerCycleCount;
doc["light_brightness"] = lightBrightness;
doc["fade_in_progress"] = fadeInProgress;
```

---

## ফাইল পরিবর্তন সারসংক্ষেপ

| ফাইল | পরিবর্তন |
|------|---------|
| `public/esp32-unified.ino` | ৭টি নতুন মডিউল যোগ, settings structs, control functions |

---

## কারিগরি বিবরণ

### মেমোরি ব্যবহার
- নতুন গ্লোবাল ভেরিয়েবল: ~200 bytes
- নতুন settings structs: ~100 bytes
- মোট অতিরিক্ত: ~300 bytes (ESP32 এর ৩২০KB RAM থেকে)

### টাইমিং
- Main loop: প্রতি 100ms
- Sensor read: প্রতি 5 sec
- Cloud sync: প্রতি 30 sec
- Command check: প্রতি 5 sec
- Lighting check: প্রতি 10 sec
- Min vent cycle: প্রতি 5 min (configurable)
- Fogger cycle: 40s ON / 120s OFF (configurable)

### Safety Guarantees
1. Heater FORCE OFF > 34°C
2. Fogger requires exhaust running
3. Ammonia override = continuous exhaust
4. Watchdog protection (8 sec)
5. Failsafe mode on cloud timeout (5 min)

