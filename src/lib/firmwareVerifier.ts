/**
 * Firmware content verifier — parses a fetched ESP32 .ino file to confirm
 * its version tag + GPIO pin map match the expected firmware version.
 *
 * Used by Settings → Device → Code Generator to prevent stale-cache or
 * wrong-file downloads from shipping incompatible firmware to the field.
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
}

/**
 * Parse firmware source text and detect which version it is by checking
 * BOTH the version banner comment AND the GPIO pin map. A file only
 * counts as a given version if both signals agree.
 */
export function verifyFirmwareContent(
  source: string,
  expected: FirmwareVersion,
): VerifyResult {
  const hasV8Tag = /INDUSTRIAL CONTROLLER v8/i.test(source);
  const hasV10Tag = /Industrial Firmware v10/i.test(source);

  const hasV8Pinmap =
    /FAN_RELAY_PIN\s+25\b/.test(source) &&
    /HEATER_RELAY_PIN\s+14\b/.test(source) &&
    /LIGHT_RELAY_PIN\s+27\b/.test(source);

  const hasV10Pinmap =
    /PIN_FAN_EXHAUST\s+5\b/.test(source) &&
    /PIN_HEATER\s+21\b/.test(source) &&
    /PIN_LIGHT\s+19\b/.test(source);

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
  };
}
