import { motion } from 'framer-motion';
import { Lightbulb, LightbulbOff, Sunrise, Sunset, Hand, Clock, Moon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { useLightingCurve } from '@/hooks/useLightingCurve';
import { useRealtimeDeviceStatus } from '@/hooks/useRealtimeSensorData';
import { cn } from '@/lib/utils';

/**
 * Compact "Light Status" panel.
 * Single source of truth: combines lighting_schedule + device_status.light_on
 * to clearly explain WHY the light is currently ON or OFF.
 *
 * Reasons it can show:
 *   1. Manual override active        → ম্যানুয়াল মোড
 *   2. Schedule active (fade-in)     → সকালের ফেড ইন
 *   3. Schedule active (full ON)     → সিডিউল অনুযায়ী চালু
 *   4. Schedule active (fade-out)    → সন্ধ্যার ফেড আউট
 *   5. Outside scheduled hours       → সময়সূচীর বাইরে
 */
export function LightStatusPanel() {
  const { language } = useAuth();
  const { currentState, settings, isLoading } = useLightingCurve();
  const { status: deviceStatus, manualOverride, isDeviceOnline } = useRealtimeDeviceStatus();

  if (isLoading || !currentState || !settings) {
    return (
      <Card className="border bg-muted/30">
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-muted animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-24 bg-muted rounded animate-pulse" />
              <div className="h-2.5 w-40 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const relayOn = isDeviceOnline ? (deviceStatus?.light ?? false) : false;
  const isManual = manualOverride === true;

  // ESP32 offline → show neutral offline card; do not pretend the schedule is acting
  if (!isDeviceOnline) {
    return (
      <Card className="border-2 border-slate-500/40 bg-gradient-to-br from-slate-500/10 to-slate-600/5">
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-600 text-white shadow-sm">
              <LightbulbOff className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-bold leading-tight truncate">
                  {language === 'bn' ? '📡 ESP32 অফলাইন' : '📡 ESP32 offline'}
                </p>
                <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-bold bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-500/30">
                  {language === 'bn' ? 'অফলাইন' : 'OFFLINE'}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                {language === 'bn'
                  ? 'লাইটের আসল অবস্থা যাচাই করা যাচ্ছে না — ডিভাইস কানেক্ট করুন'
                  : 'Cannot verify actual light state — please reconnect device'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ───── Determine the dominant reason ─────
  type Reason = 'manual' | 'fade-in' | 'on' | 'fade-out' | 'off-schedule';
  let reason: Reason;
  if (isManual) reason = 'manual';
  else if (currentState.phase === 'fade-in') reason = 'fade-in';
  else if (currentState.phase === 'on') reason = 'on';
  else if (currentState.phase === 'fade-out') reason = 'fade-out';
  else reason = 'off-schedule';

  // ───── Style mapping ─────
  const STYLES: Record<Reason, {
    border: string;
    bg: string;
    iconBg: string;
    iconColor: string;
    dotColor: string;
    badgeClass: string;
    Icon: typeof Lightbulb;
    title: { bn: string; en: string };
    reasonLabel: { bn: string; en: string };
    badge: { bn: string; en: string };
  }> = {
    manual: {
      border: 'border-amber-500/40',
      bg: 'bg-gradient-to-br from-amber-500/10 to-amber-600/5',
      iconBg: 'bg-amber-500',
      iconColor: 'text-white',
      dotColor: 'bg-amber-500',
      badgeClass: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30',
      Icon: Hand,
      title: { bn: '✋ ম্যানুয়াল মোডে', en: '✋ Manual override' },
      reasonLabel: {
        bn: 'আপনি সরাসরি নিয়ন্ত্রণ করছেন — সিডিউল উপেক্ষিত',
        en: 'You are in direct control — schedule ignored',
      },
      badge: { bn: 'ম্যানুয়াল', en: 'MANUAL' },
    },
    'fade-in': {
      border: 'border-orange-500/40',
      bg: 'bg-gradient-to-br from-orange-500/10 to-yellow-500/5',
      iconBg: 'bg-orange-500',
      iconColor: 'text-white',
      dotColor: 'bg-orange-500',
      badgeClass: 'bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30',
      Icon: Sunrise,
      title: { bn: '🌅 সকালের ফেড ইন', en: '🌅 Morning fade-in' },
      reasonLabel: {
        bn: 'ধীরে ধীরে আলো বাড়ছে — মুরগির স্ট্রেস কমাতে',
        en: 'Light gradually increasing — to reduce bird stress',
      },
      badge: { bn: 'চালু হচ্ছে', en: 'FADE IN' },
    },
    on: {
      border: 'border-emerald-500/40',
      bg: 'bg-gradient-to-br from-emerald-500/10 to-emerald-600/5',
      iconBg: 'bg-emerald-500',
      iconColor: 'text-white',
      dotColor: 'bg-emerald-500',
      badgeClass: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
      Icon: Lightbulb,
      title: { bn: '☀️ সিডিউল অনুযায়ী চালু', en: '☀️ ON by schedule' },
      reasonLabel: {
        bn: 'নির্ধারিত সময়সূচীর মধ্যে — পূর্ণ উজ্জ্বলতা',
        en: 'Within scheduled hours — full brightness',
      },
      badge: { bn: 'চালু', en: 'ON' },
    },
    'fade-out': {
      border: 'border-purple-500/40',
      bg: 'bg-gradient-to-br from-purple-500/10 to-purple-600/5',
      iconBg: 'bg-purple-500',
      iconColor: 'text-white',
      dotColor: 'bg-purple-500',
      badgeClass: 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30',
      Icon: Sunset,
      title: { bn: '🌙 সন্ধ্যার ফেড আউট', en: '🌙 Evening fade-out' },
      reasonLabel: {
        bn: 'ধীরে ধীরে আলো কমছে — মুরগি ঘুমানোর প্রস্তুতিতে',
        en: 'Light gradually decreasing — birds preparing to rest',
      },
      badge: { bn: 'বন্ধ হচ্ছে', en: 'FADE OUT' },
    },
    'off-schedule': {
      border: 'border-slate-500/30',
      bg: 'bg-gradient-to-br from-slate-500/10 to-slate-600/5',
      iconBg: 'bg-slate-600',
      iconColor: 'text-white',
      dotColor: 'bg-slate-500',
      badgeClass: 'bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-500/30',
      Icon: Moon,
      title: { bn: '🌑 সময়সূচীর বাইরে', en: '🌑 Outside schedule' },
      reasonLabel: {
        bn: 'এখন বিশ্রামের সময় — সিডিউল অনুযায়ী বন্ধ',
        en: 'Rest period — OFF by schedule',
      },
      badge: { bn: 'বন্ধ', en: 'OFF' },
    },
  };

  const style = STYLES[reason];
  const Icon = style.Icon;

  // ───── Mismatch detection ─────
  // If schedule says ON but relay says OFF (or vice versa) outside manual mode → show warning.
  const expectedOn = currentState.isActive;
  const hasMismatch = !isManual && expectedOn !== relayOn;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card className={cn('border-2 overflow-hidden', style.border, style.bg)}>
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            {/* Icon with live dot */}
            <div className="relative shrink-0">
              <div className={cn(
                'flex h-11 w-11 items-center justify-center rounded-xl shadow-sm',
                style.iconBg, style.iconColor
              )}>
                <Icon className="h-5 w-5" />
              </div>
              {relayOn && (
                <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                  <span className={cn(
                    'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                    style.dotColor
                  )} />
                  <span className={cn(
                    'relative inline-flex rounded-full h-3 w-3 ring-2 ring-background',
                    style.dotColor
                  )} />
                </span>
              )}
            </div>

            {/* Title + reason */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-bold leading-tight truncate">
                  {style.title[language]}
                </p>
                <Badge variant="outline" className={cn('text-[10px] h-5 px-1.5 font-bold', style.badgeClass)}>
                  {style.badge[language]}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                {style.reasonLabel[language]}
              </p>
            </div>

            {/* Brightness % */}
            <div className="shrink-0 text-right">
              <p className="text-2xl font-extrabold leading-none tabular-nums">
                {currentState.brightness}
                <span className="text-xs font-medium text-muted-foreground">%</span>
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {language === 'bn' ? 'উজ্জ্বলতা' : 'Brightness'}
              </p>
            </div>
          </div>

          {/* Schedule footer strip */}
          <div className="mt-2.5 pt-2.5 border-t border-border/50 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span className="tabular-nums">
                {settings.startTime} – {settings.endTime}
              </span>
              <span className="text-muted-foreground/60">·</span>
              <span>
                {language === 'bn' ? 'সিডিউল' : 'Schedule'}
              </span>
            </div>

            {currentState.minutesRemaining > 0 && reason !== 'manual' && (
              <span className={cn('font-semibold tabular-nums', style.dotColor.replace('bg-', 'text-'))}>
                {language === 'bn'
                  ? `${currentState.minutesRemaining} মিনিট বাকি`
                  : `${currentState.minutesRemaining} min left`}
              </span>
            )}
          </div>

          {/* Mismatch warning */}
          {hasMismatch && (
            <div className="mt-2 rounded-lg bg-destructive/10 border border-destructive/30 px-2.5 py-1.5 flex items-center gap-2">
              {relayOn ? (
                <Lightbulb className="h-3.5 w-3.5 text-destructive shrink-0" />
              ) : (
                <LightbulbOff className="h-3.5 w-3.5 text-destructive shrink-0" />
              )}
              <p className="text-[11px] font-medium text-destructive leading-tight">
                {language === 'bn'
                  ? `⚠️ অমিল: রিলে এখন ${relayOn ? 'চালু' : 'বন্ধ'}, সিডিউল চাইছে ${expectedOn ? 'চালু' : 'বন্ধ'}`
                  : `⚠️ Mismatch: relay is ${relayOn ? 'ON' : 'OFF'}, schedule expects ${expectedOn ? 'ON' : 'OFF'}`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
