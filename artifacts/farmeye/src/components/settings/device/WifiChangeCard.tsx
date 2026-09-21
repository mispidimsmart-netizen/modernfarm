import { useState } from 'react';
import { Wifi, Loader2, CheckCircle2, AlertTriangle, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useFarmContext } from '@/context/FarmContext';
import { usePermissions } from '@/hooks/usePermissions';

interface Props {
  language?: 'bn' | 'en';
}

/**
 * Sends a new WiFi SSID/password to the controller as a device command.
 * The board applies it while still online and reverts to the previous network
 * automatically if the new one does not connect. Password is never read back.
 */
export function WifiChangeCard({ language = 'bn' }: Props) {
  const bn = language === 'bn';
  const { currentFarm } = useFarmContext();
  const { canChangeHardware } = usePermissions();
  const [open, setOpen] = useState(false);
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [sending, setSending] = useState(false);
  const [queued, setQueued] = useState(false);

  if (!canChangeHardware) return null;

  const submit = async () => {
    const cleanSsid = ssid.trim();
    if (!currentFarm?.id) {
      toast.error(bn ? 'আগে একটি ফার্ম নির্বাচন করুন' : 'Select a farm first');
      return;
    }
    if (!cleanSsid) {
      toast.error(bn ? 'ওয়াইফাই নাম লিখুন' : 'Enter the WiFi name');
      return;
    }
    if (password && password.length < 8) {
      toast.error(bn ? 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে' : 'Password must be at least 8 characters');
      return;
    }
    setSending(true);
    setQueued(false);
    try {
      const { error } = await supabase.rpc('queue_device_wifi_change', {
        _farm_id: currentFarm.id,
        _ssid: cleanSsid,
        _password: password,
      });
      if (error) throw error;
      setQueued(true);
      setPassword('');
      toast.success(
        bn
          ? 'নতুন ওয়াইফাই পাঠানো হয়েছে — কন্ট্রোলার অনলাইনে থাকলে ১ মিনিটের মধ্যে যুক্ত হবে'
          : 'New WiFi sent — the controller will switch within a minute',
      );
    } catch (e: any) {
      toast.error(
        (bn ? 'পাঠানো যায়নি: ' : 'Could not send: ') + (e?.message ?? 'unknown error'),
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="overflow-hidden border-primary/30">
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Wifi className="h-5 w-5" />
              </div>
              <span className="font-semibold">{bn ? 'ওয়াইফাই পরিবর্তন' : 'Change WiFi'}</span>
            </div>
            <motion.div animate={{ rotate: open ? 180 : 0 }}>
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            </motion.div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t p-4 space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {bn
                ? 'ওয়াইফাই নাম বা পাসওয়ার্ড বদলালে নতুন ফার্মওয়্যার আপলোড করতে হবে না। কন্ট্রোলার অনলাইনে থাকা অবস্থায় নিচের তথ্য পাঠান। নতুন ওয়াইফাইতে যুক্ত হতে না পারলে কন্ট্রোলার নিজেই আগের ওয়াইফাইতে ফিরে যাবে।'
                : 'No re-flash needed. Send the new credentials while the controller is online; it reverts to the previous network automatically if the new one fails.'}
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="wifi-ssid">{bn ? 'ওয়াইফাই নাম (SSID)' : 'WiFi name (SSID)'}</Label>
              <Input
                id="wifi-ssid"
                value={ssid}
                maxLength={32}
                onChange={(e) => setSsid(e.target.value)}
                placeholder={bn ? 'যেমন: FarmEye-Shed1' : 'e.g. FarmEye-Shed1'}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="wifi-pass">{bn ? 'পাসওয়ার্ড' : 'Password'}</Label>
              <Input
                id="wifi-pass"
                type="password"
                value={password}
                maxLength={63}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={bn ? 'খোলা নেটওয়ার্ক হলে ফাঁকা রাখুন' : 'Leave empty for an open network'}
              />
            </div>

            <Button className="w-full" onClick={submit} disabled={sending}>
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {bn ? 'পাঠানো হচ্ছে...' : 'Sending...'}
                </>
              ) : (
                <>
                  <Wifi className="h-4 w-4 mr-2" />
                  {bn ? 'কন্ট্রোলারে পাঠান' : 'Send to controller'}
                </>
              )}
            </Button>

            {queued && (
              <div className="flex items-start gap-2 rounded-md bg-primary/10 p-2.5 text-xs text-primary">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  {bn
                    ? 'পাঠানো হয়েছে। কন্ট্রোলার তথ্য নিয়ে রিস্টার্ট হবে — অ্যাপে ১-২ মিনিট অফলাইন দেখাতে পারে।'
                    : 'Sent. The controller will reconnect — it may show offline for a minute or two.'}
                </span>
              </div>
            )}

            <div className="flex items-start gap-2 rounded-md bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                {bn
                  ? 'কন্ট্রোলার অফলাইন থাকলে এই তথ্য পৌঁছাবে না। তখন কন্ট্রোলারের নিজের সেটআপ ওয়াইফাই (FarmEye-Setup-XXXX, পাসওয়ার্ড farmeye2026) ব্যবহার করুন — মোবাইল থেকে যুক্ত হয়ে 192.168.4.1 এ গিয়ে নতুন ওয়াইফাই সেভ করুন।'
                  : 'If the controller is offline, use its own setup hotspot (FarmEye-Setup-XXXX, password farmeye2026) and open 192.168.4.1 from your phone.'}
              </span>
            </div>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default WifiChangeCard;
