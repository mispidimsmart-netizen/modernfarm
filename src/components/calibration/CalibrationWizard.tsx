import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Ruler, Wind, Thermometer, Flame, Droplets, CheckCircle2, 
  AlertTriangle, ArrowRight, ArrowLeft, RotateCcw, Play, 
  Check, X, Loader2, Gauge
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCalibrationWizard, CalibrationStep } from '@/hooks/useCalibrationWizard';
import { useRealtimeSensorData } from '@/hooks/useRealtimeSensorData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

const STEPS: { id: CalibrationStep; icon: React.ElementType; label: { bn: string; en: string } }[] = [
  { id: 'dimensions', icon: Ruler, label: { bn: 'মাত্রা', en: 'Dimensions' } },
  { id: 'fan_direction', icon: Wind, label: { bn: 'ফ্যান', en: 'Fan' } },
  { id: 'temp_sensor', icon: Thermometer, label: { bn: 'তাপমাত্রা', en: 'Temp' } },
  { id: 'ammonia_baseline', icon: Gauge, label: { bn: 'গ্যাস', en: 'Gas' } },
  { id: 'heater_response', icon: Flame, label: { bn: 'হিটার', en: 'Heater' } },
  { id: 'water_flow', icon: Droplets, label: { bn: 'পানি', en: 'Water' } },
  { id: 'complete', icon: CheckCircle2, label: { bn: 'সম্পন্ন', en: 'Done' } },
];

interface CalibrationWizardProps {
  deviceTokenId?: string;
  shedId?: string;
  onComplete?: () => void;
}

export function CalibrationWizard({ deviceTokenId, shedId, onComplete }: CalibrationWizardProps) {
  const { language } = useAuth();
  const { sensorData } = useRealtimeSensorData();
  const wizard = useCalibrationWizard(deviceTokenId, shedId);
  
  // Form states
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [waterPulse, setWaterPulse] = useState('');

  // Pre-fill from existing data
  useEffect(() => {
    if (wizard.calibrationData) {
      if (wizard.calibrationData.farm_length_meters) setLength(String(wizard.calibrationData.farm_length_meters));
      if (wizard.calibrationData.farm_width_meters) setWidth(String(wizard.calibrationData.farm_width_meters));
      if (wizard.calibrationData.farm_height_meters) setHeight(String(wizard.calibrationData.farm_height_meters));
    }
  }, [wizard.calibrationData]);

  const currentStepIndex = STEPS.findIndex(s => s.id === wizard.currentStep);

  const renderStepContent = () => {
    switch (wizard.currentStep) {
      case 'dimensions':
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <Ruler className="w-12 h-12 mx-auto text-primary mb-2" />
              <h3 className="text-lg font-semibold">
                {language === 'bn' ? 'খামারের মাত্রা দিন' : 'Enter Farm Dimensions'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {language === 'bn' ? 'সঠিক ভেন্টিলেশন গণনার জন্য প্রয়োজন' : 'Required for ventilation calculation'}
              </p>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="length">{language === 'bn' ? 'দৈর্ঘ্য (মিটার)' : 'Length (m)'}</Label>
                <Input 
                  id="length"
                  type="number" 
                  value={length} 
                  onChange={(e) => setLength(e.target.value)}
                  placeholder="30"
                />
              </div>
              <div>
                <Label htmlFor="width">{language === 'bn' ? 'প্রস্থ (মিটার)' : 'Width (m)'}</Label>
                <Input 
                  id="width"
                  type="number" 
                  value={width} 
                  onChange={(e) => setWidth(e.target.value)}
                  placeholder="10"
                />
              </div>
              <div>
                <Label htmlFor="height">{language === 'bn' ? 'উচ্চতা (মিটার)' : 'Height (m)'}</Label>
                <Input 
                  id="height"
                  type="number" 
                  value={height} 
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="3"
                />
              </div>
            </div>

            {length && width && height && (
              <div className="bg-muted/50 rounded-xl p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  {language === 'bn' ? 'বায়ু আয়তন' : 'Air Volume'}
                </p>
                <p className="text-2xl font-bold text-primary">
                  {(Number(length) * Number(width) * Number(height)).toFixed(0)} m³
                </p>
              </div>
            )}

            <Button 
              className="w-full" 
              disabled={!length || !width || !height}
              onClick={() => wizard.saveDimensions(Number(length), Number(width), Number(height))}
            >
              {language === 'bn' ? 'পরবর্তী' : 'Next'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        );

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

      case 'complete':
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

      default:
        return null;
    }
  };

  if (wizard.isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Step Indicator */}
      <div className="flex items-center justify-between px-2">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isActive = wizard.currentStep === step.id;
          const isPast = currentStepIndex > index;
          
          return (
            <div key={step.id} className="flex flex-col items-center">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  isActive 
                    ? 'bg-primary text-primary-foreground' 
                    : isPast 
                      ? 'bg-green-500 text-white'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {isPast ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className={`text-[10px] mt-1 ${isActive ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                {step.label[language]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <Progress value={(currentStepIndex / (STEPS.length - 1)) * 100} className="h-1" />

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={wizard.currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {renderStepContent()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// Sheet wrapper for easy integration
export function CalibrationWizardSheet({ 
  children, 
  deviceTokenId, 
  shedId,
  onComplete 
}: { 
  children: React.ReactNode;
  deviceTokenId?: string;
  shedId?: string;
  onComplete?: () => void;
}) {
  const { language } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>
            {language === 'bn' ? '🔧 ইনস্টলেশন ক্যালিব্রেশন উইজার্ড' : '🔧 Installation Calibration Wizard'}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 overflow-y-auto max-h-[calc(85vh-100px)]">
          <CalibrationWizard 
            deviceTokenId={deviceTokenId}
            shedId={shedId}
            onComplete={() => {
              onComplete?.();
              setOpen(false);
            }}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
