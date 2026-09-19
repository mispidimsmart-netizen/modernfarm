/**
 * Heat Stress Index (HSI) and the cloud-side rule engine built on top of it.
 *
 * Contract with the firmware (hardware is source of truth):
 *   - `calculateHSI` MUST stay numerically identical to `calcHSI()` in
 *     public/esp32-industrial-v10.ino and src/lib/heatStressIndex.ts.
 *   - The cloud only ever writes `desired_*` columns; the ESP32 decides the
 *     actual relay state and reports it back.
 *
 * | HSI    | Level  | Desired action        |
 * |--------|--------|-----------------------|
 * | < 75   | NORMAL | Fan OFF, alarm OFF    |
 * | 75–80  | MILD   | Fan LOW               |
 * | 80–85  | HIGH   | Fan HIGH              |
 * | > 85   | DANGER | Fan HIGH + alarm ON   |
 */

export type HSILevel = 'NORMAL' | 'MILD' | 'HIGH' | 'DANGER';

/**
 * Steadman heat-stress index. Mirrors firmware `calcHSI()` exactly.
 * Shared with automation-engine so cloud alerts and device behaviour agree.
 */
export { calculateHSI } from '../_shared/hsi-formula.ts';

import { evaluateModeGate } from '../_shared/mode-precedence.ts';

/**
 * Apply HSI-driven ventilation intent for a farm/shed.
 *
 * Gating follows the single mode-precedence contract in
 * `_shared/mode-precedence.ts` (FAIL_SAFE/OFFLINE > emergency > safety engine >
 * MANUAL > manual override > HSI toggle > timed per-actuator overrides), so
 * every cloud path agrees on when the cloud may express intent. Failures are
 * swallowed on purpose: sensor ingestion must never fail because the advisory
 * rule engine could not run.
 *
 * `farmId` scopes both the settings read and the `desired_*` write — without it
 * an owner with more than one farm could have another farm's device updated.
 */
// deno-lint-ignore no-explicit-any
export async function applyHSIAutomation(
  supabase: any,
  userId: string,
  level: HSILevel,
  hsi: number,
  shedId?: string | null,
  farmId?: string | null,
): Promise<void> {
  try {
    let settingsQuery = supabase
      .from('farm_settings')
      .select('hsi_automation_enabled, automation_mode, safety_engine_enabled')
      .eq('user_id', userId);
    if (farmId) settingsQuery = settingsQuery.eq('farm_id', farmId);

    const { data: settings } = await settingsQuery.limit(1).maybeSingle();

    let deviceQuery = supabase
      .from('device_status')
      .select(
        'id, mode, manual_override, desired_manual_override, shed_id, ' +
        'desired_fan_expires_at, desired_alarm_expires_at',
      )
      .eq('user_id', userId);

    if (farmId) deviceQuery = deviceQuery.eq('farm_id', farmId);
    if (shedId) deviceQuery = deviceQuery.eq('shed_id', shedId);

    const { data: deviceStatus } = await deviceQuery.limit(1).maybeSingle();

    const gate = evaluateModeGate({
      automationMode: settings?.automation_mode,
      deviceMode: deviceStatus?.mode,
      safetyEngineEnabled: settings?.safety_engine_enabled,
      hsiAutomationEnabled: settings?.hsi_automation_enabled,
      manualOverride: deviceStatus?.manual_override,
      desiredManualOverride: deviceStatus?.desired_manual_override,
      fanOverrideUntil: deviceStatus?.desired_fan_expires_at,
      alarmOverrideUntil: deviceStatus?.desired_alarm_expires_at,
      requiresHSIAutomation: true,
    });

    if (!gate.allow) {
      console.log(`⏸️ [HSI] skipped for shed ${shedId || 'default'} — ${gate.reason}`);
      return;
    }

    // Cloud writes desired_* columns ONLY.
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    switch (level) {
      case 'DANGER':
        updates.desired_fan_on = true;
        updates.desired_fan_speed = 'HIGH';
        updates.desired_alarm_on = true;
        console.log(`🚨 [Shed: ${shedId || 'default'}] HSI DANGER (${hsi.toFixed(1)}) → desired: Fan HIGH + Alarm ON`);
        break;

      case 'HIGH':
        updates.desired_fan_on = true;
        updates.desired_fan_speed = 'HIGH';
        console.log(`⚠️ [Shed: ${shedId || 'default'}] HSI HIGH (${hsi.toFixed(1)}) → desired: Fan HIGH`);
        break;

      case 'MILD':
        updates.desired_fan_on = true;
        updates.desired_fan_speed = 'LOW';
        console.log(`🌡️ [Shed: ${shedId || 'default'}] HSI MILD (${hsi.toFixed(1)}) → desired: Fan LOW`);
        break;

      case 'NORMAL':
        updates.desired_fan_on = false;
        updates.desired_fan_speed = 'OFF';
        updates.desired_alarm_on = false;
        console.log(`✅ [Shed: ${shedId || 'default'}] HSI NORMAL (${hsi.toFixed(1)}) → desired: Fan OFF`);
        break;
    }

    // Never overwrite an actuator whose timed override is still counting down.
    if (gate.skipFan) {
      delete updates.desired_fan_on;
      delete updates.desired_fan_speed;
    }
    if (gate.skipAlarm) {
      delete updates.desired_alarm_on;
    }
    if (Object.keys(updates).length <= 1) return; // only updated_at left

    let updateQuery = supabase
      .from('device_status')
      .update(updates)
      .eq('user_id', userId);

    if (farmId) updateQuery = updateQuery.eq('farm_id', farmId);
    if (shedId) updateQuery = updateQuery.eq('shed_id', shedId);

    await updateQuery;

  } catch (error) {
    console.error('HSI automation error:', error);
  }
}
