export type FinanceMode = 'layer' | 'broiler' | null;

export interface FinanceScope {
  mode: FinanceMode;
  activeBatchId: string | null;
  batchStart: string | null;
}

export const LAYER_ONLY_INCOME = new Set(['eggs', 'egg_sale', 'spent_hen']);
export const BROILER_ONLY_INCOME = new Set(['culled_birds', 'bird_sale']);

const normalizeTag = (value: unknown) => (value ?? '').toString().trim().toLowerCase();

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
  // Check BOTH category and source — some legacy rows store the real type in
  // `source` while `category` holds an unrelated value (e.g. category='manure',
  // source='egg_sale'). We must catch layer/broiler-only on either field.
  const category = normalizeTag(row?.category);
  const source = normalizeTag(row?.source);
  const tags = [category, source].filter(Boolean);
  const rowMode = normalizeTag(row?.farm_mode);
  const date = kind === 'income' ? row?.income_date : row?.expense_date;

  if (kind === 'income') {
    const isLayerOnly = tags.some((t) => LAYER_ONLY_INCOME.has(t));
    const isBroilerOnly = tags.some((t) => BROILER_ONLY_INCOME.has(t));
    if (mode === 'broiler' && isLayerOnly) {
      reasons.push(labels?.layerOnly ?? 'Layer-only category');
    }
    if (mode === 'layer' && isBroilerOnly) {
      reasons.push(labels?.broilerOnly ?? 'Broiler-only category');
    }
  }

  if (mode && rowMode && rowMode !== mode && rowMode !== 'both') {
    reasons.push(labels?.wrongMode ?? 'Other farm mode');
  }

  const rowBatchId = (row?.batch_id ?? '').toString();
  if (rowBatchId) {
    if (scope.activeBatchId && rowBatchId !== scope.activeBatchId) {
      reasons.push(labels?.otherBatch ?? 'Other batch');
    }
  } else {
    // Active batch is the finance SSOT: rows without batch_id are not part of
    // the active report, even if their date/mode looks current.
    if (scope.activeBatchId) {
      reasons.push(labels?.untagged ?? 'Batch/mode not tagged');
    } else if (mode === 'broiler' && !rowMode) {
      reasons.push(labels?.untagged ?? 'Batch/mode not tagged');
    } else if (scope.batchStart && date && date < scope.batchStart) {
      reasons.push(labels?.beforeBatch ?? 'Before active batch start');
    }
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