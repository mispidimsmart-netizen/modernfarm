CREATE OR REPLACE FUNCTION public.super_admin_delete_farm(_farm_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r RECORD;
  fk_col TEXT;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'permission denied: super admin only';
  END IF;

  -- Dynamically cascade-delete every public table that has a FK to public.farms.
  -- This covers farm_settings, sheds, sensor_readings, alerts, expenses, income,
  -- batches, schedules, automation_rules, etc. — and any future child tables —
  -- without needing schema changes per table.
  FOR r IN
    SELECT
      n.nspname  AS schema_name,
      c.relname  AS table_name,
      a.attname  AS column_name
    FROM pg_constraint con
    JOIN pg_class      c ON c.oid = con.conrelid
    JOIN pg_namespace  n ON n.oid = c.relnamespace
    JOIN pg_attribute  a ON a.attrelid = con.conrelid AND a.attnum = con.conkey[1]
    JOIN pg_class      rc ON rc.oid = con.confrelid
    JOIN pg_namespace  rn ON rn.oid = rc.relnamespace
    WHERE con.contype = 'f'
      AND rn.nspname = 'public'
      AND rc.relname = 'farms'
      AND n.nspname  = 'public'
      AND c.relkind  = 'r'  -- regular tables only, skip partitions
      AND c.relname <> 'farms'
  LOOP
    BEGIN
      EXECUTE format(
        'DELETE FROM %I.%I WHERE %I = $1',
        r.schema_name, r.table_name, r.column_name
      ) USING _farm_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'skip cleanup on %.% (%): %', r.schema_name, r.table_name, r.column_name, SQLERRM;
    END;
  END LOOP;

  DELETE FROM farms WHERE id = _farm_id;
END;
$function$;