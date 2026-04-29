-- ব্রয়লার মোডে layer-only source ভুল — category এর সাথে align করি
UPDATE public.income
SET source = category
WHERE farm_mode = 'broiler'
  AND source IN ('eggs', 'egg_sale', 'spent_hen')
  AND category NOT IN ('eggs', 'egg_sale', 'spent_hen');

-- উল্টোভাবে: লেয়ার মোডে broiler-only source ভুল হলেও align করি
UPDATE public.income
SET source = category
WHERE farm_mode = 'layer'
  AND source IN ('culled_birds', 'bird_sale')
  AND category NOT IN ('culled_birds', 'bird_sale');