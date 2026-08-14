import type { FarmType, FirmwareMode } from './types';

/**
 * Pure firmware template transformers.
 * No DOM / network access here — fully unit-testable (see src/test/firmwareBuilder.test.ts).
 */

export interface BuildOptions {
  ssid: string;
  password: string;
  deviceToken: string;
  shedId: string;
  shedName: string;
  farmId: string;
  farmType: FarmType;
  firmwareMode: FirmwareMode;
  includeSafetyEngine: boolean;
  /** v8 only — board has the optional ILI9341 TFT panel wired (21/22/17/5). */
  hasDisplay?: boolean;
  /** Injected for deterministic tests. */
  generatedAt?: string;
}


/** v10 BETA: simpler config block, hardcoded mode only. */
export function buildV10Firmware(template: string, o: BuildOptions): string {
  let code = template;
  code = code.replace(
    /const\s+char\*\s+WIFI_SSID\s*=\s*"[^"]*"\s*;/,
    `const char* WIFI_SSID      = "${o.ssid.trim()}";`,
  );
  code = code.replace(
    /const\s+char\*\s+WIFI_PASS\s*=\s*"[^"]*"\s*;/,
    `const char* WIFI_PASS      = "${o.password}";`,
  );
  code = code.replace(
    /const\s+char\*\s+DEVICE_TOKEN\s*=\s*"[^"]*"\s*;/,
    `const char* DEVICE_TOKEN   = "${o.deviceToken.trim()}";`,
  );
  code = code.replace(
    /const\s+char\*\s+SHED_ID\s*=\s*"[^"]*"\s*;/,
    `const char* SHED_ID        = "${o.shedId.trim()}";`,
  );

  const header = `/*
 * ╔═══════════════════════════════════════════════════════════════════════╗
 * ║  🔧 AUTO-CONFIGURED BY FARMEYE GENERATOR — v10 BETA                  ║
 * ╠═══════════════════════════════════════════════════════════════════════╣
 * ║  Firmware: Industrial v10 (Phase 9 sensors, locked GPIO map)         ║
 * ║  WiFi SSID: ${o.ssid.trim().padEnd(54)}║
 * ║  Device Token: ${o.deviceToken.trim().substring(0, 50).padEnd(50)}...║
 * ║  Generated: ${(o.generatedAt ?? new Date().toISOString()).padEnd(53)}║
 * ╠═══════════════════════════════════════════════════════════════════════╣
 * ║  ⚠️ v10 BETA — only use on NEW v10 hardware (Exhaust=5, Heater=21).  ║
 * ║  ⚠️ DO NOT flash on existing v8 field devices.                       ║
 * ╚═══════════════════════════════════════════════════════════════════════╝
 */

`;
  return header + code;
}

/** v8 STABLE: hardcoded or OTA (NVS) mode. */
export function buildV8Firmware(template: string, o: BuildOptions): string {
  let code = template;

  if (o.firmwareMode === 'hardcoded') {
    code = code.replace(
      /const\s+char\*\s+WIFI_SSID\s*=\s*"YOUR_WIFI_SSID"\s*;/,
      `const char* WIFI_SSID     = "${o.ssid.trim()}";`,
    );
    code = code.replace(
      /const\s+char\*\s+WIFI_PASSWORD\s*=\s*"YOUR_WIFI_PASSWORD"\s*;/,
      `const char* WIFI_PASSWORD  = "${o.password}";`,
    );
    code = code.replace(
      /const\s+char\*\s+DEVICE_TOKEN\s*=\s*"YOUR_DEVICE_TOKEN"\s*;/,
      `const char* DEVICE_TOKEN   = "${o.deviceToken.trim()}";  // Auto-configured`,
    );
    code = code.replace(
      /const\s+char\*\s+SHED_ID\s*=\s*"YOUR_SHED_ID"\s*;/,
      `const char* SHED_ID        = "${o.shedId.trim() || 'default_shed'}";`,
    );
    code = code.replace(
      /const\s+char\*\s+SHED_NAME\s*=\s*"[^"]*"\s*;/,
      `const char* SHED_NAME      = "${o.shedName.trim() || 'Shed A'}";`,
    );
    code = code.replace(
      /const\s+char\*\s+FARM_ID\s*=\s*"YOUR_FARM_ID"\s*;/,
      `const char* FARM_ID        = "${o.farmId.trim() || 'default_farm'}";  // Auto-configured`,
    );
    // USE_HARDCODED_TOKEN stays true (template default)
  } else {
    code = code.replace(
      '#define USE_HARDCODED_TOKEN true',
      '#define USE_HARDCODED_TOKEN false  // OTA Mode: Reads credentials from NVS',
    );
  }

  if (o.farmType === 'broiler') {
    // Legacy designated-initializer form (older templates)
    code = code.replace(
      '.farmType = FARM_PROFILE_LAYER,  // Default: Layer',
      '.farmType = FARM_PROFILE_BROILER,  // Default: Broiler (auto-configured)',
    );
    code = code.replace(
      '.chickAgeDays = 1,                // Default: Day 1',
      '.chickAgeDays = 1,                // Default: Day 1 (auto-configured for broiler)',
    );
    // Current v8.3 template form:
    //   FarmConfig farmConfig = { FARM_PROFILE_LAYER, 1, 0.0f, 0.0f };
    // Also patched inside the factory-reset branch so a reset keeps the profile.
    code = code.replace(
      /(FarmConfig\s+farmConfig\s*=\s*\{\s*)FARM_PROFILE_LAYER/g,
      '$1FARM_PROFILE_BROILER',
    );
    code = code.replace(
      /(farmConfig\s*=\s*\{\s*)FARM_PROFILE_LAYER/g,
      '$1FARM_PROFILE_BROILER',
    );
    code = code.replace(
      /(farmConfig\.farmType\s*>\s*1\)\s*farmConfig\.farmType\s*=\s*)FARM_PROFILE_LAYER/g,
      '$1FARM_PROFILE_BROILER',
    );
  }


  // Optional TFT display: template default is DISABLED (no extra libraries
  // required). Enable only when the board actually has the ILI9341 panel.
  code = code.replace(
    /#define\s+DISPLAY_ENABLED\s+(true|false)/,
    `#define DISPLAY_ENABLED ${o.hasDisplay ? 'true' : 'false'}`,
  );

  // Build-time safety engine toggle (cloud /config can override at runtime)
  if (!o.includeSafetyEngine) {
    code = code.replace(
      /bool\s+safetyEngineEnabled\s*=\s*true\s*;[^\n]*/,
      'bool safetyEngineEnabled = false;          // ⚠️ DISABLED at build time (Hard Floor 42°C still active)',
    );
  }


  return buildV8Header(o) + code;
}

/** Banner comment prepended to generated v8 firmware. */
export function buildV8Header(o: BuildOptions): string {
  const modeLabel = o.firmwareMode === 'ota' ? 'OTA-READY (NVS Mode)' : 'HARDCODED (First-time Setup)';
  const safetyLabel = o.includeSafetyEngine ? 'FULL SAFETY ENGINE' : 'LITE (Hard Floor only — 42°C)';
  const displayLabel = o.hasDisplay
    ? 'ON — install Adafruit GFX + ILI9341 libs (SCK21/MOSI22/CS17/DC5)'
    : 'OFF — optional, no extra libraries needed';

  return `
/*
 * ╔═══════════════════════════════════════════════════════════════════════╗
 * ║  🔧 AUTO-CONFIGURED BY FARMEYE GENERATOR                             ║
 * ╠═══════════════════════════════════════════════════════════════════════╣
 * ║  Mode: ${modeLabel.padEnd(57)}║
 * ║  Farm Type: ${(o.farmType === 'layer' ? 'LAYER (Egg)' : 'BROILER (Meat)').padEnd(54)}║${o.firmwareMode === 'hardcoded' ? `
 * ║  WiFi SSID: ${o.ssid.trim().padEnd(54)}║
 * ║  Device Token: ${o.deviceToken.trim().substring(0, 50).padEnd(50)}...║
 * ║  Shed: ${(o.shedName || 'Default Shed').padEnd(58)}║` : `
 * ║  📦 Credentials will be loaded from NVS storage                       ║
 * ║  ⚠️ Device must be first provisioned with hardcoded firmware          ║`}
 * ║  Safety: ${safetyLabel.padEnd(55)}║
 * ║  Generated: ${(o.generatedAt ?? new Date().toISOString()).padEnd(53)}║
 * ╠═══════════════════════════════════════════════════════════════════════╣${o.firmwareMode === 'ota' ? `
 * ║  📋 OTA INSTRUCTIONS:                                                 ║
 * ║  1. Arduino IDE → Sketch → Export Compiled Binary                    ║
 * ║  2. Upload the .bin file to OTA Firmware section                     ║
 * ║  3. Push to devices - they'll auto-update!                           ║` : `
 * ║  ⚠️ এই ফাইল সরাসরি Arduino IDE তে Upload করুন!                       ║
 * ║  ⚠️ Upload this file directly in Arduino IDE!                        ║`}
 * ╚═══════════════════════════════════════════════════════════════════════╝
 */

`;
}

/** Cache-busted public URL of the .ino template for the given version. */
export function buildTemplateUrl(version: 'v8' | 'v10', now = Date.now(), rand = Math.random()): string {
  const cacheBuster = `t=${now}&r=${rand.toString(36).slice(2, 10)}`;
  const baseFile = version === 'v10' ? '/esp32-industrial-v10.ino' : '/esp32-industrial.ino';
  return `${baseFile}?${cacheBuster}`;
}

/**
 * Output .ino filename.
 * Arduino IDE requires the sketch file name to match its folder name and to
 * contain only [A-Za-z0-9_]; timestamps/dashes cause "Unable to find executable
 * file ... .ino.elf" build errors. So we emit short, underscore-only names.
 */
export function buildFilename(
  version: 'v8' | 'v10',
  mode: FirmwareMode,
  farmType: FarmType,
  _now = Date.now(),
): string {
  const type = String(farmType).replace(/[^A-Za-z0-9]/g, '_');
  if (version === 'v10') return `farmeye_v10_beta.ino`;
  return mode === 'ota' ? `farmeye_ota_${type}.ino` : `farmeye_${type}.ino`;
}

