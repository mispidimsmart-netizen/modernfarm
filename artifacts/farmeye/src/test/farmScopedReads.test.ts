import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(__dirname, '../..', p), 'utf8');

const farmData = read('src/hooks/useFarmData.ts');
const automationMode = read('src/hooks/useAutomationMode.ts');
const boundedOverride = read('src/hooks/useBoundedOverride.ts');

describe('farm-scoped reads (non-owner members must see real farm state)', () => {
  it('useFarmSettings reads by farm_id, not the viewer user_id', () => {
    const block = farmData.slice(
      farmData.indexOf('export function useFarmSettings'),
      farmData.indexOf('export function useUpdateFarmSettings')
    );
    expect(block).toContain(".from('farm_settings')");
    expect(block).toContain(".eq('farm_id', selectedFarmId)");
    // user_id is only allowed in the no-farm legacy branch
    expect(block).toContain('No farm selected');
  });

  it('useAutomationMode reads mode by farm_id so MANUAL is never mis-reported as AUTO', () => {
    const block = automationMode.slice(0, automationMode.indexOf('export function useSetAutomationMode'));
    const farmIdx = block.indexOf(".eq('farm_id', selectedFarmId)");
    const userIdx = block.indexOf(".eq('user_id', user.id)");
    expect(farmIdx).toBeGreaterThan(-1);
    // farm branch comes first; user_id only as the no-farm legacy fallback
    expect(farmIdx).toBeLessThan(userIdx);
  });

  it('useSetAutomationMode writes are strictly farm-scoped with no user_id fallback', () => {
    const block = automationMode.slice(automationMode.indexOf('export function useSetAutomationMode'));
    expect(block).toContain("throw new Error('NO_FARM_SELECTED')");
    expect(block).not.toContain(".eq('user_id', user.id)");
  });
});

describe('per-shed device writes never fan out', () => {
  it('useUpdateDeviceStatus refuses a shed-less write on a multi-shed farm', () => {
    const block = farmData.slice(farmData.indexOf('export function useUpdateDeviceStatus'));
    expect(block).toContain("throw new Error('No farm selected')");
    expect(block).toContain('SHED_REQUIRED_FOR_DEVICE_WRITE');
    expect(block).toContain('DEVICE_STATUS_ROW_NOT_FOUND');
  });

  it('useBoundedOverride skips the write when no farm is selected', () => {
    expect(boundedOverride).not.toContain(".eq('user_id', user.id)");
    const guards = boundedOverride.match(/NO_FARM_SELECTED/g) ?? [];
    expect(guards.length).toBeGreaterThanOrEqual(2);
  });
});
