-- =============================================
-- ফেজ ১: ডেটা ফাউন্ডেশন টেবিলস
-- =============================================

-- ১. ডিম উৎপাদন ট্র্যাকিং
CREATE TABLE public.egg_production (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  production_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_eggs INTEGER NOT NULL DEFAULT 0,
  grade_a INTEGER NOT NULL DEFAULT 0,
  grade_b INTEGER NOT NULL DEFAULT 0,
  grade_c INTEGER NOT NULL DEFAULT 0,
  broken INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, production_date)
);

-- ২. ফিড ইনভেন্টরি (খাদ্য স্টক)
CREATE TABLE public.feed_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  feed_type TEXT NOT NULL DEFAULT 'layer_feed',
  quantity_kg NUMERIC NOT NULL DEFAULT 0,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  supplier TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ৩. ফিড খরচ (প্রতিদিনের ব্যবহার)
CREATE TABLE public.feed_consumption (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  consumption_date DATE NOT NULL DEFAULT CURRENT_DATE,
  feed_type TEXT NOT NULL DEFAULT 'layer_feed',
  quantity_kg NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ৪. মর্টালিটি রেকর্ড
CREATE TABLE public.mortality_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER NOT NULL DEFAULT 1,
  cause TEXT NOT NULL DEFAULT 'unknown',
  age_weeks INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ৫. খরচ হিসাব
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL DEFAULT 'other',
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ৬. আয় হিসাব
CREATE TABLE public.income (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  income_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL DEFAULT 'eggs',
  amount NUMERIC NOT NULL DEFAULT 0,
  quantity INTEGER,
  unit_price NUMERIC,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ৭. ফ্লক ইনফরমেশন (মুরগির সংখ্যা ট্র্যাক করতে)
CREATE TABLE public.flock_info (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  total_birds INTEGER NOT NULL DEFAULT 0,
  age_weeks INTEGER NOT NULL DEFAULT 0,
  breed TEXT DEFAULT 'layer',
  purchase_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- RLS Policies
-- =============================================

ALTER TABLE public.egg_production ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_consumption ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mortality_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flock_info ENABLE ROW LEVEL SECURITY;

-- Egg Production Policies
CREATE POLICY "Users can manage their own egg production" ON public.egg_production
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Feed Inventory Policies
CREATE POLICY "Users can manage their own feed inventory" ON public.feed_inventory
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Feed Consumption Policies
CREATE POLICY "Users can manage their own feed consumption" ON public.feed_consumption
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Mortality Records Policies
CREATE POLICY "Users can manage their own mortality records" ON public.mortality_records
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Expenses Policies
CREATE POLICY "Users can manage their own expenses" ON public.expenses
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Income Policies
CREATE POLICY "Users can manage their own income" ON public.income
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Flock Info Policies
CREATE POLICY "Users can manage their own flock info" ON public.flock_info
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =============================================
-- Indexes for Performance
-- =============================================
CREATE INDEX idx_egg_production_user_date ON public.egg_production(user_id, production_date DESC);
CREATE INDEX idx_feed_consumption_user_date ON public.feed_consumption(user_id, consumption_date DESC);
CREATE INDEX idx_mortality_user_date ON public.mortality_records(user_id, record_date DESC);
CREATE INDEX idx_expenses_user_date ON public.expenses(user_id, expense_date DESC);
CREATE INDEX idx_income_user_date ON public.income(user_id, income_date DESC);

-- =============================================
-- Update handle_new_user function to create flock_info
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, phone, farm_name)
  VALUES (NEW.id, NEW.phone, 'আমার লেয়ার ফার্ম');
  
  INSERT INTO public.farm_settings (user_id)
  VALUES (NEW.id);
  
  INSERT INTO public.device_status (user_id)
  VALUES (NEW.id);
  
  INSERT INTO public.lighting_schedule (user_id)
  VALUES (NEW.id);
  
  INSERT INTO public.flock_info (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$function$;