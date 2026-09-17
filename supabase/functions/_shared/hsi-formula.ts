/**
 * Single source of truth for the Heat Stress Index (HSI) formula.
 *
 * Hardware is source of truth: this MUST stay numerically identical to
 * `calcHSI()` in the ESP32 firmware. Every cloud function (esp32-api,
 * automation-engine) imports this — never re-derive the formula locally,
 * otherwise cloud alerts and device behaviour diverge.
 *
 * Steadman heat-stress index (°F scale, ~75–90 operating band).
 */
export function calculateHSI(temperature: number, humidity: number): number {
  return (1.8 * temperature + 32) - ((0.55 - 0.0055 * humidity) * (1.8 * temperature - 26));
}
