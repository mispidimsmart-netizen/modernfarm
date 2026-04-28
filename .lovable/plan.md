# LDR / Smart Lighting — Firmware Sync Plan

## Audit Result Summary

| Layer | Status |
|---|---|
| Database schema | ✅ Complete (all 7 new columns present) |
| UI components | ✅ Complete (settings, dashboard, reports) |
| Realtime data flow | ✅ Working (live lux from `sensor_readings`) |
| Cloud → Device sync API | ✅ Sends `lighting_schedule` JSON |
| **ESP32 firmware** | ❌ **Reads only 4 of 11 LDR columns — new smart logic missing** |

The UI lets the user save layer/broiler mode, dark hours, fade circuits, and daylight-off threshold to the cloud, but the ESP32 firmware ignores those fields. So the hardware behaviour does not yet match what the user configured.

## What Needs to Change

### 1. `public/esp32-industrial.ino` — extend `LightSchedule` struct

Add fields:
- `float ldrDaylightOffLux` (default 300)
- `int fadeCircuits` (1-3, default 2)
- `int fadeStepGapMinutes` (default 5)
- `bool flockTypeBroiler` (false = layer)
- `int layerDarkHours` (default 9)
- `int broilerDarkStartMin` / `broilerDarkEndMin` (minutes-of-day)
- `bool broilerAgeAuto` (default true)

### 2. JSON parser (around line 2675) — read new fields

Extend the `parseLightingSchedule()` block to consume the 7 new keys returned by the cloud API.

### 3. Decision logic (around line 2049) — implement the spec from `SMART_LIGHTING.md`

Replace current LDR override block with the layered decision tree:
1. Manual override → all ON
2. Determine target by `flock_type`:
   - **Broiler + age ≤ 7d + auto** → 23h light
   - **Broiler + age > 7d** → OFF inside `broiler_dark_start..end`
   - **Layer** → OFF for `layer_dark_hours` starting at `start_time + light_hours`
3. Apply LDR override:
   - In `hybrid` mode, force OFF when `lux >= ldr_daylight_off_lux` (power save)
   - In `sensor_only`, drive purely from lux + hysteresis
4. Stepped fade transitions:
   - If `fade_circuits == 1` → toggle GPIO 25 only
   - If `fade_circuits >= 2` → GPIO 25 first, GPIO 26 after `fade_step_gap_minutes`
   - If `fade_circuits == 3` → also GPIO 27 after another gap
   - Reverse order on OFF transition

### 4. Relay map — add light circuits 2 and 3

Add `LIGHT2_PIN = 26` and `LIGHT3_PIN = 27` constants, initialize them as outputs, and reflect their state in the `device_status` payload (use existing `light_on` for primary, optionally extend telemetry later).

### 5. Broiler age source

Reuse the existing `broilerAgeDays` value the firmware already syncs from cloud (`broiler_age_source` field in `device_health`). No new sync needed.

### 6. Quick verification once flashed

- Set `flock_type = broiler`, age = 5 → all light circuits stay ON 24h
- Set `flock_type = layer`, `layer_dark_hours = 9` → lights OFF for the 9-hour window
- Cover the LDR sensor in daytime (lux drops) → no change in `hybrid` if inside light window
- Shine bright light (lux > 300) → lights OFF even inside light window
- Toggle ON → GPIO 25 first, GPIO 26 lights up 5 min later

## Files Touched

- `public/esp32-industrial.ino` — struct, parser, decision logic, GPIO setup
- (No DB / UI changes — those are already in place)

## What Stays Unchanged

- 8 hardware safety invariants still take priority over any lighting decision
- `device_status.light_on` continues to reflect primary circuit state
- Existing schedule/manual override behaviour preserved

## Outcome

After this firmware update:
- LDR Daylight Auto-OFF (300 lux) will actually save power
- Broiler farms get the 23h-light brood phase + 11pm–5am rest window
- Layer farms get exactly 9 hours of uninterrupted dark
- 2-step fade reduces flock stress at sunrise/sunset
- UI, Cloud, and Hardware will be 100% in sync
