import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

/**
 * Contract: when a timed override is cancelled (or expires) in AUTO mode the
 * cloud must report it as inactive in /config.overrides, and the firmware must
 * drop its own per-device 20-minute manual lock so automation resumes.
 */
const repoRoot = resolve(__dirname, '../../../..');
const readsPath = resolve(repoRoot, 'supabase/functions/esp32-api/reads.ts');
const inoPath = resolve(__dirname, '../../public/esp32-industrial.ino');

describe('timed override release contract', () => {
  it('cloud /config exposes an overrides map', () => {
    if (!existsSync(readsPath)) return;
    const src = readFileSync(readsPath, 'utf8');
    expect(src).toContain('overrides: overrides');
    for (const key of ['fan', 'heater', 'fogger', 'circulation_fan', 'ceiling_fan', 'sprinkler', 'light']) {
      expect(src).toContain(`${key}:`);
    }
    // expiry must be honoured — expired override counts as inactive
    expect(src).toMatch(/expiresAt\s*>\s*now\.getTime\(\)/);
  });

  it('firmware releases per-device locks when cloud reports override inactive', () => {
    const ino = readFileSync(inoPath, 'utf8');
    expect(ino).toContain('doc.containsKey("overrides")');
    // never applied while the operator holds absolute MANUAL control
    expect(ino).toMatch(/doc\.containsKey\("overrides"\)\s*&&\s*!localManualOverride/);
    for (const [key, flag] of [
      ['fan', 'fanManualOverride'],
      ['heater', 'heaterManualOverride'],
      ['fogger', 'foggerManualOverride'],
      ['circulation_fan', 'circulationFanManualOverride'],
      ['ceiling_fan', 'ceilingFanManualOverride'],
      ['sprinkler', 'sprinklerManualOverride'],
      ['light', 'lightSchedule.manualOverride'],
    ] as const) {
      expect(ino).toContain(`ov["${key}"] == false && ${flag}`);
      expect(ino).toContain(`${flag} = false`);
    }
  });
});
