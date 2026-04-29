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
  // Check BOTH category and source — some legacy rows store the real type in
  // `source` while `category` holds an unrelated value (e.g. category='manure',
  // source='egg_sale'). We must catch layer/broiler-only on either field.
  const category = (row?.category ?? '').toString();
  const source = (row?.source ?? '').toString();
  const tags = [category, source].filter(Boolean);
  const rowMode = (row?.farm_mode ?? '').toString();
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

  if (mode && rowMode && rowMode !== mode) {
    reasons.push(labels?.wrongMode ?? 'Other farm mode');
  }

  if (row?.batch_id) {
    if (scope.activeBatchId && row.batch_id !== scope.activeBatchId) {
      reasons.push(labels?.otherBatch ?? 'Other batch');
    }
  } else {
    // Untagged row (no batch_id, no farm_mode):
    // - In broiler mode, hide to prevent layer-era data leakage into a fresh batch.
    // - In layer mode, include legacy entries that fall within the active batch window
    //   (or always, if no batch is active) so historical totals are not lost.
    if (mode === 'broiler' && !rowMode) {
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