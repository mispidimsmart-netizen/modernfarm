import { describe, it, expect } from 'vitest';
import { verifyFirmwareContent } from '@/lib/firmwareVerifier';

// Minimal but realistic snippets mirroring the real .ino headers/pinmaps
// in public/esp32-industrial.ino and public/esp32-industrial-v10.ino.
const v8Sample = `
/*
 * SMART FARM - INDUSTRIAL CONTROLLER v8.0.0
 * GPIO 25 (IN1): Exhaust Fan
 * GPIO 14 (IN4): Heater
 */
#define FAN_RELAY_PIN    25
#define HEATER_RELAY_PIN 14
#define LIGHT_RELAY_PIN  27
`;

const v10Sample = `
/*
 * FarmEye ESP32 — Industrial Firmware v10 (Beta)
 * Phase 9 sensors + new pin map
 */
#define PIN_FAN_EXHAUST 5
#define PIN_HEATER      21
#define PIN_LIGHT       19
`;

describe('verifyFirmwareContent — match cases', () => {
  it('detects v8 when v8 file + v8 expected', () => {
    const r = verifyFirmwareContent(v8Sample, 'v8');
    expect(r.detected).toBe('v8');
    expect(r.matches).toBe(true);
    expect(r.hasV8Tag).toBe(true);
    expect(r.hasV8Pinmap).toBe(true);
  });

  it('detects v10 when v10 file + v10 expected', () => {
    const r = verifyFirmwareContent(v10Sample, 'v10');
    expect(r.detected).toBe('v10');
    expect(r.matches).toBe(true);
    expect(r.hasV10Tag).toBe(true);
    expect(r.hasV10Pinmap).toBe(true);
  });
});

describe('verifyFirmwareContent — mismatch cases', () => {
  it('flags mismatch when v8 file but v10 expected', () => {
    const r = verifyFirmwareContent(v8Sample, 'v10');
    expect(r.detected).toBe('v8');
    expect(r.matches).toBe(false);
  });

  it('flags mismatch when v10 file but v8 expected', () => {
    const r = verifyFirmwareContent(v10Sample, 'v8');
    expect(r.detected).toBe('v10');
    expect(r.matches).toBe(false);
  });

  it('returns unknown for empty/garbage content', () => {
    const r = verifyFirmwareContent('// some random sketch\nvoid setup() {}', 'v8');
    expect(r.detected).toBe('unknown');
    expect(r.matches).toBe(false);
  });

  it('returns unknown when v8 tag present but pinmap is v10', () => {
    const frankenstein = `
      // SMART FARM - INDUSTRIAL CONTROLLER v8.0.0
      #define PIN_FAN_EXHAUST 5
      #define PIN_HEATER 21
      #define PIN_LIGHT 19
    `;
    const r = verifyFirmwareContent(frankenstein, 'v8');
    expect(r.detected).toBe('unknown');
    expect(r.matches).toBe(false);
    expect(r.hasV8Tag).toBe(true);
    expect(r.hasV8Pinmap).toBe(false);
    expect(r.hasV10Pinmap).toBe(true);
  });

  it('returns unknown when v10 tag present but pinmap is v8', () => {
    const frankenstein = `
      // FarmEye ESP32 — Industrial Firmware v10 (Beta)
      #define FAN_RELAY_PIN 25
      #define HEATER_RELAY_PIN 14
      #define LIGHT_RELAY_PIN 27
    `;
    const r = verifyFirmwareContent(frankenstein, 'v10');
    expect(r.detected).toBe('unknown');
    expect(r.matches).toBe(false);
    expect(r.hasV10Tag).toBe(true);
    expect(r.hasV10Pinmap).toBe(false);
  });

  it('returns unknown when v8 pinmap uses wrong GPIO numbers', () => {
    const wrongPins = `
      // SMART FARM - INDUSTRIAL CONTROLLER v8.0.0
      #define FAN_RELAY_PIN 26
      #define HEATER_RELAY_PIN 13
      #define LIGHT_RELAY_PIN 27
    `;
    const r = verifyFirmwareContent(wrongPins, 'v8');
    expect(r.detected).toBe('unknown');
    expect(r.hasV8Tag).toBe(true);
    expect(r.hasV8Pinmap).toBe(false);
  });
});
