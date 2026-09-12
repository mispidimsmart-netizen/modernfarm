/**
 * Farm setup selectable options (SSOT for the settings → farm setup tab).
 */
import { Egg, Drumstick, Sun, Snowflake, CloudRain, Baby, TrendingUp, Factory, Flame, Wind } from 'lucide-react';
import type { FarmType, Season, FarmSize, ProfileType } from '@/lib/farmSetup';

interface BilingualText { bn: string; en: string }

export interface OptionItem<T> {
  id: T;
  icon?: React.ElementType;
  name: BilingualText;
  description?: BilingualText;
  range?: BilingualText;
  color?: string;
  bgColor?: string;
}

export const FARM_TYPES: OptionItem<FarmType>[] = [
  {
    id: 'layer',
    icon: Egg,
    name: { bn: 'লেয়ার', en: 'Layer' },
    description: { bn: 'ডিম উৎপাদন', en: 'Egg production' },
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
  },
  {
    id: 'broiler',
    icon: Drumstick,
    name: { bn: 'ব্রয়লার', en: 'Broiler' },
    description: { bn: 'মাংস উৎপাদন', en: 'Meat production' },
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
  },
];

export const SEASONS: OptionItem<Season>[] = [
  {
    id: 'summer',
    icon: Sun,
    name: { bn: 'গ্রীষ্ম', en: 'Summer' },
    description: { bn: 'গরমের সময়', en: 'Hot weather' },
    color: 'text-orange-500',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
  },
  {
    id: 'winter',
    icon: Snowflake,
    name: { bn: 'শীত', en: 'Winter' },
    description: { bn: 'ঠান্ডার সময়', en: 'Cold weather' },
    color: 'text-blue-500',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  {
    id: 'rainy',
    icon: CloudRain,
    name: { bn: 'বর্ষা', en: 'Rainy' },
    description: { bn: 'বৃষ্টির সময়', en: 'Monsoon' },
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
  },
];

export const FARM_SIZES: OptionItem<FarmSize>[] = [
  { id: 'small', name: { bn: 'ছোট', en: 'Small' }, range: { bn: '< ১,০০০ পাখি', en: '< 1,000 birds' } },
  { id: 'medium', name: { bn: 'মাঝারি', en: 'Medium' }, range: { bn: '১,০০০ - ৫,০০০', en: '1,000 - 5,000' } },
  { id: 'large', name: { bn: 'বড়', en: 'Large' }, range: { bn: '৫,০০০+', en: '5,000+' } },
];

export const PROFILES: OptionItem<ProfileType>[] = [
  {
    id: 'chick_care',
    icon: Baby,
    name: { bn: 'বাচ্চা পরিচর্যা', en: 'Chick Care' },
    description: { bn: '১-১০ দিনের জন্য উচ্চ তাপমাত্রা', en: 'High temp for 1-10 days old' },
    color: 'text-pink-500',
    bgColor: 'bg-pink-100 dark:bg-pink-900/30',
  },
  {
    id: 'grower',
    icon: TrendingUp,
    name: { bn: 'গ্রোয়ার স্টেজ', en: 'Grower Stage' },
    description: { bn: '১১-২১ দিনের জন্য সুষম পরিবেশ', en: 'Balanced for 11-21 days old' },
    color: 'text-green-500',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  {
    id: 'production',
    icon: Factory,
    name: { bn: 'প্রোডাকশন', en: 'Production' },
    description: { bn: 'সর্বোচ্চ উৎপাদনের জন্য', en: 'For maximum output' },
    color: 'text-purple-500',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
  {
    id: 'heat_protection',
    icon: Flame,
    name: { bn: 'তাপ সুরক্ষা', en: 'Heat Protection' },
    description: { bn: 'অতিরিক্ত গরমে সুরক্ষা', en: 'Protection during extreme heat' },
    color: 'text-red-500',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  {
    id: 'cold_protection',
    icon: Wind,
    name: { bn: 'ঠান্ডা সুরক্ষা', en: 'Cold Protection' },
    description: { bn: 'শীতকালে সুরক্ষা', en: 'Protection during cold' },
    color: 'text-blue-500',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
];
