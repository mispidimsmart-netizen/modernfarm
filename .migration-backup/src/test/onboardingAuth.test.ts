import { describe, it, expect, beforeEach } from 'vitest';
import {
  SETUP_STEPS,
  isStepDone,
  completedStepCount,
  setupProgressPercent,
  nextSetupStep,
  deriveSetupState,
} from '@/lib/onboarding';
import {
  generateInviteCode,
  normalizeInviteCode,
  isValidInviteCode,
  isInvitationActive,
  minutesUntilExpiry,
} from '@/lib/inviteCodes';
import {
  hintKey,
  workerUnlockKey,
  setFlag,
  isFlagSet,
  clearFlag,
  clearFlagsByPrefix,
  HINT_PREFIX,
} from '@/lib/localFlags';

describe('onboarding setup steps', () => {
  it('has 9 unique ordered steps', () => {
    expect(SETUP_STEPS).toHaveLength(9);
    expect(SETUP_STEPS.map((s) => s.step)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(new Set(SETUP_STEPS.map((s) => s.key)).size).toBe(9);
  });

  it('treats missing row as zero progress but complete (legacy farms)', () => {
    expect(completedStepCount(null)).toBe(0);
    expect(setupProgressPercent(null)).toBe(0);
    expect(deriveSetupState(null).isComplete).toBe(true);
    expect(deriveSetupState(null).isHardwareValidated).toBe(false);
  });

  it('counts only boolean-true flags', () => {
    const row = { step_farm_created: true, step_shed_added: 'yes', step_relays_tested: false };
    expect(isStepDone(row, 'step_farm_created')).toBe(true);
    expect(isStepDone(row, 'step_shed_added')).toBe(false);
    expect(completedStepCount(row)).toBe(1);
    expect(setupProgressPercent(row)).toBe(11);
  });

  it('returns the first incomplete step', () => {
    const row = { step_farm_created: true, step_shed_added: true };
    expect(nextSetupStep(row)?.key).toBe('step_controller_registered');
  });

  it('returns null next step when all complete', () => {
    const row: Record<string, boolean> = {};
    SETUP_STEPS.forEach((s) => (row[s.key] = true));
    expect(nextSetupStep(row)).toBeNull();
    expect(setupProgressPercent(row)).toBe(100);
  });

  it('derives hardware validation and completion flags', () => {
    const state = deriveSetupState({ setup_completed: false, hardware_validation_passed: true });
    expect(state.isComplete).toBe(false);
    expect(state.isHardwareValidated).toBe(true);
    expect(state.total).toBe(9);
  });
});

describe('invite codes', () => {
  it('generates 8-char uppercase alphanumeric codes', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateInviteCode();
      expect(code).toHaveLength(8);
      expect(code).toMatch(/^[A-Z0-9]{8}$/);
    }
  });

  it('pads when rng yields short strings', () => {
    const code = generateInviteCode(() => 0.5);
    expect(code).toHaveLength(8);
    expect(code).toMatch(/^[A-Z0-9]{8}$/);
  });

  it('normalizes user input', () => {
    expect(normalizeInviteCode('  ab12cd34 ')).toBe('AB12CD34');
    expect(normalizeInviteCode('')).toBe('');
  });

  it('validates codes', () => {
    expect(isValidInviteCode(' ab12 ')).toBe(true);
    expect(isValidInviteCode('')).toBe(false);
    expect(isValidInviteCode('   ')).toBe(false);
    expect(isValidInviteCode('AB-12')).toBe(false);
  });

  it('detects active vs used vs expired invitations', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    expect(isInvitationActive({ expires_at: '2026-01-02T00:00:00Z' }, now)).toBe(true);
    expect(isInvitationActive({ expires_at: '2025-12-31T00:00:00Z' }, now)).toBe(false);
    expect(
      isInvitationActive({ expires_at: '2026-01-02T00:00:00Z', used_at: '2026-01-01T00:00:00Z' }, now),
    ).toBe(false);
    expect(isInvitationActive({ expires_at: 'garbage' }, now)).toBe(false);
    expect(isInvitationActive({ expires_at: null }, now)).toBe(true);
  });

  it('computes minutes until expiry', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    expect(minutesUntilExpiry({ expires_at: '2026-01-01T01:30:00Z' }, now)).toBe(90);
    expect(minutesUntilExpiry({ expires_at: '2025-12-31T23:00:00Z' }, now)).toBe(0);
    expect(minutesUntilExpiry({ expires_at: null }, now)).toBe(0);
  });
});

describe('localFlags', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('builds namespaced keys', () => {
    expect(hintKey('kpi-tap')).toBe('farmeye-hint-seen:kpi-tap');
    expect(workerUnlockKey('farm-1')).toBe('worker_mode_unlocked:farm-1');
  });

  it('sets, reads and clears flags', () => {
    const k = workerUnlockKey('farm-1');
    expect(isFlagSet(k)).toBe(false);
    setFlag(k);
    expect(isFlagSet(k)).toBe(true);
    clearFlag(k);
    expect(isFlagSet(k)).toBe(false);
  });

  it('clears every flag matching a prefix only', () => {
    setFlag(hintKey('a'));
    setFlag(hintKey('b'));
    setFlag(workerUnlockKey('farm-1'));
    const removed = clearFlagsByPrefix(HINT_PREFIX);
    expect(removed).toBe(2);
    expect(isFlagSet(hintKey('a'))).toBe(false);
    expect(isFlagSet(workerUnlockKey('farm-1'))).toBe(true);
  });
});
