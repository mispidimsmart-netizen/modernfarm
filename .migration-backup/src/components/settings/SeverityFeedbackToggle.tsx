/**
 * SeverityFeedbackToggle — user opt-out for haptics + beep on alerts (S3.2)
 */
import { useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  isSeverityFeedbackMuted,
  setSeverityFeedbackMuted,
  severityFeedback,
} from '@/lib/severityFeedback';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

export function SeverityFeedbackToggle() {
  const { language } = useAuth();
  const [muted, setMuted] = useState(false);

  useEffect(() => { setMuted(isSeverityFeedbackMuted()); }, []);

  const handleToggle = (enabled: boolean) => {
    const newMuted = !enabled;
    setSeverityFeedbackMuted(newMuted);
    setMuted(newMuted);
  };

  const t = {
    title: { bn: 'অ্যালার্ট কম্পন ও শব্দ', en: 'Alert vibration & sound' },
    desc:  { bn: 'বিপদ/সতর্কতা এলে ফোন কাঁপবে ও ছোট bip বাজাবে',
             en: 'Vibrate + short beep on danger/warning alerts' },
    test:  { bn: 'টেস্ট', en: 'Test' },
  };

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 py-4">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{t.title[language]}</p>
            <p className="text-xs text-muted-foreground">{t.desc[language]}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => severityFeedback('danger', { force: true, dedupeKey: 'test-' + Date.now() })}
          >
            {t.test[language]}
          </Button>
          <Switch checked={!muted} onCheckedChange={handleToggle} />
        </div>
      </CardContent>
    </Card>
  );
}

export default SeverityFeedbackToggle;
