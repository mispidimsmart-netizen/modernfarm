/**
 * Farm record domain types.
 *
 * Single source of truth for the row shapes used by the data-access layer
 * (`src/api/*`) and the react-query hooks that consume it.
 */

export interface EggProduction {
  id: string;
  user_id: string;
  farm_id?: string | null;
  shed_id?: string | null;
  production_date: string;
  total_eggs: number;
  grade_a: number;
  grade_b: number;
  grade_c: number;
  broken: number;
  notes: string | null;
  created_at: string;
}

export interface FeedInventory {
  id: string;
  user_id: string;
  feed_type: string;
  quantity_kg: number;
  unit_price: number;
  purchase_date: string;
  supplier: string | null;
  notes: string | null;
  created_at: string;
}

export interface FeedConsumption {
  id: string;
  user_id: string;
  consumption_date: string;
  feed_type: string;
  quantity_kg: number;
  notes: string | null;
  created_at: string;
}

export interface MortalityRecord {
  id: string;
  user_id: string;
  shed_id?: string | null;
  farm_id?: string | null;
  farm_mode?: 'layer' | 'broiler' | null;
  batch_id?: string | null;
  record_date: string;
  count: number;
  cause: string;
  age_weeks: number | null;
  notes: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  user_id: string;
  expense_date: string;
  category: string;
  amount: number;
  description: string | null;
  batch_id: string | null;
  farm_mode: 'layer' | 'broiler' | null;
  created_at: string;
}

export interface Income {
  id: string;
  user_id: string;
  income_date: string;
  category: string;
  source: string | null;
  amount: number;
  quantity: number | null;
  unit_price: number | null;
  description: string | null;
  batch_id: string | null;
  farm_mode: 'layer' | 'broiler' | null;
  created_at: string;
}

export interface FlockInfo {
  id: string;
  user_id: string;
  total_birds: number;
  age_weeks: number;
  breed: string | null;
  purchase_date: string | null;
  updated_at: string;
  created_at: string;
}

/** Active batch + farm mode resolved for the currently selected farm. */
export interface ActiveScope {
  activeBatchId: string | null;
  farmMode: 'layer' | 'broiler' | null;
}

/** ISO date (YYYY-MM-DD) for "N days ago", used by every list query. */
export function daysAgoDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}
