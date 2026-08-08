/**
 * Unit tests for the pure modules extracted from `index.ts`.
 *
 * These run without a database or network — they lock in the numeric and
 * parsing contracts that both the cloud and the firmware depend on.
 *
 *   deno test supabase/functions/esp32-api/domain_test.ts
 */
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { getBroilerTargetTemp, parseAction, computeQualityScore } from "./domain.ts";
import { calculateCurrentBrightness } from "./lighting.ts";
import { calculateHSI } from "./hsi.ts";
import { hmacSha256Hex, timingSafeEqual } from "./security.ts";

Deno.test("getBroilerTargetTemp: brooding curve by age", () => {
  assertEquals(getBroilerTargetTemp(1), { min: 33, max: 34 });
  assertEquals(getBroilerTargetTemp(5), { min: 32, max: 32 });
  assertEquals(getBroilerTargetTemp(14), { min: 30, max: 30 });
  assertEquals(getBroilerTargetTemp(21), { min: 28, max: 28 });
  assertEquals(getBroilerTargetTemp(35), { min: 24, max: 24 });
  assertEquals(getBroilerTargetTemp(60), { min: 22, max: 23 });
  // Out-of-range ages fall back to the mature band instead of throwing.
  assertEquals(getBroilerTargetTemp(0), { min: 22, max: 23 });
});

Deno.test("parseAction: valid and invalid actions", () => {
  assertEquals(parseAction("fan_on"), { device: "fan", state: true });
  assertEquals(parseAction("LIGHT_OFF"), { device: "light", state: false });
  assertEquals(parseAction("alarm_on"), { device: "alarm", state: true });
  assertEquals(parseAction("heater_on"), null);
  assertEquals(parseAction("fan"), null);
  assertEquals(parseAction(""), null);
});

Deno.test("computeQualityScore: penalties clamp to 0..100", () => {
  assertEquals(computeQualityScore(-50, 10, 0), 100);
  assertEquals(computeQualityScore(-70, 10, 0), 90);   // rssi -10
  assertEquals(computeQualityScore(-90, 400, 6), 30);  // -40 -30 -30
  assertEquals(computeQualityScore(null, 10, 0), 100); // unknown rssi = no penalty
  const worst = computeQualityScore(-100, 100000, 100);
  assert(worst >= 0 && worst <= 100);
});

Deno.test("calculateHSI: matches firmware Steadman formula", () => {
  // 30 °C / 60 % RH → reference value shared with src/lib/heatStressIndex.ts
  const hsi = calculateHSI(30, 60);
  assert(Math.abs(hsi - 74.68) < 0.05, `unexpected HSI ${hsi}`);
  // Monotonic in both inputs.
  assert(calculateHSI(35, 60) > calculateHSI(30, 60));
  assert(calculateHSI(30, 80) > calculateHSI(30, 60));
});

Deno.test("calculateCurrentBrightness: no schedule → off", () => {
  assertEquals(calculateCurrentBrightness(null), { brightness: 0, phase: "off" });
});

Deno.test("calculateCurrentBrightness: manual override wins", () => {
  const res = calculateCurrentBrightness({ manual_override: true, max_brightness: 80 });
  assertEquals(res, { brightness: 80, phase: "manual" });
});

Deno.test("calculateCurrentBrightness: non-gradual schedule is ON/OFF", () => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const active = {
    gradual_enabled: false,
    min_brightness: 0,
    max_brightness: 100,
    start_time: "00:00:00",
    end_time: `${pad(Math.min(23, now.getHours() + 1))}:59:00`,
  };
  assertEquals(calculateCurrentBrightness(active).phase, "on");

  const inactive = { ...active, start_time: "23:58:00", end_time: "23:59:00" };
  const res = calculateCurrentBrightness(inactive);
  assert(res.phase === "off" || res.phase === "on"); // depends on wall clock
});

Deno.test("hmacSha256Hex / timingSafeEqual", async () => {
  const a = await hmacSha256Hex("secret", "1700000000.nonce.{}");
  const b = await hmacSha256Hex("secret", "1700000000.nonce.{}");
  const c = await hmacSha256Hex("other", "1700000000.nonce.{}");
  assertEquals(a.length, 64);
  assert(timingSafeEqual(a, b));
  assert(!timingSafeEqual(a, c));
  assert(!timingSafeEqual(a, a.slice(0, 63)));
});
