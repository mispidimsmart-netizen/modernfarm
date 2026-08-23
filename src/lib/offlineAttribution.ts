/**
 * Offline-queue authorship resolution.
 *
 * A queued mutation is authored by whoever was signed in when it was
 * enqueued. On a shared farm device the account can change before the
 * network comes back, so the drainer must never stamp rows with "whoever
 * is logged in right now" — that silently mis-attributes daily logs,
 * expenses and device commands to the wrong worker.
 */

export interface AttributableItem {
  queued_by?: string;
  record_data: Record<string, unknown>;
}

export type AttributionDecision =
  | { action: 'sync'; authorId: string }
  | { action: 'defer'; authorId: string; reason: 'different-user' };

/**
 * Decide how to handle a queued item for the currently signed-in user.
 * - No recorded author → legacy item, attribute to the current user.
 * - Author === current user → sync normally.
 * - Author !== current user → defer (keep queued) until that user returns.
 */
export function resolveQueueAttribution(
  item: AttributableItem,
  currentUserId: string,
): AttributionDecision {
  const recorded =
    item.queued_by ??
    (typeof item.record_data?.user_id === 'string'
      ? (item.record_data.user_id as string)
      : undefined);

  if (!recorded) return { action: 'sync', authorId: currentUserId };
  if (recorded === currentUserId) return { action: 'sync', authorId: recorded };
  return { action: 'defer', authorId: recorded, reason: 'different-user' };
}
