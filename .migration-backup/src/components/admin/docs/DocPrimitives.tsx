import { useState, type ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  ChevronDown, ChevronRight, AlertTriangle, CheckCircle, XCircle, Info,
} from 'lucide-react';

/** Shared presentational primitives for the in-app documentation tab. */

interface DocSectionProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  badge?: string;
  badgeColor?: string;
}

export const DocSection = ({
  title,
  icon,
  children,
  defaultOpen = false,
  badge,
  badgeColor = 'bg-indigo-500',
}: DocSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between p-4 bg-slate-800/50 hover:bg-slate-800/70 rounded-xl border border-white/10 transition-all">
          <div className="flex items-center gap-3">
            {icon}
            <span className="font-semibold text-white">{title}</span>
            {badge && <Badge className={`${badgeColor} text-white text-xs`}>{badge}</Badge>}
          </div>
          {isOpen ? (
            <ChevronDown className="w-5 h-5 text-indigo-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 p-5 bg-slate-900/50 rounded-xl border border-white/5 space-y-4">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export const InfoBox = ({
  type,
  children,
}: {
  type: 'info' | 'warning' | 'success' | 'danger';
  children: ReactNode;
}) => {
  const styles = {
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-300',
    warning: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
    success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
    danger: 'bg-red-500/10 border-red-500/30 text-red-300',
  };

  const icons = {
    info: <Info className="w-5 h-5" />,
    warning: <AlertTriangle className="w-5 h-5" />,
    success: <CheckCircle className="w-5 h-5" />,
    danger: <XCircle className="w-5 h-5" />,
  };

  return (
    <div className={`flex gap-3 p-4 rounded-lg border ${styles[type]}`}>
      {icons[type]}
      <div className="flex-1 text-sm">{children}</div>
    </div>
  );
};

export const ThresholdTable = ({
  data,
}: {
  data: { label: string; value: string; action: string; color?: string }[];
}) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-white/10">
          <th className="text-left py-2 px-3 text-slate-400 font-medium">মান</th>
          <th className="text-left py-2 px-3 text-slate-400 font-medium">থ্রেশহোল্ড</th>
          <th className="text-left py-2 px-3 text-slate-400 font-medium">অ্যাকশন</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={i} className="border-b border-white/5">
            <td className={`py-2 px-3 font-medium ${row.color || 'text-white'}`}>{row.label}</td>
            <td className="py-2 px-3 text-slate-300">{row.value}</td>
            <td className="py-2 px-3 text-slate-400">{row.action}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
