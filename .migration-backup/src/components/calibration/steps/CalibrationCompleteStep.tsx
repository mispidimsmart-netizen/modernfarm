import {
  Wind, Thermometer, Flame, Droplets, CheckCircle2,
  AlertTriangle, ArrowRight, RotateCcw, Play,
  Check, X, Gauge, Settings2, RefreshCw, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { AutomationDefaults, CalibrationStep } from '@/hooks/useCalibrationWizard';
import type { useCalibrationWizard } from '@/hooks/useCalibrationWizard';
import type { useRealtimeSensorData } from '@/hooks/useRealtimeSensorData';

export type CalibrationWizardApi = ReturnType<typeof useCalibrationWizard>;
export type SensorSnapshot = ReturnType<typeof useRealtimeSensorData>['sensorData'];
export type Lang = 'bn' | 'en';

interface Props {
  language: Lang;
  wizard: CalibrationWizardApi;
  onComplete?: () => void;
}

export function CalibrationCompleteStep({ language, wizard, onComplete }: Props) {
  const score = wizard.calibrationData.calibration_score ?? 0;
  const status = wizard.calibrationData.overall_status ?? 'pending';

  return (
    <div className="space-y-4 text-center">
      <div className="mb-6">
        {status === 'good' ? (
          <CheckCircle2 className="w-16 h-16 mx-auto text-green-500 mb-2" />
        ) : status === 'acceptable' ? (
          <CheckCircle2 className="w-16 h-16 mx-auto text-amber-500 mb-2" />
        ) : (
          <AlertTriangle className="w-16 h-16 mx-auto text-red-500 mb-2" />
        )}

        <h3 className="text-lg font-semibold">
          {language === 'bn' ? 'ক্যালিব্রেশন সম্পন্ন!' : 'Calibration Complete!'}
        </h3>
      </div>

      <div className={`rounded-2xl p-6 ${
        status === 'good' 
          ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-500' 
          : status === 'acceptable'
            ? 'bg-amber-100 dark:bg-amber-900/30 border-2 border-amber-500'
            : 'bg-red-100 dark:bg-red-900/30 border-2 border-red-500'
      }`}>
        <p className="text-sm text-muted-foreground mb-2">
          {language === 'bn' ? 'ইনস্টলেশন কোয়ালিটি' : 'Installation Quality'}
        </p>
        <p className="text-4xl font-bold mb-2">{score}%</p>
        <Badge variant={status === 'good' ? 'default' : status === 'acceptable' ? 'secondary' : 'destructive'}>
          {status === 'good' 
            ? (language === 'bn' ? '✅ ভালো' : '✅ GOOD')
            : status === 'acceptable'
              ? (language === 'bn' ? '⚠️ গ্রহণযোগ্য' : '⚠️ ACCEPTABLE')
              : (language === 'bn' ? '❌ সংশোধন প্রয়োজন' : '❌ NEEDS FIX')}
        </Badge>
      </div>

      {/* Test Results Summary */}
      <div className="grid grid-cols-2 gap-2 text-left">
        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
          {wizard.calibrationData.fan_direction_test_passed ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <X className="w-4 h-4 text-red-500" />
          )}
          <span className="text-xs">{language === 'bn' ? 'ফ্যান দিক' : 'Fan Direction'}</span>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
          {wizard.calibrationData.temp_sensor_test_passed ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <X className="w-4 h-4 text-red-500" />
          )}
          <span className="text-xs">{language === 'bn' ? 'তাপমাত্রা সেন্সর' : 'Temp Sensor'}</span>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
          {wizard.calibrationData.clean_air_nh3_ppm !== undefined ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <X className="w-4 h-4 text-red-500" />
          )}
          <span className="text-xs">{language === 'bn' ? 'গ্যাস বেসলাইন' : 'Gas Baseline'}</span>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
          {wizard.calibrationData.heater_test_passed ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <X className="w-4 h-4 text-red-500" />
          )}
          <span className="text-xs">{language === 'bn' ? 'হিটার' : 'Heater'}</span>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 col-span-2">
          {wizard.calibrationData.water_flow_test_passed ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <X className="w-4 h-4 text-red-500" />
          )}
          <span className="text-xs">{language === 'bn' ? 'ওয়াটার ফ্লো' : 'Water Flow'}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <Button 
          variant="outline" 
          className="flex-1"
          onClick={wizard.resetWizard}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          {language === 'bn' ? 'পুনরায় শুরু' : 'Restart'}
        </Button>
        <Button 
          className="flex-1"
          onClick={() => {
            wizard.completeWizard();
            onComplete?.();
          }}
        >
          {language === 'bn' ? 'সম্পন্ন' : 'Finish'}
        </Button>
      </div>
    </div>
  );
}
