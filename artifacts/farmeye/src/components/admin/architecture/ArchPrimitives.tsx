import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

interface ArchSectionProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

export function ArchSection({ icon, title, children }: ArchSectionProps) {
  return (
    <Card className="bg-slate-800/50 border-white/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-white">
          {icon}
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 text-sm">{children}</CardContent>
    </Card>
  );
}

export function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>{headers.map((h, i) => <th key={i} className="border border-white/10 bg-slate-700/50 text-slate-200 px-2 py-1.5 text-left font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-slate-800/30' : 'bg-slate-700/20'}>
              {row.map((cell, j) => <td key={j} className="border border-white/10 text-slate-300 px-2 py-1.5">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BulletList({ items, color }: { items: { label: string; value: string }[]; color: string }) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2">
          <CheckCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${color}`} />
          <span className="text-slate-300 text-xs"><strong className="text-slate-200">{item.label}:</strong> {item.value}</span>
        </div>
      ))}
    </div>
  );
}

