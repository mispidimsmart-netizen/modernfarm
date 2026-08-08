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

/** Steadman heat-stress index. Mirrors firmware `calcHSI()` exactly. */
export function calculateHSI(temperature: number, humidity: number): number {
  return (1.8 * temperature + 32) - ((0.55 - 0.0055 * humidity) * (1.8 * temperature - 26));
}

/**
 * Apply HSI-driven ventilation intent for a farm/shed.
 *
 * No-ops when HSI automation is disabled, the farm is in MANUAL mode, or a
 * manual override is active on either side (device or app). Failures are
 * swallowed on purpose: sensor ingestion must never fail because the
 * advisory rule engine could not run.
 */
// deno-lint-ignore no-explicit-any
export async function applyHSIAutomation(
  supabase: any,
  userId: string,
  level: HSILevel,
  hsi: number,
  shedId?: string | null,
): Promise<void> {
  try {
    const { data: settings } = await supabase
      .from('farm_settings')
      .select('hsi_automation_enabled, automation_mode')
      .eq('user_id', userId)
      .single();

    if (!settings?.hsi_automation_enabled) {
      console.log('HSI automation disabled, skipping');
      return;
    }

    if (settings.automation_mode === 'MANUAL') {
      console.log(`⏸️ [HSI] MANUAL mode active for user ${userId}, skipping HSI automation`);
      return;
    }

    let deviceQuery = supabase
      .from('device_status')
      .select('id, manual_override, desired_manual_override, shed_id')
      .eq('user_id', userId);

    if (shedId) {
      deviceQuery = deviceQuery.eq('shed_id', shedId);
    }

    const { data: deviceStatus } = await deviceQuery.maybeSingle();

    // Respect overrides from BOTH sides: ESP32 (`manual_override`) and app
    // (`desired_manual_override`).
    if (deviceStatus?.manual_override || deviceStatus?.desired_manual_override) {
      console.log(`Manual override active for shed ${shedId || 'default'}, skipping HSI automation`);
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

    let updateQuery = supabase
      .from('device_status')
      .update(updates)
      .eq('user_id', userId);

    if (shedId) {
      updateQuery = updateQuery.eq('shed_id', shedId);
    }

    await updateQuery;
  } catch (error) {
    console.error('HSI automation error:', error);
  }
}
