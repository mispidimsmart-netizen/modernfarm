import { describe, it, expect } from 'vitest';
import { validateShedInput, MAX_BIRD_CAPACITY } from '@/api/sheds';

describe('validateShedInput (create)', () => {
  it('accepts a valid shed', () => {
    expect(validateShedInput({ name: 'শেড ১', name_en: 'Shed 1', bird_capacity: 5000 })).toBeNull();
  });

  it('rejects an empty or whitespace-only name', () => {
    expect(validateShedInput({ name: '' })).toBe('শেডের নাম দিন');
    expect(validateShedInput({ name: '   ' })).toBe('শেডের নাম দিন');
  });

  it('rejects an overly long name', () => {
    expect(validateShedInput({ name: 'ক'.repeat(81) })).toContain('অনেক বড়');
  });

  it('rejects negative or non-finite capacity', () => {
    expect(validateShedInput({ name: 'A', bird_capacity: -1 })).toContain('ঋণাত্মক');
    expect(validateShedInput({ name: 'A', bird_capacity: Number.NaN })).toContain('ঋণাত্মক');
  });

  it('rejects an implausibly large capacity', () => {
    expect(validateShedInput({ name: 'A', bird_capacity: MAX_BIRD_CAPACITY + 1 })).toContain('অস্বাভাবিক');
    expect(validateShedInput({ name: 'A', bird_capacity: MAX_BIRD_CAPACITY })).toBeNull();
  });

  it('allows zero capacity (shed not yet stocked)', () => {
    expect(validateShedInput({ name: 'A', bird_capacity: 0 })).toBeNull();
  });
});

describe('validateShedInput (partial update)', () => {
  it('skips the name check when name is not supplied', () => {
    expect(validateShedInput({ bird_capacity: 100 }, { partial: true })).toBeNull();
  });

  it('still validates a supplied name', () => {
    expect(validateShedInput({ name: '' }, { partial: true })).toBe('শেডের নাম দিন');
  });

  it('still validates a supplied capacity', () => {
    expect(validateShedInput({ bird_capacity: -5 }, { partial: true })).toContain('ঋণাত্মক');
  });

  it('accepts an empty patch', () => {
    expect(validateShedInput({}, { partial: true })).toBeNull();
  });
});
