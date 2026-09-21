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

/**
 * Farm calendar timezone. Every day-log date MUST be resolved in Asia/Dhaka:
 * with plain `toISOString()` an entry made between 00:00–05:59 local time lands
 * on the previous day's row (UTC is 6 hours behind) and can overwrite it.
 */
export const FARM_TIME_ZONE = 'Asia/Dhaka';

/** ISO date (YYYY-MM-DD) of a moment, in farm-local (Asia/Dhaka) time. */
export function toFarmDate(value: Date | string | number = new Date()): string {
  const d = value instanceof Date ? value : new Date(value);
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: FARM_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/** ISO date (YYYY-MM-DD) for "N days ago", used by every list query. */
export function daysAgoDate(days: number): string {
  return toFarmDate(Date.now() - days * 86_400_000);
}

/** Today's ISO date (YYYY-MM-DD) — default for every day-log style insert. */
export function today(): string {
  return toFarmDate();
}


