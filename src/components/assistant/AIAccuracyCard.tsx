import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useFarm } from '@/context/FarmContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, TrendingUp } from 'lucide-react';

type Row = {
  prediction_type: string;
  total: number;
  reconciled: number;
  avg_error_pct: number | null;
  accuracy_pct: number | null;
};

const labelBn: Record<string, string> = {
  mortality_risk_7d: 'মৃত্যু-ঝুঁকি (৭ দিন)',
  feed_consumption_kg: 'ফিড খরচ (কেজি)',
  hsi_avg: 'গড় HSI',
  water_consumption_l: 'পানি খরচ (লিটার)',
};

export const AIAccuracyCard = () => {
  const { currentFarm } = useFarm();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentFarm?.id) return;
    setLoading(true);
    supabase
      .rpc('get_ai_accuracy_summary' as never, { _farm_id: currentFarm.id, _days: 30 } as never)
      .then(({ data }) => {
        setRows((data as Row[]) || []);
        setLoading(false);
      });
  }, [currentFarm?.id]);

  return (
    <Card className="bg-gradient-to-br from-indigo-950/40 to-slate-900/60 border-indigo-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Brain className="w-5 h-5 text-indigo-400" />
          AI মডেল নির্ভুলতা (গত ৩০ দিন)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <p className="text-sm text-slate-400">লোড হচ্ছে...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-400">
            এখনো পর্যাপ্ত ডেটা নেই — পূর্বাভাসগুলো রেকর্ড হচ্ছে, প্রতিদিন তুলনা করে নির্ভুলতা দেখানো হবে।
          </p>
        ) : (
          rows.map((r) => (
            <div
              key={r.prediction_type}
              className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/40 border border-white/5"
            >
              <div>
                <p className="text-sm text-white">
                  {labelBn[r.prediction_type] || r.prediction_type}
                </p>
                <p className="text-xs text-slate-400">
                  মোট {r.total} • মিলানো {r.reconciled}
                </p>
              </div>
              <Badge
                variant="outline"
                className={
                  (r.accuracy_pct ?? 0) >= 85
                    ? 'border-emerald-500/40 text-emerald-300'
                    : (r.accuracy_pct ?? 0) >= 70
                    ? 'border-amber-500/40 text-amber-300'
                    : 'border-red-500/40 text-red-300'
                }
              >
                <TrendingUp className="w-3 h-3 mr-1" />
                {r.accuracy_pct ?? '—'}%
              </Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default AIAccuracyCard;
