import { describe, it, expect } from 'vitest';
import {
  getSignalStrengthLabel,
  formatUptime,
  formatDuration,
  getRestartReasonLabel,
  getOTAStatusLabel,
  isDeviceOffline,
} from '@/lib/deviceHealthStatus';

describe('getSignalStrengthLabel', () => {
  it('maps RSSI bands', () => {
    expect(getSignalStrengthLabel(-40).level).toBe('excellent');
    expect(getSignalStrengthLabel(-50).level).toBe('excellent');
    expect(getSignalStrengthLabel(-55).level).toBe('good');
    expect(getSignalStrengthLabel(-65).level).toBe('fair');
    expect(getSignalStrengthLabel(-85).level).toBe('weak');
  });

  it('treats null as weak/unknown', () => {
    expect(getSignalStrengthLabel(null)).toMatchObject({ level: 'weak', label: 'Unknown' });
  });
});

describe('formatUptime / formatDuration', () => {
  it('formats uptime by largest unit', () => {
    expect(formatUptime(null)).toBe('-');
    expect(formatUptime(90)).toBe('1m');
    expect(formatUptime(3660)).toBe('1h 1m');
    expect(formatUptime(90000)).toBe('1d 1h');
  });

  it('formats duration in Bengali units and treats 0 as empty', () => {
    expect(formatDuration(0)).toBe('-');
    expect(formatDuration(null)).toBe('-');
    expect(formatDuration(120)).toContain('মিনিট');
    expect(formatDuration(90000)).toContain('দিন');
  });
});

describe('getRestartReasonLabel', () => {
  it('flags brownout and panic as danger', () => {
    expect(getRestartReasonLabel('BROWNOUT').severity).toBe('danger');
    expect(getRestartReasonLabel('PANIC').severity).toBe('danger');
  });

  it('flags watchdog resets as warning and power-on as normal', () => {
    expect(getRestartReasonLabel('WDT').severity).toBe('warning');
    expect(getRestartReasonLabel('TASK_WDT').severity).toBe('warning');
    expect(getRestartReasonLabel('POWER_ON').severity).toBe('normal');
  });

  it('falls back to the raw reason for unknown codes', () => {
    expect(getRestartReasonLabel('SOMETHING_NEW')).toMatchObject({ label: 'SOMETHING_NEW', severity: 'normal' });
    expect(getRestartReasonLabel(null).labelBn).toBe('অজানা');
  });
});

describe('getOTAStatusLabel', () => {
  it('maps known statuses and passes through unknown ones', () => {
    expect(getOTAStatusLabel('downloading').label).toBe('Downloading...');
    expect(getOTAStatusLabel('failed').labelBn).toBe('ব্যর্থ');
    expect(getOTAStatusLabel(null).label).toBe('-');
    expect(getOTAStatusLabel('weird').label).toBe('weird');
  });
});

describe('isDeviceOffline', () => {
  it('treats missing last_seen as offline', () => {
    expect(isDeviceOffline(null)).toBe(true);
  });

  it('uses the 5 minute default threshold', () => {
    const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    expect(isDeviceOffline(twoMinAgo)).toBe(false);
    expect(isDeviceOffline(tenMinAgo)).toBe(true);
  });

  it('honours a custom threshold', () => {
    const threeMinAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString();
    expect(isDeviceOffline(threeMinAgo, 1)).toBe(true);
    expect(isDeviceOffline(threeMinAgo, 30)).toBe(false);
  });
});
