import { Lock } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

/**
 * Wraps settings cards that change hardware behaviour (automation mode, safety
 * engine, thresholds, advanced automation). Workers may look, never touch —
 * previously the controls moved in the UI and only the database refused the
 * write, which read as a silent failure.
 */
export function HardwareEditGuard({ children }: { children: React.ReactNode }) {
  const { canChangeHardware } = usePermissions();

  if (canChangeHardware) return <>{children}</>;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
        <Lock className="h-3.5 w-3.5 shrink-0" />
        <span>শুধু খামারের মালিক বা এডমিন এই সেটিংস পরিবর্তন করতে পারেন — আপনি কেবল দেখতে পারবেন।</span>
      </div>
      <div aria-disabled className="pointer-events-none select-none opacity-60">
        {children}
      </div>
    </div>
  );
}
