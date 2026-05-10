import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFarm } from '@/context/FarmContext';
import { Shield, KeyRound, Copy, Check, AlertTriangle, RefreshCw, QrCode } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  deviceTokenId?: string;
  deviceName?: string;
  secretVersion?: number;
}

interface ClaimResult {
  device_token: string;
  device_secret: string;
  secret_version: number;
}

interface RotateResult {
  device_secret: string;
  secret_version: number;
  grace_until: string;
}

export function DeviceSecuritySheet({ open, onOpenChange, deviceTokenId, deviceName, secretVersion }: Props) {
  const { toast } = useToast();
  const { activeFarm } = useFarm();
  const [loading, setLoading] = useState(false);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingExpires, setPairingExpires] = useState<string | null>(null);
  const [rotateResult, setRotateResult] = useState<RotateResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const generatePairingCode = async () => {
    if (!activeFarm?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('provision-device/create', {
        body: { farm_id: activeFarm.id, device_name: deviceName || 'ESP32 Controller' },
      });
      if (error) throw error;
      setPairingCode((data as any).code);
      setPairingExpires((data as any).expires_at);
      toast({ title: 'কোড তৈরি হয়েছে', description: '১০ মিনিটে expire হবে' });
    } catch (e) {
      toast({ title: 'ব্যর্থ', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const rotateSecret = async () => {
    if (!deviceTokenId) return;
    if (!confirm('পুরাতন secret ২৪ ঘণ্টা কাজ করবে, এরপর শুধু নতুন secret। নিশ্চিত?')) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('rotate-device-secret', {
        body: { device_token_id: deviceTokenId },
      });
      if (error) throw error;
      setRotateResult(data as RotateResult);
      toast({ title: 'Secret rotated', description: 'নতুন secret ESP32-এ flash করুন' });
    } catch (e) {
      toast({ title: 'ব্যর্থ', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            ডিভাইস সিকিউরিটি
          </SheetTitle>
          <SheetDescription>
            HMAC স্বাক্ষর দিয়ে অননুমোদিত access আটকান
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status */}
          {deviceTokenId && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{deviceName || 'Device'}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Secret Version: <span className="font-mono">{secretVersion ?? 0}</span>
                    </p>
                  </div>
                  {(secretVersion ?? 0) >= 1 ? (
                    <Badge className="bg-primary"><Shield className="h-3 w-3 mr-1" />সুরক্ষিত</Badge>
                  ) : (
                    <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Legacy</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* New device pairing */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <QrCode className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">নতুন ESP32 যোগ করুন</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                One-time pairing code তৈরি করে ESP32-এ enter করুন। ১০ মিনিটে expire।
              </p>
              {!pairingCode ? (
                <Button onClick={generatePairingCode} disabled={loading} className="w-full">
                  Pairing Code তৈরি করুন
                </Button>
              ) : (
                <Alert className="border-primary/40 bg-primary/5">
                  <AlertDescription className="space-y-2">
                    <div className="flex items-center justify-between">
                      <code className="text-lg font-bold tracking-wider">{pairingCode}</code>
                      <Button size="sm" variant="ghost" onClick={() => copy(pairingCode, 'code')}>
                        {copied === 'code' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Expires: {pairingExpires && new Date(pairingExpires).toLocaleTimeString('bn-BD')}
                    </p>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Rotate */}
          {deviceTokenId && (
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-amber-500" />
                  <h3 className="font-semibold">Secret Rotate করুন</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Secret leak হলে সাথে সাথে rotate করুন। পুরাতন secret ২৪ ঘণ্টা কাজ করবে।
                </p>
                {!rotateResult ? (
                  <Button onClick={rotateSecret} disabled={loading} variant="outline" className="w-full">
                    <KeyRound className="h-4 w-4 mr-2" />
                    Rotate Secret
                  </Button>
                ) : (
                  <Alert className="border-amber-500/40 bg-amber-500/5">
                    <AlertDescription className="space-y-2">
                      <p className="font-semibold text-sm">নতুন Secret (একবারই দেখানো হবে):</p>
                      <div className="flex items-start gap-2">
                        <code className="text-xs break-all flex-1 bg-background p-2 rounded">
                          {rotateResult.device_secret}
                        </code>
                        <Button size="sm" variant="ghost" onClick={() => copy(rotateResult.device_secret, 'sec')}>
                          {copied === 'sec' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Version: {rotateResult.secret_version} • Grace until:{' '}
                        {new Date(rotateResult.grace_until).toLocaleString('bn-BD')}
                      </p>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Secret কখনো শেয়ার করবেন না। Server-এ শুধু একবার দেখানো হয় — হারালে rotate করুন।
            </AlertDescription>
          </Alert>
        </div>
      </SheetContent>
    </Sheet>
  );
}
