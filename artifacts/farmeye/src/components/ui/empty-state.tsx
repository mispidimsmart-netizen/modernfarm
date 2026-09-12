/**
 * EmptyState — reusable Bengali-first empty/zero-data placeholder (S4.1).
 *
 * Use whenever a list/section has no data to show, instead of a blank panel.
 * Provides an icon, title, optional description, and optional CTA.
 */

import { memo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Inbox, type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  children?: ReactNode;
}

export const EmptyState = memo(function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
  children,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/30 p-6 text-center',
        className
      )}
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon size={24} />
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description && (
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">{description}</p>
      )}
      {action && (
        <Button
          type="button"
          size="sm"
          onClick={action.onClick}
          className="mt-4"
        >
          {action.label}
        </Button>
      )}
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
});

export default EmptyState;
