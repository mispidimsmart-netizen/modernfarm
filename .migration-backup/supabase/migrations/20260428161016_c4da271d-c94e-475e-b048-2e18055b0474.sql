-- Layer batches table (lifecycle)
CREATE TABLE public.layer_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  farm_id UUID,
  shed_id UUID,
  batch_name TEXT NOT NULL DEFAULT 'Batch 1',
  batch_name_bn TEXT DEFAULT 'ব্যাচ ১',
  breed TEXT DEFAULT 'Hy-Line Brown',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_end_date DATE,
  actual_end_date DATE,
  initial_bird_count INTEGER NOT NULL DEFAULT 0,
  current_bird_count INTEGER NOT NULL DEFAULT 0,
  chick_cost_per_bird NUMERIC DEFAULT 0,
  age_at_start_weeks INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.layer_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farm tenant access"
ON public.layer_batches
FOR ALL
USING (user_can_access_farm(auth.uid(), farm_id))
WITH CHECK (user_can_access_farm(auth.uid(), farm_id));

CREATE TRIGGER update_layer_batches_updated_at
BEFORE UPDATE ON public.layer_batches
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_layer_batches_farm_status ON public.layer_batches(farm_id, status);
CREATE INDEX idx_layer_batches_user ON public.layer_batches(user_id);

-- Closed batch summary (snapshot of final metrics)
CREATE TABLE public.layer_batch_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL,
  user_id UUID NOT NULL,
  farm_id UUID,
  total_eggs BIGINT DEFAULT 0,
  peak_production_percent NUMERIC DEFAULT 0,
  peak_age_weeks INTEGER,
  total_mortality INTEGER DEFAULT 0,
  mortality_percent NUMERIC DEFAULT 0,
  total_feed_kg NUMERIC DEFAULT 0,
  total_feed_cost NUMERIC DEFAULT 0,
  fcr NUMERIC DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,
  total_expenses NUMERIC DEFAULT 0,
  net_profit NUMERIC DEFAULT 0,
  duration_days INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.layer_batch_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farm tenant access"
ON public.layer_batch_summary
FOR ALL
USING (user_can_access_farm(auth.uid(), farm_id))
WITH CHECK (user_can_access_farm(auth.uid(), farm_id));

CREATE INDEX idx_layer_batch_summary_batch ON public.layer_batch_summary(batch_id);

-- Link daily records to the active batch (additive, nullable)
ALTER TABLE public.egg_production ADD COLUMN IF NOT EXISTS batch_id UUID;
ALTER TABLE public.feed_consumption ADD COLUMN IF NOT EXISTS batch_id UUID;
ALTER TABLE public.flock_info ADD COLUMN IF NOT EXISTS batch_id UUID;

CREATE INDEX IF NOT EXISTS idx_egg_production_batch ON public.egg_production(batch_id);
CREATE INDEX IF NOT EXISTS idx_feed_consumption_batch ON public.feed_consumption(batch_id);