/**
 * Alert message templates — pure SSOT (no React, no network).
 *
 * Single source of truth for farmer-facing alert copy (EN + BN) and the
 * default severity of every alert type produced by the ESP32 / cloud rules.
 */

export type AlertLevel = 'info' | 'warning' | 'danger';

export interface AlertTemplate {
  title: { en: string; bn: string };
  getMessage: (data?: any) => { en: string; bn: string };
  getSuggestion: () => { en: string; bn: string };
  level: AlertLevel;
}

export const ALERT_TEMPLATES: Record<string, AlertTemplate> = {
  high_temperature: {
    title: { en: 'Farm is too hot', bn: '🌡️ খামার বেশি গরম — স্বয়ংক্রিয়ভাবে ঠান্ডা করা হচ্ছে' },
    getMessage: (data) => ({
      en: `Temperature rising${data?.temp ? ` to ${data.temp}°C` : ''}. Auto-cooling active.`,
      bn: `তাপমাত্রা বাড়ছে${data?.temp ? ` (${data.temp}°সে)` : ''}। স্বয়ংক্রিয়ভাবে ঠান্ডা করা হচ্ছে।`,
    }),
    getSuggestion: () => ({
      en: 'System is auto-cooling. Check curtains if needed.',
      bn: 'সিস্টেম নিজে ঠান্ডা করছে। প্রয়োজনে পর্দা চেক করুন।',
    }),
    level: 'danger',
  },
  extreme_cold: {
    title: { en: 'Shed is too cold', bn: 'শেড অত্যন্ত ঠান্ডা' },
    getMessage: (data) => ({
      en: `Temperature has dropped${data?.temp ? ` to ${data.temp}°C` : ''}. Birds need warmth.`,
      bn: `তাপমাত্রা কমে গেছে${data?.temp ? ` (${data.temp}°সে)` : ''}। পাখিদের উষ্ণতা প্রয়োজন।`,
    }),
    getSuggestion: () => ({
      en: 'Close curtains and turn on heater',
      bn: 'পর্দা বন্ধ করুন এবং হিটার চালু করুন',
    }),
    level: 'danger',
  },
  high_ammonia: {
    title: { en: 'Gas level rising', bn: '💨 খামারে গ্যাস বেড়েছে — বাতাস দেওয়া হচ্ছে' },
    getMessage: (data) => ({
      en: `Ammonia level rising${data?.ppm ? ` to ${data.ppm} ppm` : ''}. Auto-ventilation active.`,
      bn: `গ্যাসের মাত্রা বাড়ছে${data?.ppm ? ` (${data.ppm} পিপিএম)` : ''}। স্বয়ংক্রিয়ভাবে বাতাস দেওয়া হচ্ছে।`,
    }),
    getSuggestion: () => ({
      en: 'System is auto-ventilating. Add fresh litter if possible.',
      bn: 'সিস্টেম নিজে বাতাস দিচ্ছে। সম্ভব হলে তাজা লিটার দিন।',
    }),
    level: 'warning',
  },
  ammonia_danger: {
    title: { en: 'Dangerous gas level', bn: '💨 খামারে গ্যাস অনেক বেশি — সর্বোচ্চ বাতাস দেওয়া হচ্ছে' },
    getMessage: () => ({
      en: 'Gas at dangerous level. Maximum ventilation active.',
      bn: 'গ্যাস বিপদসীমায়। সর্বোচ্চ বাতাস দেওয়া হচ্ছে।',
    }),
    getSuggestion: () => ({
      en: 'System is running max ventilation automatically.',
      bn: 'সিস্টেম নিজে সর্বোচ্চ বাতাস দিচ্ছে।',
    }),
    level: 'danger',
  },
  low_water: {
    title: { en: 'Birds drinking less water', bn: 'পাখিরা কম পানি খাচ্ছে' },
    getMessage: () => ({
      en: 'Water consumption is lower than usual. This may indicate health issues.',
      bn: 'পানি খরচ স্বাভাবিকের চেয়ে কম। এটি স্বাস্থ্য সমস্যার লক্ষণ হতে পারে।',
    }),
    getSuggestion: () => ({
      en: 'Check water lines for blockage or leaks',
      bn: 'পানির লাইনে ব্লকেজ বা লিকেজ চেক করুন',
    }),
    level: 'warning',
  },
  high_humidity: {
    title: { en: 'Shed is getting humid', bn: 'শেড ভেজা হয়ে যাচ্ছে' },
    getMessage: (data) => ({
      en: `Humidity is high${data?.humidity ? ` at ${data.humidity}%` : ''}. Litter may become wet.`,
      bn: `আর্দ্রতা বেশি${data?.humidity ? ` (${data.humidity}%)` : ''}। লিটার ভেজা হয়ে যেতে পারে।`,
    }),
    getSuggestion: () => ({
      en: 'Increase ventilation and check litter condition',
      bn: 'ভেন্টিলেশন বাড়ান এবং লিটার চেক করুন',
    }),
    level: 'info',
  },
  power_failure: {
    title: { en: 'Power outage', bn: '⚠️ খামারের বিদ্যুৎ চলে গেছে' },
    getMessage: () => ({
      en: 'Power supply interrupted. Running on backup.',
      bn: 'বিদ্যুৎ সরবরাহ বিচ্ছিন্ন। ব্যাকআপে চলছে।',
    }),
    getSuggestion: () => ({
      en: 'Check generator. System will auto-purge when power returns.',
      bn: 'জেনারেটর চেক করুন। বিদ্যুৎ ফিরলে সিস্টেম নিজে পরিষ্কার করবে।',
    }),
    level: 'danger',
  },
  power_restored: {
    title: { en: 'Power restored', bn: '⚡ বিদ্যুৎ ফিরে এসেছে, খামার পরিষ্কার করা হচ্ছে' },
    getMessage: () => ({
      en: 'Power is back. Farm purge running automatically.',
      bn: 'বিদ্যুৎ ফিরে এসেছে। খামার স্বয়ংক্রিয়ভাবে পরিষ্কার হচ্ছে।',
    }),
    getSuggestion: () => ({
      en: 'No action needed. System will return to normal after purge.',
      bn: 'কিছু করার দরকার নেই। পরিষ্কারের পর সিস্টেম স্বাভাবিক হবে।',
    }),
    level: 'info',
  },
  heat_stress: {
    title: { en: 'Extreme heat', bn: '🔥 অতিরিক্ত গরম — সর্বোচ্চ বাতাস দেওয়া হচ্ছে' },
    getMessage: () => ({
      en: 'Extreme heat detected. Maximum cooling active.',
      bn: 'অতিরিক্ত গরম। সর্বোচ্চ বাতাস ও কুলিং চলছে।',
    }),
    getSuggestion: () => ({
      en: 'System is auto-cooling at max. Check water supply.',
      bn: 'সিস্টেম নিজে সর্বোচ্চ কুলিং দিচ্ছে। পানি সরবরাহ চেক করুন।',
    }),
    level: 'danger',
  },
  no_ventilation: {
    title: { en: 'No ventilation detected', bn: 'ভেন্টিলেশন বন্ধ আছে' },
    getMessage: () => ({
      en: 'All ventilation fans appear to be off. Check fan connections.',
      bn: 'সব ভেন্টিলেশন ফ্যান বন্ধ মনে হচ্ছে। ফ্যানের সংযোগ চেক করুন।',
    }),
    getSuggestion: () => ({
      en: 'Manually check exhaust fans and power connections',
      bn: 'ম্যানুয়ালি এক্সহস্ট ফ্যান এবং পাওয়ার সংযোগ চেক করুন',
    }),
    level: 'danger',
  },
  sensor_failure: {
    title: { en: 'Sensor issue', bn: '🛠️ সেন্সর সমস্যা — খামার সেফটি মোডে চলছে' },
    getMessage: (data) => ({
      en: `${data?.sensor || 'A sensor'} not responding. Farm running in safety mode.`,
      bn: `${data?.sensorBn || 'একটি সেন্সর'} সাড়া দিচ্ছে না। খামার সেফটি মোডে চলছে।`,
    }),
    getSuggestion: () => ({
      en: 'Farm is safe. Check sensor connection when convenient.',
      bn: 'খামার নিরাপদ আছে। সুযোগে সেন্সর সংযোগ চেক করুন।',
    }),
    level: 'danger',
  },
  temperature_rising: {
    title: { en: 'Temperature slowly rising', bn: 'তাপমাত্রা ধীরে বাড়ছে' },
    getMessage: () => ({
      en: 'Temperature is gradually increasing. May need attention soon.',
      bn: 'তাপমাত্রা ধীরে ধীরে বাড়ছে। শীঘ্রই মনোযোগ দিতে হতে পারে।',
    }),
    getSuggestion: () => ({
      en: 'Monitor closely and prepare ventilation',
      bn: 'নজরে রাখুন এবং ভেন্টিলেশন প্রস্তুত রাখুন',
    }),
    level: 'info',
  },
  curtain_suggestion: {
    title: { en: 'Curtain adjustment suggested', bn: 'পর্দা সামঞ্জস্য করুন' },
    getMessage: () => ({
      en: 'Based on temperature difference, curtains may be opened slightly.',
      bn: 'তাপমাত্রার পার্থক্যের উপর ভিত্তি করে পর্দা সামান্য খোলা যেতে পারে।',
    }),
    getSuggestion: () => ({
      en: 'Open side curtains 10-20% for natural airflow',
      bn: 'প্রাকৃতিক বাতাসের জন্য পাশের পর্দা ১০-২০% খুলুন',
    }),
    level: 'info',
  },
  broiler_cold: {
    title: { en: 'Broiler too cold for age', bn: 'ব্রয়লার বয়স অনুযায়ী ঠান্ডা' },
    getMessage: (data) => ({
      en: `Temperature ${data?.temp || '--'}°C is below target ${data?.target || '--'}°C for ${data?.age || '--'} day old chicks.`,
      bn: `তাপমাত্রা ${data?.temp || '--'}°সে, ${data?.age || '--'} দিনের বাচ্চার জন্য টার্গেট ${data?.target || '--'}°সে।`,
    }),
    getSuggestion: () => ({
      en: 'Turn on heater immediately to maintain broiler temperature',
      bn: 'ব্রয়লারের তাপমাত্রা বজায় রাখতে এখনই হিটার চালু করুন',
    }),
    level: 'danger',
  },
  broiler_hot: {
    title: { en: 'Broiler too hot for age', bn: 'ব্রয়লার বয়স অনুযায়ী গরম' },
    getMessage: (data) => ({
      en: `Temperature ${data?.temp || '--'}°C is above target ${data?.target || '--'}°C for ${data?.age || '--'} day old chicks.`,
      bn: `তাপমাত্রা ${data?.temp || '--'}°সে, ${data?.age || '--'} দিনের বাচ্চার জন্য টার্গেট ${data?.target || '--'}°সে।`,
    }),
    getSuggestion: () => ({
      en: 'Turn off heater and increase ventilation',
      bn: 'হিটার বন্ধ করুন এবং ভেন্টিলেশন বাড়ান',
    }),
    level: 'warning',
  },
};

/** Resolve a template by alert type, falling back to the sensor_failure copy. */
export function getAlertTemplate(alertType: string): AlertTemplate {
  return ALERT_TEMPLATES[alertType] ?? ALERT_TEMPLATES.sensor_failure;
}
