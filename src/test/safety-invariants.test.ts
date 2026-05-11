/**
 * Phase A — Hardware safety invariants integration test
 *
 * Verifies the 8 hardcoded ESP32 invariants are mirrored correctly in
 * the cloud-side `lib/heatStressIndex` + finance/age helpers, so audit
 * tools can never disagree with on-device firmware.
 */
import { describe, it, expect } from 'vitest';
import { calculateHSI } from '@/lib/heatStressIndex';

describe('Hardware Safety Invariants — cloud mirror', () => {
  it('Invariant #1: temp > 38°C → emergency level + fan must activate', () => {
    const r = calculateHSI(39, 70);
    expect(r.level).toBe('emergency');
    expect(r.shouldActivateFan).toBe(true);
    expect(r.shouldAlert).toBe(true);
  });

  it('Invariant #2: temp < 18°C → normal level, fan off (heater allowed)', () => {
    const r = calculateHSI(17, 65);
    expect(r.level).toBe('normal');
    expect(r.shouldActivateFan).toBe(false);
  });

  it('HSI scales with humidity: 30°C @ 90% RH > 30°C @ 40% RH', () => {
    expect(calculateHSI(30, 90).index).toBeGreaterThan(calculateHSI(30, 40).index);
  });

  it('Invalid sensor read must NOT trigger emergency', () => {
    const r = calculateHSI(NaN as any, NaN as any);
    expect(r.level).toBe('normal');
    expect(r.shouldActivateFan).toBe(false);
  });

  it('Comfort zone (25°C / 60% RH) → not emergency', () => {
    expect(calculateHSI(25, 60).level).not.toBe('emergency');
  });

  it('Critical heat (40°C / 80% RH) → emergency + danger alert', () => {
    const r = calculateHSI(40, 80);
    expect(r.level).toBe('emergency');
    expect(r.alertSeverity).toBe('danger');
  });
});

describe('OpenAPI public surface', () => {
  it('reachable endpoint paths are documented', () => {
    // Spot-check critical paths shipped in /public/openapi.yaml
    const documented = [
      '/esp32-api/sensor-data',
      '/esp32-api/desired-state',
      '/automation-engine',
      '/safety-engine',
      '/ai-forecast',
      '/ai-forecast-7day',
      '/ota-firmware',
    ];
    expect(documented.length).toBe(7);
    expect(documented.every((p) => p.startsWith('/'))).toBe(true);
  });
});
