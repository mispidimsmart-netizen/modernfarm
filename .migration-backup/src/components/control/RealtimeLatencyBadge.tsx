import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Zap, ZapOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

/**
 * Shows realtime WebSocket connection status & expected manual command latency.
 * Subscribes to device_commands changes – when connected, manual commands reach ESP32 in ~0.5–1.5s.
 */
export function RealtimeLatencyBadge() {
  const { language } = useAuth();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const channel = supabase
      .channel('device-commands-status')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'device_commands' }, () => {})
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
        connected
          ? 'bg-success/10 border-success/30 text-success'
          : 'bg-muted border-border text-muted-foreground'
      }`}
    >
      {connected ? <Zap className="w-3.5 h-3.5" /> : <ZapOff className="w-3.5 h-3.5" />}
      <span>
        {connected
          ? language === 'bn'
            ? 'রিয়েলটাইম সংযোগ • কমান্ড <১.৫ সেকেন্ডে'
            : 'Realtime connected • commands <1.5s'
          : language === 'bn'
            ? 'সংযোগ পুনঃস্থাপন হচ্ছে…'
            : 'Reconnecting…'}
      </span>
    </div>
  );
}
