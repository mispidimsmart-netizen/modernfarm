import { describe, it, expect } from 'vitest';
import {
  buildV8Firmware,
  buildV10Firmware,
  buildTemplateUrl,
  buildFilename,
  type BuildOptions,
} from '@/components/device/codegen/firmwareBuilder';

const base: BuildOptions = {
  ssid: '  MyWiFi  ',
  password: 'secret123',
  deviceToken: '  tok_abcdefghij  ',
  shedId: ' shed_001 ',
  shedName: ' Shed A ',
  farmId: ' farm_001 ',
  farmType: 'layer',
  firmwareMode: 'hardcoded',
  includeSafetyEngine: true,
  generatedAt: '2026-01-01T00:00:00.000Z',
};

const V8_TEMPLATE = `
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD  = "YOUR_WIFI_PASSWORD";
const char* DEVICE_TOKEN   = "YOUR_DEVICE_TOKEN";
const char* SHED_ID        = "YOUR_SHED_ID";
const char* SHED_NAME      = "Shed";
const char* FARM_ID        = "YOUR_FARM_ID";
#define USE_HARDCODED_TOKEN true
  .farmType = FARM_PROFILE_LAYER,  // Default: Layer
  .chickAgeDays = 1,                // Default: Day 1
bool safetyEngineEnabled = true;   // full engine
`;

const V10_TEMPLATE = `
const char* WIFI_SSID      = "";
const char* WIFI_PASS      = "";
const char* DEVICE_TOKEN   = "";
const char* SHED_ID        = "";
`;

describe('firmwareBuilder — v8', () => {
  it('injects trimmed credentials in hardcoded mode', () => {
    const out = buildV8Firmware(V8_TEMPLATE, base);
    expect(out).toContain('const char* WIFI_SSID     = "MyWiFi";');
    expect(out).toContain('const char* WIFI_PASSWORD  = "secret123";');
    expect(out).toContain('"tok_abcdefghij";  // Auto-configured');
    expect(out).toContain('const char* SHED_ID        = "shed_001";');
    expect(out).toContain('const char* SHED_NAME      = "Shed A";');
    expect(out).toContain('"farm_001";  // Auto-configured');
    expect(out).toContain('#define USE_HARDCODED_TOKEN true');
  });

  it('falls back to defaults for empty shed/farm ids', () => {
    const out = buildV8Firmware(V8_TEMPLATE, { ...base, shedId: '', shedName: '', farmId: '' });
    expect(out).toContain('"default_shed"');
    expect(out).toContain('"Shed A"');
    expect(out).toContain('"default_farm"');
  });

  it('switches to NVS credentials in OTA mode and does not embed WiFi', () => {
    const out = buildV8Firmware(V8_TEMPLATE, { ...base, firmwareMode: 'ota' });
    expect(out).toContain('#define USE_HARDCODED_TOKEN false');
    expect(out).toContain('const char* WIFI_SSID     = "YOUR_WIFI_SSID";');
    expect(out).toContain('OTA-READY (NVS Mode)');
  });

  it('sets broiler profile when farm type is broiler', () => {
    const out = buildV8Firmware(V8_TEMPLATE, { ...base, farmType: 'broiler' });
    expect(out).toContain('.farmType = FARM_PROFILE_BROILER');
    expect(out).toContain('BROILER (Meat)');
  });

  it('keeps layer profile untouched for layer farms', () => {
    const out = buildV8Firmware(V8_TEMPLATE, base);
    expect(out).toContain('.farmType = FARM_PROFILE_LAYER');
  });

  it('disables the safety engine at build time when unchecked (hard floor note kept)', () => {
    const out = buildV8Firmware(V8_TEMPLATE, { ...base, includeSafetyEngine: false });
    expect(out).toContain('bool safetyEngineEnabled = false;');
    expect(out).toContain('Hard Floor 42°C still active');
    expect(out).toContain('LITE (Hard Floor only');
  });

  it('keeps the safety engine enabled by default', () => {
    const out = buildV8Firmware(V8_TEMPLATE, base);
    expect(out).toContain('bool safetyEngineEnabled = true;');
    expect(out).toContain('FULL SAFETY ENGINE');
  });

  it('prepends a generated banner with the injected timestamp', () => {
    const out = buildV8Firmware(V8_TEMPLATE, base);
    expect(out.startsWith('\n/*')).toBe(true);
    expect(out).toContain('2026-01-01T00:00:00.000Z');
  });
});

describe('firmwareBuilder — v10', () => {
  it('injects credentials into the v10 config block', () => {
    const out = buildV10Firmware(V10_TEMPLATE, base);
    expect(out).toContain('const char* WIFI_SSID      = "MyWiFi";');
    expect(out).toContain('const char* WIFI_PASS      = "secret123";');
    expect(out).toContain('const char* DEVICE_TOKEN   = "tok_abcdefghij";');
    expect(out).toContain('const char* SHED_ID        = "shed_001";');
  });

  it('warns about v10 beta hardware in the banner', () => {
    const out = buildV10Firmware(V10_TEMPLATE, base);
    expect(out).toContain('v10 BETA');
    expect(out).toContain('DO NOT flash on existing v8 field devices');
  });
});

describe('firmwareBuilder — urls and filenames', () => {
  it('builds cache-busted template urls per version', () => {
    expect(buildTemplateUrl('v8', 123, 0.5)).toContain('/esp32-industrial.ino?t=123&r=');
    expect(buildTemplateUrl('v10', 123, 0.5)).toContain('/esp32-industrial-v10.ino?t=123&r=');
  });

  it('names output files by version and mode', () => {
    expect(buildFilename('v8', 'hardcoded', 'layer', 5)).toBe('farmeye-layer-5.ino');
    expect(buildFilename('v8', 'ota', 'broiler', 5)).toBe('farmeye-ota-broiler-5.ino');
    expect(buildFilename('v10', 'hardcoded', 'layer', 5)).toBe('farmeye-v10-beta-5.ino');
  });
});
