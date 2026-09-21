/**
 * Executable cross-runtime parity gate for the Heat Stress Index (THI).
 *
 * The board is the source of truth. This test proves — as a release gate, not a
 * comment — that the firmware C++ formula, the cloud `_shared/hsi-formula.ts`
 * implementation and the app implementation produce the same numbers, and that
 * both firmware copies carry the identical formula.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { calculateHSI as appHSIResult } from '@/lib/heatStressIndex';

/** App returns a result object with the index rounded to 1 decimal. */
const appHSI = (t: number, rh: number) => appHSIResult(t, rh).index;

const REPO_ROOT = resolve(__dirname, '../../../..');
const FIRMWARE_PATHS = [
  resolve(REPO_ROOT, 'public/esp32-industrial.ino'),
  resolve(REPO_ROOT, 'artifacts/farmeye/public/esp32-industrial.ino'),
];
const CLOUD_FORMULA = resolve(REPO_ROOT, 'supabase/functions/_shared/hsi-formula.ts');

/** Golden vectors — THI at 1 decimal. Must never change without a firmware release. */
const GOLDEN: Array<[number, number, number]> = [
  [25, 60, 72.8],
  [30, 70, 81.3],
  [35, 80, 90.9],
  [40, 80, 98.9],
  [20, 40, 64.6],
  [38, 90, 98.0],
];

function readFirmwareFormula(path: string): string {
  const src = readFileSync(path, 'utf8');
  const match = src.match(/float\s+calculateHSI\s*\(\s*float\s+t\s*,\s*float\s+h\s*\)\s*\{([\s\S]*?)\}/);
  expect(match, `calculateHSI() not found in ${path}`).toBeTruthy();
  return match![1].replace(/\s+/g, ' ').trim();
}

/** Evaluate the firmware body in JS by stripping C float suffixes. */
function evalFirmware(body: string, t: number, h: number): number {
  const expr = body
    .replace(/^return\s+/, '')
    .replace(/;$/, '')
    .replace(/([0-9.]+)f/g, '$1');
  // eslint-disable-next-line no-new-func
  return Function('t', 'h', `return (${expr});`)(t, h) as number;
}

function cloudSource(): string {
  return readFileSync(CLOUD_FORMULA, 'utf8');
}

describe('HSI formula parity (firmware ↔ cloud ↔ app)', () => {
  it('both firmware copies carry an identical calculateHSI()', () => {
    const [a, b] = FIRMWARE_PATHS.map(readFirmwareFormula);
    expect(a).toBe(b);
  });

  it('firmware uses the v8 poultry THI expression', () => {
    const body = readFirmwareFormula(FIRMWARE_PATHS[0]);
    expect(body).toContain('0.8');
    expect(body).toContain('14.4');
    expect(body).toContain('46.4');
    expect(body).not.toMatch(/steadman/i);
  });

  it('cloud implementation declares the pinned formula version', () => {
    const src = cloudSource();
    expect(src).toContain("HSI_FORMULA_VERSION = 'v8-thi-1'");
    expect(src).toContain('0.8 * t + (rhClamped / 100) * (t - 14.4) + 46.4');
  });

  it('app matches firmware on every golden vector', () => {
    const body = readFirmwareFormula(FIRMWARE_PATHS[0]);
    for (const [t, rh, expected] of GOLDEN) {
      const fw = evalFirmware(body, t, rh);
      expect(Number(fw.toFixed(1))).toBeCloseTo(expected, 1);
      expect(appHSI(t, rh)).toBeCloseTo(Math.round(fw * 10) / 10, 5);
    }
  });

  it('threshold-boundary readings decide identically in app and firmware', () => {
    const body = readFirmwareFormula(FIRMWARE_PATHS[0]);
    for (let t = 15; t <= 45; t += 0.5) {
      for (let rh = 0; rh <= 100; rh += 10) {
        const fw = evalFirmware(body, t, rh);
        expect(Math.abs(appHSI(t, rh) - fw)).toBeLessThanOrEqual(0.05001);
      }
    }
  });
});
