import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  page: number;
  totalPages: number;
  onChange: (updater: (p: number) => number) => void;
}

/** Compact prev/next pager used by the org farms & members lists. */
export function OrgPager({ page, totalPages, onChange }: Props) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-3 text-xs text-slate-400">
      <span>পৃষ্ঠা {page} / {totalPages}</span>
      <div className="flex gap-1">
        <Button
          size="sm" variant="outline" className="h-7 px-2 border-white/10"
          disabled={page <= 1}
          onClick={() => onChange(p => Math.max(1, p - 1))}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>
        <Button
          size="sm" variant="outline" className="h-7 px-2 border-white/10"
          disabled={page >= totalPages}
          onClick={() => onChange(p => Math.min(totalPages, p + 1))}
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
