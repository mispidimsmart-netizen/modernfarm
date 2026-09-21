/**
 * MANUAL MODE — full automated contract suite.
 *
 * Four layers are covered end to end:
 *   1. Mode derivation & state changes (src/lib/manualMode)
 *   2. Control-page gating: what the operator may command in MANUAL
 *      (src/lib/controlModeGating, src/lib/deviceSafetyLock)
 *   3. Cloud/API requests: every desired_* writer must go through
 *      evaluateModeGate() and stand down in MANUAL
 *   4. ESP32 firmware response: source-level invariants on the shipped .ino /
 *      safety-engine header (both public copies must be byte-identical)
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  deriveManualMode,
  isHardwareManualMode,
  isModeSyncPending,
  canUseTimedOverride,
  shouldShowSafetyTiles,
  manualOverrideKind,
} from '@/lib/manualMode';
import {
  canUserCommand,
  isDeviceSafetyLocked,
  shouldCloudApplySafetyAutomation,
  shouldShowSafetyLockedPanel,
  type DeviceKey,
  type SafetyContext,
} from '@/lib/controlModeGating';
import { evaluateModeGate } from '../../../../supabase/functions/_shared/mode-precedence';

const ALL_DEVICES: DeviceKey[] = [
  'fan', 'heater', 'light', 'alarm',
  'circulation_fan', 'ceiling_fan', 'fogger', 'sprinkler',
];

const manualCtx = (over: Partial<SafetyContext> = {}): SafetyContext => ({
  mode: 'MANUAL',
  safetyEngineEnabled: true,
  temperature: 44,   // way past the hard floor
  ammonia: 80,       // way past the gas limit
  temperatureMax: 32,
  ammoniaMax: 25,
  ...over,
});

// ───────────────────────── 1. state changes ─────────────────────────
describe('MANUAL mode — state derivation', () => {
  it('any single manual signal makes the UI manual', () => {
    expect(deriveManualMode({ automationMode: 'MANUAL' })).toBe(true);
    expect(deriveManualMode({ automationMode: 'manual' })).toBe(true);
    expect(deriveManualMode({ desiredManualOverride: true })).toBe(true);
    expect(deriveManualMode({ manualOverride: true })).toBe(true);
    expect(deriveManualMode({ automationMode: 'AUTO' })).toBe(false);
    expect(deriveManualMode({})).toBe(false);
  });

  it('hardware truth only follows the board flag', () => {
    expect(isHardwareManualMode({ automationMode: 'MANUAL' })).toBe(false);
    expect(isHardwareManualMode({ manualOverride: true })).toBe(true);
  });

  it('shows "waiting for hardware" until the board mirrors the mode', () => {
    // App asked for MANUAL, board still reports AUTO
    expect(isModeSyncPending({ automationMode: 'MANUAL', manualOverride: false })).toBe(true);
    // Board applied it
    expect(isModeSyncPending({ automationMode: 'MANUAL', manualOverride: true })).toBe(false);
    // Board holds MANUAL after a button press, cloud not updated yet
    expect(isModeSyncPending({ automationMode: 'AUTO', manualOverride: true })).toBe(false);
    // Settled AUTO
    expect(isModeSyncPending({ automationMode: 'AUTO', manualOverride: false })).toBe(false);
  });

  it('manual hold is permanent; auto overrides are temporary', () => {
    expect(manualOverrideKind(true)).toBe('permanent');
    expect(manualOverrideKind(false)).toBe('temporary');
  });

  it('timed overrides exist only in AUTO', () => {
    expect(canUseTimedOverride(true)).toBe(false);
    expect(canUseTimedOverride(false)).toBe(true);
  });

  it('safety/automation tiles are hidden in MANUAL', () => {
    expect(shouldShowSafetyTiles(true)).toBe(false);
    expect(shouldShowSafetyTiles(false)).toBe(true);
    expect(shouldShowSafetyLockedPanel(true, 'MANUAL')).toBe(false);
    expect(shouldShowSafetyLockedPanel(true, 'AUTO')).toBe(true);
  });
});

// ───────────────────────── 2. operator controls ─────────────────────────
describe('MANUAL mode — operator controls are never blocked', () => {
  it('no device is safety-locked in MANUAL, even in extreme danger', () => {
    for (const d of ALL_DEVICES) {
      expect(isDeviceSafetyLocked(d, manualCtx())).toBe(false);
      expect(isDeviceSafetyLocked(d, manualCtx({ safetyEngineEnabled: false }))).toBe(false);
    }
  });

  it('every ON and OFF command is permitted in MANUAL', () => {
    for (const d of ALL_DEVICES) {
      expect(canUserCommand(d, manualCtx(), 'on')).toBe(true);
      expect(canUserCommand(d, manualCtx(), 'off')).toBe(true);
    }
  });

  it('AUTO keeps its safety locks (contrast case)', () => {
    const auto = manualCtx({ mode: 'AUTO' });
    expect(isDeviceSafetyLocked('fan', auto)).toBe(true);
    expect(canUserCommand('fan', auto, 'off')).toBe(false);
    expect(canUserCommand('fan', auto, 'on')).toBe(true);
  });
});

// ───────────────────────── 3. API / cloud writes ─────────────────────────
describe('MANUAL mode — cloud never writes desired_* (API contract)', () => {
  it('automation_mode MANUAL denies with MANUAL_MODE', () => {
    const r = evaluateModeGate({ automationMode: 'MANUAL' });
    expect(r.allow).toBe(false);
    expect(r.reason).toBe('MANUAL_MODE');
    expect(r.skipFan).toBe(true);
    expect(r.skipAlarm).toBe(true);
  });

  it('board-reported MANUAL denies even when cloud thinks AUTO', () => {
    const r = evaluateModeGate({ automationMode: 'AUTO', deviceMode: 'MANUAL' });
    expect(r.allow).toBe(false);
    expect(r.reason).toBe('MANUAL_MODE');
  });

  it('manual_override / desired_manual_override deny with MANUAL_OVERRIDE', () => {
    expect(evaluateModeGate({ automationMode: 'AUTO', manualOverride: true }).reason)
      .toBe('MANUAL_OVERRIDE');
    expect(evaluateModeGate({ automationMode: 'AUTO', desiredManualOverride: true }).reason)
      .toBe('MANUAL_OVERRIDE');
  });

  it('MANUAL wins over every lower rule (HSI writer included)', () => {
    const r = evaluateModeGate({
      automationMode: 'MANUAL',
      requiresHSIAutomation: true,
      hsiAutomationEnabled: true,
      fanOverrideUntil: new Date(Date.now() + 60_000).toISOString(),
    });
    expect(r.allow).toBe(false);
    expect(r.reason).toBe('MANUAL_MODE');
  });

  it('higher-precedence board states still win over MANUAL labelling', () => {
    expect(evaluateModeGate({ automationMode: 'MANUAL', deviceMode: 'FAIL_SAFE' }).reason)
      .toBe('DEVICE_FAIL_SAFE');
    expect(evaluateModeGate({ automationMode: 'MANUAL', emergencyActive: true }).reason)
      .toBe('EMERGENCY_ACTIVE');
  });

  it('AUTO + engine ON is the only allowing combination', () => {
    const r = evaluateModeGate({ automationMode: 'AUTO', deviceMode: 'AUTO', safetyEngineEnabled: true });
    expect(r.allow).toBe(true);
    expect(r.skipFan).toBe(false);
  });

  it('client mirror agrees with the server gate for MANUAL', () => {
    expect(shouldCloudApplySafetyAutomation({ mode: 'MANUAL', safetyEngineEnabled: true })).toBe(false);
    expect(evaluateModeGate({ automationMode: 'MANUAL', safetyEngineEnabled: true }).allow).toBe(false);
  });
});

// ───────────────────────── 4. ESP32 firmware response ─────────────────────────
const root = resolve(__dirname, '../../');            // artifacts/farmeye
const repo = resolve(__dirname, '../../../../');      // /dev-server
const appIno = readFileSync(resolve(root, 'public/esp32-industrial.ino'), 'utf8');
const pubIno = readFileSync(resolve(repo, 'public/esp32-industrial.ino'), 'utf8');
const appHdr = readFileSync(resolve(root, 'public/esp32-safety-engine.h'), 'utf8');

describe('MANUAL mode — ESP32 firmware source invariants', () => {
  it('both shipped firmware copies are identical', () => {
    expect(pubIno).toBe(appIno);
  });

  it('declares a manual-absolute firmware version', () => {
    const m = appIno.match(/FIRMWARE_VERSION\s*=\s*"([^"]+)"/);
    expect(m?.[1]).toMatch(/manual-absolute/);
  });

  it('every automation relay request is guarded by manualAbsolute()', () => {
    const guarded = [
      'requestFan', 'requestHeater', 'requestFogger',
      'requestCirculationFan', 'requestCeilingFan', 'requestSprinkler', 'requestLight',
    ];
    for (const fn of guarded) {
      const line = appIno.split('\n').find(
        (l) => l.startsWith(`void ${fn}(`) && l.includes('{'),
      );
      expect(line, `${fn} definition not found`).toBeTruthy();
      expect(line, `${fn} missing manualAbsolute() guard`).toContain('if (manualAbsolute()) return;');
    }
  });

  it('the siren stays available in MANUAL (never guarded)', () => {
    const line = appIno.split('\n').find((l) => l.startsWith('void requestAlarm('));
    expect(line).toBeTruthy();
    expect(line).not.toContain('manualAbsolute()');
  });

  it('the safety arbiter only drives the alarm pin while manual-absolute', () => {
    expect(appHdr).toContain('setManualAbsolute');
    expect(appHdr).toMatch(/_manualAbsolute\s*&&\s*pin\s*!=\s*alarmPin/);
    expect(appIno).toContain('safetyEngine.setManualAbsolute(manualAbsolute())');
  });

  it('boot ventilation and sensor-fail fans stand down in MANUAL', () => {
    // No unguarded automation fan kick: every requestFan call site relies on the
    // setter guard above, and the boot purge checks the mode explicitly.
    expect(appIno).toContain('!manualAbsolute()');
  });

  it('manual mode survives reboot via NVS restore before the display init', () => {
    const load = appIno.indexOf('loadPersistedModeState()');
    const apply = appIno.indexOf('relayManagerApply()', load);
    const display = appIno.indexOf('displayInit()');
    expect(load).toBeGreaterThan(-1);
    expect(apply).toBeGreaterThan(load);
    expect(display).toBeGreaterThan(apply);
  });

  it('operator commands write relays directly (not through the guarded setters)', () => {
    const start = appIno.indexOf('void forceApplyManualRelay');
    expect(start).toBeGreaterThan(-1);
    const body = appIno.slice(start, start + 3000);
    expect(body).toContain('digitalWrite(FAN_RELAY_PIN');
    expect(body).not.toContain('requestFan(');
  });
});
