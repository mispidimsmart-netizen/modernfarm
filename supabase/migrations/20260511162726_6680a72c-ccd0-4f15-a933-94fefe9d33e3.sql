
CREATE TABLE IF NOT EXISTS public.phase_c_roadmap (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id text NOT NULL,
  track_name text NOT NULL,
  track_goal text,
  track_icon text NOT NULL DEFAULT 'Radio',
  track_color text NOT NULL DEFAULT 'text-purple-400',
  track_position int NOT NULL DEFAULT 0,
  item_position int NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('done','in_progress','planned')),
  detail text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.phase_c_roadmap ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roadmap_read_all_auth" ON public.phase_c_roadmap
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "roadmap_admin_insert" ON public.phase_c_roadmap
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "roadmap_admin_update" ON public.phase_c_roadmap
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "roadmap_admin_delete" ON public.phase_c_roadmap
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS phase_c_roadmap_order_idx
  ON public.phase_c_roadmap (track_position, track_id, item_position);

CREATE OR REPLACE FUNCTION public.touch_phase_c_roadmap()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_touch_phase_c_roadmap ON public.phase_c_roadmap;
CREATE TRIGGER trg_touch_phase_c_roadmap
  BEFORE UPDATE ON public.phase_c_roadmap
  FOR EACH ROW EXECUTE FUNCTION public.touch_phase_c_roadmap();
