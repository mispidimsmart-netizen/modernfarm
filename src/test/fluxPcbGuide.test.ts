import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { PIN_MAP, PROMPT_SCHEMATIC, PROMPT_REVIEW } from '@/data/fluxPcbGuide';

const firmware = readFileSync(resolve(process.cwd(), 'public/esp32-industrial.ino'), 'utf8');

const defineValue = (name: string): number | null => {
  const m = firmware.match(new RegExp(`^#define\\s+${name}\\s+(\\d+)`, 'm'));
  return m ? Number(m[1]) : null;
};

describe('Flux PCB guide pin map matches v8 firmware', () => {
  it.each(PIN_MAP.map((p) => [p.define, p.gpio] as const))(
    '%s === GPIO %i',
    (name, gpio) => {
      expect(defineValue(name)).toBe(gpio);
    },
  );

  it('has no duplicate GPIO assignments', () => {
    const gpios = PIN_MAP.map((p) => p.gpio);
    expect(new Set(gpios).size).toBe(gpios.length);
  });

  it('covers all 8 relay channels', () => {
    expect(PIN_MAP.filter((p) => p.group === 'relay')).toHaveLength(8);
  });

  it('prompts reference the real GPIO numbers', () => {
    for (const p of PIN_MAP.filter((x) => x.group === 'relay')) {
      expect(PROMPT_SCHEMATIC).toContain(`GPIO${p.gpio}`);
    }
    expect(PROMPT_REVIEW).toContain('input-only');
  });
});
