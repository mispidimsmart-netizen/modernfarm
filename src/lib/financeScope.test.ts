import { describe, it, expect } from 'vitest';
import {
  getFinanceMode,
  getFinanceScopeIssues,
  matchesActiveFinanceScope,
  type FinanceScope,
} from './financeScope';

const LAYER_BATCH = 'batch-layer-1';
const BROILER_BATCH = 'batch-broiler-1';
const OTHER_BATCH = 'batch-other-9';

const layerScope: FinanceScope = { mode: 'layer', activeBatchId: LAYER_BATCH, batchStart: '2026-01-01' };
const broilerScope: FinanceScope = { mode: 'broiler', activeBatchId: BROILER_BATCH, batchStart: '2026-03-01' };
const noBatchBroilerScope: FinanceScope = { mode: 'broiler', activeBatchId: null, batchStart: null };
const noBatchLayerScope: FinanceScope = { mode: 'layer', activeBatchId: null, batchStart: null };

describe('getFinanceMode', () => {
  it('returns layer when isLayer', () => {
    expect(getFinanceMode(true, false)).toBe('layer');
  });
  it('returns broiler when isBroiler', () => {
    expect(getFinanceMode(false, true)).toBe('broiler');
  });
  it('returns null when neither', () => {
    expect(getFinanceMode(false, false)).toBeNull();
  });
});

describe('getFinanceScopeIssues — income mode-cases', () => {
  it('flags layer-only income (eggs) in broiler mode', () => {
    const issues = getFinanceScopeIssues(
      { category: 'eggs', batch_id: BROILER_BATCH, farm_mode: 'broiler', income_date: '2026-04-01' },
      'income',
      broilerScope,
    );
    expect(issues).toContain('Layer-only category');
  });

  it('flags layer-only when category is unrelated but source=egg_sale', () => {
    const issues = getFinanceScopeIssues(
      { category: 'manure', source: 'egg_sale', batch_id: BROILER_BATCH, farm_mode: 'broiler' },
      'income',
      broilerScope,
    );
    expect(issues).toContain('Layer-only category');
  });

  it('flags broiler-only income (bird_sale) in layer mode', () => {
    const issues = getFinanceScopeIssues(
      { category: 'bird_sale', batch_id: LAYER_BATCH, farm_mode: 'layer' },
      'income',
      layerScope,
    );
    expect(issues).toContain('Broiler-only category');
  });

  it('does NOT flag spent_hen in layer mode', () => {
    const issues = getFinanceScopeIssues(
      { category: 'spent_hen', batch_id: LAYER_BATCH, farm_mode: 'layer' },
      'income',
      layerScope,
    );
    expect(issues).toEqual([]);
  });

  it('does NOT flag layer/broiler-only check on expenses', () => {
    const issues = getFinanceScopeIssues(
      { category: 'eggs', batch_id: BROILER_BATCH, farm_mode: 'broiler', expense_date: '2026-04-01' },
      'expense',
      broilerScope,
    );
    expect(issues).not.toContain('Layer-only category');
  });
});

describe('getFinanceScopeIssues — farm_mode mismatch', () => {
  it('flags row.farm_mode=layer when scope is broiler', () => {
    const issues = getFinanceScopeIssues(
      { category: 'feed', batch_id: BROILER_BATCH, farm_mode: 'layer' },
      'expense',
      broilerScope,
    );
    expect(issues).toContain('Other farm mode');
  });

  it('does NOT flag farm_mode=both', () => {
    const issues = getFinanceScopeIssues(
      { category: 'feed', batch_id: BROILER_BATCH, farm_mode: 'both' },
      'expense',
      broilerScope,
    );
    expect(issues).not.toContain('Other farm mode');
  });

  it('does NOT flag matching mode', () => {
    const issues = getFinanceScopeIssues(
      { category: 'feed', batch_id: LAYER_BATCH, farm_mode: 'layer' },
      'expense',
      layerScope,
    );
    expect(issues).toEqual([]);
  });
});

describe('getFinanceScopeIssues — active batch matching', () => {
  it('flags row from a different batch', () => {
    const issues = getFinanceScopeIssues(
      { category: 'feed', batch_id: OTHER_BATCH, farm_mode: 'layer' },
      'expense',
      layerScope,
    );
    expect(issues).toContain('Other batch');
  });

  it('does NOT flag row matching active batch', () => {
    const issues = getFinanceScopeIssues(
      { category: 'feed', batch_id: LAYER_BATCH, farm_mode: 'layer' },
      'expense',
      layerScope,
    );
    expect(issues).toEqual([]);
  });

  it('flags untagged row when an active batch exists', () => {
    const issues = getFinanceScopeIssues(
      { category: 'feed', batch_id: null, farm_mode: 'layer' },
      'expense',
      layerScope,
    );
    expect(issues).toContain('Batch/mode not tagged');
  });

  it('flags untagged broiler row when no active batch (broiler-only safety)', () => {
    const issues = getFinanceScopeIssues(
      { category: 'feed', batch_id: null, farm_mode: null },
      'expense',
      noBatchBroilerScope,
    );
    expect(issues).toContain('Batch/mode not tagged');
  });

  it('does NOT flag untagged layer row when no active batch and no batchStart', () => {
    const issues = getFinanceScopeIssues(
      { category: 'feed', batch_id: null, farm_mode: 'layer', expense_date: '2026-04-01' },
      'expense',
      noBatchLayerScope,
    );
    expect(issues).toEqual([]);
  });
});

describe('getFinanceScopeIssues — batchStart date guard', () => {
  it('flags row dated before batchStart when no active batch and no batch_id', () => {
    const scope: FinanceScope = { mode: 'layer', activeBatchId: null, batchStart: '2026-04-01' };
    const issues = getFinanceScopeIssues(
      { category: 'feed', batch_id: null, farm_mode: 'layer', expense_date: '2026-03-01' },
      'expense',
      scope,
    );
    expect(issues).toContain('Before active batch start');
  });

  it('does NOT flag row dated after batchStart', () => {
    const scope: FinanceScope = { mode: 'layer', activeBatchId: null, batchStart: '2026-04-01' };
    const issues = getFinanceScopeIssues(
      { category: 'feed', batch_id: null, farm_mode: 'layer', expense_date: '2026-04-15' },
      'expense',
      scope,
    );
    expect(issues).toEqual([]);
  });
});

describe('matchesActiveFinanceScope', () => {
  it('returns true for a clean in-scope row', () => {
    const ok = matchesActiveFinanceScope(
      { category: 'feed', batch_id: LAYER_BATCH, farm_mode: 'layer', expense_date: '2026-04-01' },
      'expense',
      layerScope,
    );
    expect(ok).toBe(true);
  });

  it('returns false when any issue is present', () => {
    const ok = matchesActiveFinanceScope(
      { category: 'eggs', batch_id: BROILER_BATCH, farm_mode: 'broiler', income_date: '2026-04-01' },
      'income',
      broilerScope,
    );
    expect(ok).toBe(false);
  });
});

describe('Custom labels', () => {
  it('uses Bengali labels when provided', () => {
    const issues = getFinanceScopeIssues(
      { category: 'eggs', batch_id: OTHER_BATCH, farm_mode: 'layer' },
      'income',
      broilerScope,
      {
        layerOnly: 'লেয়ার-only ক্যাটাগরি',
        wrongMode: 'অন্য ফার্ম মোড',
        otherBatch: 'অন্য ব্যাচ',
      },
    );
    expect(issues).toContain('লেয়ার-only ক্যাটাগরি');
    expect(issues).toContain('অন্য ফার্ম মোড');
    expect(issues).toContain('অন্য ব্যাচ');
  });
});
