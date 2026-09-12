-- Phase B: ML feedback loop — log AI predictions and reconcile with actual outcomes
CREATE TABLE IF NOT EXISTS public.ai_prediction_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  user_id uuid,
  prediction_type text NOT NULL,            -- e.g. 'mortality_risk_7d', 'feed_consumption_kg', 'hsi_avg'
  target_date date NOT NULL,                -- the day the prediction is FOR
  predicted_value numeric,
  predicted_label text,
  confidence numeric,                       -- 0..1
  model text NOT NULL DEFAULT 'gemini-2.5-flash',
  payload jsonb DEFAULT '{}'::jsonb,
  actual_value numeric,
  actual_label text,
  error_abs numeric,                        -- |actual - predicted|
  error_pct numeric,
  reconciled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_pred_farm_date ON public.ai_prediction_log(farm_id, target_date DESC);
CREATE INDEX IF NOT EXISTS idx_ai_pred_type ON public.ai_prediction_log(prediction_type, target_date DESC);

ALTER TABLE public.ai_prediction_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members read predictions" ON public.ai_prediction_log;
CREATE POLICY "members read predictions"
  ON public.ai_prediction_log FOR SELECT TO authenticated
  USING (public.user_can_access_farm(auth.uid(), farm_id));

DROP POLICY IF EXISTS "members insert predictions" ON public.ai_prediction_log;
CREATE POLICY "members insert predictions"
  ON public.ai_prediction_log FOR INSERT TO authenticated
  WITH CHECK (public.user_can_access_farm(auth.uid(), farm_id));

DROP POLICY IF EXISTS "members update predictions" ON public.ai_prediction_log;
CREATE POLICY "members update predictions"
  ON public.ai_prediction_log FOR UPDATE TO authenticated
  USING (public.user_can_access_farm(auth.uid(), farm_id))
  WITH CHECK (public.user_can_access_farm(auth.uid(), farm_id));

-- Accuracy summary view (members can read via underlying RLS)
CREATE OR REPLACE FUNCTION public.get_ai_accuracy_summary(_farm_id uuid, _days integer DEFAULT 30)
RETURNS TABLE(
  prediction_type text,
  total bigint,
  reconciled bigint,
  avg_error_pct numeric,
  accuracy_pct numeric
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.user_can_access_farm(auth.uid(), _farm_id) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  RETURN QUERY
  SELECT
    p.prediction_type,
    count(*)::bigint AS total,
    count(p.reconciled_at)::bigint AS reconciled,
    round(avg(p.error_pct)::numeric, 2) AS avg_error_pct,
    round((100 - LEAST(avg(p.error_pct), 100))::numeric, 2) AS accuracy_pct
  FROM public.ai_prediction_log p
  WHERE p.farm_id = _farm_id
    AND p.created_at >= now() - (_days || ' days')::interval
  GROUP BY p.prediction_type
  ORDER BY total DESC;
END $$;