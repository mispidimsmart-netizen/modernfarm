import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, Sun, Moon, Sunrise, Sunset } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLightingCurve } from '@/hooks/useLightingCurve';
import { getPhaseStyle } from '@/lib/lightingCurve';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, ReferenceLine } from 'recharts';

export function LightingCurveCard() {
  const { language } = useAuth();
  const { currentState, curveData, settings, isLoading } = useLightingCurve();

  if (isLoading || !currentState || !settings) {
    return (
      <Card className="overflow-hidden bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <Lightbulb className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {language === 'bn' ? 'স্মার্ট লাইটিং' : 'Smart Lighting'}
              </p>
              <p className="text-lg font-medium text-muted-foreground">
                {language === 'bn' ? 'লোড হচ্ছে...' : 'Loading...'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const phaseStyle = getPhaseStyle(currentState.phase);
  const currentTime = new Date().toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });

  return (
    <Card className={cn('overflow-hidden border', phaseStyle.bgColor)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Lightbulb className={cn('h-5 w-5', phaseStyle.color)} />
            {language === 'bn' ? 'স্মার্ট লাইটিং কার্ভ' : 'Smart Lighting Curve'}
          </div>
          {settings.gradualEnabled && (
            <span className="text-xs font-normal text-muted-foreground">
              {language === 'bn' ? 'গ্র্যাজুয়াল মোড' : 'Gradual Mode'}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Current Status */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              animate={currentState.phase === 'fade-in' || currentState.phase === 'fade-out' 
                ? { opacity: [0.5, 1, 0.5] } 
                : {}
              }
              transition={{ repeat: Infinity, duration: 2 }}
              className={cn('flex h-14 w-14 items-center justify-center rounded-2xl', phaseStyle.bgColor)}
            >
              <span className="text-2xl">{phaseStyle.icon}</span>
            </motion.div>
            <div>
              <p className={cn('text-3xl font-bold', phaseStyle.color)}>
                {currentState.brightness}%
              </p>
              <p className="text-xs text-muted-foreground">
                {language === 'bn' ? 'উজ্জ্বলতা' : 'Brightness'}
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-sm font-medium">
              {currentState.phase === 'fade-in' && (language === 'bn' ? 'ফেড ইন' : 'Fade In')}
              {currentState.phase === 'on' && (language === 'bn' ? 'চালু' : 'ON')}
              {currentState.phase === 'fade-out' && (language === 'bn' ? 'ফেড আউট' : 'Fade Out')}
              {currentState.phase === 'off' && (language === 'bn' ? 'বন্ধ' : 'OFF')}
            </p>
            <p className="text-xs text-muted-foreground">
              {currentState.message[language]}
            </p>
          </div>
        </div>

        {/* Brightness Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>{settings.minBrightness}%</span>
            <span>{settings.maxBrightness}%</span>
          </div>
          <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${currentState.brightness}%` }}
              transition={{ duration: 0.5 }}
              className={cn(
                'h-full rounded-full',
                currentState.phase === 'fade-in' && 'bg-gradient-to-r from-orange-400 to-yellow-400',
                currentState.phase === 'on' && 'bg-yellow-400',
                currentState.phase === 'fade-out' && 'bg-gradient-to-r from-yellow-400 to-purple-400',
                currentState.phase === 'off' && 'bg-gray-400'
              )}
            />
          </div>
        </div>

        {/* Mini Curve Chart */}
        <div className="h-24 w-full mb-3">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={curveData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="lightingGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 10 }}
                tickFormatter={(val) => val.slice(0, 2)}
                interval={7}
              />
              <YAxis 
                domain={[0, 100]} 
                tick={{ fontSize: 10 }}
                tickFormatter={(val) => `${val}%`}
              />
              <ReferenceLine 
                x={currentTime} 
                stroke="hsl(var(--destructive))" 
                strokeWidth={2}
                strokeDasharray="3 3"
              />
              <Area
                type="monotone"
                dataKey="brightness"
                stroke="hsl(var(--primary))"
                fill="url(#lightingGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Schedule Info */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Sunrise className="h-3.5 w-3.5 text-orange-500" />
            <span>{settings.startTime}</span>
            {settings.gradualEnabled && (
              <span className="text-orange-500">+{settings.fadeInMinutes}m</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            {settings.gradualEnabled && (
              <span className="text-purple-500">-{settings.fadeOutMinutes}m</span>
            )}
            <span>{settings.endTime}</span>
            <Sunset className="h-3.5 w-3.5 text-purple-500" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
