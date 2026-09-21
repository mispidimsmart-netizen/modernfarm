-- Only get_public_batch_trace is meant to be callable without signing in
-- (public batch QR page). Device/OTA/WiFi RPCs are invoked either by edge
-- functions (service_role) or by signed-in farm owners.
REVOKE EXECUTE ON FUNCTION public.claim_device_commands(uuid, text, uuid, uuid, integer, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.complete_device_command(uuid, uuid, uuid, boolean, text, text, uuid, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.provision_device_secret(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.queue_device_wifi_change(uuid, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.queue_v8_ota_assignment(uuid, uuid) FROM anon;
