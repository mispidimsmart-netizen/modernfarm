import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Ruler, Wind, Thermometer, Flame, Droplets, CheckCircle2,
  ArrowRight, Check, Loader2, Gauge, Settings2
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCalibrationWizard, CalibrationStep, AutomationDefaults } from '@/hooks/useCalibrationWizard';
import { useRealtimeSensorData } from '@/hooks/useRealtimeSensorData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { DEFAULT_AUTOMATION, validateAutomationDefaults, isBlockingWarning } from '@/lib/calibration';
import { AutomationDefaultsStep } from './steps/AutomationDefaultsStep';
import { SensorTestSteps } from './steps/SensorTestSteps';
import { CalibrationCompleteStep } from './steps/CalibrationCompleteStep';


const STEPS: { id: CalibrationStep; icon: React.ElementType; label: { bn: string; en: string } }[] = [
  { id: 'dimensions', icon: Ruler, label: { bn: 'মাত্রা', en: 'Dimensions' } },
  { id: 'automation_defaults', icon: Settings2, label: { bn: 'সেটিংস', en: 'Settings' } },
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
  
  // Automation defaults state (SSOT + validation live in src/lib/calibration.ts)
  const [automationDefaults, setAutomationDefaults] = useState<AutomationDefaults>(DEFAULT_AUTOMATION);

  const validationWarnings = useMemo(
    () => validateAutomationDefaults(automationDefaults, language === 'bn' ? 'bn' : 'en'),
    [automationDefaults, language],
  );

  const hasErrors = validationWarnings.some(isBlockingWarning);

  const resetToDefaults = () => {
    setAutomationDefaults(DEFAULT_AUTOMATION);
  };


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

      case 'automation_defaults':
        return (
          <AutomationDefaultsStep
            language={language === 'bn' ? 'bn' : 'en'}
            wizard={wizard}
            automationDefaults={automationDefaults}
            setAutomationDefaults={setAutomationDefaults}
            validationWarnings={validationWarnings}
            hasErrors={hasErrors}
            resetToDefaults={resetToDefaults}
          />
        );

      case 'fan_direction':
      case 'temp_sensor':
      case 'ammonia_baseline':
      case 'heater_response':
      case 'water_flow':
        return (
          <SensorTestSteps
            step={wizard.currentStep}
            language={language === 'bn' ? 'bn' : 'en'}
            wizard={wizard}
            sensorData={sensorData}
            waterPulse={waterPulse}
            setWaterPulse={setWaterPulse}
          />
        );

      case 'complete':
        return (
          <CalibrationCompleteStep
            language={language === 'bn' ? 'bn' : 'en'}
            wizard={wizard}
            onComplete={onComplete}
          />
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
