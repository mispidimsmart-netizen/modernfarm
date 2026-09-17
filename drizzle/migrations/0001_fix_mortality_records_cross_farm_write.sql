-- The legacy owner-only policy allowed writing rows tagged with any farm_id.
-- Restrict it to legacy rows that carry no farm_id; farm-scoped rows stay
-- covered by the "Farm tenant access" policy.
DROP POLICY IF EXISTS "Users can manage their own mortality records" ON public.mortality_records;

CREATE POLICY "Users can manage their own legacy mortality records"
ON public.mortality_records
FOR ALL
TO authenticated
USING (farm_id IS NULL AND auth.uid() = user_id)
WITH CHECK (farm_id IS NULL AND auth.uid() = user_id);