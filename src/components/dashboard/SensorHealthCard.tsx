import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle, WifiOff, Thermometer, Droplets, Wind, Droplet, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSensorValidation, SensorIssue } from '@/hooks/useSensorValidation';
import { useRealtimeSensorData } from '@/hooks/useRealtimeSensorData';
import { cn } from '@/lib/utils';

const sensorIcons: Record<string, React.ElementType> = {
  temperature: Thermometer,
  humidity: Droplets,
  ammonia: Wind,
  water: Droplet,
};

const severityColors: Record<string, string> = {
  info: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30',
  warning: 'text-amber-500 bg-amber-100 dark:bg-amber-900/30',
  danger: 'text-red-500 bg-red-100 dark:bg-red-900/30',
};

export function SensorHealthCard() {
  const { language } = useAuth();
  const { sensorData } = useRealtimeSensorData();
  const { issues, hasIssues, ignoredSensors, safeModeActive, safeModeUntil } = useSensorValidation(sensorData);

  // Safe mode banner
  if (safeModeActive) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-red-500/40 bg-gradient-to-br from-red-500/15 to-amber-500/10">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-red-500 animate-pulse" />
                {language === 'bn' ? '🛡️ সেফ মোড সক্রিয়' : '🛡️ Safe Mode Active'}
              </CardTitle>
              <Badge variant="destructive" className="text-[10px]">
                {language === 'bn' ? 'জরুরি' : 'CRITICAL'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {language === 'bn'
                ? 'সেন্সর অ্যানোমালি সনাক্ত হয়েছে। অটোমেশন নিরাপদ ডিফল্টে চলছে।'
                : 'Sensor anomaly detected. Automation running on safe defaults.'}
            </p>
            {safeModeUntil && (
              <p className="text-xs text-muted-foreground">
                {language === 'bn' ? 'মেয়াদ শেষ: ' : 'Expires: '}
                {safeModeUntil.toLocaleTimeString(language === 'bn' ? 'bn-BD' : 'en-US', {
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            )}

            {/* Show active issues */}
            <AnimatePresence>
              {issues.map((issue, index) => (
                <SensorIssueItem key={`${issue.sensor}-${issue.type}`} issue={issue} index={index} />
              ))}
            </AnimatePresence>

            {ignoredSensors.size > 0 && (
              <div className="mt-2 p-2 rounded-lg bg-muted/50 border border-dashed border-red-500/30">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <WifiOff className="h-3 w-3" />
                  {language === 'bn'
                    ? `${Array.from(ignoredSensors).join(', ')} — উপেক্ষা করা হচ্ছে`
                    : `${Array.from(ignoredSensors).join(', ')} — ignored for automation`}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // No issues
  if (!hasIssues) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
          <CardContent className="py-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span className="text-sm text-emerald-600 dark:text-emerald-400">
                {language === 'bn' ? 'সব সেন্সর স্বাভাবিক' : 'All sensors OK'}
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Issues present but no safe mode
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-red-500/5">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              {language === 'bn' ? 'সেন্সর স্বাস্থ্য সতর্কতা' : 'Sensor Health Alert'}
            </CardTitle>
            <Badge variant="outline" className="text-amber-600 border-amber-500/30">
              {issues.length} {language === 'bn' ? 'সমস্যা' : 'issue(s)'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <AnimatePresence>
            {issues.map((issue, index) => (
              <SensorIssueItem key={`${issue.sensor}-${issue.type}`} issue={issue} index={index} />
            ))}
          </AnimatePresence>

          {ignoredSensors.size > 0 && (
            <div className="mt-3 p-2 rounded-lg bg-muted/50 border border-dashed border-amber-500/30">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <WifiOff className="h-3 w-3" />
                {language === 'bn'
                  ? `${Array.from(ignoredSensors).join(', ')} — অটোমেশন থেকে বাদ দেওয়া হয়েছে`
                  : `${Array.from(ignoredSensors).join(', ')} — excluded from automation`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function SensorIssueItem({ issue, index }: { issue: SensorIssue; index: number }) {
  const { language } = useAuth();
  const Icon = sensorIcons[issue.sensor] || AlertTriangle;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        'flex items-start gap-3 p-2.5 rounded-lg border',
        issue.severity === 'danger' && 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800',
        issue.severity === 'warning' && 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800',
        issue.severity === 'info' && 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800',
      )}
    >
      <div className={cn('p-1.5 rounded-full', severityColors[issue.severity])}>
        <Icon className="h-3.5 w-3.5" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">
          {language === 'bn' ? issue.message.bn : issue.message.en}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {issue.detectedAt.toLocaleTimeString(language === 'bn' ? 'bn-BD' : 'en-US', {
            hour: '2-digit', minute: '2-digit',
          })}
          {issue.shouldIgnoreSensor && (
            <span className="ml-2 text-amber-600 dark:text-amber-400">
              • {language === 'bn' ? 'উপেক্ষা করা হচ্ছে' : 'Ignored for control'}
            </span>
          )}
        </p>
      </div>

      <Badge
        variant="outline"
        className={cn(
          'text-[10px] px-1.5 capitalize',
          issue.severity === 'danger' && 'border-red-500 text-red-600',
          issue.severity === 'warning' && 'border-amber-500 text-amber-600',
          issue.severity === 'info' && 'border-blue-500 text-blue-600',
        )}
      >
        {issue.type === 'out_of_range' ? 'OOR' : issue.type}
      </Badge>
    </motion.div>
  );
}
