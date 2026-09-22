-- A freshly seeded device_health row must never look like a live heartbeat.
-- last_seen_at defaulted to now(), so brand-new accounts (no controller yet)
-- read as "online" anywhere the app trusted last_seen_at.
ALTER TABLE public.device_health ALTER COLUMN last_seen_at DROP DEFAULT;

COMMENT ON COLUMN public.device_health.last_seen_at IS
  'Set ONLY by a real device heartbeat. NULL = never reported. No default on purpose.';
COMMENT ON COLUMN public.device_status.updated_at IS
  'Row write time (cloud writes bump it). NEVER an online/liveness signal - use last_device_ack_at.';