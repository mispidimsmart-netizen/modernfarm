import { useState } from 'react';
import { Egg, Skull, Wheat, TrendingUp, Calendar, ChevronDown, Pencil, Trash2 } from 'lucide-react';
import {
  useLayerBatchSummary,
  useDeleteLayerBatch,
  type LayerBatch,
} from '@/hooks/useLayerBatch';
import { EditCompletedBatchDialog } from '@/components/farm/EditCompletedBatchDialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { formatDateBn } from '@/lib/layerBatch';
import { MiniStat } from '@/components/farm/batch/BatchStats';
import { BatchTrendChart } from '@/components/farm/batch/BatchTrendChart';

export function PastBatchRow({
  batch,
  language,
}: {
  batch: LayerBatch;
  language: 'bn' | 'en';
}) {
  const { data: summary } = useLayerBatchSummary(batch.id);
  const deleteBatch = useDeleteLayerBatch();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-stretch gap-1">
          <CollapsibleTrigger asChild>
            <button className="flex-1 rounded-lg border bg-muted/30 p-2.5 text-left hover:bg-muted/50">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">
                    {batch.batch_name_bn || batch.batch_name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDateBn(batch.start_date)} → {formatDateBn(batch.actual_end_date)}
                  </div>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    open ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </button>
          </CollapsibleTrigger>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-auto w-9 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              setEditOpen(true);
            }}
            title={language === 'bn' ? 'সম্পাদনা' : 'Edit'}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-auto w-9 shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteOpen(true);
            }}
            title={language === 'bn' ? 'মুছুন' : 'Delete'}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
        <CollapsibleContent className="mt-1 grid grid-cols-3 gap-1.5 px-2">
          <MiniStat
            icon={<Egg className="h-3 w-3" />}
            label={language === 'bn' ? 'মোট ডিম' : 'Eggs'}
            value={summary?.total_eggs?.toLocaleString() || '—'}
          />
          <MiniStat
            icon={<TrendingUp className="h-3 w-3" />}
            label={language === 'bn' ? 'পিক %' : 'Peak %'}
            value={summary ? `${summary.peak_production_percent}%` : '—'}
          />
          <MiniStat
            icon={<Skull className="h-3 w-3" />}
            label={language === 'bn' ? 'মৃত্যু %' : 'Mort %'}
            value={summary ? `${summary.mortality_percent}%` : '—'}
          />
          <MiniStat
            icon={<Wheat className="h-3 w-3" />}
            label={language === 'bn' ? 'খাদ্য' : 'Feed'}
            value={summary ? `${summary.total_feed_kg} kg` : '—'}
          />
          <MiniStat
            icon={<TrendingUp className="h-3 w-3" />}
            label="FCR"
            value={summary?.fcr?.toString() || '—'}
          />
          <MiniStat
            icon={<Calendar className="h-3 w-3" />}
            label={language === 'bn' ? 'দিন' : 'Days'}
            value={summary?.duration_days?.toString() || '—'}
          />
        </CollapsibleContent>
        <CollapsibleContent className="mt-2 px-2">
          <BatchTrendChart batch={batch} language={language} />
        </CollapsibleContent>
      </Collapsible>

      <EditCompletedBatchDialog batch={batch} open={editOpen} onOpenChange={setEditOpen} />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">
              {language === 'bn' ? 'এই ব্যাচ মুছবেন?' : 'Delete this batch?'}
            </DialogTitle>
            <DialogDescription>
              {language === 'bn'
                ? `"${batch.batch_name_bn || batch.batch_name}" ব্যাচ ও তার সারাংশ স্থায়ীভাবে মুছে যাবে। দৈনিক রেকর্ড অপরিবর্তিত থাকবে।`
                : `"${batch.batch_name_bn || batch.batch_name}" batch and its summary will be permanently deleted. Daily records remain untouched.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button
              variant="destructive"
              disabled={deleteBatch.isPending}
              onClick={() =>
                deleteBatch.mutate(batch.id, { onSuccess: () => setDeleteOpen(false) })
              }
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              {language === 'bn' ? 'মুছে ফেলুন' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
