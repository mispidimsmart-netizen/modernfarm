CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.farms
  ADD COLUMN IF NOT EXISTS worker_pin_hash text;

COMMENT ON COLUMN public.farms.worker_pin_hash IS
  'bcrypt hash of 4-digit Worker Mode PIN. NULL = worker mode not enabled.';

CREATE OR REPLACE FUNCTION public.set_worker_pin(_farm_id uuid, _pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_owner boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.farms WHERE id = _farm_id AND owner_id = auth.uid()
  ) INTO _is_owner;

  IF NOT _is_owner THEN
    RAISE EXCEPTION 'forbidden_only_owner_can_set_pin';
  END IF;

  IF _pin IS NULL OR _pin = '' THEN
    UPDATE public.farms SET worker_pin_hash = NULL, updated_at = now() WHERE id = _farm_id;
    RETURN true;
  END IF;

  IF _pin !~ '^[0-9]{4}$' THEN
    RAISE EXCEPTION 'invalid_pin_must_be_4_digits';
  END IF;

  UPDATE public.farms
    SET worker_pin_hash = crypt(_pin, gen_salt('bf', 8)),
        updated_at = now()
    WHERE id = _farm_id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_worker_pin(_farm_id uuid, _pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _hash text;
  _has_access boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.farms WHERE id = _farm_id AND owner_id = auth.uid()
    UNION
    SELECT 1 FROM public.farm_members WHERE farm_id = _farm_id AND user_id = auth.uid()
  ) INTO _has_access;

  IF NOT _has_access THEN
    RAISE EXCEPTION 'forbidden_no_farm_access';
  END IF;

  SELECT worker_pin_hash INTO _hash FROM public.farms WHERE id = _farm_id;

  IF _hash IS NULL OR _pin IS NULL OR _pin = '' THEN
    RETURN false;
  END IF;

  RETURN _hash = crypt(_pin, _hash);
END;
$$;

REVOKE ALL ON FUNCTION public.set_worker_pin(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_worker_pin(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_worker_pin(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_worker_pin(uuid, text) TO authenticated;