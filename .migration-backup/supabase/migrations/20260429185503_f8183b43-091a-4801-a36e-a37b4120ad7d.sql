-- Fix mistagged income rows: broiler batch তে egg_sale source অসম্ভব।
-- যেহেতু category 'manure' এবং farm_mode 'broiler', source কেও 'manure' এ সংশোধন করছি।
UPDATE public.income
SET source = 'manure'
WHERE farm_mode = 'broiler'
  AND category = 'manure'
  AND source IN ('eggs', 'egg_sale', 'spent_hen');