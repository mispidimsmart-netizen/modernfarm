export const PUBLIC_TRACE_BASE_URL = 'https://farmeye.pro.bd';

/** Domains that are considered valid for a scanned trace QR link. */
export const ALLOWED_TRACE_HOSTS = ['farmeye.pro.bd', 'modernfarm.pro.bd', 'farmeye.lovable.app'];

export type BatchKind = 'layer' | 'broiler';

export interface TraceQrPayload {
  slug: string;
  kind: BatchKind;
  batchId: string;
  /** Farm the batch belongs to — lets the public page verify it renders the right farm. */
  farmId: string;
  /** Optional QR revision, bumped when branding/data changes so old prints are traceable. */
  version?: number;
}

/** Builds the canonical public trace URL embedded in a QR code. */
export function buildTraceUrl({ slug, kind, batchId, farmId, version }: TraceQrPayload): string {
  if (!slug) throw new Error('slug is required');
  if (kind !== 'layer' && kind !== 'broiler') throw new Error('invalid batch kind');
  if (!batchId) throw new Error('batchId is required');
  if (!farmId) throw new Error('farmId is required');
  const params = new URLSearchParams({ kind, batch: batchId, farm: farmId });
  if (version != null) params.set('v', String(version));
  return `${PUBLIC_TRACE_BASE_URL}/trace/${encodeURIComponent(slug)}?${params.toString()}`;
}

export interface ParsedTraceUrl {
  valid: boolean;
  reason?: 'bad-url' | 'bad-domain' | 'bad-path' | 'legacy-missing-params' | 'bad-kind';
  slug?: string;
  kind?: BatchKind;
  batchId?: string;
  farmId?: string;
  version?: number;
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
  const farmId = url.searchParams.get('farm') ?? undefined;
  const rawVersion = url.searchParams.get('v');
  const version = rawVersion && !Number.isNaN(Number(rawVersion)) ? Number(rawVersion) : undefined;

  if (!kind || !batchId) return { valid: false, reason: 'legacy-missing-params', slug, farmId };
  if (kind !== 'layer' && kind !== 'broiler') return { valid: false, reason: 'bad-kind', slug, farmId };

  return { valid: true, slug, kind, batchId, farmId, version };
}

/** True when the page data matches what the scanned QR claimed. */
export function isTraceMatch(
  expected: { kind?: string | null; batchId?: string | null; farmId?: string | null },
  actual: { kind?: string | null; id?: string | null; farmId?: string | null },
): boolean {
  if (expected.kind && actual.kind && expected.kind !== actual.kind) return false;
  if (expected.batchId && actual.id && expected.batchId !== actual.id) return false;
  if (expected.farmId && actual.farmId && expected.farmId !== actual.farmId) return false;
  return true;
}
