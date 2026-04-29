export type FinanceMode = 'layer' | 'broiler' | null;

export interface FinanceScope {
  mode: FinanceMode;
  activeBatchId: string | null;
  batchStart: string | null;
}

export const LAYER_ONLY_INCOME = new Set(['eggs', 'egg_sale', 'spent_hen']);
export const BROILER_ONLY_INCOME = new Set(['culled_birds', 'bird_sale']);

export function getFinanceMode(isLayer: boolean, isBroiler: boolean): FinanceMode {
  if (isLayer) return 'layer';
  if (isBroiler) return 'broiler';
  return null;
}

export function getFinanceScopeIssues(
  row: any,
  kind: 'income' | 'expense',
  scope: FinanceScope,
  labels?: {
    layerOnly?: string;
    broilerOnly?: string;
    wrongMode?: string;
    otherBatch?: string;
    beforeBatch?: string;
    untagged?: string;
  },
): string[] {
  const reasons: string[] = [];
  const mode = scope.mode;
  const category = (row?.category ?? row?.source ?? '').toString();
  const rowMode = (row?.farm_mode ?? '').toString();
  const date = kind === 'income' ? row?.income_date : row?.expense_date;

  if (kind === 'income') {
    if (mode === 'broiler' && LAYER_ONLY_INCOME.has(category)) {
      reasons.push(labels?.layerOnly ?? 'Layer-only category');
    }
    if (mode === 'layer' && BROILER_ONLY_INCOME.has(category)) {
      reasons.push(labels?.broilerOnly ?? 'Broiler-only category');
    }
  }

  if (mode && rowMode && rowMode !== mode) {
    reasons.push(labels?.wrongMode ?? 'Other farm mode');
  }

  if (row?.batch_id) {
    if (scope.activeBatchId && row.batch_id !== scope.activeBatchId) {
      reasons.push(labels?.otherBatch ?? 'Other batch');
    }
  } else if (scope.activeBatchId && !rowMode) {
    reasons.push(labels?.untagged ?? 'Batch/mode not tagged');
  } else if (scope.batchStart && date && date < scope.batchStart) {
    reasons.push(labels?.beforeBatch ?? 'Before active batch start');
  }

  return reasons;
}

export function matchesActiveFinanceScope(
  row: any,
  kind: 'income' | 'expense',
  scope: FinanceScope,
): boolean {
  return getFinanceScopeIssues(row, kind, scope).length === 0;
}