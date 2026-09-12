/**
 * inviteCodes — pure helpers for worker invitation codes (Phase 5j).
 *
 * Kept free of Supabase so both the UI and tests can reason about code
 * formatting/expiry without a network round-trip.
 */

export const INVITE_CODE_LENGTH = 8;

export interface InvitationLike {
  expires_at: string | null;
  used_at?: string | null;
}

/** Generate a random uppercase alphanumeric invite code. */
export function generateInviteCode(
  rng: () => number = Math.random,
  length = INVITE_CODE_LENGTH,
): string {
  let out = '';
  while (out.length < length) {
    out += rng().toString(36).substring(2).toUpperCase();
  }
  return out.substring(0, length);
}

/** Trim + uppercase user input (what gets sent to `redeem_invitation`). */
export function normalizeInviteCode(input: string): string {
  return (input ?? '').toUpperCase().trim();
}

/** A code is submittable when it is non-empty and alphanumeric. */
export function isValidInviteCode(input: string): boolean {
  const code = normalizeInviteCode(input);
  return code.length > 0 && /^[A-Z0-9]+$/.test(code);
}

/** An invitation is redeemable while unused and not past its expiry. */
export function isInvitationActive(
  invite: InvitationLike,
  now: Date = new Date(),
): boolean {
  if (invite.used_at) return false;
  if (!invite.expires_at) return true;
  const expiry = new Date(invite.expires_at).getTime();
  if (Number.isNaN(expiry)) return false;
  return expiry > now.getTime();
}

/** Whole minutes left before expiry (0 when expired/unknown). */
export function minutesUntilExpiry(
  invite: InvitationLike,
  now: Date = new Date(),
): number {
  if (!invite.expires_at) return 0;
  const expiry = new Date(invite.expires_at).getTime();
  if (Number.isNaN(expiry)) return 0;
  return Math.max(0, Math.floor((expiry - now.getTime()) / 60000));
}
