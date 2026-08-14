CREATE TABLE public.pcb_test_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  step_id text not null,
  board_serial text,
  file_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  note text,
  created_at timestamptz not null default now()
);
CREATE INDEX idx_pcb_test_evidence_user_step ON public.pcb_test_evidence(user_id, step_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pcb_test_evidence TO authenticated;
GRANT ALL ON public.pcb_test_evidence TO service_role;

ALTER TABLE public.pcb_test_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own evidence read" ON public.pcb_test_evidence FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE POLICY "own evidence insert" ON public.pcb_test_evidence FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "own evidence update" ON public.pcb_test_evidence FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own evidence delete" ON public.pcb_test_evidence FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));

CREATE POLICY "pcb evidence read own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'pcb-test-evidence' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_super_admin(auth.uid())));
CREATE POLICY "pcb evidence insert own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'pcb-test-evidence' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "pcb evidence delete own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'pcb-test-evidence' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_super_admin(auth.uid())));