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
  step: CalibrationStep;
  language: Lang;
  wizard: CalibrationWizardApi;
  sensorData: SensorSnapshot;
  waterPulse: string;
  setWaterPulse: (v: string) => void;
}

export function SensorTestSteps({ step, language, wizard, sensorData, waterPulse, setWaterPulse }: Props) {
  switch (step) {
    case 'fan_direction':
      return (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <Wind className="w-12 h-12 mx-auto text-primary mb-2" />
            <h3 className="text-lg font-semibold">
              {language === 'bn' ? 'ফ্যান দিক পরীক্ষা' : 'Fan Direction Test'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {language === 'bn' ? 'এক্সহস্ট ফ্যান ১০ সেকেন্ড চলবে' : 'Exhaust fan will run for 10 seconds'}
            </p>
          </div>

          {wizard.isTestRunning ? (
            <div className="space-y-4">
              <Progress value={wizard.testProgress} className="h-3" />
              <p className="text-center text-sm text-muted-foreground">
                {language === 'bn' ? 'বাতাসের দিক দেখুন...' : 'Check airflow direction...'}
              </p>
              <div className="bg-amber-100 dark:bg-amber-900/30 border border-amber-500/50 rounded-xl p-4 text-center">
                <p className="text-amber-700 dark:text-amber-300 font-medium">
                  {language === 'bn' ? '👆 বাতাস অবশ্যই বাইরে যেতে হবে!' : '👆 Air must go OUTSIDE!'}
                </p>
              </div>
            </div>
          ) : (
            <>
              <Button 
                className="w-full" 
                size="lg"
                onClick={wizard.runFanDirectionTest}
              >
                <Play className="w-5 h-5 mr-2" />
                {language === 'bn' ? 'টেস্ট শুরু করুন' : 'Start Test'}
              </Button>

              {wizard.testProgress === 100 && (
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    className="border-green-500 text-green-600 hover:bg-green-50"
                    onClick={() => wizard.saveFanDirectionResult(true)}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    {language === 'bn' ? 'সঠিক দিক' : 'Correct'}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="border-red-500 text-red-600 hover:bg-red-50"
                    onClick={() => wizard.saveFanDirectionResult(false)}
                  >
                    <X className="w-4 h-4 mr-2" />
                    {language === 'bn' ? 'ভুল দিক' : 'Wrong'}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      );

    case 'temp_sensor':
      return (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <Thermometer className="w-12 h-12 mx-auto text-primary mb-2" />
            <h3 className="text-lg font-semibold">
              {language === 'bn' ? 'তাপমাত্রা সেন্সর টেস্ট' : 'Temperature Sensor Test'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {language === 'bn' ? 'খামারের দরজা ২০ সেকেন্ড খোলা রাখুন' : 'Keep farm door open for 20 seconds'}
            </p>
          </div>

          <div className="bg-muted/50 rounded-xl p-4 text-center">
            <p className="text-sm text-muted-foreground">
              {language === 'bn' ? 'বর্তমান তাপমাত্রা' : 'Current Temperature'}
            </p>
            <p className="text-3xl font-bold text-primary">
              {sensorData.temperature?.toFixed(1) ?? '--'}°C
            </p>
          </div>

          {wizard.isTestRunning ? (
            <div className="space-y-4">
              <Progress value={wizard.testProgress} className="h-3" />
              <p className="text-center text-sm text-muted-foreground">
                {language === 'bn' ? '🚪 দরজা খোলা রাখুন...' : '🚪 Keep door open...'}
              </p>
            </div>
          ) : (
            <>
              <Button 
                className="w-full" 
                size="lg"
                onClick={() => wizard.runTempSensorTest(sensorData.temperature ?? 25)}
              >
                <Play className="w-5 h-5 mr-2" />
                {language === 'bn' ? 'টেস্ট শুরু করুন' : 'Start Test'}
              </Button>

              {wizard.testProgress === 100 && (
                <Button 
                  className="w-full" 
                  onClick={() => wizard.saveTempSensorResult(sensorData.temperature ?? 25)}
                >
                  {language === 'bn' ? 'ফলাফল সংরক্ষণ করুন' : 'Save Result'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </>
          )}
        </div>
      );

    case 'ammonia_baseline':
      return (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <Gauge className="w-12 h-12 mx-auto text-primary mb-2" />
            <h3 className="text-lg font-semibold">
              {language === 'bn' ? 'অ্যামোনিয়া বেসলাইন' : 'Ammonia Baseline'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {language === 'bn' ? 'বিশুদ্ধ বায়ুতে ৩০ সেকেন্ড স্যাম্পলিং' : 'Sample clean air for 30 seconds'}
            </p>
          </div>

          <div className="bg-muted/50 rounded-xl p-4 text-center">
            <p className="text-sm text-muted-foreground">
              {language === 'bn' ? 'বর্তমান অ্যামোনিয়া' : 'Current Ammonia'}
            </p>
            <p className="text-3xl font-bold text-primary">
              {sensorData.ammonia?.toFixed(1) ?? '--'} ppm
            </p>
          </div>

          {wizard.isTestRunning ? (
            <div className="space-y-4">
              <Progress value={wizard.testProgress} className="h-3" />
              <p className="text-center text-sm text-muted-foreground">
                {language === 'bn' ? '🌬️ বিশুদ্ধ বায়ু স্যাম্পলিং...' : '🌬️ Sampling clean air...'}
              </p>
            </div>
          ) : (
            <>
              <div className="bg-blue-100 dark:bg-blue-900/30 border border-blue-500/50 rounded-xl p-4">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {language === 'bn' 
                    ? '💡 সেরা ফলাফলের জন্য সকালে বা পাখি সরানোর পর টেস্ট করুন' 
                    : '💡 For best results, test in morning or after birds are removed'}
                </p>
              </div>

              <Button 
                className="w-full" 
                size="lg"
                onClick={() => wizard.runAmmoniaCalibration(sensorData.ammonia ?? 0)}
              >
                <Play className="w-5 h-5 mr-2" />
                {language === 'bn' ? 'ক্যালিব্রেশন শুরু' : 'Start Calibration'}
              </Button>

              {wizard.testProgress === 100 && (
                <Button 
                  className="w-full" 
                  onClick={() => wizard.saveAmmoniaBaseline(sensorData.ammonia ?? 0)}
                >
                  {language === 'bn' ? 'বেসলাইন সংরক্ষণ' : 'Save Baseline'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </>
          )}
        </div>
      );

    case 'heater_response':
      return (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <Flame className="w-12 h-12 mx-auto text-primary mb-2" />
            <h3 className="text-lg font-semibold">
              {language === 'bn' ? 'হিটার রেসপন্স টেস্ট' : 'Heater Response Test'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {language === 'bn' ? 'হিটার ৬০ সেকেন্ড চলবে' : 'Heater will run for 60 seconds'}
            </p>
          </div>

          <div className="bg-muted/50 rounded-xl p-4 text-center">
            <p className="text-sm text-muted-foreground">
              {language === 'bn' ? 'বর্তমান তাপমাত্রা' : 'Current Temperature'}
            </p>
            <p className="text-3xl font-bold text-primary">
              {sensorData.temperature?.toFixed(1) ?? '--'}°C
            </p>
          </div>

          {wizard.isTestRunning ? (
            <div className="space-y-4">
              <Progress value={wizard.testProgress} className="h-3" />
              <p className="text-center text-sm text-muted-foreground">
                {language === 'bn' ? '🔥 হিটার চলছে...' : '🔥 Heater running...'}
              </p>
            </div>
          ) : (
            <>
              <Button 
                className="w-full" 
                size="lg"
                onClick={() => wizard.runHeaterTest(sensorData.temperature ?? 25)}
              >
                <Play className="w-5 h-5 mr-2" />
                {language === 'bn' ? 'টেস্ট শুরু করুন' : 'Start Test'}
              </Button>

              {wizard.testProgress === 100 && (
                <Button 
                  className="w-full" 
                  onClick={() => wizard.saveHeaterResult(sensorData.temperature ?? 25)}
                >
                  {language === 'bn' ? 'ফলাফল সংরক্ষণ' : 'Save Result'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </>
          )}
        </div>
      );

    case 'water_flow':
      return (
        <div className="space-y-4">
          <div className="text-center mb-6">
            <Droplets className="w-12 h-12 mx-auto text-primary mb-2" />
            <h3 className="text-lg font-semibold">
              {language === 'bn' ? 'ওয়াটার ফ্লো টেস্ট' : 'Water Flow Test'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {language === 'bn' ? '৬০ সেকেন্ড পালস প্যাটার্ন ডিটেকশন' : 'Detect pulse pattern for 60 seconds'}
            </p>
          </div>

          <div className="bg-muted/50 rounded-xl p-4 text-center">
            <p className="text-sm text-muted-foreground">
              {language === 'bn' ? 'বর্তমান ফ্লো' : 'Current Flow'}
            </p>
            <p className="text-3xl font-bold text-primary">
              {sensorData.waterUsage?.toFixed(1) ?? '--'} L/h
            </p>
          </div>

          {wizard.isTestRunning ? (
            <div className="space-y-4">
              <Progress value={wizard.testProgress} className="h-3" />
              <p className="text-center text-sm text-muted-foreground">
                {language === 'bn' ? '💧 পালস ডিটেকশন...' : '💧 Detecting pulses...'}
              </p>
            </div>
          ) : (
            <>
              <Button 
                className="w-full" 
                size="lg"
                onClick={wizard.runWaterFlowTest}
              >
                <Play className="w-5 h-5 mr-2" />
                {language === 'bn' ? 'টেস্ট শুরু করুন' : 'Start Test'}
              </Button>

              {wizard.testProgress === 100 && (
                <div className="space-y-3">
                  <div>
                    <Label>{language === 'bn' ? 'পালস প্যাটার্ন (পালস/মিনিট)' : 'Pulse Pattern (pulse/min)'}</Label>
                    <Input 
                      type="number" 
                      value={waterPulse} 
                      onChange={(e) => setWaterPulse(e.target.value)}
                      placeholder="450"
                    />
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={() => wizard.saveWaterFlowResult(Number(waterPulse) || sensorData.waterUsage || 0, true)}
                  >
                    {language === 'bn' ? 'ফলাফল সংরক্ষণ' : 'Save Result'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full"
                    onClick={() => wizard.saveWaterFlowResult(0, false)}
                  >
                    {language === 'bn' ? 'এড়িয়ে যান' : 'Skip'}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      );
    default:
      return null;
  }
}
