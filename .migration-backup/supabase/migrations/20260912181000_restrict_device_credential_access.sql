-- Phase 3B (restrictive): apply only after Phase 3A is live, the matching
-- frontend is published, and provisioning/rotation Edge Functions are deployed.

BEGIN;

DROP POLICY IF EXISTS "Users can manage their own device tokens"
  ON public.device_tokens;
DROP POLICY IF EXISTS "Farm tenant access"
  ON public.device_tokens;
DROP POLICY IF EXISTS "device_tokens_safe_select"
  ON public.device_tokens;
DROP POLICY IF EXISTS "device_tokens_owner_update"
  ON public.device_tokens;
DROP POLICY IF EXISTS "device_tokens_owner_delete"
  ON public.device_tokens;

CREATE POLICY "device_tokens_safe_select"
ON public.device_tokens
FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR user_id = auth.uid()
  OR (
    farm_id IS NOT NULL
    AND public.user_can_access_farm(auth.uid(), farm_id)
  )
);

CREATE POLICY "device_tokens_owner_update"
ON public.device_tokens
FOR UPDATE
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.farms
    WHERE farms.id = device_tokens.farm_id
      AND farms.owner_id = auth.uid()
  )
  OR (farm_id IS NULL AND user_id = auth.uid())
)
WITH CHECK (
  (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.farms
      WHERE farms.id = device_tokens.farm_id
        AND farms.owner_id = auth.uid()
    )
    OR (farm_id IS NULL AND user_id = auth.uid())
  )
  AND (
    shed_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.sheds
      WHERE sheds.id = device_tokens.shed_id
        AND sheds.farm_id = device_tokens.farm_id
    )
  )
);

CREATE POLICY "device_tokens_owner_delete"
ON public.device_tokens
FOR DELETE
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.farms
    WHERE farms.id = device_tokens.farm_id
      AND farms.owner_id = auth.uid()
  )
  OR (farm_id IS NULL AND user_id = auth.uid())
);

REVOKE SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.device_tokens
  FROM PUBLIC, anon, authenticated;

REVOKE SELECT (
  token,
  device_secret,
  previous_device_secret,
  device_secret_hash,
  previous_secret_hash,
  previous_secret_expires_at
) ON public.device_tokens FROM PUBLIC, anon, authenticated;

REVOKE UPDATE (
  token,
  device_secret,
  previous_device_secret,
  device_secret_hash,
  previous_secret_hash,
  previous_secret_expires_at,
  secret_version,
  secret_rotated_at,
  last_signature_at,
  signature_failure_count
) ON public.device_tokens FROM PUBLIC, anon, authenticated;

REVOKE INSERT (
  token,
  device_secret,
  previous_device_secret,
  device_secret_hash,
  previous_secret_hash,
  previous_secret_expires_at,
  secret_version,
  secret_rotated_at,
  last_signature_at,
  signature_failure_count
) ON public.device_tokens FROM PUBLIC, anon, authenticated;

GRANT SELECT (
  id,
  user_id,
  device_name,
  farm_id,
  shed_id,
  is_active,
  last_seen_at,
  created_at,
  secret_version,
  secret_rotated_at,
  last_signature_at,
  signature_failure_count,
  mesh_role,
  mesh_group_id,
  mqtt_enabled,
  mqtt_topic_prefix,
  last_installed_version_code
) ON public.device_tokens TO authenticated;

GRANT UPDATE (
  device_name,
  shed_id,
  is_active,
  mesh_role,
  mesh_group_id,
  mqtt_enabled,
  mqtt_topic_prefix
) ON public.device_tokens TO authenticated;

GRANT DELETE ON TABLE public.device_tokens TO authenticated;

DROP POLICY IF EXISTS "Farm members can view their provisioning codes"
  ON public.device_provisioning_codes;
DROP POLICY IF EXISTS "Farm members can create provisioning codes"
  ON public.device_provisioning_codes;
DROP POLICY IF EXISTS "Farm members can delete their codes"
  ON public.device_provisioning_codes;
DROP POLICY IF EXISTS "device_provisioning_codes_owner_select"
  ON public.device_provisioning_codes;
DROP POLICY IF EXISTS "device_provisioning_codes_owner_insert"
  ON public.device_provisioning_codes;
DROP POLICY IF EXISTS "device_provisioning_codes_owner_delete"
  ON public.device_provisioning_codes;

CREATE POLICY "device_provisioning_codes_owner_select"
ON public.device_provisioning_codes
FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.farms
    WHERE farms.id = device_provisioning_codes.farm_id
      AND farms.owner_id = auth.uid()
  )
);

CREATE POLICY "device_provisioning_codes_owner_insert"
ON public.device_provisioning_codes
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.farms
      WHERE farms.id = device_provisioning_codes.farm_id
        AND farms.owner_id = auth.uid()
    )
  )
);

CREATE POLICY "device_provisioning_codes_owner_delete"
ON public.device_provisioning_codes
FOR DELETE
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.farms
    WHERE farms.id = device_provisioning_codes.farm_id
      AND farms.owner_id = auth.uid()
  )
);

COMMIT;