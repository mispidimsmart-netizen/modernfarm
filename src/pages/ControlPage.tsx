import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { ManualControlTimerDialog } from '@/components/assistant/ManualControlTimerDialog';
import { SafetyLockedDevices } from '@/components/control';
import { StateExplanationHeader } from '@/components/control/StateExplanationHeader';
import { WhyFanRunning } from '@/components/control/WhyFanRunning';
import { AutomationDecisionLog } from '@/components/control/AutomationDecisionLog';
import { FarmGuardBanner, ControlModeBanner, ControlSafetyFooter } from '@/components/control/ControlBanners';
import { ViewerRestrictionCard, TemporaryControlNoticeCard } from '@/components/control/ControlNotices';
import { ManualDeviceGrid } from '@/components/control/ManualDeviceGrid';
import { AutoDeviceGrid } from '@/components/control/AutoDeviceGrid';
import { ActiveTimersSummary } from '@/components/control/ActiveTimersSummary';
import { useControlPageState } from '@/hooks/useControlPageState';

export function ControlPage() {
  const c = useControlPageState();

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="page-container px-3 sm:px-4 md:px-6 lg:px-8 space-y-4 max-w-7xl mx-auto">
        {/* ===== FARM-NOT-SELECTED GUARD BANNER ===== */}
        {c.farmNotReady && (
          <FarmGuardBanner
            language={c.language}
            farmsLoading={c.farmsLoading}
            farmCount={c.farms?.length ?? 0}
          />
        )}

        {/* ===== MODE INDICATOR BANNER ===== */}
        <ControlModeBanner language={c.language} isManualMode={c.isManualMode} />

        {/* ===== 1. STATE EXPLANATION HEADER ===== */}
        <div className="w-full">
          <StateExplanationHeader />
        </div>

        {/* ===== 2. WHY FAN IS RUNNING (only in AUTO mode) ===== */}
        {!c.isManualMode && <WhyFanRunning />}

        {/* ===== 4. DEVICE CONTROL PANEL ===== */}
        {c.isManualMode ? (
          <div className="space-y-3">
            {c.isViewer && <ViewerRestrictionCard language={c.language} />}

            <ManualDeviceGrid
              devices={c.DEVICES}
              language={c.language}
              isDeviceActive={c.isDeviceActive}
              pendingCommands={c.pendingCommands}
              onToggle={c.handleManualToggle}
              temperature={c.sensorData.temperature}
              ammonia={c.sensorData.ammonia}
              tempMax={c.tempMax}
              ammoniaMax={c.ammoniaMax}
              engineEnabled={(c.farmSettings as any)?.safety_engine_enabled}
              disabled={c.farmNotReady || c.isViewer || !c.canFullControl}
            />
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-status-warning/40 bg-status-warning/10 p-4 space-y-3">
            {c.isViewer && <ViewerRestrictionCard language={c.language} />}

            {c.canTemporaryControl && !c.canFullControl && !c.isViewer && (
              <TemporaryControlNoticeCard language={c.language} />
            )}

            {/* Safety Locked Devices — hidden when Safety Engine is OFF */}
            {(c.farmSettings as any)?.safety_engine_enabled !== false && (
              <SafetyLockedDevices protections={c.safetyProtections} />
            )}

            {c.hasTemporaryOverrides && (
              <ActiveTimersSummary language={c.language} count={Object.keys(c.activeTimers).length} />
            )}

            <AutoDeviceGrid
              devices={c.DEVICES}
              isDeviceActive={c.isDeviceActive}
              getDeviceMode={c.getDeviceMode}
              getRemainingTime={c.getRemainingTime}
              activeTimers={c.activeTimers}
              temperature={c.sensorData.temperature}
              ammonia={c.sensorData.ammonia}
              tempMax={c.tempMax}
              ammoniaMax={c.ammoniaMax}
              engineEnabled={(c.farmSettings as any)?.safety_engine_enabled}
              onRunTemporarily={(d) => c.handleRunTemporarily(d.key, d.name, d.icon)}
              onStopTemporarily={(d) => c.handleStopTemporarily(d.key, d.name, d.icon)}
              onCancelOverride={c.handleCancelOverride}
              disabled={c.farmNotReady || !c.canTemporaryControl}
            />
          </div>
        )}

        {/* ===== 5. AUTOMATION DECISION LOG (only in AUTO mode) ===== */}
        {!c.isManualMode && <AutomationDecisionLog />}

        {/* ===== 6. SAFETY FOOTER ===== */}
        <ControlSafetyFooter language={c.language} />
      </main>

      {/* Timer Dialog (only used in AUTO mode) */}
      <ManualControlTimerDialog
        open={c.timerDialogOpen}
        onOpenChange={c.setTimerDialogOpen}
        deviceName={c.pendingDevice?.name || ''}
        deviceIcon={c.pendingDevice?.icon || null}
        intent={c.pendingDevice?.intent || 'on'}
        onConfirm={c.handleTimerConfirm}
        onCancel={() => c.setPendingDevice(null)}
      />

      <BottomNav />
    </div>
  );
}
