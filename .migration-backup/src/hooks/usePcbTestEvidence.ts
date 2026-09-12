import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type EvidenceRow = {
  id: string;
  step_id: string;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  note: string | null;
  created_at: string;
};

const BUCKET = 'pcb-test-evidence';
export const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024; // 10MB
export const ALLOWED_EVIDENCE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];

export function validateEvidenceFile(file: File): string | null {
  if (!ALLOWED_EVIDENCE_TYPES.includes(file.type)) {
    return 'শুধু ছবি (PNG/JPG/WebP) বা PDF আপলোড করা যাবে';
  }
  if (file.size > MAX_EVIDENCE_BYTES) {
    return 'ফাইল সাইজ ১০ MB এর বেশি হতে পারবে না';
  }
  return null;
}

export function usePcbTestEvidence() {
  const [rows, setRows] = useState<EvidenceRow[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [uploadingStep, setUploadingStep] = useState<string | null>(null);

  const signAll = useCallback(async (list: EvidenceRow[]) => {
    if (!list.length) {
      setUrls({});
      return {} as Record<string, string>;
    }
    const { data } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(list.map((r) => r.file_path), 60 * 60 * 24 * 7);
    const map: Record<string, string> = {};
    (data || []).forEach((d, i) => {
      if (d.signedUrl) map[list[i].file_path] = d.signedUrl;
    });
    setUrls(map);
    return map;
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pcb_test_evidence')
      .select('id, step_id, file_path, file_name, mime_type, size_bytes, note, created_at')
      .order('created_at', { ascending: true });
    if (!error && data) {
      setRows(data as EvidenceRow[]);
      await signAll(data as EvidenceRow[]);
    }
    setLoading(false);
  }, [signAll]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const upload = useCallback(
    async (stepId: string, file: File, note?: string) => {
      const invalid = validateEvidenceFile(file);
      if (invalid) throw new Error(invalid);

      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error('লগইন প্রয়োজন');

      setUploadingStep(stepId);
      try {
        const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
        const path = `${uid}/${stepId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) throw upErr;

        const { error: insErr } = await supabase.from('pcb_test_evidence').insert({
          user_id: uid,
          step_id: stepId,
          file_path: path,
          file_name: file.name,
          mime_type: file.type,
          size_bytes: file.size,
          note: note ?? null,
        });
        if (insErr) throw insErr;
        await refresh();
      } finally {
        setUploadingStep(null);
      }
    },
    [refresh],
  );

  const remove = useCallback(
    async (row: EvidenceRow) => {
      await supabase.storage.from(BUCKET).remove([row.file_path]);
      await supabase.from('pcb_test_evidence').delete().eq('id', row.id);
      await refresh();
    },
    [refresh],
  );

  const byStep = useCallback(
    (stepId: string) => rows.filter((r) => r.step_id === stepId),
    [rows],
  );

  return { rows, urls, loading, uploadingStep, upload, remove, refresh, byStep, signAll };
}
