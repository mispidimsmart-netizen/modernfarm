import { describe, it, expect } from 'vitest';
import {
  buildTraceUrl,
  parseTraceUrl,
  isTraceMatch,
  PUBLIC_TRACE_BASE_URL,
} from '@/lib/traceQr';

describe('buildTraceUrl', () => {
  it('always uses the production domain, never preview/localhost', () => {
    const url = buildTraceUrl({ slug: 'abc123', kind: 'layer', batchId: 'b-1', farmId: 'f-1' });
    expect(url.startsWith(`${PUBLIC_TRACE_BASE_URL}/trace/`)).toBe(true);
    expect(url).not.toContain('lovable.app');
    expect(url).not.toContain('localhost');
  });

  it('embeds kind and batch id', () => {
    expect(buildTraceUrl({ slug: 's1', kind: 'broiler', batchId: 'B-9', farmId: 'F-2' })).toBe(
      'https://farmeye.pro.bd/trace/s1?kind=broiler&batch=B-9&farm=F-2',
    );
  });

  it('rejects missing or invalid inputs', () => {
    expect(() => buildTraceUrl({ slug: '', kind: 'layer', batchId: 'b', farmId: 'f' })).toThrow();
    expect(() => buildTraceUrl({ slug: 's', kind: 'duck' as never, batchId: 'b', farmId: 'f' })).toThrow();
    expect(() => buildTraceUrl({ slug: 's', kind: 'layer', batchId: '', farmId: 'f' })).toThrow();
  });
});

describe('parseTraceUrl', () => {
  it('accepts a freshly generated link round-trip', () => {
    const url = buildTraceUrl({ slug: 'xyz', kind: 'layer', batchId: 'batch-7', farmId: 'farm-3' });
    expect(parseTraceUrl(url)).toEqual({
      valid: true, slug: 'xyz', kind: 'layer', batchId: 'batch-7', farmId: 'farm-3', version: undefined,
    });
  });

  it('rejects wrong domains (preview / lovable project URLs)', () => {
    const r = parseTraceUrl('https://id-preview--123.lovable.app/trace/xyz?kind=layer&batch=b1');
    expect(r.valid).toBe(false);
    expect(r.reason).toBe('bad-domain');
  });

  it('rejects missing farmId', () => {
    expect(() => buildTraceUrl({ slug: 's', kind: 'layer', batchId: 'b', farmId: '' })).toThrow();
  });

  it('rejects legacy QR links without kind/batch params', () => {
    const r = parseTraceUrl('https://farmeye.pro.bd/trace/xyz');
    expect(r.valid).toBe(false);
    expect(r.reason).toBe('legacy-missing-params');
    expect(r.slug).toBe('xyz');
  });

  it('reads farm id and version params', () => {
    const r = parseTraceUrl('https://farmeye.pro.bd/trace/s?kind=layer&batch=b1&farm=f1&v=2');
    expect(r.valid).toBe(true);
    expect(r.farmId).toBe('f1');
    expect(r.version).toBe(2);
  });

  it('rejects bad paths and malformed urls', () => {
    expect(parseTraceUrl('https://farmeye.pro.bd/settings').reason).toBe('bad-path');
    expect(parseTraceUrl('not-a-url').reason).toBe('bad-url');
  });

  it('rejects unknown batch kinds', () => {
    expect(parseTraceUrl('https://farmeye.pro.bd/trace/xyz?kind=duck&batch=b1').reason).toBe('bad-kind');
  });

  it('allows the custom domain aliases', () => {
    expect(parseTraceUrl('https://modernfarm.pro.bd/trace/s?kind=broiler&batch=b').valid).toBe(true);
  });
});

describe('isTraceMatch', () => {
  it('matches when kind and id agree', () => {
    expect(isTraceMatch({ kind: 'layer', batchId: 'b1' }, { kind: 'layer', id: 'b1' })).toBe(true);
  });

  it('fails on kind mismatch', () => {
    expect(isTraceMatch({ kind: 'layer', batchId: 'b1' }, { kind: 'broiler', id: 'b1' })).toBe(false);
  });

  it('fails on batch id mismatch', () => {
    expect(isTraceMatch({ kind: 'layer', batchId: 'b1' }, { kind: 'layer', id: 'b2' })).toBe(false);
  });

  it('fails on farm id mismatch', () => {
    expect(isTraceMatch({ farmId: 'f1' }, { farmId: 'f2' })).toBe(false);
    expect(isTraceMatch({ farmId: 'f1' }, { farmId: 'f1' })).toBe(true);
  });

  it('is permissive when expectations are absent (old QR)', () => {
    expect(isTraceMatch({}, { kind: 'layer', id: 'b1' })).toBe(true);
  });
});
