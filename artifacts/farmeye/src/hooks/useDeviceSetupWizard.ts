import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { verifyFirmwareContent } from '@/lib/firmwareVerifier';
import {
  RELAY_MAP_V8,
  RELAY_MAP_V10,
  SENSORS_V8,
  SENSORS_V10,
  STEPS,
  type HwVersion,
  type StepKey,
} from '@/components/device/setup-wizard/wizardConstants';

/**
 * State machine + firmware download/verification logic for the Device Setup Wizard.
 * Behaviour is unchanged from the previous inline implementation.
 */
export function useDeviceSetupWizard() {
  const [stepIdx, setStepIdx] = useState(0);
  const [version, setVersion] = useState<HwVersion | null>(null);
  const [wiringConfirmed, setWiringConfirmed] = useState(false);
  const [selectedSensors, setSelectedSensors] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [finalAck, setFinalAck] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const step: StepKey = STEPS[stepIdx].key;
  const progress = ((stepIdx + 1) / STEPS.length) * 100;

  const relayMap = version === 'v10' ? RELAY_MAP_V10 : RELAY_MAP_V8;
  const sensorList = version === 'v10' ? SENSORS_V10 : SENSORS_V8;

  const handleVersionPick = (v: HwVersion) => {
    setVersion(v);
    const list = v === 'v10' ? SENSORS_V10 : SENSORS_V8;
    setSelectedSensors(list.filter((s) => s.required || s.recommended).map((s) => s.id));
    setWiringConfirmed(false);
  };

  const toggleSensor = (id: string) => {
    setSelectedSensors((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const canNext = useMemo(() => {
    if (step === 'version') return version !== null;
    if (step === 'wiring') return wiringConfirmed;
    if (step === 'sensors') {
      const tempOk =
        version === 'v8'
          ? selectedSensors.includes('dht22')
          : selectedSensors.includes('sht31') || selectedSensors.includes('dht22');
      return tempOk;
    }
    return true;
  }, [step, version, wiringConfirmed, selectedSensors]);

  const firmwareFile = version === 'v10' ? '/esp32-industrial-v10.ino' : '/esp32-industrial.ino';
  const firmwareLabel = version === 'v10' ? 'Industrial v10 (Beta)' : 'Industrial v8 (Stable)';

  const downloadFirmware = async () => {
    if (!version) return;
    setIsVerifying(true);
    try {
      const url = `${firmwareFile}?t=${Date.now()}&r=${Math.random().toString(36).slice(2, 10)}`;
      const res = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const content = await res.text();
      const verify = verifyFirmwareContent(content, version);
      if (!verify.matches) {
        toast.error(
          `ভেরিফিকেশন ব্যর্থ: প্রত্যাশিত ${version.toUpperCase()}, পাওয়া গেছে ${verify.detected.toUpperCase()}। ডাউনলোড বাতিল।`
        );
        return;
      }
      const blob = new Blob([content], { type: 'text/plain' });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = version === 'v10' ? 'esp32-industrial-v10.ino' : 'esp32-industrial.ino';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      toast.success(`${firmwareLabel} ডাউনলোড শুরু হলো — ${version.toUpperCase()} verified ✓`);
      setConfirmOpen(false);
      setFinalAck(false);
    } catch (e) {
      toast.error(`ডাউনলোড ব্যর্থ: ${(e as Error).message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  const openConfirm = () => {
    if (!version) return;
    setFinalAck(false);
    setConfirmOpen(true);
  };

  const goNext = () => setStepIdx((i) => Math.min(i + 1, STEPS.length - 1));
  const goBack = () => setStepIdx((i) => Math.max(i - 1, 0));

  return {
    stepIdx,
    step,
    progress,
    version,
    handleVersionPick,
    wiringConfirmed,
    setWiringConfirmed,
    selectedSensors,
    toggleSensor,
    relayMap,
    sensorList,
    canNext,
    firmwareFile,
    firmwareLabel,
    confirmOpen,
    setConfirmOpen,
    finalAck,
    setFinalAck,
    isVerifying,
    downloadFirmware,
    openConfirm,
    goNext,
    goBack,
  };
}
