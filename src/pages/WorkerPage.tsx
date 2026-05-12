/**
 * WorkerPage (/worker) — Worker Mode kiosk dashboard (S2.1, Standard scope)
 *
 * Shows:
 *   - Big read-only KPI tiles (temp · humidity · ammonia · water)
 *   - 4 large hold-to-confirm relay toggles (Fan · Heater · Water · Light)
 *   - "Feed log" + "Mortality" entry buttons (open existing sheets)
 *   - PIN-locked exit (re-enter PIN to leave)
 *
 * No settings, no finance, no AI panels — by design.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Fan, Flame, Droplets, Lightbulb, Wheat, Skull, LogOut, Lock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useFarmContext } from '@/context/FarmContext';
import { useRealtimeSensorData, useRealtimeDeviceStatus } from '@/hooks/useRealtimeSensorData';
import { useSendDeviceCommand } from '@/hooks/useDeviceCommands';
import {
  useIsWorkerUnlocked,
  lockWorkerDevice,
} from '@/hooks/useWorkerPin';
import { HoldToConfirmButton } from '@/components/ui/hold-to-confirm-button';
import { Button } from '@/components/ui/button';
import { WorkerLockScreen } from '@/components/worker/WorkerLockScreen';
import { IndustrialKpiGrid } from '@/components/dashboard/IndustrialKpiGrid';
import { FeedManagementSheet } from '@/components/farm/FeedManagementSheet';
import { MortalitySheet } from '@/components/farm/MortalitySheet';
import { FailedCommandsBanner } from '@/components/control/FailedCommandsBanner';
import { cn } from '@/lib/utils';

type Relay = 'fan' | 'heater' | 'sprinkler' | 'light';

interface RelayConfig {
  key: Relay;
  Icon: typeof Fan;
  label: { bn: string; en: string };
  isOn: boolean;
}

export function WorkerPage() {
  const { language } = useAuth();
  const { currentFarm, selectedFarmId } = useFarmContext();
  const unlocked = useIsWorkerUnlocked();
  const [version, setVersion] = useState(0); // force re-eval after unlock
  const isUnlocked = unlocked || version > 0; // local override after success

  const { status: deviceStatus } = useRealtimeDeviceStatus();
  const sendCmd = useSendDeviceCommand();
  const [feedOpen, setFeedOpen] = useState(false);
  const [mortalityOpen, setMortalityOpen] = useState(false);

  if (!selectedFarmId) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center text-muted-foreground">
        {language === 'bn' ? 'কোনো খামার নির্বাচিত নয়।' : 'No farm selected.'}
      </div>
    );
  }

  if (!isUnlocked) {
    return <WorkerLockScreen onUnlocked={() => setVersion(v => v + 1)} />;
  }

  const relays: RelayConfig[] = [
    { key: 'fan',       Icon: Fan,      label: { bn: 'ফ্যান',  en: 'Fan' },     isOn: deviceStatus.fan },
    { key: 'heater',    Icon: Flame,    label: { bn: 'হিটার',  en: 'Heater' },  isOn: deviceStatus.heater },
    { key: 'sprinkler', Icon: Droplets, label: { bn: 'পানি',   en: 'Water' },   isOn: deviceStatus.sprinkler },
    { key: 'light',     Icon: Lightbulb,label: { bn: 'লাইট',   en: 'Light' },   isOn: deviceStatus.light },
  ];

  const handleLock = () => {
    if (selectedFarmId) lockWorkerDevice(selectedFarmId);
    setVersion(0);
    // Force re-render by reloading route state
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background pb-10">
      {/* Header — minimal, no nav */}
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between gap-2 px-3 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Lock size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {language === 'bn' ? 'কর্মী মোড' : 'Worker Mode'}
              </p>
              <p className="truncate text-sm font-semibold text-foreground">
                {currentFarm ? (language === 'bn' ? currentFarm.name : currentFarm.name_en) : '—'}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLock} className="flex-shrink-0">
            <LogOut size={16} className="mr-1" />
            {language === 'bn' ? 'লক' : 'Lock'}
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-4 px-3 pt-4">
        {/* 1. KPI strip — read only */}
        <section aria-label={language === 'bn' ? 'সেন্সর সারাংশ' : 'Sensor summary'}>
          <IndustrialKpiGrid />
        </section>

        {/* 2. Big relay toggles */}
        <section aria-label={language === 'bn' ? 'যন্ত্র নিয়ন্ত্রণ' : 'Device controls'}>
          <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {language === 'bn' ? 'নিয়ন্ত্রণ' : 'Controls'}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {relays.map(({ key, Icon, label, isOn }) => {
              const target = !isOn;
              return (
                <div
                  key={key}
                  className={cn(
                    'rounded-2xl border bg-card p-3 shadow-sm',
                    isOn ? 'ring-2 ring-primary/30' : ''
                  )}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-xl',
                      isOn ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    )}>
                      <Icon size={20} />
                    </div>
                    <span className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                      isOn ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                    )}>
                      {isOn
                        ? (language === 'bn' ? 'চালু' : 'ON')
                        : (language === 'bn' ? 'বন্ধ' : 'OFF')}
                    </span>
                  </div>
                  <p className="mb-2 text-base font-bold text-foreground">{label[language]}</p>
                  <HoldToConfirmButton
                    onConfirm={() => sendCmd.mutate({ commandType: key, commandValue: target })}
                    holdMs={700}
                    variant={target ? 'primary' : 'destructive'}
                    label={
                      target
                        ? (language === 'bn' ? 'চাপুন: চালু' : 'Hold: Turn ON')
                        : (language === 'bn' ? 'চাপুন: বন্ধ' : 'Hold: Turn OFF')
                    }
                    holdingLabel={language === 'bn' ? 'অপেক্ষা…' : 'Holding…'}
                    icon={<Icon size={14} />}
                    className="w-full h-11 text-sm font-semibold"
                  />
                </div>
              );
            })}
          </div>
        </section>

        {/* 3. Daily log entries */}
        <section aria-label={language === 'bn' ? 'দৈনিক এন্ট্রি' : 'Daily entries'}>
          <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {language === 'bn' ? 'দৈনিক এন্ট্রি' : 'Daily Log'}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFeedOpen(true)}
              className="flex flex-col items-start gap-2 rounded-2xl border bg-card p-4 text-left shadow-sm transition active:scale-[0.98] hover:bg-accent"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400">
                <Wheat size={22} />
              </div>
              <div>
                <p className="text-base font-bold text-foreground">
                  {language === 'bn' ? 'ফিড লগ' : 'Feed Log'}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {language === 'bn' ? 'আজকের খাদ্য এন্ট্রি' : "Add today's feed"}
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setMortalityOpen(true)}
              className="flex flex-col items-start gap-2 rounded-2xl border bg-card p-4 text-left shadow-sm transition active:scale-[0.98] hover:bg-accent"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/15 text-red-700 dark:text-red-400">
                <Skull size={22} />
              </div>
              <div>
                <p className="text-base font-bold text-foreground">
                  {language === 'bn' ? 'মৃত্যু এন্ট্রি' : 'Mortality'}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {language === 'bn' ? 'নতুন মৃত্যু রেকর্ড' : 'Add new mortality'}
                </p>
              </div>
            </button>
          </div>
        </section>

        {/* Footer note */}
        <p className="px-1 pt-2 text-center text-[10px] text-muted-foreground">
          {language === 'bn'
            ? 'কর্মী মোড — সীমিত নিয়ন্ত্রণ। সম্পূর্ণ অ্যাক্সেসের জন্য মালিককে কল করুন।'
            : 'Worker Mode — limited controls. Contact owner for full access.'}
          {' · '}
          <Link to="/login" className="underline">
            {language === 'bn' ? 'মালিক লগইন' : 'Owner login'}
          </Link>
        </p>
      </main>

      <FeedManagementSheet open={feedOpen} onOpenChange={setFeedOpen} />
      <MortalitySheet open={mortalityOpen} onOpenChange={setMortalityOpen} />
    </div>
  );
}

export default WorkerPage;
