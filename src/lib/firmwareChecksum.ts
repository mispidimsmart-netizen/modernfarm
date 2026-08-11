/** Firmware binary hashing & version helpers (pure, unit-testable). */

export function parseVersionCode(v: string): number {
  const m = v.replace(/^v/i, "").match(/(\d+)\.(\d+)\.(\d+)/);
  if (!m) return 0;
  return parseInt(m[1]) * 1_000_000 + parseInt(m[2]) * 1_000 + parseInt(m[3]);
}

export async function crc32Hex(buffer: ArrayBuffer): Promise<string> {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  let crc = 0xffffffff;
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) crc = table[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, "0");
}

export async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
