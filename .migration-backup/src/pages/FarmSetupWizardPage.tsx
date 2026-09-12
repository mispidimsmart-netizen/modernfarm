import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { HardwareValidation } from '@/components/setup/HardwareValidation';
import {
  StepFarmCreate,
  StepAddShed,
  StepSetChickAge,
  StepAutomationProfile,
} from '@/components/setup/steps/BasicSetupSteps';
import { StepRegisterController } from '@/components/setup/steps/StepRegisterController';
import {
  StepTestRelays,
  StepCalibrateSensors,
  StepSimulationTest,
} from '@/components/setup/steps/HardwareTestSteps';
import { useAuth } from '@/context/AuthContext';
import { useFarmSetupStatus, useUpdateSetupStep, SETUP_STEPS } from '@/hooks/useFarmSetup';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export default function FarmSetupWizardPage() {
  const { language } = useAuth();
  const navigate = useNavigate();
  const { data: setupStatus, isLoading } = useFarmSetupStatus();
  const updateStep = useUpdateSetupStep();
  const [activeStep, setActiveStep] = useState(1);

  useEffect(() => {
    if (setupStatus?.current_step) {
      setActiveStep(setupStatus.current_step);
    }
  }, [setupStatus?.current_step]);

  // If setup already completed, redirect
  useEffect(() => {
    if (setupStatus?.setup_completed) {
      navigate('/', { replace: true });
    }
  }, [setupStatus?.setup_completed, navigate]);

  const completeStep = async (stepNum: number) => {
    const stepConfig = SETUP_STEPS[stepNum - 1];
    const nextStep = stepNum + 1;

    const updates: Record<string, unknown> = {
      [stepConfig.key]: true,
      current_step: Math.min(nextStep, 9),
    };

    if (stepNum === 9) {
      updates.setup_completed = true;
      updates.setup_completed_at = new Date().toISOString();
    }

    await updateStep.mutateAsync(updates);

    if (stepNum === 9) {
      navigate('/', { replace: true });
    } else {
      setActiveStep(nextStep);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const progressPercent = ((activeStep - 1) / 9) * 100;

  const stepComponents: Record<number, React.ReactNode> = {
    1: <StepFarmCreate onComplete={() => completeStep(1)} />,
    2: <StepAddShed onComplete={() => completeStep(2)} />,
    3: <StepRegisterController onComplete={() => completeStep(3)} />,
    4: <StepTestRelays onComplete={() => completeStep(4)} />,
    5: <StepCalibrateSensors onComplete={() => completeStep(5)} />,
    6: <StepSetChickAge onComplete={() => completeStep(6)} />,
    7: <StepAutomationProfile onComplete={() => completeStep(7)} />,
    8: <HardwareValidation
         onComplete={async (results) => {
           await updateStep.mutateAsync({
             hardware_validation_passed: true,
             hardware_validation_at: new Date().toISOString(),
             hardware_validation_results: results,
             current_step: 9,
           });
           setActiveStep(9);
         }}
         onSkip={() => setActiveStep(9)}
       />,
    9: <StepSimulationTest onComplete={() => completeStep(9)} />,
  };

  const currentStepConfig = SETUP_STEPS[activeStep - 1];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-lg font-bold">
            {language === 'bn' ? '🚀 খামার সেটআপ' : '🚀 Farm Setup'}
          </h1>
          <span className="text-xs text-muted-foreground font-mono">
            {activeStep}/9
          </span>
        </div>
        <Progress value={progressPercent} className="h-2 rounded-full" />
      </div>

      {/* Step indicator strip */}
      <div className="flex gap-1 px-4 py-3 overflow-x-auto">
        {SETUP_STEPS.map((s, i) => {
          const stepNum = i + 1;
          const isCompleted = setupStatus?.[s.key as keyof typeof setupStatus] === true;
          const isActive = stepNum === activeStep;
          return (
            <button
              key={s.step}
              onClick={() => isCompleted || stepNum <= activeStep ? setActiveStep(stepNum) : null}
              className={`flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold transition-all ${
                isCompleted ? 'bg-primary text-primary-foreground' :
                isActive ? 'bg-primary/20 text-primary ring-2 ring-primary' :
                'bg-muted text-muted-foreground'
              }`}
            >
              {isCompleted ? '✓' : s.icon}
            </button>
          );
        })}
      </div>

      {/* Step content */}
      <div className="px-4 pb-8">
        <Card className="rounded-2xl border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="text-xl">{currentStepConfig.icon}</span>
              {language === 'bn' ? currentStepConfig.bn : currentStepConfig.en}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {stepComponents[activeStep]}
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Navigation */}
        {activeStep > 1 && (
          <Button
            variant="ghost"
            onClick={() => setActiveStep(prev => Math.max(1, prev - 1))}
            className="mt-3 w-full h-10 rounded-xl"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {language === 'bn' ? 'আগের ধাপ' : 'Previous Step'}
          </Button>
        )}
      </div>
    </div>
  );
}
