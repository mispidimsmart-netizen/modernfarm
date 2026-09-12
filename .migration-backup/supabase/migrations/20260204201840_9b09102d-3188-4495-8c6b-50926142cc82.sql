-- =============================================
-- BROILER FARM MANAGEMENT TABLES
-- =============================================

-- Broiler Batches: Track each batch of broilers
CREATE TABLE public.broiler_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  shed_id UUID REFERENCES public.sheds(id) ON DELETE SET NULL,
  batch_name TEXT NOT NULL DEFAULT 'Batch 1',
  batch_name_bn TEXT DEFAULT 'ব্যাচ ১',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_end_date DATE,
  actual_end_date DATE,
  initial_bird_count INTEGER NOT NULL DEFAULT 0,
  current_bird_count INTEGER NOT NULL DEFAULT 0,
  chick_cost_per_bird NUMERIC DEFAULT 0,
  target_weight_grams INTEGER DEFAULT 2200,
  breed TEXT DEFAULT 'Cobb 500',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.broiler_batches ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own broiler batches" 
ON public.broiler_batches 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admins can view all broiler batches" 
ON public.broiler_batches 
FOR SELECT 
USING (is_super_admin(auth.uid()));

-- =============================================
-- WEIGHT RECORDS: Track daily/weekly weights
-- =============================================
CREATE TABLE public.broiler_weights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  batch_id UUID NOT NULL REFERENCES public.broiler_batches(id) ON DELETE CASCADE,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  sample_count INTEGER DEFAULT 10,
  average_weight_grams INTEGER NOT NULL,
  min_weight_grams INTEGER,
  max_weight_grams INTEGER,
  uniformity_percent NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.broiler_weights ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own weight records" 
ON public.broiler_weights 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- =============================================
-- BROILER FEED RECORDS: Track feed per batch
-- =============================================
CREATE TABLE public.broiler_feed (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  batch_id UUID NOT NULL REFERENCES public.broiler_batches(id) ON DELETE CASCADE,
  feed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  feed_type TEXT DEFAULT 'starter' CHECK (feed_type IN ('pre-starter', 'starter', 'grower', 'finisher')),
  quantity_kg NUMERIC NOT NULL DEFAULT 0,
  cost_per_kg NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.broiler_feed ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own broiler feed records" 
ON public.broiler_feed 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- =============================================
-- BROILER MORTALITY: Track mortality per batch
-- =============================================
CREATE TABLE public.broiler_mortality (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  batch_id UUID NOT NULL REFERENCES public.broiler_batches(id) ON DELETE CASCADE,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER NOT NULL DEFAULT 1,
  cause TEXT DEFAULT 'unknown' CHECK (cause IN ('unknown', 'disease', 'heat_stress', 'cold_stress', 'suffocation', 'leg_weakness', 'ascites', 'culling', 'other')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.broiler_mortality ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own broiler mortality" 
ON public.broiler_mortality 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- =============================================
-- BROILER SALES: Track batch sales
-- =============================================
CREATE TABLE public.broiler_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  batch_id UUID NOT NULL REFERENCES public.broiler_batches(id) ON DELETE CASCADE,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  bird_count INTEGER NOT NULL,
  total_weight_kg NUMERIC NOT NULL,
  price_per_kg NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  buyer_name TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.broiler_sales ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own broiler sales" 
ON public.broiler_sales 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- =============================================
-- CREATE INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX idx_broiler_batches_user_id ON public.broiler_batches(user_id);
CREATE INDEX idx_broiler_batches_status ON public.broiler_batches(status);
CREATE INDEX idx_broiler_weights_batch_id ON public.broiler_weights(batch_id);
CREATE INDEX idx_broiler_feed_batch_id ON public.broiler_feed(batch_id);
CREATE INDEX idx_broiler_mortality_batch_id ON public.broiler_mortality(batch_id);
CREATE INDEX idx_broiler_sales_batch_id ON public.broiler_sales(batch_id);

-- =============================================
-- TRIGGERS FOR updated_at
-- =============================================
CREATE TRIGGER update_broiler_batches_updated_at
BEFORE UPDATE ON public.broiler_batches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();