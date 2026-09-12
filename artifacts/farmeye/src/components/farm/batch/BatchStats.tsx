import type { ReactNode } from 'react';

export function Stat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border bg-card p-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold">{value}</div>
    </div>
  );
}

export function MiniStat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md bg-card p-1.5 text-center">
      <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-xs font-semibold">{value}</div>
    </div>
  );
}
