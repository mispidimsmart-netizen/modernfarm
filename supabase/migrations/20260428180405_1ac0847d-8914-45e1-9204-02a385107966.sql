-- 1) Add farm_id to worker_invitations (nullable for backfill, then backfill, then keep nullable for safety)
ALTER TABLE public.worker_invitations
  ADD COLUMN IF NOT EXISTS farm_id uuid;

-- Backfill: link existing invitations to the owner's first farm
UPDATE public.worker_invitations wi
SET farm_id = (
  SELECT f.id FROM public.farms f
  WHERE f.owner_id = wi.farm_owner_id
  ORDER BY f.created_at ASC
  LIMIT 1
)
WHERE wi.farm_id IS NULL;

-- 2) RPC: redeem_invitation (atomic worker join)
CREATE OR REPLACE FUNCTION public.redeem_invitation(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _invitation record;
  _target_farm_id uuid;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Find a valid invitation
  SELECT * INTO _invitation
  FROM public.worker_invitations
  WHERE invite_code = upper(trim(_code))
    AND used_at IS NULL
    AND expires_at > now()
  LIMIT 1;

  IF _invitation IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation code';
  END IF;

  -- Resolve target farm (use invitation.farm_id, fallback to owner's first farm)
  _target_farm_id := _invitation.farm_id;
  IF _target_farm_id IS NULL THEN
    SELECT id INTO _target_farm_id
    FROM public.farms
    WHERE owner_id = _invitation.farm_owner_id
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  IF _target_farm_id IS NULL THEN
    RAISE EXCEPTION 'Owner has no farm to join';
  END IF;

  -- Cannot join your own farm
  IF _invitation.farm_owner_id = _user_id THEN
    RAISE EXCEPTION 'Cannot join your own farm';
  END IF;

  -- Insert worker role (idempotent on user_id+farm_owner_id)
  INSERT INTO public.user_roles (user_id, farm_owner_id, role)
  VALUES (_user_id, _invitation.farm_owner_id, 'worker')
  ON CONFLICT (user_id, farm_owner_id) DO UPDATE SET role = 'worker';

  -- Insert farm_members so RLS (user_can_access_farm) grants access
  INSERT INTO public.farm_members (farm_id, user_id, role)
  VALUES (_target_farm_id, _user_id, 'worker')
  ON CONFLICT DO NOTHING;

  -- Mark invitation as used
  UPDATE public.worker_invitations
  SET used_at = now(), used_by = _user_id
  WHERE id = _invitation.id;

  RETURN jsonb_build_object(
    'success', true,
    'farm_id', _target_farm_id,
    'farm_owner_id', _invitation.farm_owner_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_invitation(text) TO authenticated;

-- 3) RPC: cleanup_worker_farm (removes auto-created farm for workers post-signup)
CREATE OR REPLACE FUNCTION public.cleanup_worker_farm(_farm_owner_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _farm_to_delete uuid;
  _is_worker boolean;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Confirm caller is a worker for the given owner
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND farm_owner_id = _farm_owner_id AND role = 'worker'
  ) INTO _is_worker;

  IF NOT _is_worker THEN
    RAISE EXCEPTION 'Not a worker for this owner';
  END IF;

  -- Find the auto-created farm owned by this worker (single farm with no other members)
  SELECT f.id INTO _farm_to_delete
  FROM public.farms f
  WHERE f.owner_id = _user_id
  LIMIT 1;

  IF _farm_to_delete IS NULL THEN
    RETURN jsonb_build_object('success', true, 'deleted', false);
  END IF;

  -- Delete dependent rows first (those without ON DELETE CASCADE)
  DELETE FROM public.farm_members WHERE farm_id = _farm_to_delete;
  DELETE FROM public.farm_settings WHERE farm_id = _farm_to_delete;
  DELETE FROM public.farm_setup_status WHERE farm_id = _farm_to_delete;
  DELETE FROM public.device_status WHERE farm_id = _farm_to_delete;
  DELETE FROM public.device_health WHERE farm_id = _farm_to_delete;
  DELETE FROM public.device_tokens WHERE farm_id = _farm_to_delete;
  DELETE FROM public.sheds WHERE farm_id = _farm_to_delete;
  DELETE FROM public.flock_info WHERE farm_id = _farm_to_delete;
  DELETE FROM public.lighting_schedule WHERE farm_id = _farm_to_delete;
  DELETE FROM public.farms WHERE id = _farm_to_delete;

  RETURN jsonb_build_object('success', true, 'deleted', true, 'farm_id', _farm_to_delete);
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_worker_farm(uuid) TO authenticated;
