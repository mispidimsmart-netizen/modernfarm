import { useState, useEffect } from 'react';
import { Vibrate, VolumeX, Volume2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { triggerHaptic } from '@/hooks/useHapticFeedback';

const HAPTIC_STORAGE_KEY = 'farmeye-haptic-enabled';

export function HapticSettingsCard() {
  const { language } = useAuth();
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  // Load saved preference
  useEffect(() => {
    const saved = localStorage.getItem(HAPTIC_STORAGE_KEY);
    if (saved !== null) {
      setHapticEnabled(saved === 'true');
    }
  }, []);

  const handleToggle = (enabled: boolean) => {
    setHapticEnabled(enabled);
    localStorage.setItem(HAPTIC_STORAGE_KEY, String(enabled));
    
    // Demo the haptic feedback when enabling
    if (enabled) {
      triggerHaptic('success');
    }
  };

  const t = {
    title: { bn: 'হ্যাপটিক ফিডব্যাক', en: 'Haptic Feedback' },
    description: { bn: 'বাটন প্রেসে কম্পন', en: 'Vibration on button press' },
    notSupported: { bn: 'এই ডিভাইসে সমর্থিত নয়', en: 'Not supported on this device' },
    enabled: { bn: 'চালু', en: 'Enabled' },
    disabled: { bn: 'বন্ধ', en: 'Disabled' },
  };

  if (!isSupported) {
    return (
      <Card className="border-dashed opacity-60">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
              <VolumeX className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-muted-foreground">{t.title[language]}</p>
              <p className="text-xs text-muted-foreground">{t.notSupported[language]}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              hapticEnabled ? 'bg-primary/10' : 'bg-muted'
            }`}>
              <Vibrate className={`h-5 w-5 ${hapticEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <p className="font-medium">{t.title[language]}</p>
              <p className="text-xs text-muted-foreground">
                {hapticEnabled ? t.enabled[language] : t.disabled[language]} • {t.description[language]}
              </p>
            </div>
          </div>
          <Switch
            checked={hapticEnabled}
            onCheckedChange={handleToggle}
            haptic={false} // Don't trigger haptic on this toggle itself
          />
        </div>
      </CardContent>
    </Card>
  );
}

// Export function to check if haptic is enabled
export function isHapticEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const saved = localStorage.getItem(HAPTIC_STORAGE_KEY);
  return saved !== 'false'; // Default to true
}
