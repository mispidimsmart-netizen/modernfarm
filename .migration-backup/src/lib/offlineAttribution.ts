/**
 * Offline-queue authorship resolution.
 *
 * A queued mutation is authored by whoever was signed in when it was
 * enqueued, for whichever farm was selected at that moment. On a shared
 * farm device the account (or the selected farm) can change before the
 * network comes back, so the drainer must never stamp rows with "whoever
 * is logged in right now" — that silently mis-attributes daily logs,
 * expenses and device commands to the wrong worker or the wrong farm.
 */

export interface AttributableItem {
  queued_by?: string;
  queued_farm_id?: string;
  record_data: Record<string, unknown>;
}

export type AttributionDecision =
  | { action: 'sync'; authorId: string; farmId?: string }
  | { action: 'defer'; authorId: string; reason: 'different-user' | 'farm-mismatch' };

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * Decide how to handle a queued item for the currently signed-in user.
 * - No recorded author → legacy item, attribute to the current user.
 * - Author === current user → sync with the farm captured at enqueue time.
 * - Author !== current user → defer (keep queued) until that user returns.
 * - record_data.farm_id conflicts with the captured farm → defer, the item
 *   is inconsistent and must not be written to either farm.
 */
export function resolveQueueAttribution(
  item: AttributableItem,
  currentUserId: string,
): AttributionDecision {
  const recorded = item.queued_by ?? readString(item.record_data?.user_id);
  const authorId = recorded ?? currentUserId;

  if (recorded && recorded !== currentUserId) {
    return { action: 'defer', authorId: recorded, reason: 'different-user' };
  }

  const queuedFarm = readString(item.queued_farm_id);
  const payloadFarm = readString(item.record_data?.farm_id);
  if (queuedFarm && payloadFarm && queuedFarm !== payloadFarm) {
    return { action: 'defer', authorId, reason: 'farm-mismatch' };
  }

  return { action: 'sync', authorId, farmId: payloadFarm ?? queuedFarm };
}
