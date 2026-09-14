import { useRef } from 'react';

/**
 * Stable, unique-per-hook-instance id appended to realtime channel names.
 *
 * Supabase JS returns the SAME RealtimeChannel object for identical channel
 * names. When two components mount a hook that calls
 * `.channel(name).on('postgres_changes', ...)` with the same name, the second
 * instance tries to register callbacks on an already-subscribed channel and
 * throws:
 *   "cannot add `postgres_changes` callbacks for realtime:NAME after `subscribe()`."
 *
 * Suffixing each instance's channel name avoids the collision entirely without
 * affecting the data the subscription receives (filters still scope rows).
 *
 * NOTE: do NOT use this for `broadcast` channels that two peers must share by
 * name — those need an identical name to communicate.
 */
export function useRealtimeInstanceId(): string {
  const ref = useRef(Math.random().toString(36).slice(2, 8));
  return ref.current;
}
