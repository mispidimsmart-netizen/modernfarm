-- Permanent safeguard: auto-grant base-table privileges on any new public table
-- so RLS-protected inserts (like device_commands) never get blocked by missing
-- GRANTs again for any user.

CREATE OR REPLACE FUNCTION public.auto_grant_public_table_privs()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN
    SELECT * FROM pg_event_trigger_ddl_commands()
    WHERE command_tag = 'CREATE TABLE'
      AND schema_name = 'public'
  LOOP
    BEGIN
      EXECUTE format(
        'GRANT SELECT, INSERT, UPDATE, DELETE ON %s TO authenticated',
        obj.object_identity
      );
      EXECUTE format(
        'GRANT ALL ON %s TO service_role',
        obj.object_identity
      );
    EXCEPTION WHEN OTHERS THEN
      -- Never block a CREATE TABLE if grant fails for exotic object types.
      NULL;
    END;
  END LOOP;
END;
$$;

DROP EVENT TRIGGER IF EXISTS trg_auto_grant_public_table_privs;
CREATE EVENT TRIGGER trg_auto_grant_public_table_privs
ON ddl_command_end
WHEN TAG IN ('CREATE TABLE')
EXECUTE FUNCTION public.auto_grant_public_table_privs();