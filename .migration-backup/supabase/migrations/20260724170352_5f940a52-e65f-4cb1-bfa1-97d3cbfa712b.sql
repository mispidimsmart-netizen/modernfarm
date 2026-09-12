
-- 1) Revoke EXECUTE on all public functions from anon and PUBLIC (0028)
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;

-- Re-grant to authenticated + service_role (default we want to preserve)
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- 2) Revoke EXECUTE from authenticated on internal-only SECURITY DEFINER functions (0029)
DO $$
DECLARE
  fn text;
  fns text[] := ARRAY[
    'trigger_mqtt_publish_command()',
    'tg_audit_organizations()',
    'tg_audit_org_members()',
    'handle_new_user()',
    'set_mqtt_topic_prefix()',
    'resolve_escalation_on_ack()',
    'sync_flock_info_from_batch()',
    'touch_phase_c_roadmap()',
    'tg_sync_user_roles_on_farm_owner_change()',
    'sync_feed_consumption_to_broiler_feed()',
    'auto_assign_farm_organization()',
    'enforce_org_max_users()',
    'block_super_admin_farm_member()',
    'enforce_org_max_farms()',
    'tg_sync_user_roles_from_farm_members()',
    'cleanup_farm_members_on_super_admin()',
    'enforce_finance_batch_scope()',
    'fill_alert_ack_audit()',
    'auto_log_medicine_expense()',
    'log_safety_engine_change()',
    'cleanup_device_health_metrics()',
    'cleanup_device_security_artifacts()',
    'cleanup_edge_request_log()',
    'cleanup_mqtt_log()',
    'cleanup_old_audit_logs()',
    'cleanup_old_restart_logs()',
    'cleanup_old_security_audit()',
    'cleanup_old_sensor_partitions(integer)',
    'cleanup_performance_metrics()',
    'cleanup_worker_farm(uuid)',
    'ensure_future_sensor_partitions()',
    'create_sensor_partition_for_month(date)',
    'auto_advance_rollout()',
    'generate_license_expiry_notifications()'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM authenticated, anon, PUBLIC', fn);
    EXCEPTION WHEN undefined_function THEN NULL;
    END;
  END LOOP;
END $$;

-- 3) Fix mutable search_path on the two flagged functions (0011)
ALTER FUNCTION public.canonical_role_label_bn(canonical_role) SET search_path = public;
ALTER FUNCTION public.role_rank(app_role) SET search_path = public;

-- 4) Hide materialized views from the Data API (0016)
REVOKE ALL ON public.farm_daily_rollup_mv FROM anon, authenticated;
REVOKE ALL ON public.sensor_hourly_rollup_mv FROM anon, authenticated;

-- 5) Public bucket listing (0025): drop broad SELECT policies on storage.objects.
-- Public buckets remain readable via direct CDN URLs; only the list API is closed.
DROP POLICY IF EXISTS "Anyone can download firmware" ON storage.objects;
DROP POLICY IF EXISTS "Public read firmware files" ON storage.objects;
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;

-- 6) RLS policy always true (0024): tighten air_quality_alerts INSERT
DROP POLICY IF EXISTS "System can insert air quality alerts" ON public.air_quality_alerts;
CREATE POLICY "Users can insert air quality alerts for their farms"
  ON public.air_quality_alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_access_farm(auth.uid(), farm_id));
