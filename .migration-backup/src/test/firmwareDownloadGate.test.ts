import { describe, it, expect, vi } from 'vitest';
import { isDownloadAllowed, tryDownload } from '@/lib/firmwareDownloadGate';

describe('firmwareDownloadGate.isDownloadAllowed', () => {
  it('blocks when confirmOpen is false (dialog never shown)', () => {
    expect(isDownloadAllowed({ confirmOpen: false, finalAck: true, isDownloading: false })).toBe(false);
  });

  it('blocks when finalAck is false (checkbox unticked)', () => {
    expect(isDownloadAllowed({ confirmOpen: true, finalAck: false, isDownloading: false })).toBe(false);
  });

  it('blocks when both confirmOpen and finalAck are false', () => {
    expect(isDownloadAllowed({ confirmOpen: false, finalAck: false, isDownloading: false })).toBe(false);
  });

  it('blocks while a download is already in progress', () => {
    expect(isDownloadAllowed({ confirmOpen: true, finalAck: true, isDownloading: true })).toBe(false);
  });

  it('allows only when confirmOpen + finalAck are true AND not downloading', () => {
    expect(isDownloadAllowed({ confirmOpen: true, finalAck: true, isDownloading: false })).toBe(true);
  });
});

describe('firmwareDownloadGate.tryDownload', () => {
  it('does NOT call download when confirmOpen=false', () => {
    const dl = vi.fn();
    const ran = tryDownload({ confirmOpen: false, finalAck: true, isDownloading: false }, dl);
    expect(ran).toBe(false);
    expect(dl).not.toHaveBeenCalled();
  });

  it('does NOT call download when finalAck=false', () => {
    const dl = vi.fn();
    const ran = tryDownload({ confirmOpen: true, finalAck: false, isDownloading: false }, dl);
    expect(ran).toBe(false);
    expect(dl).not.toHaveBeenCalled();
  });

  it('does NOT call download while isDownloading=true', () => {
    const dl = vi.fn();
    const ran = tryDownload({ confirmOpen: true, finalAck: true, isDownloading: true }, dl);
    expect(ran).toBe(false);
    expect(dl).not.toHaveBeenCalled();
  });

  it('calls download exactly once when gate fully open', () => {
    const dl = vi.fn();
    const ran = tryDownload({ confirmOpen: true, finalAck: true, isDownloading: false }, dl);
    expect(ran).toBe(true);
    expect(dl).toHaveBeenCalledTimes(1);
  });

  it('is idempotent — flipping finalAck off immediately re-blocks', () => {
    const dl = vi.fn();
    tryDownload({ confirmOpen: true, finalAck: true, isDownloading: false }, dl);
    tryDownload({ confirmOpen: true, finalAck: false, isDownloading: false }, dl);
    expect(dl).toHaveBeenCalledTimes(1);
  });
});
