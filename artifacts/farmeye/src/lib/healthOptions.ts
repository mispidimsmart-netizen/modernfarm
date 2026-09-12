import type { MedicineType, MedicineUnit } from '@/hooks/useMedicine';

export type Lang = 'bn' | 'en';
export interface BilingualOption<T extends string = string> {
  value: T;
  bn: string;
  en: string;
}

export const CAUSES: BilingualOption[] = [
  { value: 'disease', bn: 'রোগ', en: 'Disease' },
  { value: 'heat_stress', bn: 'গরম', en: 'Heat Stress' },
  { value: 'suffocation', bn: 'দম বন্ধ', en: 'Suffocation' },
  { value: 'injury', bn: 'আঘাত', en: 'Injury' },
  { value: 'predator', bn: 'শিকারি', en: 'Predator' },
  { value: 'unknown', bn: 'অজানা', en: 'Unknown' },
];

export const MED_TYPES: BilingualOption<MedicineType>[] = [
  { value: 'medicine', bn: 'ওষুধ', en: 'Medicine' },
  { value: 'vaccine', bn: 'টিকা', en: 'Vaccine' },
  { value: 'vitamin', bn: 'ভিটামিন', en: 'Vitamin' },
  { value: 'supplement', bn: 'সাপ্লিমেন্ট', en: 'Supplement' },
  { value: 'other', bn: 'অন্যান্য', en: 'Other' },
];

export const MED_UNITS: BilingualOption<MedicineUnit>[] = [
  { value: 'ml', bn: 'মিলি', en: 'ml' },
  { value: 'gm', bn: 'গ্রাম', en: 'gm' },
  { value: 'piece', bn: 'পিস', en: 'piece' },
  { value: 'dose', bn: 'ডোজ', en: 'dose' },
  { value: 'bottle', bn: 'বোতল', en: 'bottle' },
  { value: 'gallon', bn: 'গ্যালন', en: 'gallon' },
];

export const REASONS: BilingualOption[] = [
  { value: 'preventive', bn: 'প্রতিরোধমূলক', en: 'Preventive' },
  { value: 'disease', bn: 'রোগের চিকিৎসা', en: 'Disease Treatment' },
  { value: 'vaccination_schedule', bn: 'টিকাদান শিডিউল', en: 'Vaccination Schedule' },
  { value: 'other', bn: 'অন্যান্য', en: 'Other' },
];

/** Resolve a bilingual label, falling back to the raw stored value. */
export function optionLabel(
  options: readonly BilingualOption<string>[],
  value: string | null | undefined,
  language: Lang
): string {
  if (!value) return '—';
  return options.find((o) => o.value === value)?.[language] ?? value;
}

/** Mortality percentage of the flock, formatted with 2 decimals. Returns '0' when flock size unknown. */
export function mortalityRatePercent(
  totalMortality: number,
  totalBirds: number | null | undefined
): string {
  if (!totalBirds || totalBirds <= 0) return '0';
  return ((totalMortality / totalBirds) * 100).toFixed(2);
}

/** Colour tone for remaining medicine stock. */
export function stockTone(remaining: number, purchased: number): 'out' | 'low' | 'ok' {
  if (remaining <= 0) return 'out';
  if (remaining < purchased * 0.2) return 'low';
  return 'ok';
}

export const HEALTH_LABELS = {
  title: { bn: '🏥 স্বাস্থ্য ও ক্ষতি', en: '🏥 Health & Loss' },
  mortality: { bn: 'মৃত্যু', en: 'Mortality' },
  usage: { bn: 'ওষুধ প্রয়োগ', en: 'Medicine Use' },
  stock: { bn: 'ওষুধ স্টক', en: 'Medicine Stock' },
  date: { bn: 'তারিখ', en: 'Date' },
  count: { bn: 'সংখ্যা', en: 'Count' },
  cause: { bn: 'কারণ', en: 'Cause' },
  notes: { bn: 'নোট', en: 'Notes' },
  save: { bn: 'সংরক্ষণ', en: 'Save' },
  medName: { bn: 'ওষুধের নাম', en: 'Medicine Name' },
  medType: { bn: 'ধরণ', en: 'Type' },
  quantity: { bn: 'পরিমাণ', en: 'Quantity' },
  unit: { bn: 'একক', en: 'Unit' },
  unitPrice: { bn: 'একক দাম (৳)', en: 'Unit Price (৳)' },
  totalCost: { bn: 'মোট খরচ', en: 'Total Cost' },
  supplier: { bn: 'সরবরাহকারী', en: 'Supplier' },
  expiry: { bn: 'মেয়াদ উত্তীর্ণ', en: 'Expiry' },
  reason: { bn: 'কারণ', en: 'Reason' },
  birdsTreated: { bn: 'পাখির সংখ্যা', en: 'Birds Treated' },
  quantityUsed: { bn: 'ব্যবহার্য পরিমাণ', en: 'Quantity Used' },
  mortalityRate: { bn: 'মৃত্যুর হার', en: 'Mortality Rate' },
  last30Days: { bn: 'গত ৩০ দিন', en: 'Last 30 days' },
  remaining: { bn: 'অবশিষ্ট', en: 'Remaining' },
  purchased: { bn: 'কিনেছেন', en: 'Purchased' },
  used: { bn: 'ব্যবহার', en: 'Used' },
  noStock: { bn: 'কোনো ওষুধ স্টকে নেই', en: 'No medicine in stock' },
  noUsage: { bn: 'কোনো ব্যবহার রেকর্ড নেই', en: 'No usage records' },
  autoExpense: {
    bn: '💡 ওষুধ কিনলে স্বয়ংক্রিয়ভাবে খরচে যুক্ত হবে',
    en: '💡 Purchasing medicine auto-adds to expenses',
  },
  history: { bn: 'ইতিহাস', en: 'History' },
  birds: { bn: 'টি', en: '' },
} as const;
