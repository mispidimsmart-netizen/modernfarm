import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle2, Circle, Clock, Radio, Signal, ShieldCheck,
  Pencil, Save, X, Plus, Trash2, Loader2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { toast } from 'sonner';

type Status = 'done' | 'in_progress' | 'planned';

type Row = {
  id: string;
  track_id: string;
  track_name: string;
  track_goal: string | null;
  track_icon: string;
  track_color: string;
  track_position: number;
  item_position: number;
  title: string;
  status: Status;
  detail: string | null;
};

const ICONS: Record<string, React.ComponentType<any>> = {
  Radio, Signal, ShieldCheck,
};

const StatusIcon = ({ s }: { s: Status }) =>
  s === 'done' ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> :
  s === 'in_progress' ? <Clock className="w-4 h-4 text-amber-400 shrink-0" /> :
  <Circle className="w-4 h-4 text-slate-500 shrink-0" />;

const statusBadge = (s: Status) =>
  s === 'done' ? 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10' :
  s === 'in_progress' ? 'border-amber-500/40 text-amber-300 bg-amber-500/10' :
  'border-slate-500/40 text-slate-400 bg-slate-500/10';

const statusLabel = (s: Status) =>
  s === 'done' ? '✓ সম্পন্ন' : s === 'in_progress' ? '◐ চলমান' : 'পরিকল্পিত';

export const PhaseCRoadmapPanel = () => {
  const { isSuperAdmin } = useSuperAdmin();
  const isAdmin = isSuperAdmin;

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [openTrack, setOpenTrack] = useState<string | null>('lora');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Row>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null); // track_id
  const [newItem, setNewItem] = useState<{ title: string; status: Status; detail: string }>({
    title: '', status: 'planned', detail: '',
  });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('phase_c_roadmap')
      .select('*')
      .order('track_position', { ascending: true })
      .order('item_position', { ascending: true });
    if (error) {
      toast.error('রোডম্যাপ লোড ব্যর্থ: ' + error.message);
    } else {
      setRows((data || []) as Row[]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const tracks = useMemo(() => {
    const map = new Map<string, { meta: Pick<Row, 'track_id' | 'track_name' | 'track_goal' | 'track_icon' | 'track_color' | 'track_position'>; items: Row[] }>();
    for (const r of rows) {
      if (!map.has(r.track_id)) {
        map.set(r.track_id, {
          meta: {
            track_id: r.track_id, track_name: r.track_name, track_goal: r.track_goal,
            track_icon: r.track_icon, track_color: r.track_color, track_position: r.track_position,
          },
          items: [],
        });
      }
      map.get(r.track_id)!.items.push(r);
    }
    return Array.from(map.values()).sort((a, b) => a.meta.track_position - b.meta.track_position);
  }, [rows]);

  const startEdit = (r: Row) => {
    setEditingId(r.id);
    setDraft({ title: r.title, status: r.status, detail: r.detail || '' });
  };
  const cancelEdit = () => { setEditingId(null); setDraft({}); };

  const saveEdit = async (id: string) => {
    setSavingId(id);
    const { error } = await supabase
      .from('phase_c_roadmap')
      .update({
        title: draft.title,
        status: draft.status as Status,
        detail: (draft.detail as string)?.trim() ? draft.detail : null,
      })
      .eq('id', id);
    setSavingId(null);
    if (error) return toast.error('সেভ ব্যর্থ: ' + error.message);
    toast.success('সেভ হয়েছে');
    cancelEdit();
    load();
  };

  const quickStatus = async (r: Row, status: Status) => {
    setSavingId(r.id);
    const { error } = await supabase
      .from('phase_c_roadmap').update({ status }).eq('id', r.id);
    setSavingId(null);
    if (error) return toast.error(error.message);
    toast.success('স্ট্যাটাস আপডেট');
    load();
  };

  const removeItem = async (id: string) => {
    if (!confirm('এই আইটেম মুছে ফেলবেন?')) return;
    const { error } = await supabase.from('phase_c_roadmap').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('মুছে ফেলা হয়েছে');
    load();
  };

  const addItem = async (trackMeta: Row | typeof tracks[number]['meta']) => {
    if (!newItem.title.trim()) return toast.error('শিরোনাম দিন');
    const trackItems = tracks.find(t => t.meta.track_id === trackMeta.track_id)?.items || [];
    const nextPos = trackItems.length;
    const { error } = await supabase.from('phase_c_roadmap').insert({
      track_id: trackMeta.track_id,
      track_name: trackMeta.track_name,
      track_goal: trackMeta.track_goal,
      track_icon: trackMeta.track_icon,
      track_color: trackMeta.track_color,
      track_position: trackMeta.track_position,
      item_position: nextPos,
      title: newItem.title.trim(),
      status: newItem.status,
      detail: newItem.detail.trim() || null,
    });
    if (error) return toast.error(error.message);
    toast.success('আইটেম যোগ হয়েছে');
    setAdding(null);
    setNewItem({ title: '', status: 'planned', detail: '' });
    load();
  };

  return (
    <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/50 border-purple-500/20 shadow-xl">
      <CardHeader className="border-b border-white/10">
        <CardTitle className="text-white flex items-center gap-2">
          <Radio className="w-5 h-5 text-purple-400" />
          Phase C রোডম্যাপ — LoRa, Dual-SIM, ISO Track
        </CardTitle>
        <p className="text-xs text-slate-400 mt-1">
          {isAdmin
            ? 'অ্যাডমিন: প্রতিটি আইটেমের স্ট্যাটাস/বিবরণ সরাসরি এডিট করুন।'
            : 'দীর্ঘমেয়াদী hardware + compliance work-এর প্রগ্রেস ট্র্যাকার (read-only)।'}
        </p>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {loading && (
          <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
            <Loader2 className="w-4 h-4 animate-spin" /> লোড হচ্ছে…
          </div>
        )}

        {!loading && tracks.map(({ meta, items }) => {
          const Icon = ICONS[meta.track_icon] || Radio;
          const total = items.length || 1;
          const done = items.filter((i) => i.status === 'done').length;
          const inProgress = items.filter((i) => i.status === 'in_progress').length;
          const pct = Math.round(((done + inProgress * 0.5) / total) * 100);
          const isOpen = openTrack === meta.track_id;

          return (
            <div key={meta.track_id} className="rounded-lg border border-white/10 bg-slate-800/40 overflow-hidden">
              <button
                onClick={() => setOpenTrack(isOpen ? null : meta.track_id)}
                className="w-full p-4 text-left hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3 mb-3">
                  <Icon className={`w-5 h-5 ${meta.track_color}`} />
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{meta.track_name}</h3>
                    {meta.track_goal && (
                      <p className="text-xs text-slate-400 mt-0.5">{meta.track_goal}</p>
                    )}
                  </div>
                  <Badge variant="outline" className="border-white/10 text-slate-300">
                    {done}/{items.length} • {pct}%
                  </Badge>
                </div>
                <Progress value={pct} className="h-1.5" />
              </button>

              {isOpen && (
                <div className="px-4 pb-4 space-y-2 border-t border-white/5 pt-3">
                  {items.map((item) => {
                    const isEditing = editingId === item.id;
                    const isSaving = savingId === item.id;
                    return (
                      <div key={item.id} className="flex items-start gap-3 p-2.5 rounded-md bg-slate-900/40">
                        <StatusIcon s={item.status} />
                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <div className="space-y-2">
                              <Input
                                value={draft.title as string || ''}
                                onChange={(e) => setDraft(d => ({ ...d, title: e.target.value }))}
                                className="bg-slate-800 border-white/10 text-white text-sm"
                                placeholder="শিরোনাম"
                              />
                              <Textarea
                                value={draft.detail as string || ''}
                                onChange={(e) => setDraft(d => ({ ...d, detail: e.target.value }))}
                                className="bg-slate-800 border-white/10 text-white text-xs min-h-[60px]"
                                placeholder="বিবরণ (ঐচ্ছিক)"
                              />
                              <div className="flex items-center gap-2 flex-wrap">
                                <Select
                                  value={draft.status as Status}
                                  onValueChange={(v) => setDraft(d => ({ ...d, status: v as Status }))}
                                >
                                  <SelectTrigger className="w-[160px] bg-slate-800 border-white/10 text-white text-xs h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="planned">পরিকল্পিত</SelectItem>
                                    <SelectItem value="in_progress">◐ চলমান</SelectItem>
                                    <SelectItem value="done">✓ সম্পন্ন</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button size="sm" onClick={() => saveEdit(item.id)} disabled={isSaving} className="h-8">
                                  {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                  <span className="ml-1">সেভ</span>
                                </Button>
                                <Button size="sm" variant="ghost" onClick={cancelEdit} className="h-8 text-slate-300">
                                  <X className="w-3 h-3 mr-1" /> বাতিল
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-start justify-between gap-2 flex-wrap">
                                <p className="text-sm text-white">{item.title}</p>
                                <div className="flex items-center gap-1.5">
                                  <Badge variant="outline" className={`text-xs ${statusBadge(item.status)}`}>
                                    {statusLabel(item.status)}
                                  </Badge>
                                  {isAdmin && (
                                    <>
                                      <Select
                                        value={item.status}
                                        onValueChange={(v) => quickStatus(item, v as Status)}
                                      >
                                        <SelectTrigger className="h-7 w-[44px] px-1 bg-slate-800/60 border-white/10 text-xs">
                                          <span className="sr-only">status</span>
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="planned">পরিকল্পিত</SelectItem>
                                          <SelectItem value="in_progress">◐ চলমান</SelectItem>
                                          <SelectItem value="done">✓ সম্পন্ন</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-300"
                                        onClick={() => startEdit(item)}>
                                        <Pencil className="w-3 h-3" />
                                      </Button>
                                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-400 hover:text-rose-300"
                                        onClick={() => removeItem(item.id)}>
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                              {item.detail && (
                                <p className="text-xs text-slate-400 mt-1">{item.detail}</p>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {isAdmin && (
                    adding === meta.track_id ? (
                      <div className="p-2.5 rounded-md bg-slate-900/60 border border-purple-500/20 space-y-2">
                        <Input
                          value={newItem.title}
                          onChange={(e) => setNewItem(n => ({ ...n, title: e.target.value }))}
                          placeholder="নতুন আইটেমের শিরোনাম"
                          className="bg-slate-800 border-white/10 text-white text-sm"
                        />
                        <Textarea
                          value={newItem.detail}
                          onChange={(e) => setNewItem(n => ({ ...n, detail: e.target.value }))}
                          placeholder="বিবরণ (ঐচ্ছিক)"
                          className="bg-slate-800 border-white/10 text-white text-xs min-h-[50px]"
                        />
                        <div className="flex items-center gap-2 flex-wrap">
                          <Select
                            value={newItem.status}
                            onValueChange={(v) => setNewItem(n => ({ ...n, status: v as Status }))}
                          >
                            <SelectTrigger className="w-[160px] bg-slate-800 border-white/10 text-white text-xs h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="planned">পরিকল্পিত</SelectItem>
                              <SelectItem value="in_progress">◐ চলমান</SelectItem>
                              <SelectItem value="done">✓ সম্পন্ন</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button size="sm" className="h-8" onClick={() => addItem(meta as any)}>
                            <Save className="w-3 h-3 mr-1" /> যোগ করুন
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 text-slate-300"
                            onClick={() => { setAdding(null); setNewItem({ title: '', status: 'planned', detail: '' }); }}>
                            <X className="w-3 h-3 mr-1" /> বাতিল
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm" variant="ghost"
                        className="w-full text-slate-300 border border-dashed border-white/10 hover:bg-white/5"
                        onClick={() => setAdding(meta.track_id)}
                      >
                        <Plus className="w-3 h-3 mr-1" /> নতুন আইটেম যোগ করুন
                      </Button>
                    )
                  )}
                </div>
              )}
            </div>
          );
        })}

        <div className="text-center text-xs text-slate-500 pt-2 border-t border-white/5">
          সর্বশেষ হালনাগাদ: live · Nexiot Labs Engineering
        </div>
      </CardContent>
    </Card>
  );
};

export default PhaseCRoadmapPanel;
