/**
 * Control page device catalogs.
 *
 * Pure, presentation-agnostic metadata for the device cards shown on the
 * Control page. Kept out of the page component so the catalogs can be tested
 * and reused (dashboard summary, wizards) without importing page code.
 */
import {
  Fan, Lightbulb, Flame, Wind, Droplets, CloudDrizzle, CircleDot,
  type LucideIcon,
} from 'lucide-react';

export interface ControlDeviceMeta {
  key: string;
  icon: LucideIcon;
  name: { bn: string; en: string };
  description: { bn: string; en: string };
  priority?: boolean;
}

/** Broiler farms: heater is the highest-priority device. */
export const BROILER_DEVICES: ControlDeviceMeta[] = [
  {
    key: 'heater',
    icon: Flame,
    name: { bn: 'হিটার', en: 'Heater' },
    description: { bn: 'বাচ্চার তাপমাত্রা বজায় রাখে', en: 'Maintains chick temperature' },
    priority: true,
  },
  {
    key: 'fan',
    icon: Fan,
    name: { bn: 'এক্সজস্ট ফ্যান', en: 'Exhaust Fan' },
    description: { bn: 'অ্যামোনিয়া ও আর্দ্রতা দূর করে', en: 'Removes ammonia and moisture' },
  },
  {
    key: 'ceiling_fan',
    icon: CircleDot,
    name: { bn: 'সিলিং ফ্যান', en: 'Ceiling Fan' },
    description: { bn: 'ঘরের ভেতর বাতাস চলাচল', en: 'Indoor air circulation' },
  },
  {
    key: 'circulation_fan',
    icon: Wind,
    name: { bn: 'সার্কুলেশন ফ্যান', en: 'Circulation Fan' },
    description: { bn: 'বাতাস সমভাবে ছড়িয়ে দেয়', en: 'Distributes air evenly' },
  },
  {
    key: 'fogger',
    icon: Droplets,
    name: { bn: 'ফগার', en: 'Fogger' },
    description: { bn: 'গরমে হিট স্ট্রেস কমায়', en: 'Reduces heat stress' },
  },
  {
    key: 'sprinkler',
    icon: CloudDrizzle,
    name: { bn: 'ছাদ স্প্রিংকলার', en: 'Roof Sprinkler' },
    description: { bn: 'ছাদ ঠান্ডা রাখে (HSI ভিত্তিক)', en: 'Cools roof (HSI based)' },
  },
  {
    key: 'light',
    icon: Lightbulb,
    name: { bn: 'লাইট', en: 'Light' },
    description: { bn: 'আলো নিয়ন্ত্রণ', en: 'Light control' },
  },
];

/** Layer farms: light drives egg production, heater is secondary. */
export const LAYER_DEVICES: ControlDeviceMeta[] = [
  {
    key: 'fan',
    icon: Fan,
    name: { bn: 'এক্সজস্ট ফ্যান', en: 'Exhaust Fan' },
    description: { bn: 'অ্যামোনিয়া ও আর্দ্রতা দূর করে', en: 'Removes ammonia and moisture' },
  },
  {
    key: 'ceiling_fan',
    icon: CircleDot,
    name: { bn: 'সিলিং ফ্যান', en: 'Ceiling Fan' },
    description: { bn: 'ঘরের ভেতর বাতাস চলাচল (≥25°C)', en: 'Indoor air circulation (≥25°C)' },
  },
  {
    key: 'circulation_fan',
    icon: Wind,
    name: { bn: 'সার্কুলেশন ফ্যান', en: 'Circulation Fan' },
    description: { bn: 'বাতাস সমভাবে ছড়িয়ে দেয় (ম্যানুয়াল)', en: 'Distributes air evenly (manual)' },
  },
  {
    key: 'heater',
    icon: Flame,
    name: { bn: 'হিটার', en: 'Heater' },
    description: { bn: 'শীতে তাপ দেয়', en: 'Provides heat in winter' },
  },
  {
    key: 'fogger',
    icon: Droplets,
    name: { bn: 'ফগার', en: 'Fogger' },
    description: { bn: 'গরমে হিট স্ট্রেস কমায়', en: 'Reduces heat stress' },
  },
  {
    key: 'sprinkler',
    icon: CloudDrizzle,
    name: { bn: 'ছাদ স্প্রিংকলার', en: 'Roof Sprinkler' },
    description: { bn: 'ছাদ ঠান্ডা রাখে (HSI ভিত্তিক)', en: 'Cools roof (HSI based)' },
  },
  {
    key: 'light',
    icon: Lightbulb,
    name: { bn: 'লাইট', en: 'Light' },
    description: { bn: 'ডিম উৎপাদনে সহায়ক', en: 'Supports egg production' },
  },
];

export const getControlDevices = (isBroiler: boolean): ControlDeviceMeta[] =>
  isBroiler ? BROILER_DEVICES : LAYER_DEVICES;
