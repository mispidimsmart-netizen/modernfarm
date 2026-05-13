
CREATE OR REPLACE FUNCTION public.test_role_sync_invariants()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_farm uuid;
  v_owner uuid;
  v_worker uuid;
  v_other_owner uuid;
  v_count int;
  v_role text;
  v_results jsonb := '[]'::jsonb;
  v_passed int := 0;
  v_failed int := 0;
BEGIN
  IF v_caller IS NOT NULL AND NOT public.is_super_admin(v_caller) THEN
    RAISE EXCEPTION 'Only super admin can run role-sync tests';
  END IF;

  SELECT id, owner_id INTO v_farm, v_owner
    FROM public.farms WHERE deleted_at IS NULL ORDER BY created_at LIMIT 1;
  IF v_farm IS NULL THEN
    RAISE EXCEPTION 'No active farm available for tests';
  END IF;

  SELECT p.id INTO v_worker
    FROM public.profiles p
    WHERE p.id <> v_owner
      AND NOT EXISTS (SELECT 1 FROM public.farm_members fm
                      WHERE fm.farm_id = v_farm AND fm.user_id = p.id)
    LIMIT 1;
  SELECT p.id INTO v_other_owner
    FROM public.profiles p
    WHERE p.id <> v_owner AND p.id <> v_worker LIMIT 1;
  IF v_worker IS NULL OR v_other_owner IS NULL THEN
    RAISE EXCEPTION 'Need at least 3 distinct profiles to run tests';
  END IF;

  DELETE FROM public.farm_members WHERE farm_id=v_farm AND user_id=v_worker;
  DELETE FROM public.user_roles  WHERE user_id=v_worker AND farm_owner_id IN (v_owner, v_other_owner);

  -- TEST 1
  INSERT INTO public.farm_members(farm_id, user_id, role) VALUES (v_farm, v_worker, 'worker');
  SELECT count(*) INTO v_count FROM public.user_roles
    WHERE user_id=v_worker AND farm_owner_id=v_owner AND role='worker';
  IF v_count = 1 THEN
    v_results := v_results || jsonb_build_object('name','insert worker → user_roles row created','pass',true);
    v_passed := v_passed + 1;
  ELSE
    v_results := v_results || jsonb_build_object('name','insert worker → user_roles row created','pass',false,'detail',format('expected 1, got %s', v_count));
    v_failed := v_failed + 1;
  END IF;

  -- TEST 2
  UPDATE public.farm_members SET role='manager' WHERE farm_id=v_farm AND user_id=v_worker;
  SELECT count(*) INTO v_count FROM public.user_roles
    WHERE user_id=v_worker AND farm_owner_id=v_owner;
  IF v_count = 0 THEN
    v_results := v_results || jsonb_build_object('name','demote worker → user_roles row removed','pass',true);
    v_passed := v_passed + 1;
  ELSE
    v_results := v_results || jsonb_build_object('name','demote worker → user_roles row removed','pass',false,'detail',format('expected 0, got %s', v_count));
    v_failed := v_failed + 1;
  END IF;

  -- TEST 3 atomicity
  UPDATE public.farm_members SET role='worker' WHERE farm_id=v_farm AND user_id=v_worker;
  BEGIN
    UPDATE public.farm_members SET role='manager' WHERE farm_id=v_farm AND user_id=v_worker;
    RAISE EXCEPTION 'forced rollback';
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  SELECT role INTO v_role FROM public.farm_members WHERE farm_id=v_farm AND user_id=v_worker;
  SELECT count(*) INTO v_count FROM public.user_roles
    WHERE user_id=v_worker AND farm_owner_id=v_owner AND role='worker';
  IF v_role = 'worker' AND v_count = 1 THEN
    v_results := v_results || jsonb_build_object('name','savepoint rollback restores fm+ur atomically','pass',true);
    v_passed := v_passed + 1;
  ELSE
    v_results := v_results || jsonb_build_object('name','savepoint rollback restores fm+ur atomically','pass',false,'detail',format('fm=%s ur=%s', v_role, v_count));
    v_failed := v_failed + 1;
  END IF;

  -- TEST 4 owner move
  UPDATE public.farms SET owner_id = v_other_owner WHERE id = v_farm;
  SELECT count(*) INTO v_count FROM public.user_roles
    WHERE user_id=v_worker AND farm_owner_id=v_owner;
  IF v_count <> 0 THEN
    v_results := v_results || jsonb_build_object('name','owner change moves worker user_roles','pass',false,'detail',format('old owner ur still %s', v_count));
    v_failed := v_failed + 1;
  ELSE
    SELECT count(*) INTO v_count FROM public.user_roles
      WHERE user_id=v_worker AND farm_owner_id=v_other_owner AND role='worker';
    IF v_count = 1 THEN
      v_results := v_results || jsonb_build_object('name','owner change moves worker user_roles','pass',true);
      v_passed := v_passed + 1;
    ELSE
      v_results := v_results || jsonb_build_object('name','owner change moves worker user_roles','pass',false,'detail',format('new owner ur=%s', v_count));
      v_failed := v_failed + 1;
    END IF;
  END IF;
  UPDATE public.farms SET owner_id = v_owner WHERE id = v_farm;

  -- TEST 5 delete cleans ur
  -- Re-insert worker against current owner so we can verify delete path
  DELETE FROM public.farm_members WHERE farm_id=v_farm AND user_id=v_worker;
  INSERT INTO public.farm_members(farm_id, user_id, role) VALUES (v_farm, v_worker, 'worker');
  DELETE FROM public.farm_members WHERE farm_id=v_farm AND user_id=v_worker;
  SELECT count(*) INTO v_count FROM public.user_roles
    WHERE user_id=v_worker AND farm_owner_id IN (v_owner, v_other_owner);
  IF v_count = 0 THEN
    v_results := v_results || jsonb_build_object('name','delete fm row removes user_roles row','pass',true);
    v_passed := v_passed + 1;
  ELSE
    v_results := v_results || jsonb_build_object('name','delete fm row removes user_roles row','pass',false,'detail',format('residual ur=%s', v_count));
    v_failed := v_failed + 1;
  END IF;

  -- Cleanup
  DELETE FROM public.farm_members WHERE farm_id=v_farm AND user_id=v_worker;
  DELETE FROM public.user_roles  WHERE user_id=v_worker AND farm_owner_id IN (v_owner, v_other_owner);

  RETURN jsonb_build_object(
    'passed', v_passed,
    'failed', v_failed,
    'total',  v_passed + v_failed,
    'tests',  v_results,
    'fixture', jsonb_build_object('farm_id', v_farm, 'owner_id', v_owner, 'worker_id', v_worker, 'other_owner_id', v_other_owner)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.test_role_sync_invariants() TO authenticated;

DO $$
DECLARE r jsonb;
BEGIN
  r := public.test_role_sync_invariants();
  RAISE NOTICE 'Role sync integration test report: %', r;
  IF (r->>'failed')::int > 0 THEN
    RAISE EXCEPTION 'Role sync integration tests FAILED: %', r;
  END IF;
END $$;
