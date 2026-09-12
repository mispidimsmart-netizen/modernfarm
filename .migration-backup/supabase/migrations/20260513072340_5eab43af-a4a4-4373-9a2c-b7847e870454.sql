
DO $$
DECLARE
  v_farm uuid := 'ea448f73-f5a3-4bdb-b132-9f3f3ed3974c';   -- Resil
  v_user uuid := '79892004-0c53-40a9-8d6b-d82ed30f79cc';   -- Ashim Retchil
  v_owner1 uuid := '2a6d9397-a4d4-4887-aa0e-6f9e7b71e6c7'; -- Smart (Resil owner)
  v_owner2 uuid := '79892004-0c53-40a9-8d6b-d82ed30f79cc'; -- Ashim (target new owner)
  v_count int;
  v_role text;
BEGIN
  RAISE NOTICE '--- step 0: baseline cleanup ---';
  DELETE FROM public.farm_members WHERE farm_id = v_farm AND user_id = v_user;
  DELETE FROM public.user_roles  WHERE user_id = v_user AND farm_owner_id = v_owner1;

  -- ============ TEST 1: INSERT worker -> user_roles row appears ============
  RAISE NOTICE '--- TEST 1: INSERT worker syncs to user_roles ---';
  INSERT INTO public.farm_members(farm_id, user_id, role) VALUES (v_farm, v_user, 'worker');

  SELECT count(*) INTO v_count FROM public.user_roles
    WHERE user_id = v_user AND farm_owner_id = v_owner1 AND role = 'worker';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'TEST1 FAIL: expected 1 worker user_roles row, got %', v_count;
  END IF;
  RAISE NOTICE 'TEST1 PASS: user_roles synced (worker)';

  -- ============ TEST 2: UPDATE worker -> manager removes user_roles row ====
  RAISE NOTICE '--- TEST 2: change role away from worker removes user_roles ---';
  UPDATE public.farm_members SET role='manager' WHERE farm_id=v_farm AND user_id=v_user;

  SELECT count(*) INTO v_count FROM public.user_roles
    WHERE user_id = v_user AND farm_owner_id = v_owner1;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'TEST2 FAIL: expected 0 user_roles after role change, got %', v_count;
  END IF;
  RAISE NOTICE 'TEST2 PASS: user_roles removed when no longer worker';

  -- ============ TEST 3: rollback inside subtxn -> nothing persists =========
  RAISE NOTICE '--- TEST 3: error inside savepoint rolls back BOTH fm + ur ---';
  -- restore baseline (worker)
  UPDATE public.farm_members SET role='worker' WHERE farm_id=v_farm AND user_id=v_user;
  SELECT count(*) INTO v_count FROM public.user_roles
    WHERE user_id = v_user AND farm_owner_id = v_owner1 AND role='worker';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'TEST3 SETUP FAIL: ur not 1, got %', v_count;
  END IF;

  BEGIN
    UPDATE public.farm_members SET role='manager' WHERE farm_id=v_farm AND user_id=v_user;
    -- ensure trigger ran
    SELECT count(*) INTO v_count FROM public.user_roles
      WHERE user_id = v_user AND farm_owner_id = v_owner1;
    IF v_count <> 0 THEN
      RAISE EXCEPTION 'TEST3 inside-tx ur not 0';
    END IF;
    -- force failure
    RAISE EXCEPTION 'forced rollback';
  EXCEPTION WHEN OTHERS THEN
    NULL;  -- swallow, savepoint auto-rolled back
  END;

  -- After rollback, farm_members.role should still be 'worker'
  SELECT role INTO v_role FROM public.farm_members WHERE farm_id=v_farm AND user_id=v_user;
  IF v_role <> 'worker' THEN
    RAISE EXCEPTION 'TEST3 FAIL: fm.role rolled to %, expected worker', v_role;
  END IF;
  -- And user_roles should still have the worker row
  SELECT count(*) INTO v_count FROM public.user_roles
    WHERE user_id = v_user AND farm_owner_id = v_owner1 AND role='worker';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'TEST3 FAIL: ur not preserved, got %', v_count;
  END IF;
  RAISE NOTICE 'TEST3 PASS: rollback restored both fm + ur atomically';

  -- ============ TEST 4: change farms.owner_id moves worker user_roles ======
  RAISE NOTICE '--- TEST 4: changing farms.owner_id reassigns worker user_roles ---';
  -- Pre: ur exists for owner1; user is also the new owner so we cannot move
  -- to v_user (self-worker is nonsense). Pick a different test user instead.
  -- Use user "মনিরুজ্জামান" 70604f53 as worker so we can move owner safely.
  DELETE FROM public.farm_members WHERE farm_id=v_farm AND user_id=v_user;
  DELETE FROM public.user_roles  WHERE user_id=v_user AND farm_owner_id IN (v_owner1, v_owner2);

  INSERT INTO public.farm_members(farm_id, user_id, role)
    VALUES (v_farm, '70604f53-bae0-47e0-a9b0-d950df0fec36', 'worker');

  SELECT count(*) INTO v_count FROM public.user_roles
    WHERE user_id='70604f53-bae0-47e0-a9b0-d950df0fec36' AND farm_owner_id=v_owner1;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'TEST4 SETUP FAIL: ur not 1 for owner1, got %', v_count;
  END IF;

  -- Move ownership owner1 -> owner2
  UPDATE public.farms SET owner_id = v_owner2 WHERE id = v_farm;

  SELECT count(*) INTO v_count FROM public.user_roles
    WHERE user_id='70604f53-bae0-47e0-a9b0-d950df0fec36' AND farm_owner_id=v_owner1;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'TEST4 FAIL: old-owner ur still has %', v_count;
  END IF;
  SELECT count(*) INTO v_count FROM public.user_roles
    WHERE user_id='70604f53-bae0-47e0-a9b0-d950df0fec36' AND farm_owner_id=v_owner2;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'TEST4 FAIL: new-owner ur not 1, got %', v_count;
  END IF;
  RAISE NOTICE 'TEST4 PASS: owner change moved worker user_roles atomically';

  -- ============ FINAL CLEANUP — restore original state =====================
  RAISE NOTICE '--- cleanup: restoring Resil owner + removing test memberships ---';
  UPDATE public.farms SET owner_id = v_owner1 WHERE id = v_farm;
  DELETE FROM public.farm_members
    WHERE farm_id = v_farm AND user_id = '70604f53-bae0-47e0-a9b0-d950df0fec36';
  -- triggers will tidy any leftover user_roles rows from owner change/cleanup
  DELETE FROM public.user_roles
    WHERE user_id = '70604f53-bae0-47e0-a9b0-d950df0fec36'
      AND farm_owner_id IN (v_owner1, v_owner2);

  RAISE NOTICE 'ALL TRANSACTIONAL SYNC TESTS PASSED ✅';
END $$;
