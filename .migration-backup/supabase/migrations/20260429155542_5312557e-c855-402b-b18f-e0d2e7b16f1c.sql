-- ============================================================
-- INCOME: extend existing table with new columns (preserve data)
-- ============================================================
ALTER TABLE public.income ADD COLUMN IF NOT EXISTS shed_id UUID;
ALTER TABLE public.income ADD COLUMN IF NOT EXISTS batch_id UUID;
ALTER TABLE public.income ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'egg_sale';
ALTER TABLE public.income ADD COLUMN IF NOT EXISTS unit TEXT NOT NULL DEFAULT 'piece';
ALTER TABLE public.income ADD COLUMN IF NOT EXISTS total_amount NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.income ADD COLUMN IF NOT EXISTS buyer_name TEXT;
ALTER TABLE public.income ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.income ADD COLUMN IF NOT EXISTS farm_mode TEXT NOT NULL DEFAULT 'layer';
ALTER TABLE public.income ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Convert quantity to numeric if it's integer
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='income'
             AND column_name='quantity' AND data_type='integer') THEN
    ALTER TABLE public.income ALTER COLUMN quantity TYPE NUMERIC USING quantity::numeric;
  END IF;
END $$;

-- Backfill total_amount from amount column where exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='income' AND column_name='amount') THEN
    UPDATE public.income SET total_amount = COALESCE(amount, 0) WHERE total_amount = 0;
  END IF;
END $$;

-- Backfill source from category if present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='income' AND column_name='category') THEN
    UPDATE public.income SET source = COALESCE(NULLIF(category, ''), 'egg_sale') WHERE source = 'egg_sale';
  END IF;
END $$;

ALTER TABLE public.income ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Farm tenant access" ON public.income;
CREATE POLICY "Farm tenant access"
  ON public.income FOR ALL
  USING (public.user_can_access_farm(auth.uid(), farm_id))
  WITH CHECK (public.user_can_access_farm(auth.uid(), farm_id));

CREATE INDEX IF NOT EXISTS idx_income_farm_date ON public.income(farm_id, income_date DESC);
CREATE INDEX IF NOT EXISTS idx_income_user_date ON public.income(user_id, income_date DESC);
CREATE INDEX IF NOT EXISTS idx_income_batch ON public.income(batch_id);

DROP TRIGGER IF EXISTS update_income_updated_at ON public.income;
CREATE TRIGGER update_income_updated_at
  BEFORE UPDATE ON public.income
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- MEDICINE INVENTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS public.medicine_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  farm_id UUID,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  medicine_name TEXT NOT NULL,
  medicine_type TEXT NOT NULL DEFAULT 'medicine',
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'piece',
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  supplier TEXT,
  expiry_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.medicine_inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Farm tenant access" ON public.medicine_inventory;
CREATE POLICY "Farm tenant access"
  ON public.medicine_inventory FOR ALL
  USING (public.user_can_access_farm(auth.uid(), farm_id))
  WITH CHECK (public.user_can_access_farm(auth.uid(), farm_id));

CREATE INDEX IF NOT EXISTS idx_medicine_inv_farm_date ON public.medicine_inventory(farm_id, purchase_date DESC);

DROP TRIGGER IF EXISTS update_medicine_inventory_updated_at ON public.medicine_inventory;
CREATE TRIGGER update_medicine_inventory_updated_at
  BEFORE UPDATE ON public.medicine_inventory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- MEDICINE USAGE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.medicine_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  farm_id UUID,
  shed_id UUID,
  batch_id UUID,
  inventory_id UUID,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  medicine_name TEXT NOT NULL,
  medicine_type TEXT NOT NULL DEFAULT 'medicine',
  quantity_used NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'piece',
  reason TEXT,
  birds_treated INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.medicine_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Farm tenant access" ON public.medicine_usage;
CREATE POLICY "Farm tenant access"
  ON public.medicine_usage FOR ALL
  USING (public.user_can_access_farm(auth.uid(), farm_id))
  WITH CHECK (public.user_can_access_farm(auth.uid(), farm_id));

CREATE INDEX IF NOT EXISTS idx_medicine_usage_farm_date ON public.medicine_usage(farm_id, usage_date DESC);
CREATE INDEX IF NOT EXISTS idx_medicine_usage_inv ON public.medicine_usage(inventory_id);

-- ============================================================
-- AUTO-LINK: medicine_inventory purchase -> expenses entry
-- ============================================================
CREATE OR REPLACE FUNCTION public.auto_log_medicine_expense()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.total_cost > 0 THEN
    INSERT INTO public.expenses (user_id, farm_id, expense_date, category, amount, description)
    VALUES (
      NEW.user_id,
      NEW.farm_id,
      NEW.purchase_date,
      'medicine',
      NEW.total_cost,
      '[Auto] ' || COALESCE(NEW.medicine_type, 'medicine') || ': ' || NEW.medicine_name
        || ' • ' || NEW.quantity || ' ' || NEW.unit
        || COALESCE(' • ' || NEW.supplier, '')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_medicine_inventory_expense ON public.medicine_inventory;
CREATE TRIGGER trg_medicine_inventory_expense
  AFTER INSERT ON public.medicine_inventory
  FOR EACH ROW EXECUTE FUNCTION public.auto_log_medicine_expense();

-- ============================================================
-- Realtime
-- ============================================================
ALTER TABLE public.income REPLICA IDENTITY FULL;
ALTER TABLE public.medicine_inventory REPLICA IDENTITY FULL;
ALTER TABLE public.medicine_usage REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.income; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.medicine_inventory; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.medicine_usage; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;