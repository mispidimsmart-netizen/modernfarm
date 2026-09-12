/**
 * Biological plausibility validation for bird age.
 * 
 * Rules:
 *  - Age must be 0–60 days (broiler biological cycle)
 *  - Age cannot jump >2 days within a 24-hour window
 *  - If age is missing, use locally incremented age from batch start_date
 *  - All overrides logged as age_override_event
 */

export const AGE_MIN = 0;
export const AGE_MAX = 60;
export const MAX_DAILY_JUMP = 2;

export interface AgeValidationResult {
  valid: boolean;
  reason?: string;
  correctedAge?: number;
}

/**
 * Validate that age is within biological range (0–60 days)
 */
export function validateAgeRange(ageDays: number): AgeValidationResult {
  if (typeof ageDays !== 'number' || isNaN(ageDays)) {
    return { valid: false, reason: 'age_not_a_number' };
  }
  if (ageDays < AGE_MIN || ageDays > AGE_MAX) {
    return { 
      valid: false, 
      reason: `age_outside_range_${AGE_MIN}_${AGE_MAX}`,
    };
  }
  return { valid: true };
}

/**
 * Validate that age hasn't jumped more than 2 days in 24 hours
 */
export function validateAgeJump(
  newAge: number, 
  currentAge: number, 
  lastUpdateTime: Date | null
): AgeValidationResult {
  const ageDelta = Math.abs(newAge - currentAge);
  
  if (lastUpdateTime) {
    const hoursSinceUpdate = (Date.now() - lastUpdateTime.getTime()) / (60 * 60 * 1000);
    if (ageDelta > MAX_DAILY_JUMP && hoursSinceUpdate < 24) {
      return { 
        valid: false, 
        reason: `jump_${ageDelta}_days_exceeds_max_${MAX_DAILY_JUMP}_in_24h`,
      };
    }
  }
  
  return { valid: true };
}

/**
 * Calculate locally incremented age from batch start date.
 * Used as fallback when submitted age is missing or invalid.
 */
export function getLocalIncrementedAge(startDate: string): number {
  const start = new Date(startDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  return Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
}

/**
 * Full validation pipeline: range → jump → fallback
 */
export function validateBirdAge(
  submittedAge: number | null | undefined,
  currentAge: number,
  lastUpdateTime: Date | null,
  batchStartDate: string | null
): AgeValidationResult & { finalAge: number } {
  // If age is missing, use locally incremented age
  if (submittedAge === null || submittedAge === undefined || isNaN(submittedAge)) {
    const fallbackAge = batchStartDate 
      ? getLocalIncrementedAge(batchStartDate) 
      : currentAge;
    return { 
      valid: true, 
      reason: 'age_missing_used_local_increment',
      finalAge: Math.min(fallbackAge, AGE_MAX),
    };
  }

  // Rule 1: Range check
  const rangeResult = validateAgeRange(submittedAge);
  if (!rangeResult.valid) {
    const fallbackAge = batchStartDate 
      ? getLocalIncrementedAge(batchStartDate) 
      : currentAge;
    return { 
      valid: false, 
      reason: rangeResult.reason,
      finalAge: Math.min(fallbackAge, AGE_MAX),
    };
  }

  // Rule 2: Jump check  
  const jumpResult = validateAgeJump(submittedAge, currentAge, lastUpdateTime);
  if (!jumpResult.valid) {
    return { 
      valid: false, 
      reason: jumpResult.reason,
      finalAge: currentAge, // keep current age on jump rejection
    };
  }

  return { valid: true, finalAge: submittedAge };
}
