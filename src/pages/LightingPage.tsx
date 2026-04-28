import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon, Clock, Lightbulb, RefreshCcw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLightingSchedule, useUpdateLightingSchedule } from '@/hooks/useFarmData';
import { useLightingCurve } from '@/hooks/useLightingCurve';
import { translations } from '@/lib/translations';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { LightingCurveCard } from '@/components/lighting/LightingCurveCard';
import { LightingCurveSettings } from '@/components/lighting/LightingCurveSettings';
import { AgeLightingSuggestionCard } from '@/components/lighting/AgeLightingSuggestionCard';
import { LDRSettingsCard } from '@/components/lighting/LDRSettingsCard';
import { LDRInstallationGuide } from '@/components/lighting/LDRInstallationGuide';

export function LightingPage() {
  const { language } = useAuth();
  const { data: schedule, isLoading } = useLightingSchedule();
  const { currentState } = useLightingCurve();
  const updateSchedule = useUpdateLightingSchedule();
  const { toast } = useToast();
  
  // Local state for time pickers
  const [startHour, setStartHour] = useState(5);
  const [endHour, setEndHour] = useState(21);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync with database when schedule loads
  useMemo(() => {
    if (schedule) {
      const start = schedule.start_time?.split(':')[0];
      const end = schedule.end_time?.split(':')[0];
      if (start) setStartHour(parseInt(start));
      if (end) setEndHour(parseInt(end));
    }
  }, [schedule]);

  const totalHours = useMemo(() => {
    if (endHour > startHour) {
      return endHour - startHour;
    }
    return 24 - startHour + endHour; // Overnight schedule
  }, [startHour, endHour]);

  const isValidSchedule = totalHours >= 14 && totalHours <= 16;

  const handleSave = async () => {
    const startTime = `${startHour.toString().padStart(2, '0')}:00`;
    const endTime = `${endHour.toString().padStart(2, '0')}:00`;
    
    updateSchedule.mutate({
      start_time: startTime,
      end_time: endTime,
      total_hours: totalHours,
    }, {
      onSuccess: () => {
        setHasChanges(false);
        toast({
          title: language === 'bn' ? 'সফল!' : 'Success!',
          description: language === 'bn' 
            ? 'লাইটিং সময়সূচী আপডেট হয়েছে' 
            : 'Lighting schedule updated',
        });
      },
    });
  };

  const handleManualOverride = (override: boolean) => {
    updateSchedule.mutate({ manual_override: override });
  };

  const formatTime = (hour: number) => {
    const period = hour >= 12 ? (language === 'bn' ? 'PM' : 'PM') : (language === 'bn' ? 'AM' : 'AM');
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:00 ${period}`;
  };

  // Calculate sun position for visualization
  const currentHour = new Date().getHours();
  const isLightOn = schedule?.manual_override 
    ? true 
    : currentState?.isActive ?? (currentHour >= startHour && currentHour < endHour);
  
  // Get brightness from curve
  const currentBrightness = currentState?.brightness ?? (isLightOn ? 100 : 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="page-container px-4">
          <div className="flex items-center justify-center py-16">
            <div className="text-muted-foreground">{translations.common.loading[language]}</div>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="page-container px-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="section-title">{translations.lighting.title[language]}</h2>

          {/* Age-Based Lighting Suggestion */}
          <div className="mb-6">
            <AgeLightingSuggestionCard />
          </div>

          {/* Smart Lighting Curve Card */}
          <div className="mb-6">
            <LightingCurveCard />
          </div>

          {/* Current Status */}
          <div className="mb-6 rounded-2xl bg-card p-6 shadow-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${
                  isLightOn ? 'bg-amber-100 text-amber-600' : 'bg-muted text-muted-foreground'
                }`}>
                  {isLightOn ? <Sun size={32} /> : <Moon size={32} />}
                </div>
                <div>
                  <p className="text-lg font-semibold">
                    {isLightOn 
                      ? (language === 'bn' ? `লাইট চালু (${currentBrightness}%)` : `Lights ON (${currentBrightness}%)`) 
                      : (language === 'bn' ? 'লাইট বন্ধ' : 'Lights OFF')
                    }
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {schedule?.manual_override 
                      ? (language === 'bn' ? 'ম্যানুয়াল মোড' : 'Manual Mode')
                      : currentState?.phase === 'fade-in' 
                        ? (language === 'bn' ? 'ফেড ইন মোড' : 'Fade In Mode')
                        : currentState?.phase === 'fade-out'
                          ? (language === 'bn' ? 'ফেড আউট মোড' : 'Fade Out Mode')
                          : (language === 'bn' ? 'অটো মোড' : 'Auto Mode')
                    }
                  </p>
                </div>
              </div>
              <div className={`h-4 w-4 rounded-full ${isLightOn ? 'bg-status-normal animate-pulse' : 'bg-status-off'}`} />
            </div>
          </div>

          {/* Manual Override */}
          <div className="mb-6 flex items-center justify-between rounded-2xl bg-card p-4 shadow-card">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                schedule?.manual_override ? 'bg-secondary text-white' : 'bg-muted text-muted-foreground'
              }`}>
                <RefreshCcw size={20} />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  {translations.lighting.manualOverride[language]}
                </p>
                <p className="text-sm text-muted-foreground">
                  {language === 'bn' ? 'সবসময় লাইট চালু রাখুন' : 'Keep lights always ON'}
                </p>
              </div>
            </div>
            <Switch
              checked={schedule?.manual_override ?? false}
              onCheckedChange={handleManualOverride}
            />
          </div>

          {/* Schedule Configuration */}
          <div className="mb-6 rounded-2xl bg-card p-6 shadow-card">
            <div className="mb-6 flex items-center gap-2">
              <Clock size={20} className="text-primary" />
              <h3 className="font-semibold">
                {language === 'bn' ? 'দৈনিক সময়সূচী' : 'Daily Schedule'}
              </h3>
            </div>

            {/* Total Hours Display */}
            <div className="mb-6 text-center">
              <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 ${
                isValidSchedule ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'
              }`}>
                <Lightbulb size={18} />
                <span className="text-2xl font-bold">{totalHours}</span>
                <span className="text-sm">{translations.common.hours[language]}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {isValidSchedule 
                  ? (language === 'bn' ? 'সঠিক সময়কাল (১৪-১৬ ঘন্টা)' : 'Valid duration (14-16 hours)')
                  : (language === 'bn' ? 'সময়কাল ১৪-১৬ ঘন্টার মধ্যে হওয়া উচিত' : 'Duration should be 14-16 hours')
                }
              </p>
            </div>

            {/* Start Time Slider */}
            <div className="mb-6">
              <div className="mb-3 flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Sun size={16} className="text-amber-500" />
                  {translations.lighting.startTime[language]}
                </label>
                <span className="rounded-full bg-muted px-3 py-1 text-sm font-medium">
                  {formatTime(startHour)}
                </span>
              </div>
              <Slider
                value={[startHour]}
                onValueChange={(value) => {
                  setStartHour(value[0]);
                  setHasChanges(true);
                }}
                min={3}
                max={8}
                step={1}
                className="py-2"
              />
              <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                <span>3:00 AM</span>
                <span>8:00 AM</span>
              </div>
            </div>

            {/* End Time Slider */}
            <div className="mb-6">
              <div className="mb-3 flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Moon size={16} className="text-blue-500" />
                  {translations.lighting.endTime[language]}
                </label>
                <span className="rounded-full bg-muted px-3 py-1 text-sm font-medium">
                  {formatTime(endHour)}
                </span>
              </div>
              <Slider
                value={[endHour]}
                onValueChange={(value) => {
                  setEndHour(value[0]);
                  setHasChanges(true);
                }}
                min={18}
                max={23}
                step={1}
                className="py-2"
              />
              <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                <span>6:00 PM</span>
                <span>11:00 PM</span>
              </div>
            </div>

            {/* Visual Timeline */}
            <div className="mb-6">
              <p className="mb-2 text-sm font-medium">
                {language === 'bn' ? 'দিনের সময়রেখা' : 'Daily Timeline'}
              </p>
              <div className="relative h-8 overflow-hidden rounded-full bg-slate-200">
                {/* Night portion before start */}
                <div 
                  className="absolute left-0 top-0 h-full bg-slate-700"
                  style={{ width: `${(startHour / 24) * 100}%` }}
                />
                {/* Day/Light portion */}
                <div 
                  className="absolute top-0 h-full bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300"
                  style={{ 
                    left: `${(startHour / 24) * 100}%`,
                    width: `${((endHour - startHour) / 24) * 100}%`
                  }}
                />
                {/* Night portion after end */}
                <div 
                  className="absolute right-0 top-0 h-full bg-slate-700"
                  style={{ width: `${((24 - endHour) / 24) * 100}%` }}
                />
                {/* Current time indicator */}
                <div 
                  className="absolute top-0 h-full w-1 bg-red-500"
                  style={{ left: `${(currentHour / 24) * 100}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                <span>12 AM</span>
                <span>6 AM</span>
                <span>12 PM</span>
                <span>6 PM</span>
                <span>12 AM</span>
              </div>
            </div>

            {/* Save Button */}
            <Button 
              onClick={handleSave} 
              className="w-full" 
              disabled={!hasChanges || !isValidSchedule || updateSchedule.isPending}
            >
              {updateSchedule.isPending 
                ? translations.common.loading[language]
                : translations.common.save[language]
              }
            </Button>
          </div>

          {/* Smart Lighting Curve Settings */}
          <div className="mb-6">
            <LightingCurveSettings />
          </div>

          {/* LDR Hardware Status — large, farmer-friendly */}
          <div className="mb-4">
            <LDRStatusBanner />
          </div>

          {/* LDR Sensor Settings */}
          <div className="mb-6">
            <LDRSettingsCard />
          </div>

          {/* LDR Installation Guide */}
          <div className="mb-6">
            <LDRInstallationGuide />
          </div>

          {/* Info Card */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <h4 className="mb-2 font-medium text-primary">
              {language === 'bn' ? '💡 লেয়ার মুরগির জন্য আলো' : '💡 Light for Layer Hens'}
            </h4>
            <p className="text-sm text-muted-foreground">
              {language === 'bn' 
                ? 'সর্বোত্তম ডিম উৎপাদনের জন্য লেয়ার মুরগির দৈনিক ১৪-১৬ ঘন্টা আলো প্রয়োজন। গ্র্যাজুয়াল মোড স্ট্রেস কমায় এবং ডিম পাড়ার ধারাবাহিকতা বাড়ায়।'
                : 'Layer hens require 14-16 hours of light daily for optimal egg production. Gradual mode reduces stress and improves egg laying consistency.'
              }
            </p>
          </div>
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
}
