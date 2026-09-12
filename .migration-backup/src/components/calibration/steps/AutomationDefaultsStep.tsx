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
  automationDefaults: AutomationDefaults;
  setAutomationDefaults: React.Dispatch<React.SetStateAction<AutomationDefaults>>;
  validationWarnings: string[];
  hasErrors: boolean;
  resetToDefaults: () => void;
}

export function AutomationDefaultsStep({
  language, wizard, automationDefaults, setAutomationDefaults,
  validationWarnings, hasErrors, resetToDefaults,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <Settings2 className="w-12 h-12 mx-auto text-primary mb-2" />
        <h3 className="text-lg font-semibold">
          {language === 'bn' ? 'ডিফল্ট অটোমেশন সেটিংস' : 'Default Automation Settings'}
        </h3>
        <p className="text-sm text-muted-foreground">
          {language === 'bn' ? 'থ্রেশহোল্ড ও ফ্যান/হিটার সেটিংস' : 'Thresholds & Fan/Heater settings'}
        </p>
      </div>

      {/* Reset Button */}
      <div className="flex justify-end">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={resetToDefaults}
          className="text-xs"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          {language === 'bn' ? 'ডিফল্ট মান' : 'Reset Defaults'}
        </Button>
      </div>

      {/* Validation Warnings */}
      {validationWarnings.length > 0 && (
        <Alert variant={hasErrors ? "destructive" : "default"} className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <ul className="space-y-1 mt-1">
              {validationWarnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Temperature Thresholds */}
      <div className="bg-muted/30 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Thermometer className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">
            {language === 'bn' ? 'তাপমাত্রা সীমা' : 'Temperature Limits'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">{language === 'bn' ? 'সর্বনিম্ন (°C)' : 'Min (°C)'}</Label>
            <Input 
              type="number" 
              value={automationDefaults.temp_min}
              onChange={(e) => setAutomationDefaults(prev => ({ ...prev, temp_min: Number(e.target.value) }))}
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs">{language === 'bn' ? 'সর্বোচ্চ (°C)' : 'Max (°C)'}</Label>
            <Input 
              type="number" 
              value={automationDefaults.temp_max}
              onChange={(e) => setAutomationDefaults(prev => ({ ...prev, temp_max: Number(e.target.value) }))}
              className="h-9"
            />
          </div>
        </div>
      </div>

      {/* Humidity & Ammonia */}
      <div className="bg-muted/30 rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">{language === 'bn' ? 'আর্দ্রতা সর্বনিম্ন (%)' : 'Humidity Min (%)'}</Label>
            <Input 
              type="number" 
              value={automationDefaults.humidity_min}
              onChange={(e) => setAutomationDefaults(prev => ({ ...prev, humidity_min: Number(e.target.value) }))}
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs">{language === 'bn' ? 'আর্দ্রতা সর্বোচ্চ (%)' : 'Humidity Max (%)'}</Label>
            <Input 
              type="number" 
              value={automationDefaults.humidity_max}
              onChange={(e) => setAutomationDefaults(prev => ({ ...prev, humidity_max: Number(e.target.value) }))}
              className="h-9"
            />
          </div>
        </div>
        <div>
          <Label className="text-xs">{language === 'bn' ? 'অ্যামোনিয়া সর্বোচ্চ (ppm)' : 'Ammonia Max (ppm)'}</Label>
          <Input 
            type="number" 
            value={automationDefaults.ammonia_max}
            onChange={(e) => setAutomationDefaults(prev => ({ ...prev, ammonia_max: Number(e.target.value) }))}
            className="h-9"
          />
        </div>
      </div>

      {/* Fan Speed Settings */}
      <div className="bg-muted/30 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Wind className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">
            {language === 'bn' ? 'ফ্যান স্পিড তাপমাত্রা' : 'Fan Speed Temperatures'}
          </span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">🌀 Low</span>
            <span className="font-medium">{automationDefaults.fan_low_temp_min}°C - {automationDefaults.fan_low_temp_max}°C</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input 
              type="number" 
              value={automationDefaults.fan_low_temp_min}
              onChange={(e) => setAutomationDefaults(prev => ({ ...prev, fan_low_temp_min: Number(e.target.value) }))}
              className="h-8 text-xs"
              placeholder="28"
            />
            <Input 
              type="number" 
              value={automationDefaults.fan_low_temp_max}
              onChange={(e) => setAutomationDefaults(prev => ({ ...prev, fan_low_temp_max: Number(e.target.value) }))}
              className="h-8 text-xs"
              placeholder="30"
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">🌀🌀 Medium</span>
            <span className="font-medium">{automationDefaults.fan_medium_temp_min}°C - {automationDefaults.fan_medium_temp_max}°C</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input 
              type="number" 
              value={automationDefaults.fan_medium_temp_min}
              onChange={(e) => setAutomationDefaults(prev => ({ ...prev, fan_medium_temp_min: Number(e.target.value) }))}
              className="h-8 text-xs"
              placeholder="30"
            />
            <Input 
              type="number" 
              value={automationDefaults.fan_medium_temp_max}
              onChange={(e) => setAutomationDefaults(prev => ({ ...prev, fan_medium_temp_max: Number(e.target.value) }))}
              className="h-8 text-xs"
              placeholder="33"
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">🌀🌀🌀 High</span>
            <span className="font-medium">&gt; {automationDefaults.fan_high_temp_min}°C</span>
          </div>
          <Input 
            type="number" 
            value={automationDefaults.fan_high_temp_min}
            onChange={(e) => setAutomationDefaults(prev => ({ ...prev, fan_high_temp_min: Number(e.target.value) }))}
            className="h-8 text-xs"
            placeholder="33"
          />
        </div>
      </div>

      {/* Heater Settings */}
      <div className="bg-muted/30 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Flame className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">
            {language === 'bn' ? 'হিটার সেটিংস' : 'Heater Settings'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">{language === 'bn' ? 'চালু হবে (°C)' : 'Turn ON (°C)'}</Label>
            <Input 
              type="number" 
              value={automationDefaults.heater_on_temp}
              onChange={(e) => setAutomationDefaults(prev => ({ ...prev, heater_on_temp: Number(e.target.value) }))}
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs">{language === 'bn' ? 'বন্ধ হবে (°C)' : 'Turn OFF (°C)'}</Label>
            <Input 
              type="number" 
              value={automationDefaults.heater_off_temp}
              onChange={(e) => setAutomationDefaults(prev => ({ ...prev, heater_off_temp: Number(e.target.value) }))}
              className="h-9"
            />
          </div>
        </div>
      </div>

      <Button 
        className="w-full" 
        onClick={() => wizard.saveAutomationDefaults(automationDefaults)}
        disabled={hasErrors}
      >
        {hasErrors 
          ? (language === 'bn' ? '❌ ত্রুটি সংশোধন করুন' : '❌ Fix errors first')
          : (language === 'bn' ? 'সংরক্ষণ করুন ও পরবর্তী' : 'Save & Continue')
        }
        {!hasErrors && <ArrowRight className="w-4 h-4 ml-2" />}
      </Button>
    </div>
  );
}
