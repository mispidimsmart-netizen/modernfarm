import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Volume2, VolumeX, Bell, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

const translations = {
  en: {
    title: 'Notification Sounds',
    subtitle: 'Farm-themed alert tones',
    enableSounds: 'Enable In-App Sounds',
    testDanger: 'Emergency Alert',
    testWarning: 'Warning Alert',
    testInfo: 'Info Notification',
    testSuccess: 'Success Sound',
    volume: 'Volume',
    soundsEnabled: 'Sounds enabled',
    soundsDisabled: 'Sounds disabled',
    tapToUnlock: 'Tap any button to unlock audio on mobile',
    dangerDesc: 'Urgent - temperature/ammonia critical',
    warningDesc: 'Moderate - threshold exceeded',
    infoDesc: 'General notifications',
    successDesc: 'Positive confirmations',
  },
  bn: {
    title: 'নোটিফিকেশন সাউন্ড',
    subtitle: 'ফার্ম থিমড অ্যালার্ট টোন',
    enableSounds: 'ইন-অ্যাপ সাউন্ড চালু',
    testDanger: 'জরুরি অ্যালার্ট',
    testWarning: 'সতর্কতা অ্যালার্ট',
    testInfo: 'তথ্য নোটিফিকেশন',
    testSuccess: 'সাফল্য সাউন্ড',
    volume: 'ভলিউম',
    soundsEnabled: 'সাউন্ড চালু হয়েছে',
    soundsDisabled: 'সাউন্ড বন্ধ হয়েছে',
    tapToUnlock: 'মোবাইলে অডিও আনলক করতে যেকোনো বাটনে ট্যাপ করুন',
    dangerDesc: 'জরুরি - তাপমাত্রা/অ্যামোনিয়া সংকটজনক',
    warningDesc: 'মাঝারি - সীমা অতিক্রম',
    infoDesc: 'সাধারণ নোটিফিকেশন',
    successDesc: 'সফলতার নিশ্চিতকরণ',
  },
};

const SOUND_ENABLED_KEY = 'farm_notification_sounds_enabled';

export function NotificationSoundCard() {
  const { language } = useAuth();
  const t = translations[language];
  const { playSound, initAudioContext } = useNotificationSound();
  const [soundsEnabled, setSoundsEnabled] = useState(() => {
    const saved = localStorage.getItem(SOUND_ENABLED_KEY);
    return saved !== 'false'; // Default to true
  });
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  useEffect(() => {
    localStorage.setItem(SOUND_ENABLED_KEY, String(soundsEnabled));
  }, [soundsEnabled]);

  const handleTestSound = async (type: 'danger' | 'warning' | 'info' | 'success') => {
    try {
      initAudioContext(); // Unlock audio on user interaction
      setAudioUnlocked(true);
      await playSound(type);
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

  const handleToggle = (enabled: boolean) => {
    setSoundsEnabled(enabled);
    toast.success(enabled ? t.soundsEnabled : t.soundsDisabled, {
      icon: enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-5 w-5 text-primary" />
          {t.title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t.subtitle}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor="sounds-enabled" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            {t.enableSounds}
          </Label>
          <Switch
            id="sounds-enabled"
            checked={soundsEnabled}
            onCheckedChange={handleToggle}
          />
        </div>

        {/* Mobile hint */}
        {!audioUnlocked && (
          <p className="text-xs text-muted-foreground italic">
            📱 {t.tapToUnlock}
          </p>
        )}

        {/* Test Sound Buttons */}
        <div className="grid grid-cols-2 gap-3">
          {/* Danger Sound */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleTestSound('danger')}
            className="flex flex-col items-center gap-1 h-auto py-3 border-red-200 hover:bg-red-50 hover:border-red-300"
            disabled={!soundsEnabled}
          >
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span className="text-xs font-medium">{t.testDanger}</span>
            <span className="text-[10px] text-muted-foreground">{t.dangerDesc}</span>
          </Button>

          {/* Warning Sound */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleTestSound('warning')}
            className="flex flex-col items-center gap-1 h-auto py-3 border-amber-200 hover:bg-amber-50 hover:border-amber-300"
            disabled={!soundsEnabled}
          >
            <Bell className="h-5 w-5 text-amber-500" />
            <span className="text-xs font-medium">{t.testWarning}</span>
            <span className="text-[10px] text-muted-foreground">{t.warningDesc}</span>
          </Button>

          {/* Info Sound */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleTestSound('info')}
            className="flex flex-col items-center gap-1 h-auto py-3 border-blue-200 hover:bg-blue-50 hover:border-blue-300"
            disabled={!soundsEnabled}
          >
            <Info className="h-5 w-5 text-blue-500" />
            <span className="text-xs font-medium">{t.testInfo}</span>
            <span className="text-[10px] text-muted-foreground">{t.infoDesc}</span>
          </Button>

          {/* Success Sound */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleTestSound('success')}
            className="flex flex-col items-center gap-1 h-auto py-3 border-green-200 hover:bg-green-50 hover:border-green-300"
            disabled={!soundsEnabled}
          >
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="text-xs font-medium">{t.testSuccess}</span>
            <span className="text-[10px] text-muted-foreground">{t.successDesc}</span>
          </Button>
        </div>

        {/* Info about push notifications */}
        <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
          <p className="flex items-start gap-2">
            <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>
              {language === 'bn' 
                ? 'পুশ নোটিফিকেশন সাউন্ড আপনার ডিভাইসের সেটিংস অনুযায়ী হবে। ইন-অ্যাপ সাউন্ড শুধুমাত্র অ্যাপ খোলা থাকলে বাজবে।'
                : 'Push notification sounds follow your device settings. In-app sounds only play when the app is open.'}
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Export helper to check if sounds are enabled
export function areSoundsEnabled(): boolean {
  const saved = localStorage.getItem(SOUND_ENABLED_KEY);
  return saved !== 'false';
}
