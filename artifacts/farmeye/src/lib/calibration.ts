import type { AutomationDefaults } from '@/hooks/useCalibrationWizard';

/**
 * SSOT for calibration wizard automation defaults + validation.
 * Pure module — no React, no Supabase. UI renders whatever this returns.
 */
export const DEFAULT_AUTOMATION: AutomationDefaults = {
  temp_min: 18,
  temp_max: 32,
  humidity_min: 40,
  humidity_max: 80,
  ammonia_max: 25,
  fan_low_temp_min: 28,
  fan_low_temp_max: 30,
  fan_medium_temp_min: 30,
  fan_medium_temp_max: 33,
  fan_high_temp_min: 33,
  heater_on_temp: 20,
  heater_off_temp: 24,
};

type Lang = 'bn' | 'en';

const WARN = '⚠️';
const ERR = '❌';

/** A warning starting with ❌ blocks saving; ⚠️ is advisory only. */
export function isBlockingWarning(w: string): boolean {
  return w.includes(ERR);
}

export function validateAutomationDefaults(d: AutomationDefaults, language: Lang): string[] {
  const bn = language === 'bn';
  const out: string[] = [];
  const push = (mark: string, bnText: string, enText: string) =>
    out.push(`${mark} ${bn ? bnText : enText}`);

  // Temperature
  if (d.temp_min < 10 || d.temp_min > 25) {
    push(WARN, 'সর্বনিম্ন তাপমাত্রা ১০-২৫°C এর মধ্যে হওয়া উচিত', 'Min temp should be 10-25°C');
  }
  if (d.temp_max < 28 || d.temp_max > 40) {
    push(WARN, 'সর্বোচ্চ তাপমাত্রা ২৮-৪০°C এর মধ্যে হওয়া উচিত', 'Max temp should be 28-40°C');
  }
  if (d.temp_min >= d.temp_max) {
    push(ERR, 'সর্বনিম্ন তাপমাত্রা সর্বোচ্চের চেয়ে কম হতে হবে', 'Min temp must be less than max');
  }

  // Humidity
  if (d.humidity_min < 30 || d.humidity_min > 60) {
    push(WARN, 'আর্দ্রতা সর্বনিম্ন ৩০-৬০% হওয়া উচিত', 'Humidity min should be 30-60%');
  }
  if (d.humidity_max < 70 || d.humidity_max > 95) {
    push(WARN, 'আর্দ্রতা সর্বোচ্চ ৭০-৯৫% হওয়া উচিত', 'Humidity max should be 70-95%');
  }

  // Ammonia
  if (d.ammonia_max < 15 || d.ammonia_max > 35) {
    push(WARN, 'অ্যামোনিয়া সীমা ১৫-৩৫ ppm হওয়া উচিত', 'Ammonia limit should be 15-35 ppm');
  }

  // Fan speed bands
  if (d.fan_low_temp_min >= d.fan_low_temp_max) {
    push(ERR, 'ফ্যান Low রেঞ্জ ভুল', 'Fan Low range is invalid');
  }
  if (d.fan_medium_temp_min >= d.fan_medium_temp_max) {
    push(ERR, 'ফ্যান Medium রেঞ্জ ভুল', 'Fan Medium range is invalid');
  }
  if (d.fan_low_temp_max > d.fan_medium_temp_min) {
    push(WARN, 'ফ্যান স্পিড রেঞ্জ ওভারল্যাপ করছে', 'Fan speed ranges overlap');
  }

  // Heater
  if (d.heater_on_temp >= d.heater_off_temp) {
    push(ERR, 'হিটার ON তাপমাত্রা OFF এর চেয়ে কম হতে হবে', 'Heater ON must be less than OFF');
  }
  if (d.heater_on_temp < 15 || d.heater_on_temp > 28) {
    push(WARN, 'হিটার ON তাপমাত্রা ১৫-২৮°C হওয়া উচিত', 'Heater ON should be 15-28°C');
  }

  return out;
}
