ALTER TABLE public.farm_settings REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.farm_settings;
ALTER TABLE public.safety_engine_audit_log REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.safety_engine_audit_log;