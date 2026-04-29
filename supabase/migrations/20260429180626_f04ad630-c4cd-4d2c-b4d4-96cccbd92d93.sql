ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS farm_mode text;
ALTER TABLE public.income ADD COLUMN IF NOT EXISTS farm_mode text;

CREATE INDEX IF NOT EXISTS idx_expenses_farm_mode ON public.expenses(farm_mode);
CREATE INDEX IF NOT EXISTS idx_income_farm_mode ON public.income(farm_mode);

UPDATE public.expenses e
SET farm_mode = 'layer'
WHERE farm_mode IS NULL
  AND batch_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.layer_batches lb
    WHERE lb.id = e.batch_id
  );

UPDATE public.expenses e
SET farm_mode = 'broiler'
WHERE farm_mode IS NULL
  AND batch_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.broiler_batches bb
    WHERE bb.id = e.batch_id
  );

UPDATE public.income i
SET farm_mode = 'layer'
WHERE farm_mode IS NULL
  AND (
    category IN ('eggs', 'egg_sale', 'spent_hen')
    OR EXISTS (
      SELECT 1 FROM public.layer_batches lb
      WHERE lb.id = i.batch_id
    )
  );

UPDATE public.income i
SET farm_mode = 'broiler'
WHERE farm_mode IS NULL
  AND (
    category IN ('culled_birds', 'bird_sale')
    OR EXISTS (
      SELECT 1 FROM public.broiler_batches bb
      WHERE bb.id = i.batch_id
    )
  );