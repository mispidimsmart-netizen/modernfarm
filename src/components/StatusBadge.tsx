import { cn } from '@/lib/utils';
import { StatusLevel } from '@/lib/types';

interface StatusBadgeProps {
  status: StatusLevel;
  label: string;
  className?: string;
}

const statusStyles: Record<StatusLevel, string> = {
  normal: 'status-normal',
  warning: 'status-warning',
  danger: 'status-danger',
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  return (
    <span className={cn('status-indicator', statusStyles[status], className)}>
      <span className={cn(
        'h-2 w-2 rounded-full',
        status === 'normal' && 'bg-green-500',
        status === 'warning' && 'bg-amber-500',
        status === 'danger' && 'bg-red-500 animate-pulse'
      )} />
      {label}
    </span>
  );
}
