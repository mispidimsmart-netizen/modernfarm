export const PUBLIC_TRACE_BASE_URL = 'https://farmeye.pro.bd';

/** Domains that are considered valid for a scanned trace QR link. */
export const ALLOWED_TRACE_HOSTS = ['farmeye.pro.bd', 'modernfarm.pro.bd', 'farmeye.lovable.app'];

export type BatchKind = 'layer' | 'broiler';

export interface TraceQrPayload {
  slug: string;
  kind: BatchKind;
  batchId: string;
}

/** Builds the canonical public trace URL embedded in a QR code. */
export function buildTraceUrl({ slug, kind, batchId }: TraceQrPayload): string {
  if (!slug) throw new Error('slug is required');
  if (kind !== 'layer' && kind !== 'broiler') throw new Error('invalid batch kind');
  if (!batchId) throw new Error('batchId is required');
  return `${PUBLIC_TRACE_BASE_URL}/trace/${encodeURIComponent(slug)}?kind=${kind}&batch=${encodeURIComponent(batchId)}`;
}

export interface ParsedTraceUrl {
  valid: boolean;
  reason?: 'bad-url' | 'bad-domain' | 'bad-path' | 'legacy-missing-params' | 'bad-kind';
  slug?: string;
  kind?: BatchKind;
  batchId?: string;
}

/** Parses/validates a scanned QR link. Legacy links (no kind/batch) are reported as invalid. */
export function parseTraceUrl(raw: string): ParsedTraceUrl {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { valid: false, reason: 'bad-url' };
  }

  if (!ALLOWED_TRACE_HOSTS.includes(url.hostname)) {
    return { valid: false, reason: 'bad-domain' };
  }

  const match = url.pathname.match(/^\/trace\/([^/]+)\/?$/);
  if (!match) return { valid: false, reason: 'bad-path' };

  const slug = decodeURIComponent(match[1]);
  const kind = url.searchParams.get('kind');
  const batchId = url.searchParams.get('batch');

  if (!kind || !batchId) return { valid: false, reason: 'legacy-missing-params', slug };
  if (kind !== 'layer' && kind !== 'broiler') return { valid: false, reason: 'bad-kind', slug };

  return { valid: true, slug, kind, batchId };
}

/** True when the page data matches what the scanned QR claimed. */
export function isTraceMatch(
  expected: { kind?: string | null; batchId?: string | null },
  actual: { kind?: string | null; id?: string | null },
): boolean {
  if (expected.kind && actual.kind && expected.kind !== actual.kind) return false;
  if (expected.batchId && actual.id && expected.batchId !== actual.id) return false;
  return true;
}
