import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { 
  SMART_MODE_PROFILES, 
  useApplySmartMode,
  SmartModeType 
} from '@/hooks/useSmartModeProfiles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface SmartModeCardProps {
  compact?: boolean;
}

export function SmartModeCard({ compact = false }: SmartModeCardProps) {
  const { language } = useAuth();
  const applyMode = useApplySmartMode();
  const [selectedMode, setSelectedMode] = useState<SmartModeType | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [expanded, setExpanded] = useState(!compact);

  const t = {
    title: { bn: 'স্মার্ট মোড প্রোফাইল', en: 'Smart Mode Profiles' },
    subtitle: { bn: 'এক ক্লিকে সব সেটিং বদলান', en: 'Change all settings with one tap' },
    confirm: { bn: 'নিশ্চিত করুন', en: 'Confirm' },
    cancel: { bn: 'বাতিল', en: 'Cancel' },
    confirmTitle: { bn: 'মোড পরিবর্তন করবেন?', en: 'Change Mode?' },
    confirmDesc: { 
      bn: 'এটি আপনার সব থ্রেশহোল্ড সেটিং বদলে দেবে।', 
      en: 'This will change all your threshold settings.' 
    },
  };

  const handleModeClick = (modeId: SmartModeType) => {
    setSelectedMode(modeId);
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    if (selectedMode) {
      applyMode.mutate(selectedMode);
    }
    setShowConfirm(false);
    setSelectedMode(null);
  };

  const selectedProfile = selectedMode 
    ? SMART_MODE_PROFILES.find(p => p.id === selectedMode) 
    : null;

  // Quick mode buttons for compact view (excluding 'normal')
  const quickModes = SMART_MODE_PROFILES.filter(p => p.id !== 'normal');

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="h-5 w-5 text-primary" />
              {t.title[language]}
            </CardTitle>
            {compact && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </Button>
            )}
          </div>
          {(!compact || expanded) && (
            <p className="text-sm text-muted-foreground">
              {t.subtitle[language]}
            </p>
          )}
        </CardHeader>

        <AnimatePresence>
          {(!compact || expanded) && (
            <motion.div
              initial={compact ? { height: 0, opacity: 0 } : false}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <CardContent className="space-y-3">
                {/* Quick mode buttons grid */}
                <div className="grid grid-cols-2 gap-2">
                  {quickModes.map((profile) => (
                    <motion.button
                      key={profile.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleModeClick(profile.id)}
                      disabled={applyMode.isPending}
                      className={`flex items-center gap-3 rounded-xl p-3 text-left transition-all ${profile.bgColor} hover:ring-2 hover:ring-primary/30 disabled:opacity-50`}
                    >
                      <span className="text-2xl">{profile.icon}</span>
                      <div className="min-w-0 flex-1">
                        <p className={`font-medium ${profile.color}`}>
                          {profile.name[language]}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {profile.description[language]}
                        </p>
                      </div>
                    </motion.button>
                  ))}
                </div>

                {/* Normal mode button - full width */}
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => handleModeClick('normal')}
                  disabled={applyMode.isPending}
                  className="flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-muted-foreground/30 p-3 text-left transition-all hover:border-primary/50 hover:bg-muted/50 disabled:opacity-50"
                >
                  <span className="text-2xl">✨</span>
                  <div className="flex-1">
                    <p className="font-medium text-green-600 dark:text-green-400">
                      {SMART_MODE_PROFILES.find(p => p.id === 'normal')?.name[language]}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {SMART_MODE_PROFILES.find(p => p.id === 'normal')?.description[language]}
                    </p>
                  </div>
                </motion.button>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {selectedProfile && (
                <>
                  <span className="text-2xl">{selectedProfile.icon}</span>
                  {selectedProfile.name[language]}
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>{t.confirmDesc[language]}</p>
              
              {selectedProfile && (
                <div className="mt-4 rounded-lg bg-muted p-3 text-sm">
                  <p className="mb-2 font-medium text-foreground">
                    {language === 'bn' ? 'নতুন সেটিংস:' : 'New Settings:'}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                    <div>🌡️ {selectedProfile.settings.temperature_max}°C max</div>
                    <div>💧 {selectedProfile.settings.humidity_max}% max</div>
                    <div>☁️ {selectedProfile.settings.ammonia_max} ppm max</div>
                    <div>🔥 HSI: {selectedProfile.settings.hsi_mild_threshold}</div>
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel[language]}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              <Check className="mr-2 h-4 w-4" />
              {t.confirm[language]}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
