# Smart Lighting — ESP32 Firmware Reference (v1)

The cloud-side Smart Lighting feature stores config in `lighting_schedule`. The
ESP32 firmware should read these columns and act accordingly. **All decisions
remain on-device** (Hardware-as-Source-of-Truth). Cloud only stores the rules.

## New columns to consume

| Column | Default | Use |
|---|---|---|
| `flock_type` | `layer` | `layer` or `broiler` — drives schedule shape |
| `layer_dark_hours` | `9` | Layer mode: hours of full uninterrupted dark |
| `broiler_dark_start` | `23:00` | Broiler night dark window start (after day 8) |
| `broiler_dark_end` | `05:00` | Broiler night dark window end (after day 8) |
| `broiler_age_auto` | `true` | If true: day 1–7 → 23h light; day 8+ → apply window |
| `ldr_daylight_off_lux` | `300` | Above this lux, force lights OFF during day (power save) |
| `fade_circuits` | `2` | 1 = single ON/OFF; 2 or 3 = stepped circuits for soft fade |
| `fade_step_gap_minutes` | `5` | Minutes between successive circuits during fade |

Existing columns still apply: `ldr_enabled`, `ldr_threshold_lux`, `ldr_hysteresis_lux`,
`ldr_mode` (`schedule_only` | `hybrid` | `sensor_only`), `start_time`, `end_time`,
`fade_in_minutes`, `fade_out_minutes`, `manual_override`.

## Decision logic (every loop tick)

```
1. If manual_override == true:        all light circuits ON, skip the rest.
2. If flock_type == 'broiler':
     age_days = current broiler batch age
     if broiler_age_auto && age_days <= 7:
        target = LIGHT_ON      // 23h light, brood phase
     else:
        in_dark_window = now ∈ [broiler_dark_start, broiler_dark_end]
        target = in_dark_window ? LIGHT_OFF : LIGHT_ON
   else (layer):
     dark_hours = layer_dark_hours
     light_hours = 24 - dark_hours
     // start_time anchors the LIGHT-ON window
     in_light_window = now ∈ [start_time, start_time + light_hours]
     target = in_light_window ? LIGHT_ON : LIGHT_OFF

3. Apply LDR override (if ldr_enabled):
     lux = read_ldr()
     if ldr_mode == 'schedule_only': skip override
     if ldr_mode == 'sensor_only':
        target = (lux < ldr_threshold_lux) ? LIGHT_ON : LIGHT_OFF
     if ldr_mode == 'hybrid':
        // Power-save: even inside light window, if it's bright enough, OFF
        if target == LIGHT_ON && lux >= ldr_daylight_off_lux:
            target = LIGHT_OFF
        // Optional reinforcement: if it's dim during light window, keep ON
        // Hysteresis: only flip OFF→ON when lux < threshold,
        //             only flip ON→OFF when lux > threshold + hysteresis.

4. Stepped fade simulation when target changes:
     if fade_circuits == 1:
        toggle all light relays together.
     else:
        on transition LIGHT_OFF → LIGHT_ON:
          turn on circuit 1 immediately
          schedule circuit 2 +fade_step_gap_minutes
          schedule circuit 3 +(2*fade_step_gap_minutes) if fade_circuits==3
        on transition LIGHT_ON → LIGHT_OFF:
          turn off in reverse order with the same gap.
```

## Relay mapping (suggested)

| Circuit | GPIO | Notes |
|---|---|---|
| Light 1 (always-first) | 25 | Existing primary light relay |
| Light 2 (fade step 2) | 26 | Add for `fade_circuits >= 2` |
| Light 3 (fade step 3) | 27 | Add for `fade_circuits == 3` |

If the user only has one wired light circuit, set `fade_circuits = 1` in the UI;
firmware will treat all as a single ON/OFF.

## Safety overrides (unchanged)

The 8 hardware invariants still take priority over lighting decisions
(e.g. emergency survival mode, manual override timeout, etc.).

## Cloud reflection

After applying, write the resulting state back via the existing `device_status`
update: `light_on`, plus an audit row in `device_command_log` with
`source = 'esp32'` for traceability.
