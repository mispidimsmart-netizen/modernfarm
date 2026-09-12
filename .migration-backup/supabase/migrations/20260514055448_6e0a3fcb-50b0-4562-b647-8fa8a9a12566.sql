-- ============================================================================
-- Permission Model v2 — RLS hardening for hardware/automation/threshold writes
-- ============================================================================

-- ---------- automation_rules ----------------------------------------------
DROP POLICY IF EXISTS "automation_rules write requires hardware perm"   ON public.automation_rules;
DROP POLICY IF EXISTS "automation_rules update requires hardware perm"  ON public.automation_rules;
DROP POLICY IF EXISTS "automation_rules delete requires hardware perm"  ON public.automation_rules;

CREATE POLICY "automation_rules write requires hardware perm"
  ON public.automation_rules
  AS RESTRICTIVE FOR INSERT
  TO authenticated
  WITH CHECK (public.can_change_hardware(auth.uid(), farm_id));

CREATE POLICY "automation_rules update requires hardware perm"
  ON public.automation_rules
  AS RESTRICTIVE FOR UPDATE
  TO authenticated
  USING (public.can_change_hardware(auth.uid(), farm_id))
  WITH CHECK (public.can_change_hardware(auth.uid(), farm_id));

CREATE POLICY "automation_rules delete requires hardware perm"
  ON public.automation_rules
  AS RESTRICTIVE FOR DELETE
  TO authenticated
  USING (public.can_change_hardware(auth.uid(), farm_id));

-- ---------- device_status -------------------------------------------------
DROP POLICY IF EXISTS "device_status insert requires hardware perm"  ON public.device_status;
DROP POLICY IF EXISTS "device_status update requires hardware perm"  ON public.device_status;

CREATE POLICY "device_status insert requires hardware perm"
  ON public.device_status
  AS RESTRICTIVE FOR INSERT
  TO authenticated
  WITH CHECK (public.can_change_hardware(auth.uid(), farm_id));

CREATE POLICY "device_status update requires hardware perm"
  ON public.device_status
  AS RESTRICTIVE FOR UPDATE
  TO authenticated
  USING (public.can_change_hardware(auth.uid(), farm_id))
  WITH CHECK (public.can_change_hardware(auth.uid(), farm_id));

-- ---------- device_commands ----------------------------------------------
DROP POLICY IF EXISTS "device_commands insert requires daily-log perm"  ON public.device_commands;
DROP POLICY IF EXISTS "device_commands update requires daily-log perm"  ON public.device_commands;
DROP POLICY IF EXISTS "device_commands delete requires daily-log perm"  ON public.device_commands;

CREATE POLICY "device_commands insert requires daily-log perm"
  ON public.device_commands
  AS RESTRICTIVE FOR INSERT
  TO authenticated
  WITH CHECK (
    farm_id IS NULL
    OR public.can_log_daily_data(auth.uid(), farm_id)
  );

CREATE POLICY "device_commands update requires daily-log perm"
  ON public.device_commands
  AS RESTRICTIVE FOR UPDATE
  TO authenticated
  USING (
    farm_id IS NULL
    OR public.can_log_daily_data(auth.uid(), farm_id)
  )
  WITH CHECK (
    farm_id IS NULL
    OR public.can_log_daily_data(auth.uid(), farm_id)
  );

CREATE POLICY "device_commands delete requires daily-log perm"
  ON public.device_commands
  AS RESTRICTIVE FOR DELETE
  TO authenticated
  USING (
    farm_id IS NULL
    OR public.can_log_daily_data(auth.uid(), farm_id)
  );

-- ============================================================================
-- Verification RPC: confirms the restrictive policies above are in place.
-- Returns {passed, failed, total, results[]}. Super-admin only.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.test_role_write_invariants()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_results jsonb := '[]'::jsonb;
  v_passed int := 0;
  v_failed int := 0;
  v_count int;
  v_check record;
BEGIN
  IF v_caller IS NOT NULL AND NOT public.is_super_admin(v_caller) THEN
    RAISE EXCEPTION 'Only super admin can run role-write tests';
  END IF;

  FOR v_check IN
    SELECT * FROM (VALUES
      ('automation_rules', 'INSERT', 'automation_rules write requires hardware perm'),
      ('automation_rules', 'UPDATE', 'automation_rules update requires hardware perm'),
      ('automation_rules', 'DELETE', 'automation_rules delete requires hardware perm'),
      ('device_status',    'INSERT', 'device_status insert requires hardware perm'),
      ('device_status',    'UPDATE', 'device_status update requires hardware perm'),
      ('device_commands',  'INSERT', 'device_commands insert requires daily-log perm'),
      ('device_commands',  'UPDATE', 'device_commands update requires daily-log perm'),
      ('device_commands',  'DELETE', 'device_commands delete requires daily-log perm')
    ) AS t(tbl, cmd, pname)
  LOOP
    SELECT count(*) INTO v_count
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename  = v_check.tbl
       AND policyname = v_check.pname
       AND cmd        = v_check.cmd
       AND permissive = 'RESTRICTIVE';

    IF v_count = 1 THEN
      v_results := v_results || jsonb_build_object(
        'name', format('%s.%s — restrictive policy present', v_check.tbl, v_check.cmd),
        'pass', true);
      v_passed := v_passed + 1;
    ELSE
      v_results := v_results || jsonb_build_object(
        'name', format('%s.%s — restrictive policy missing', v_check.tbl, v_check.cmd),
        'pass', false,
        'detail', format('expected 1 RESTRICTIVE row for "%s", got %s', v_check.pname, v_count));
      v_failed := v_failed + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'passed',  v_passed,
    'failed',  v_failed,
    'total',   v_passed + v_failed,
    'results', v_results
  );
END;
$$;

REVOKE ALL ON FUNCTION public.test_role_write_invariants() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.test_role_write_invariants() TO authenticated;