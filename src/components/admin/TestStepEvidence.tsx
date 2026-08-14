import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, Trash2, FileText, Loader2, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { EvidenceRow } from '@/hooks/usePcbTestEvidence';

type Props = {
  stepId: string;
  files: EvidenceRow[];
  urls: Record<string, string>;
  uploading: boolean;
  onUpload: (stepId: string, file: File) => Promise<void>;
  onRemove: (row: EvidenceRow) => Promise<void>;
};

export function TestStepEvidence({ stepId, files, urls, uploading, onUpload, onRemove }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = async (file?: File | null) => {
    if (!file) return;
    try {
      await onUpload(stepId, file);
      toast.success('প্রমাণ আপলোড হয়েছে');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'আপলোড ব্যর্থ হয়েছে');
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="mt-2 rounded-lg border border-white/10 bg-slate-950/40 p-2.5 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5" />
          প্রমাণ (ছবি/পিডিএফ)
          <Badge variant="outline" className="text-[10px] border-white/15 text-slate-300">
            {files.length}
          </Badge>
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={uploading}
          className="h-7 text-[11px] border-white/15 text-slate-200 hover:bg-white/5"
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
          আপলোড
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,application/pdf"
          className="hidden"
          onChange={(e) => void pick(e.target.files?.[0])}
        />
      </div>

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((f) => {
            const url = urls[f.file_path];
            const isImg = (f.mime_type || '').startsWith('image/');
            return (
              <div key={f.id} className="relative group w-20">
                <a href={url} target="_blank" rel="noreferrer" className="block">
                  {isImg && url ? (
                    <img
                      src={url}
                      alt={f.file_name}
                      loading="lazy"
                      className="h-20 w-20 object-cover rounded-md border border-white/10"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-md border border-white/10 bg-slate-800/60 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-slate-300" />
                    </div>
                  )}
                </a>
                <button
                  type="button"
                  aria-label="প্রমাণ মুছুন"
                  onClick={() => void onRemove(f).then(() => toast.success('মুছে ফেলা হয়েছে'))}
                  className="absolute -top-1.5 -right-1.5 rounded-full bg-rose-600 p-1 text-white opacity-0 group-hover:opacity-100 transition"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
                <p className="mt-1 text-[9px] text-slate-500 truncate" title={f.file_name}>
                  {f.file_name}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default TestStepEvidence;
