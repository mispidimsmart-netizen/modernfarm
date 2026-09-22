import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Hardware-as-Source-of-Truth: every screen must render the ACTUAL relay
 * columns reported by the ESP32 — in MANUAL as well as AUTO. Substituting
 * `desired_*` in MANUAL made the Control page contradict the Dashboard device
 * summary for the same relay, so this guard keeps both derivations aligned.
 */
const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

describe('relay state source of truth', () => {
  it('useDeviceControl never substitutes desired_* for actual state', () => {
    const src = read('src/hooks/useSensorData.ts');
    expect(src).toMatch(/const resolveState = \(actual: boolean, _desired\?: boolean \| null\) => actual;/);
    expect(src).not.toMatch(/if \(isManualMode && desired !== null/);
  });

  it('useRealtimeDeviceStatus only gates on device freshness, not desired_*', () => {
    const src = read('src/hooks/useRealtimeSensorData.ts');
    expect(src).toMatch(/if \(!isDeviceOnline\) return false;\s*\n\s*return actual;/);
    expect(src).not.toMatch(/isManualMode && desired !== null/);
  });

  it('dashboard device summary reads actual columns only', () => {
    const src = read('src/components/dashboard/DeviceStatusSummary.tsx');
    expect(src).toMatch(/const actual = \(col: string\) => isDeviceOnline && !!r\[col\];/);
    expect(src).not.toMatch(/desired_/);
  });
});
