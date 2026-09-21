-- Device secrets / auth tokens must never be readable by ordinary farm members.
-- RLS keeps row access for workers (they need device_tokens.id to target
-- commands), so restrict the sensitive columns with column-level privileges.
REVOKE SELECT ON public.device_tokens FROM authenticated;
REVOKE SELECT ON public.device_tokens FROM anon;

GRANT SELECT (
  id, user_id, device_name, last_seen_at, created_at, is_active, shed_id, farm_id,
  previous_secret_expires_at, secret_version, secret_rotated_at, last_signature_at,
  signature_failure_count, mesh_role, mesh_group_id, mqtt_enabled, mqtt_topic_prefix,
  last_installed_version_code
) ON public.device_tokens TO authenticated;

GRANT ALL ON public.device_tokens TO service_role;