// Pure helpers for the auth (login/signup) forms.

export type FarmType = 'layer' | 'broiler';
export type UserType = 'owner' | 'worker';

export interface PasswordStrength {
  level: 'weak' | 'medium' | 'strong';
  label: string;
  color: string;
  percent: number;
}

/** Password strength calculator (0-5 score bucketed into 3 levels). */
export function getPasswordStrength(pw: string): PasswordStrength {
  if (!pw) return { level: 'weak', label: '', color: '', percent: 0 };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 2) return { level: 'weak', label: 'দুর্বল', color: 'bg-destructive', percent: 33 };
  if (score <= 3) return { level: 'medium', label: 'মাঝারি', color: 'bg-status-warning', percent: 66 };
  return { level: 'strong', label: 'শক্তিশালী', color: 'bg-status-normal', percent: 100 };
}

/** Detect if input looks like a phone number (BD mobile style). */
export function isPhoneInput(value: string): boolean {
  const cleaned = value.replace(/\D/g, '');
  return cleaned.length >= 6 && /^0?1\d+$/.test(cleaned);
}

/** Valid BD mobile: 11 digits starting with 01. */
export function validatePhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 11 && cleaned.startsWith('01');
}

/** Safe same-origin relative path validator (for OAuth `next` return). */
export function safeNextPath(v: string | null): string {
  if (!v) return '/';
  if (!v.startsWith('/') || v.startsWith('//')) return '/';
  return v;
}
