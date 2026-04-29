ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS batch_id uuid;
ALTER TABLE public.income ADD COLUMN IF NOT EXISTS batch_id uuid;
CREATE INDEX IF NOT EXISTS idx_expenses_batch_id ON public.expenses(batch_id);
CREATE INDEX IF NOT EXISTS idx_income_batch_id ON public.income(batch_id);