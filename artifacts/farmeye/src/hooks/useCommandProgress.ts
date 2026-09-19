/**
 * useCommandProgress — per-device command lifecycle stage for the Control page.
 *
 * Why: the manual grid previously showed a generic "PENDING…" spinner that gave
 * no clue *where* a command was stuck — never left the app, delivered but the
 * board never picked it up, or picked up and confirmed. This hook derives the
 * latest lifecycle stage per device key from `device_command_log` so the card
 * can show an honest step.
 *
 * Stages (device_command_log.status → stage):
 *   pending → 'queued'    (saved in cloud, device has not claimed it yet)
 *   sent    → 'dispatched'(device claimed the command / lease handed out)
 *   acked   → 'done'      (device confirmed the relay actually changed)
 *   failed  → 'failed'
 *   expired → 'expired'   (device never came to collect it)
 *
 * Only entries from the last WINDOW_MS are considered — an old ack must not
 * decorate a fresh toggle forever. `command_type` equals the Control page
 * device key (see useControlPageState.handleManualToggle), so no mapping table
 * is needed.
 */
import { useMemo } from 'react';
import { useDeviceCommandLog } from '@/hooks/useDeviceCommandLog';

export type CommandStage = 'queued' | 'dispatched' | 'done' | 'failed' | 'expired';

export interface CommandProgressEntry {
  stage: CommandStage;
  /** Requested value (true = ON) of that command. */
  value: boolean;
  /** Timestamp of the most recent transition we know about. */
  at: string;
  errorMessage: string | null;
}

export type CommandProgressMap = Record<string, CommandProgressEntry>;

const WINDOW_MS = 3 * 60 * 1000;

function toStage(status: string): CommandStage | null {
  switch (status) {
    case 'pending':
      return 'queued';
    case 'sent':
      return 'dispatched';
    case 'acked':
      return 'done';
    case 'failed':
      return 'failed';
    case 'expired':
      return 'expired';
    default:
      return null;
  }
}

export function useCommandProgress(opts: { farmId?: string; shedId?: string } = {}) {
  const { data: log } = useDeviceCommandLog({
    farmId: opts.farmId,
    shedId: opts.shedId,
  });

  return useMemo<CommandProgressMap>(() => {
    if (!log || log.length === 0) return {};
    const cutoff = Date.now() - WINDOW_MS;
    const map: CommandProgressMap = {};

    // Log is ordered newest-first, so the first hit per device key wins.
    for (const row of log) {
      const key = row.command_type;
      if (!key || map[key]) continue;
      const created = new Date(row.created_at).getTime();
      if (!Number.isFinite(created) || created < cutoff) continue;
      const stage = toStage(row.status);
      if (!stage) continue;
      map[key] = {
        stage,
        value: !!row.command_value,
        at: row.acked_at ?? row.sent_at ?? row.expired_at ?? row.created_at,
        errorMessage: row.error_message ?? null,
      };
    }

    return map;
  }, [log]);
}

export default useCommandProgress;
