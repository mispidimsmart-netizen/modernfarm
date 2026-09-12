/**
 * Firmware content verifier — parses a fetched ESP32 .ino file to confirm
 * its version tag + GPIO pin map match the expected firmware version.
 *
 * Used by Settings → Device → Code Generator to prevent stale-cache or
 * wrong-file downloads from shipping incompatible firmware to the field.
 *
 * v10 verification checks ALL eight relay pins so a partial / Frankenstein
 * pin map (e.g. correct fan, wrong heater) is rejected before flashing.
 */

export type FirmwareVersion = 'v8' | 'v10';
export type DetectedVersion = FirmwareVersion | 'unknown';

export interface VerifyResult {
  detected: DetectedVersion;
  matches: boolean;
  hasV8Tag: boolean;
  hasV10Tag: boolean;
  hasV8Pinmap: boolean;
  hasV10Pinmap: boolean;
  /** Per-pin v10 results, useful for surfacing exactly what is wrong. */
  v10PinResults?: Record<string, boolean>;
}

const V10_PIN_PATTERNS: ReadonlyArray<{ name: string; re: RegExp }> = [
  { name: 'PIN_FAN_EXHAUST', re: /PIN_FAN_EXHAUST\s+5\b/ },
  { name: 'PIN_FAN_CEILING', re: /PIN_FAN_CEILING\s+18\b/ },
  { name: 'PIN_LIGHT',       re: /PIN_LIGHT\s+19\b/ },
  { name: 'PIN_HEATER',      re: /PIN_HEATER\s+21\b/ },
  { name: 'PIN_FOGGER',      re: /PIN_FOGGER\s+22\b/ },
  { name: 'PIN_ALARM',       re: /PIN_ALARM\s+23\b/ },
  { name: 'PIN_SPRINKLER',   re: /PIN_SPRINKLER\s+25\b/ },
  { name: 'PIN_FAN_CIRC',    re: /PIN_FAN_CIRC\s+26\b/ },
];

export function verifyFirmwareContent(
  source: string,
  expected: FirmwareVersion,
): VerifyResult {
  const hasV8Tag  = /INDUSTRIAL CONTROLLER v8/i.test(source);
  const hasV10Tag = /Industrial Firmware v10/i.test(source);

  const hasV8Pinmap =
    /FAN_RELAY_PIN\s+25\b/.test(source) &&
    /HEATER_RELAY_PIN\s+14\b/.test(source) &&
    /LIGHT_RELAY_PIN\s+27\b/.test(source);

  const v10PinResults: Record<string, boolean> = {};
  for (const { name, re } of V10_PIN_PATTERNS) v10PinResults[name] = re.test(source);
  const hasV10Pinmap = Object.values(v10PinResults).every(Boolean);

  let detected: DetectedVersion = 'unknown';
  if (hasV10Tag && hasV10Pinmap) detected = 'v10';
  else if (hasV8Tag && hasV8Pinmap) detected = 'v8';

  return {
    detected,
    matches: detected === expected,
    hasV8Tag,
    hasV10Tag,
    hasV8Pinmap,
    hasV10Pinmap,
    v10PinResults,
  };
}
