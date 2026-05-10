import { useEffect, useState } from 'react';
import { Network, RefreshCw, Trash2, Wifi } from 'lucide-react';
import { useFarmContext } from '@/context/FarmContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface DeviceToken {
  id: string;
  device_name: string | null;
  mesh_role: string;
  mesh_group_id: string | null;
}

interface MeshPeer {
  id: string;
  primary_device_token_id: string;
  peer_device_token_id: string;
  role: string;
  link_quality: number;
  last_handshake_at: string | null;
  pairing_code: string | null;
  pairing_code_expires_at: string | null;
}

export function MeshNetworkCard() {
  const { selectedFarm } = useFarmContext();
  const { language } = useAuth();
  const farmId = selectedFarm?.id;
  const [devices, setDevices] = useState<DeviceToken[]>([]);
  const [peers, setPeers] = useState<MeshPeer[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCode, setActiveCode] = useState<{ code: string; expires_at: string; device_id: string } | null>(null);

  const load = async () => {
    if (!farmId) return;
    const [{ data: d }, { data: p }] = await Promise.all([
      supabase.from('device_tokens').select('id, device_name, mesh_role, mesh_group_id').eq('farm_id', farmId),
      supabase.from('device_mesh_peers').select('*').eq('farm_id', farmId),
    ]);
    setDevices((d ?? []) as DeviceToken[]);
    setPeers((p ?? []) as MeshPeer[]);
  };

  useEffect(() => { load(); }, [farmId]);

  const generatePairing = async (deviceId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('generate_mesh_pairing_code', {
        _primary_device_token_id: deviceId,
      });
      if (error) throw error;
      const result = data as { code: string; expires_at: string };
      setActiveCode({ code: result.code, expires_at: result.expires_at, device_id: deviceId });
      toast.success(language === 'bn' ? 'কোড তৈরি হয়েছে' : 'Code generated');
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
    setLoading(false);
  };

  const removePeer = async (peerId: string) => {
    const { error } = await supabase.from('device_mesh_peers').delete().eq('id', peerId);
    if (error) return toast.error(error.message);
    toast.success(language === 'bn' ? 'মুছে ফেলা হয়েছে' : 'Removed');
    load();
  };

  const realPeers = peers.filter(p => p.primary_device_token_id !== p.peer_device_token_id);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Network className="w-4 h-4 text-primary" />
          {language === 'bn' ? 'মেশ নেটওয়ার্ক (একাধিক কন্ট্রোলার)' : 'Mesh Network'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          {language === 'bn'
            ? 'একাধিক ESP32 কন্ট্রোলার জুড়ে দিন — একটি master হবে cloud-এর সাথে, বাকিরা ESP-NOW দিয়ে slave হিসাবে চলবে।'
            : 'Pair multiple ESP32 controllers. One master syncs to cloud; others run as slaves over ESP-NOW.'}
        </p>

        {/* Devices list */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground">
            {language === 'bn' ? 'এই খামারের কন্ট্রোলার' : 'Controllers in this farm'}
          </div>
          {devices.length === 0 && (
            <div className="text-xs text-muted-foreground italic">
              {language === 'bn' ? 'কোনো ডিভাইস নেই' : 'No devices'}
            </div>
          )}
          {devices.map(d => (
            <div key={d.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <div className="text-sm font-medium">{d.device_name || 'ESP32'}</div>
                <Badge variant="outline" className="mt-1 text-[10px]">
                  {d.mesh_role}
                </Badge>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={loading}
                onClick={() => generatePairing(d.id)}
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                {language === 'bn' ? 'কোড' : 'Pair'}
              </Button>
            </div>
          ))}
        </div>

        {/* Active pairing code */}
        {activeCode && (
          <div className="rounded-lg bg-primary/10 border border-primary/30 p-4 text-center">
            <div className="text-xs text-muted-foreground mb-1">
              {language === 'bn' ? 'নতুন কন্ট্রোলারে এই কোড দিন (১ মিনিট)' : 'Enter this code on the new controller (1 min)'}
            </div>
            <div className="text-3xl font-mono font-bold tracking-[0.4em] text-primary">
              {activeCode.code}
            </div>
          </div>
        )}

        {/* Active peers */}
        {realPeers.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground">
              {language === 'bn' ? 'যুক্ত peer' : 'Connected peers'}
            </div>
            {realPeers.map(p => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-emerald-500" />
                  <div>
                    <div className="text-xs font-medium">{p.role}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {language === 'bn' ? 'লিংক:' : 'Link:'} {p.link_quality}%
                    </div>
                  </div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => removePeer(p.id)}>
                  <Trash2 className="w-3 h-3 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
