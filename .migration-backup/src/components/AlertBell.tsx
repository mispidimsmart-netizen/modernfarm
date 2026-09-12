import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useFarmContext } from '@/context/FarmContext';
import { toast } from 'sonner';

export function AlertBell() {
  const { user, language } = useAuth();
  const { selectedFarmId } = useFarmContext();
  const navigate = useNavigate();
  const [unack, setUnack] = useState<number>(0);

  async function loadCount() {
    if (!selectedFarmId) return;
    const { count } = await supabase
      .from('alerts')
      .select('id', { count: 'exact', head: true })
      .eq('farm_id', selectedFarmId)
      .is('acknowledged_at', null);
    setUnack(count ?? 0);
  }

  useEffect(() => {
    if (!user || !selectedFarmId) return;
    loadCount();
    const ch = supabase
      .channel(`alerts-bell-${selectedFarmId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'alerts', filter: `farm_id=eq.${selectedFarmId}` },
        (payload: any) => {
          loadCount();
          if (payload.eventType === 'INSERT' && !payload.new.acknowledged_at) {
            const isCritical = payload.new.severity === 'critical';
            toast(payload.new.message_bn || payload.new.message, {
              description: isCritical
                ? (language === 'bn' ? '🚨 জরুরি সতর্কতা' : '🚨 Critical alert')
                : (language === 'bn' ? '⚠️ নতুন সতর্কতা' : '⚠️ New alert'),
              action: {
                label: language === 'bn' ? 'দেখুন' : 'View',
                onClick: () => navigate('/alerts'),
              },
              duration: isCritical ? 15000 : 6000,
            });
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, selectedFarmId, language, navigate]);

  if (!user) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative h-9 w-9"
      onClick={() => navigate('/alerts')}
      aria-label={language === 'bn' ? 'সতর্কতা' : 'Alerts'}
    >
      <Bell size={18} />
      {unack > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[9px] flex items-center justify-center rounded-full"
        >
          {unack > 99 ? '99+' : unack}
        </Badge>
      )}
    </Button>
  );
}
