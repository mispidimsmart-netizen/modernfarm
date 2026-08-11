/**
 * onboarding — SSOT for farm setup wizard steps & progress (Phase 5j).
 *
 * Pure: takes a `farm_setup_status` row (or null) and derives step state,
 * progress, and the next actionable step. No Supabase, no React.
 */

export type SetupStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface SetupStepDef {
  step: SetupStep;
  key: string;
  icon: string;
  en: string;
  bn: string;
}

export const SETUP_STEPS: readonly SetupStepDef[] = [
  { step: 1, key: 'step_farm_created', icon: '🏠', en: 'Create Farm', bn: 'খামার তৈরি' },
  { step: 2, key: 'step_shed_added', icon: '🏗️', en: 'Add Shed', bn: 'শেড যোগ করুন' },
  { step: 3, key: 'step_controller_registered', icon: '📱', en: 'Register Controller', bn: 'কন্ট্রোলার সংযোগ' },
  { step: 4, key: 'step_relays_tested', icon: '🔌', en: 'Test Relays', bn: 'রিলে পরীক্ষা' },
  { step: 5, key: 'step_sensors_calibrated', icon: '🌡️', en: 'Calibrate Sensors', bn: 'সেন্সর ক্যালিব্রেশন' },
  { step: 6, key: 'step_chick_age_set', icon: '🐣', en: 'Set Chick Age', bn: 'বাচ্চার বয়স সেট' },
  { step: 7, key: 'step_automation_profile_selected', icon: '⚙️', en: 'Automation Profile', bn: 'অটোমেশন প্রোফাইল' },
  { step: 8, key: 'hardware_validation_passed', icon: '🔧', en: 'Hardware Validation', bn: 'হার্ডওয়্যার ভ্যালিডেশন' },
  { step: 9, key: 'step_simulation_passed', icon: '🧪', en: 'Simulation Test', bn: 'সিমুলেশন টেস্ট' },
] as const;

export type SetupStatusRow = Record<string, unknown> | null | undefined;

export function isStepDone(status: SetupStatusRow, key: string): boolean {
  return status ? status[key] === true : false;
}

export function completedStepCount(status: SetupStatusRow): number {
  return SETUP_STEPS.filter((s) => isStepDone(status, s.key)).length;
}

/** 0–100 rounded completion percentage. */
export function setupProgressPercent(status: SetupStatusRow): number {
  return Math.round((completedStepCount(status) / SETUP_STEPS.length) * 100);
}

/** First incomplete step, or null when everything is done. */
export function nextSetupStep(status: SetupStatusRow): SetupStepDef | null {
  return SETUP_STEPS.find((s) => !isStepDone(status, s.key)) ?? null;
}

/**
 * Derived setup gate used across the app.
 * Missing row → treated as complete (backward compatibility with pre-wizard farms).
 */
export function deriveSetupState(status: SetupStatusRow) {
  return {
    isComplete: status ? status['setup_completed'] === true : true,
    isHardwareValidated: isStepDone(status, 'hardware_validation_passed'),
    completed: completedStepCount(status),
    total: SETUP_STEPS.length,
    percent: setupProgressPercent(status),
    nextStep: nextSetupStep(status),
  };
}
