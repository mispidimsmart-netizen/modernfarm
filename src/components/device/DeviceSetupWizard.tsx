import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDeviceSetupWizard } from '@/hooks/useDeviceSetupWizard';
import { STEPS } from './setup-wizard/wizardConstants';
import { WizardStepper } from './setup-wizard/WizardStepper';
import { VersionStep } from './setup-wizard/VersionStep';
import { WiringStep } from './setup-wizard/WiringStep';
import { SensorsStep } from './setup-wizard/SensorsStep';
import { SummaryStep } from './setup-wizard/SummaryStep';
import { DownloadConfirmDialog } from './setup-wizard/DownloadConfirmDialog';

export function DeviceSetupWizard() {
  const navigate = useNavigate();
  const w = useDeviceSetupWizard();

  return (
    <div className="space-y-4 max-w-3xl mx-auto pb-24">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> ফিরে যান
        </Button>
        <Badge variant="outline" className="text-[11px]">
          ধাপ {w.stepIdx + 1} / {STEPS.length}
        </Badge>
      </div>

      <WizardStepper stepIdx={w.stepIdx} progress={w.progress} />

      {w.step === 'version' && <VersionStep version={w.version} onPick={w.handleVersionPick} />}

      {w.step === 'wiring' && w.version && (
        <WiringStep
          version={w.version}
          relayMap={w.relayMap}
          wiringConfirmed={w.wiringConfirmed}
          setWiringConfirmed={w.setWiringConfirmed}
          onOpenGuide={() => navigate('/installation-guide')}
        />
      )}

      {w.step === 'sensors' && w.version && (
        <SensorsStep
          version={w.version}
          sensorList={w.sensorList}
          selectedSensors={w.selectedSensors}
          toggleSensor={w.toggleSensor}
          canNext={w.canNext}
        />
      )}

      {w.step === 'summary' && w.version && (
        <SummaryStep
          version={w.version}
          firmwareFile={w.firmwareFile}
          firmwareLabel={w.firmwareLabel}
          relayMap={w.relayMap}
          sensorList={w.sensorList}
          selectedSensors={w.selectedSensors}
          onDownload={w.openConfirm}
          onOpenGenerator={() => navigate('/settings?tab=device')}
        />
      )}

      <div className="flex items-center justify-between gap-2 sticky bottom-2">
        <Button variant="outline" onClick={w.goBack} disabled={w.stepIdx === 0}>
          <ArrowLeft className="h-4 w-4 mr-1" /> পেছনে
        </Button>
        {w.stepIdx < STEPS.length - 1 ? (
          <Button onClick={w.goNext} disabled={!w.canNext}>
            পরবর্তী <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button variant="default" onClick={() => navigate('/settings?tab=device')}>
            <CheckCircle2 className="h-4 w-4 mr-1" /> সম্পন্ন
          </Button>
        )}
      </div>

      <DownloadConfirmDialog
        open={w.confirmOpen}
        onOpenChange={(o) => {
          w.setConfirmOpen(o);
          if (!o) w.setFinalAck(false);
        }}
        version={w.version}
        firmwareFile={w.firmwareFile}
        finalAck={w.finalAck}
        setFinalAck={w.setFinalAck}
        isVerifying={w.isVerifying}
        onConfirm={w.downloadFirmware}
      />
    </div>
  );
}

export default DeviceSetupWizard;
