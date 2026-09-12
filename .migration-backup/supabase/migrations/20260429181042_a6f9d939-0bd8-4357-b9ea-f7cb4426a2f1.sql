ALTER TABLE public.medicine_inventory ADD COLUMN IF NOT EXISTS batch_id uuid;
ALTER TABLE public.medicine_inventory ADD COLUMN IF NOT EXISTS farm_mode text;

CREATE INDEX IF NOT EXISTS idx_medicine_inv_batch_id ON public.medicine_inventory(batch_id);
CREATE INDEX IF NOT EXISTS idx_medicine_inv_farm_mode ON public.medicine_inventory(farm_mode);

CREATE OR REPLACE FUNCTION public.auto_log_medicine_expense()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.total_cost > 0 THEN
    INSERT INTO public.expenses (user_id, farm_id, expense_date, category, amount, description, batch_id, farm_mode)
    VALUES (
      NEW.user_id,
      NEW.farm_id,
      NEW.purchase_date,
      'medicine',
      NEW.total_cost,
      '[Auto] ' || COALESCE(NEW.medicine_type, 'medicine') || ': ' || NEW.medicine_name
        || ' • ' || NEW.quantity || ' ' || NEW.unit
        || COALESCE(' • ' || NEW.supplier, ''),
      NEW.batch_id,
      NEW.farm_mode
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;