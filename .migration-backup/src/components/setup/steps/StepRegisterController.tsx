import { useState, useEffect } from 'react';
import { ChevronRight, Loader2, Wifi, Download } from 'lucide-react';
import { ESP32CodeGenerator } from '@/components/device/ESP32CodeGenerator';
import { useAuth } from '@/context/AuthContext';
import { useFarmContext } from '@/context/FarmContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export function StepRegisterController({ onComplete }: { onComplete: () => void }) {
  const { user, language } = useAuth();
  const { selectedFarmId } = useFarmContext();
  const [isRegistering, setIsRegistering] = useState(false);
  const [showFirmwareDownload, setShowFirmwareDownload] = useState(false);
  const { toast } = useToast();

  const handleRegister = async () => {
    if (!user || !selectedFarmId) return;
    setIsRegistering(true);
    try {
      const { error } = await supabase.rpc('create_legacy_device_token', {
        _farm_id: selectedFarmId,
        _device_name: 'ESP32 Controller',
      });
      if (error) throw error;
      toast({ title: language === 'bn' ? '✅ কন্ট্রোলার রেজিস্টার হয়েছে!' : '✅ Controller registered!' });
      onComplete();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: language === 'bn' ? 'ত্রুটি' : 'Error', description: message, variant: 'destructive' });
    }
    setIsRegistering(false);
  };

  // Check if already has tokens
  const [hasToken, setHasToken] = useState(false);
  useEffect(() => {
    if (!user || !selectedFarmId) return;
    supabase.from('device_tokens').select('id').eq('user_id', user.id).eq('farm_id', selectedFarmId).limit(1).then(({ data }) => {
      if (data && data.length > 0) {
        setHasToken(true);
      }
    });
  }, [user, selectedFarmId]);

  if (hasToken) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-primary/5 border border-primary/20 p-6 text-center">
          <span className="text-5xl">📱</span>
          <h3 className="mt-3 text-lg font-bold text-foreground">
            {language === 'bn' ? 'কন্ট্রোলার সংযুক্ত!' : 'Controller connected!'}
          </h3>
          <Wifi className="mx-auto mt-2 h-8 w-8 text-primary" />
          <div className="mt-3 rounded-xl bg-background/80 p-3">
            <p className="text-xs text-muted-foreground mb-1">
              {language === 'bn' ? 'ডিভাইস ক্রেডেনশিয়াল' : 'Device credential'}
            </p>
            <p className="text-sm font-medium text-foreground">
              {language === 'bn' ? 'সুরক্ষিতভাবে সংরক্ষিত' : 'Stored securely'}
            </p>
          </div>
        </div>

        {/* Firmware download - always visible & prominent */}
        <div className="rounded-2xl border-2 border-primary/40 bg-primary/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Download className="h-5 w-5 text-primary" />
            <span className="text-sm font-bold text-foreground">
              {language === 'bn' ? '📥 ফার্মওয়্যার ডাউনলোড করুন (আবশ্যক)' : '📥 Download Firmware (Required)'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            {language === 'bn'
              ? '⚠️ পরবর্তী ধাপে রিলে/সেন্সর পরীক্ষার জন্য ESP32-এ ফার্মওয়্যার আপলোড করা আবশ্যক'
              : '⚠️ Firmware must be uploaded to ESP32 before relay/sensor tests in next steps'}
          </p>
          <button
            onClick={() => setShowFirmwareDownload(!showFirmwareDownload)}
            className="w-full flex items-center justify-between rounded-xl bg-primary/10 p-3 hover:bg-primary/15 transition-colors"
          >
            <span className="text-sm font-medium text-primary">
              {showFirmwareDownload
                ? (language === 'bn' ? '🔽 ফার্মওয়্যার কোড লুকান' : '🔽 Hide firmware code')
                : (language === 'bn' ? '▶️ ফার্মওয়্যার কোড দেখুন ও ডাউনলোড করুন' : '▶️ View & download firmware code')
              }
            </span>
            <ChevronRight className={`h-4 w-4 text-primary transition-transform ${showFirmwareDownload ? 'rotate-90' : ''}`} />
          </button>
          {showFirmwareDownload && (
            <div className="mt-3 border-t border-primary/20 pt-3">
              <ESP32CodeGenerator language={language} />
            </div>
          )}
        </div>

        {/* Flashing guide tip */}
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            {language === 'bn'
              ? '💡 Arduino IDE-তে আপলোড: Upload Speed ১১৫২০০, Flash Freq ৪০MHz, "Erase All Flash" চালু রাখুন। ফ্ল্যাশিংয়ের সময় শুধু USB কেবল ব্যবহার করুন।'
              : '💡 Arduino IDE upload: Speed 115200, Flash Freq 40MHz, "Erase All Flash" enabled. Use USB cable only during flashing.'}
          </p>
        </div>

        <Button onClick={onComplete} className="w-full h-12 text-base rounded-xl">
          {language === 'bn' ? 'ফার্মওয়্যার আপলোড হয়ে গেছে → পরবর্তী ধাপ' : 'Firmware uploaded → Next Step'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-muted/50 border border-border p-6 text-center">
        <span className="text-5xl">🔑</span>
        <h3 className="mt-3 text-lg font-bold text-foreground">
          {language === 'bn' ? 'সুরক্ষিত ডিভাইস রেজিস্ট্রেশন' : 'Secure Device Registration'}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {language === 'bn'
            ? 'রেজিস্টার করলে সার্ভার আপনার ESP32 কন্ট্রোলারের টোকেন তৈরি করবে'
            : 'The server will generate your ESP32 controller token when you register'}
        </p>
      </div>

      <div className="rounded-2xl bg-primary/5 border border-primary/20 p-4 text-center">
        <p className="text-sm font-medium text-foreground">
          {language === 'bn' ? 'টোকেন browser-এ আগে থেকে তৈরি বা সংরক্ষণ করা হবে না' : 'The token will not be pre-generated or stored in the browser'}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {language === 'bn'
            ? 'রেজিস্ট্রেশনের পরে অনুমোদিত firmware download-এ এটি অটো-এম্বেড হবে'
            : 'After registration it will be embedded through the authorized firmware download'}
        </p>
      </div>

      <Button onClick={handleRegister} disabled={isRegistering} className="w-full h-12 text-base rounded-xl">
        {isRegistering ? <Loader2 className="h-5 w-5 animate-spin" /> : (language === 'bn' ? '📱 কন্ট্রোলার রেজিস্টার করুন →' : '📱 Register Controller →')}
      </Button>
    </div>
  );
}
