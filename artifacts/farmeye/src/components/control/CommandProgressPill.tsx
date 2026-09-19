/**
 * CommandProgressPill — shows which step a device command reached.
 *
 * Farmer-readable wording only: no "lease", "ack" or "queue" jargon.
 */
import { Check, Clock, Loader2, Send, XCircle } from 'lucide-react';
import type { CommandStage } from '@/hooks/useCommandProgress';

interface Props {
  stage: CommandStage;
  language: 'bn' | 'en';
  className?: string;
}

const STAGE_META: Record<
  CommandStage,
  {
    label: { bn: string; en: string };
    icon: typeof Check;
    className: string;
    spin?: boolean;
  }
> = {
  queued: {
    label: { bn: 'পাঠানো হয়েছে', en: 'Sent' },
    icon: Send,
    className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
  },
  dispatched: {
    label: { bn: 'ডিভাইস নিয়েছে', en: 'Device received' },
    icon: Loader2,
    className: 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30',
    spin: true,
  },
  done: {
    label: { bn: 'সম্পন্ন', en: 'Confirmed' },
    icon: Check,
    className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  },
  failed: {
    label: { bn: 'ব্যর্থ', en: 'Failed' },
    icon: XCircle,
    className: 'bg-destructive/15 text-destructive border-destructive/30',
  },
  expired: {
    label: { bn: 'পৌঁছায়নি', en: 'Not delivered' },
    icon: Clock,
    className: 'bg-destructive/15 text-destructive border-destructive/30',
  },
};

export function CommandProgressPill({ stage, language, className = '' }: Props) {
  const meta = STAGE_META[stage];
  if (!meta) return null;
  const Icon = meta.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-bold leading-none ${meta.className} ${className}`}
    >
      <Icon className={`h-2.5 w-2.5 ${meta.spin ? 'animate-spin' : ''}`} aria-hidden="true" />
      {meta.label[language]}
    </span>
  );
}

export default CommandProgressPill;
