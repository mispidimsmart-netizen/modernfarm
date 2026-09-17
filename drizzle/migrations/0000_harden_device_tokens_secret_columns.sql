-- Harden device_tokens: credential columns must never be selectable by any
-- signed-in user (farm members, workers, or even the owner). Secrets are only
-- ever returned once by the provisioning/rotation edge functions (service role).
REVOKE SELECT ON public.device_tokens FROM authenticated;
REVOKE SELECT ON public.device_tokens FROM anon;

GRANT SELECT (
  id, user_id, device_name, last_seen_at, created_at, is_active,
  shed_id, farm_id, previous_secret_expires_at, secret_version,
  secret_rotated_at, last_signature_at, signature_failure_count,
  mesh_role, mesh_group_id, mqtt_enabled, mqtt_topic_prefix,
  last_installed_version_code
) ON public.device_tokens TO authenticated;

GRANT ALL ON public.device_tokens TO service_role;