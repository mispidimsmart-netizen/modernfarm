DROP FUNCTION IF EXISTS public.claim_device_commands(uuid, text, uuid, uuid, integer, integer, integer);

CREATE FUNCTION public.claim_device_commands(
  _user_id uuid,
  _device_name text DEFAULT NULL,
  _farm_id uuid DEFAULT NULL,
  _shed_id uuid DEFAULT NULL,
  _lease_seconds integer DEFAULT 20,
  _freshness_seconds integer DEFAULT 300,
  _limit integer DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  farm_id uuid,
  shed_id uuid,
  command_type text,
  command_value boolean,
  created_at timestamptz,
  client_request_id text,
  dispatched_at timestamptz,
  retry_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_fresh_cutoff timestamptz := now() - make_interval(secs => GREATEST(_freshness_seconds, 1));
  v_lease_cutoff timestamptz := now() - make_interval(secs => GREATEST(_lease_seconds, 1));
BEGIN
  UPDATE public.device_commands dc
     SET executed = true,
         executed_at = v_now
   WHERE dc.user_id = _user_id
     AND dc.executed = false
     AND dc.created_at < v_fresh_cutoff
     AND (_device_name IS NULL OR dc.device_name = _device_name)
     AND (_farm_id IS NULL OR dc.farm_id = _farm_id)
     AND (_shed_id IS NULL OR dc.shed_id = _shed_id OR dc.shed_id IS NULL);

  RETURN QUERY
  WITH candidates AS (
    SELECT dc.id
      FROM public.device_commands dc
     WHERE dc.user_id = _user_id
       AND dc.executed = false
       AND dc.created_at >= v_fresh_cutoff
       AND (dc.dispatched_at IS NULL OR dc.dispatched_at < v_lease_cutoff)
       AND (_device_name IS NULL OR dc.device_name = _device_name)
       AND (_farm_id IS NULL OR dc.farm_id = _farm_id)
       AND (_shed_id IS NULL OR dc.shed_id = _shed_id OR dc.shed_id IS NULL)
     ORDER BY dc.created_at ASC
     LIMIT GREATEST(_limit, 1)
     FOR UPDATE SKIP LOCKED
  )
  UPDATE public.device_commands dc
     SET client_request_id = COALESCE(dc.client_request_id, dc.id::text),
         dispatched_at = v_now,
         retry_count = CASE WHEN dc.dispatched_at IS NULL THEN COALESCE(dc.retry_count, 0)
                            ELSE COALESCE(dc.retry_count, 0) + 1 END
    FROM candidates c
   WHERE dc.id = c.id
  RETURNING dc.id, dc.farm_id, dc.shed_id, dc.command_type::text, dc.command_value,
            dc.created_at, dc.client_request_id, dc.dispatched_at, dc.retry_count;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_device_commands(uuid, text, uuid, uuid, integer, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_device_commands(uuid, text, uuid, uuid, integer, integer, integer) TO service_role;