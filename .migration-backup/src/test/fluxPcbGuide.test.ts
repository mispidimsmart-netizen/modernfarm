import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { PIN_MAP, PROMPT_SCHEMATIC, PROMPT_REVIEW, PROMPT_COMPLIANCE, COMPLIANCE_CHECKLIST, PROMPTS } from '@/data/fluxPcbGuide';

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

describe('Professional compliance checklist', () => {
  const sections = COMPLIANCE_CHECKLIST;

  it('has the five required sections', () => {
    expect(sections.map((s) => s.id)).toEqual([
      'erc-drc',
      'clearance',
      'protection',
      'coating',
      'testpoints',
    ]);
  });

  it('every section has items and at least one blocker', () => {
    for (const s of sections) {
      expect(s.items.length).toBeGreaterThan(0);
      expect(s.items.some((i) => i.severity === 'blocker')).toBe(true);
    }
  });

  it('all item ids are unique', () => {
    const ids = sections.flatMap((s) => s.items.map((i) => i.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('compliance prompt covers all five audit areas', () => {
    for (const needle of ['ERC', 'DRC', 'creepage', 'MOV', 'Conformal coating', 'Test points']) {
      expect(PROMPT_COMPLIANCE).toContain(needle);
    }
  });

  it('compliance prompt is exposed in the copyable prompt list', () => {
    expect(PROMPTS.some((p) => p.id === 'compliance' && p.text === PROMPT_COMPLIANCE)).toBe(true);
  });
});
