import { motion } from 'framer-motion';
import { RefreshCw, Clock, ChevronRight, Zap } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useBroilerAgeAutoMode, BROILER_AGE_PROFILES } from '@/hooks/useBroilerAgeAutoMode';
import { cn } from '@/lib/utils';

interface BroilerAgeAutoModeCardProps {
  enabled?: boolean;
}

export function BroilerAgeAutoModeCard({ enabled = true }: BroilerAgeAutoModeCardProps) {
  const { language } = useAuth();
  const { 
    ageDays, 
    currentProfile, 
    forceApply, 
    isActive,
    nextProfileChange,
  } = useBroilerAgeAutoMode(enabled);

  if (!isActive) {
    return null;
  }

  // Calculate progress within current phase
  const phaseProgress = currentProfile 
    ? Math.min(100, ((ageDays - currentProfile.minDays) / (currentProfile.maxDays - currentProfile.minDays + 1)) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              {language === 'bn' ? 'বয়স অটো-মোড' : 'Age Auto-Mode'}
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {language === 'bn' ? `${ageDays} দিন` : `Day ${ageDays}`}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Phase Indicator */}
          <div className={cn(
            'p-3 rounded-lg border-2',
            'bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30'
          )}>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{currentProfile.icon}</span>
              <div className="flex-1">
                <p className="font-semibold text-sm">
                  {language === 'bn' ? currentProfile.name.bn : currentProfile.name.en}
                </p>
                <p className="text-xs text-muted-foreground">
                  {language === 'bn' ? currentProfile.description.bn : currentProfile.description.en}
                </p>
              </div>
            </div>
            
            {/* Phase Progress */}
            <div className="mt-3 space-y-1">
              <Progress value={phaseProgress} className="h-1.5" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{language === 'bn' ? `${currentProfile.minDays} দিন` : `Day ${currentProfile.minDays}`}</span>
                <span>
                  {currentProfile.maxDays < 999 
                    ? (language === 'bn' ? `${currentProfile.maxDays} দিন` : `Day ${currentProfile.maxDays}`)
                    : (language === 'bn' ? 'মার্কেট' : 'Market')
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Phase Timeline */}
          <div className="space-y-2">
            {BROILER_AGE_PROFILES.map((profile, index) => {
              const isCurrentPhase = profile.id === currentProfile.id;
              const isPastPhase = ageDays > profile.maxDays;
              const isFuturePhase = ageDays < profile.minDays;
              
              return (
                <div 
                  key={profile.id}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-lg transition-all text-xs',
                    isCurrentPhase && 'bg-primary/10 border border-primary/20',
                    isPastPhase && 'opacity-50',
                    isFuturePhase && 'opacity-70'
                  )}
                >
                  <span className="text-lg">{profile.icon}</span>
                  <div className="flex-1">
                    <span className={cn(
                      'font-medium',
                      isCurrentPhase && 'text-primary'
                    )}>
                      {language === 'bn' 
                        ? `${profile.minDays}-${profile.maxDays < 999 ? profile.maxDays : '৪২+'} দিন`
                        : `Day ${profile.minDays}-${profile.maxDays < 999 ? profile.maxDays : '42+'}`
                      }
                    </span>
                  </div>
                  {isCurrentPhase && (
                    <Badge variant="default" className="text-[10px] px-1.5">
                      {language === 'bn' ? 'বর্তমান' : 'Active'}
                    </Badge>
                  )}
                  {isPastPhase && (
                    <Badge variant="outline" className="text-[10px] px-1.5">
                      ✓
                    </Badge>
                  )}
                  {index < BROILER_AGE_PROFILES.length - 1 && (
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Next Change Info */}
          {nextProfileChange && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-xs">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">
                {language === 'bn' 
                  ? `${nextProfileChange.daysUntil} দিন পরে ${nextProfileChange.nextProfile.icon} ${nextProfileChange.nextProfile.name.bn.split(' ')[0]} এ পরিবর্তন হবে`
                  : `${nextProfileChange.nextProfile.icon} ${nextProfileChange.nextProfile.name.en.split(' ')[0]} in ${nextProfileChange.daysUntil} days`
                }
              </span>
            </div>
          )}

          {/* Manual Apply Button — Primary & Prominent */}
          <Button 
            variant="default" 
            size="sm" 
            className="w-full text-xs bg-primary hover:bg-primary/90 shadow-md"
            onClick={forceApply}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            {language === 'bn' ? '✅ প্রস্তাবিত সেটিং প্রয়োগ করুন' : '✅ Apply Recommended Settings'}
          </Button>
          <p className="text-center text-[10px] text-muted-foreground">
            {language === 'bn' ? '🛡️ এটাই সবচেয়ে নিরাপদ সেটিং' : '🛡️ This is the safest setting'}
          </p>

          {/* Current Settings Preview */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center p-2 rounded bg-muted/50">
              <p className="text-muted-foreground">🌡️ Temp</p>
              <p className="font-semibold">{currentProfile.settings.temperature_min}-{currentProfile.settings.temperature_max}°C</p>
            </div>
            <div className="text-center p-2 rounded bg-muted/50">
              <p className="text-muted-foreground">💧 Humidity</p>
              <p className="font-semibold">{currentProfile.settings.humidity_min}-{currentProfile.settings.humidity_max}%</p>
            </div>
            <div className="text-center p-2 rounded bg-muted/50">
              <p className="text-muted-foreground">☁️ NH3</p>
              <p className="font-semibold">&lt;{currentProfile.settings.ammonia_max}ppm</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
