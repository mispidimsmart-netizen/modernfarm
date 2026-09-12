
-- Restore EXECUTE for authenticated on trigger functions that fire on user-driven inserts/updates.
-- These were revoked in the previous security hardening migration but are needed for row-level triggers to run.
GRANT EXECUTE ON FUNCTION public.trigger_mqtt_publish_command() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_mqtt_topic_prefix() TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_escalation_on_ack() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_flock_info_from_batch() TO authenticated;
GRANT EXECUTE ON FUNCTION public.touch_phase_c_roadmap() TO authenticated;
GRANT EXECUTE ON FUNCTION public.tg_sync_user_roles_on_farm_owner_change() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_feed_consumption_to_broiler_feed() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_assign_farm_organization() TO authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_org_max_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.block_super_admin_farm_member() TO authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_org_max_farms() TO authenticated;
GRANT EXECUTE ON FUNCTION public.tg_sync_user_roles_from_farm_members() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_farm_members_on_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_finance_batch_scope() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fill_alert_ack_audit() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_log_medicine_expense() TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_safety_engine_change() TO authenticated;
GRANT EXECUTE ON FUNCTION public.tg_audit_organizations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.tg_audit_org_members() TO authenticated;
