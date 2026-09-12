/**
 * WorkerModeCard — Settings panel for the farm owner to set/clear the
 * 4-digit Worker Mode PIN and link to /worker (S2.1).
 *
 * Visible only to the farm owner.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, ExternalLink, Trash2, Save } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useFarmContext } from '@/context/FarmContext';
import {
  useFarmHasWorkerPin,
  useSetWorkerPin,
} from '@/hooks/useWorkerPin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export function WorkerModeCard() {
  const { user, language } = useAuth();
  const { selectedFarmId, currentFarm } = useFarmContext();
  const { data: hasPin } = useFarmHasWorkerPin(selectedFarmId);
  const setPin = useSetWorkerPin();

  const isOwner = !!(user && currentFarm && currentFarm.owner_id === user.id);

  const [pin, setPin1] = useState('');
  const [pin2, setPin2] = useState('');

  const t = {
    title:    { bn: 'কর্মী মোড (PIN)', en: 'Worker Mode (PIN)' },
    desc:     { bn: 'কর্মীর জন্য সরল কিয়স্ক পেজ /worker খুলবে। ৪-সংখ্যার PIN দিয়ে আনলক হয়।',
                en: 'Opens the simplified kiosk page /worker for workers. Unlocked by a 4-digit PIN.' },
    enabled:  { bn: 'সক্রিয়', en: 'Enabled' },
    disabled: { bn: 'নিষ্ক্রিয়', en: 'Disabled' },
    set:      { bn: 'নতুন PIN', en: 'New PIN' },
    confirm:  { bn: 'পুনরায় লিখুন', en: 'Confirm PIN' },
    save:     { bn: 'PIN সেভ করুন', en: 'Save PIN' },
    open:     { bn: 'কর্মী মোড খুলুন', en: 'Open Worker Mode' },
    clear:    { bn: 'PIN মুছে ফেলুন', en: 'Clear PIN' },
    onlyOwner:{ bn: 'শুধু খামারের মালিক PIN পরিবর্তন করতে পারেন।',
                en: 'Only the farm owner can change the PIN.' },
    mismatch: { bn: 'দুটি PIN মিলেনি', en: 'PINs do not match' },
    invalid:  { bn: '৪ সংখ্যার PIN দিন', en: 'Enter a 4-digit PIN' },
    saved:    { bn: 'PIN সেভ হয়েছে', en: 'PIN saved' },
    cleared:  { bn: 'PIN মুছে ফেলা হয়েছে', en: 'PIN cleared' },
  };

  if (!selectedFarmId) return null;

  const handleSave = async () => {
    if (!/^\d{4}$/.test(pin)) {
      toast.error(t.invalid[language]);
      return;
    }
    if (pin !== pin2) {
      toast.error(t.mismatch[language]);
      return;
    }
    try {
      await setPin.mutateAsync({ farmId: selectedFarmId, pin });
      toast.success(t.saved[language]);
      setPin1(''); setPin2('');
    } catch (e: any) {
      toast.error(e?.message ?? 'Error');
    }
  };

  const handleClear = async () => {
    try {
      await setPin.mutateAsync({ farmId: selectedFarmId, pin: '' });
      toast.success(t.cleared[language]);
    } catch (e: any) {
      toast.error(e?.message ?? 'Error');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Lock size={18} />
            </div>
            <div>
              <CardTitle className="text-base">{t.title[language]}</CardTitle>
              <CardDescription className="text-xs">{t.desc[language]}</CardDescription>
            </div>
          </div>
          <Badge variant={hasPin ? 'default' : 'secondary'}>
            {hasPin ? t.enabled[language] : t.disabled[language]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasPin && (
          <Button asChild variant="outline" className="w-full">
            <Link to="/worker">
              <ExternalLink size={14} className="mr-1.5" />
              {t.open[language]}
            </Link>
          </Button>
        )}

        {isOwner ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="worker-pin" className="text-xs">{t.set[language]}</Label>
                <Input
                  id="worker-pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={pin}
                  onChange={e => setPin1(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <Label htmlFor="worker-pin2" className="text-xs">{t.confirm[language]}</Label>
                <Input
                  id="worker-pin2"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={pin2}
                  onChange={e => setPin2(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  autoComplete="new-password"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={setPin.isPending || pin.length !== 4}
                className="flex-1"
              >
                <Save size={14} className="mr-1.5" />
                {t.save[language]}
              </Button>
              {hasPin && (
                <Button
                  variant="outline"
                  onClick={handleClear}
                  disabled={setPin.isPending}
                >
                  <Trash2 size={14} className="mr-1.5 text-destructive" />
                  {t.clear[language]}
                </Button>
              )}
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">{t.onlyOwner[language]}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default WorkerModeCard;
