import { useState } from 'react';
import { Activity, AlertTriangle, Bug, Cloud, Cpu, FileCode, RotateCcw, Settings2, Shield, Zap } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useSheds } from '@/hooks/useSheds';
import { useAllDeviceHealth } from '@/hooks/useDeviceHealth';
import { DeviceHealthCard } from '@/components/device/DeviceHealthCard';
import { WorkerModeCard } from '@/components/settings/WorkerModeCard';
import { SeverityFeedbackToggle } from '@/components/settings/SeverityFeedbackToggle';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ESP32CodeGenerator } from '@/components/device/ESP32CodeGenerator';
import { DeviceSecuritySheet } from '@/components/device/DeviceSecuritySheet';
import { ThresholdSettingsCard } from '@/components/settings/ThresholdSettingsCard';
import { AdvancedAutomationSettingsCard } from '@/components/settings/AdvancedAutomationSettingsCard';
import { OTAFirmwareTab } from './OTAFirmwareTab';
import { CollapsibleSection } from '@/components/settings/device/CollapsibleSection';
import { useDeviceSystemData } from '@/components/settings/device/useDeviceSystemData';
import { DeviceManagementSection } from '@/components/settings/device/DeviceManagementSection';
import { SensorCalibrationSection } from '@/components/settings/device/SensorCalibrationSection';
import { LogsDebugSection } from '@/components/settings/device/LogsDebugSection';

/**
 * Settings → Device & System tab shell.
 * Data lives in `useDeviceSystemData`; each section is a presentational component.
 */
export function DeviceSystemTab() {
  const { language } = useAuth();
  const { data: permissions } = useUserPermissions();
  const isAdmin = permissions?.role === 'admin';
  const { data: sheds } = useSheds();
  const { data: deviceHealthList } = useAllDeviceHealth();
  const deviceHealth = deviceHealthList?.[0];

  const device = useDeviceSystemData();
  const [securityDevice, setSecurityDevice] = useState<{ id: string; name: string; version: number } | null>(null);
  const [showFactoryResetDialog, setShowFactoryResetDialog] = useState(false);

  return (
    <div className="space-y-4">
      {/* Worker Mode (S2.1) — owner sets PIN, opens /worker kiosk */}
      <WorkerModeCard />
      {/* Severity haptics + sound preference (S3.2) */}
      <SeverityFeedbackToggle />

      {!isAdmin ? (
        <>
          <Card className="bg-amber-500/10 border-amber-500/30">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-amber-700 dark:text-amber-300">
                    {language === 'bn' ? 'সীমিত অ্যাক্সেস' : 'Limited Access'}
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    {language === 'bn'
                      ? 'ডিভাইস ম্যানেজমেন্ট, ক্যালিব্রেশন, থ্রেশহোল্ড এবং অ্যাডভান্সড সেটিংস শুধুমাত্র অ্যাডমিন দেখতে ও পরিবর্তন করতে পারেন। আপনি শুধুমাত্র OTA ফার্মওয়্যার তথ্য দেখতে পারবেন।'
                      : 'Device management, calibration, thresholds, and advanced settings are admin-only. You can view OTA firmware information below.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <CollapsibleSection
            title="OTA Firmware"
            titleBn="OTA ফার্মওয়্যার"
            icon={Cloud}
            color="bg-cyan-500/10 text-cyan-500"
            defaultOpen
            language={language}
          >
            <OTAFirmwareTab />
          </CollapsibleSection>
        </>
      ) : (
        <>
          <Card className="bg-purple-500/10 border-purple-500/30">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="font-semibold text-purple-700 dark:text-purple-300">
                    {language === 'bn' ? 'অ্যাডমিন সেটিংস' : 'Admin Settings'}
                  </p>
                  <p className="text-xs text-purple-600 dark:text-purple-400">
                    {language === 'bn'
                      ? 'এই সেটিংস শুধুমাত্র প্রযুক্তিবিদদের জন্য'
                      : 'These settings are for technicians only'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <CollapsibleSection
            title="Device Management"
            titleBn="ডিভাইস ম্যানেজমেন্ট"
            icon={Cpu}
            color="bg-blue-500/10 text-blue-500"
            language={language}
          >
            <DeviceManagementSection
              language={language}
              deviceHealth={deviceHealth}
              sheds={sheds as any}
              deviceTokens={device.deviceTokens as any}
              addDeviceToken={device.addDeviceToken}
              deleteDeviceToken={device.deleteDeviceToken}
              onCopyToken={device.copyToClipboard}
              onRestartDevice={device.restartDevice}
              onOpenSecurity={setSecurityDevice}
            />
          </CollapsibleSection>

          <CollapsibleSection
            title="Code Generator"
            titleBn="কোড জেনারেটর"
            icon={FileCode}
            color="bg-blue-500/10 text-blue-500"
            language={language}
          >
            <div className="space-y-4">
              <Button
                variant="default"
                className="w-full"
                onClick={() => (window.location.href = '/device-setup')}
              >
                <FileCode className="mr-2 h-4 w-4" />
                {language === 'bn' ? 'ডিভাইস সেটআপ উইজার্ড (v8/v10)' : 'Device Setup Wizard (v8/v10)'}
              </Button>

              <ESP32CodeGenerator language={language} showFarmSelector={true} />

              <Separator />

              <Button
                variant="outline"
                className="w-full border-destructive/50 text-destructive hover:bg-destructive/10"
                onClick={() => setShowFactoryResetDialog(true)}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                {language === 'bn' ? 'ফ্যাক্টরি রিসেট' : 'Factory Reset'}
              </Button>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Sensor Calibration"
            titleBn="সেন্সর ক্যালিব্রেশন"
            icon={Settings2}
            color="bg-orange-500/10 text-orange-500"
            language={language}
          >
            <SensorCalibrationSection
              language={language}
              tempOffset={device.tempOffset}
              setTempOffset={device.setTempOffset}
              humidityOffset={device.humidityOffset}
              setHumidityOffset={device.setHumidityOffset}
              ammoniaOffset={device.ammoniaOffset}
              setAmmoniaOffset={device.setAmmoniaOffset}
              onSave={device.persistCalibration}
              saving={device.savingCalibration}
            />
          </CollapsibleSection>

          <CollapsibleSection
            title="Advanced Control"
            titleBn="এডভান্সড কন্ট্রোল"
            icon={Zap}
            color="bg-purple-500/10 text-purple-500"
            language={language}
          >
            <div className="space-y-4">
              <ThresholdSettingsCard />
              <Separator />
              <AdvancedAutomationSettingsCard />
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Logs & Debug"
            titleBn="লগ ও ডিবাগ"
            icon={Bug}
            color="bg-muted text-muted-foreground"
            language={language}
          >
            <LogsDebugSection
              language={language}
              showEventLogs={device.showEventLogs}
              setShowEventLogs={device.setShowEventLogs}
              showErrorLogs={device.showErrorLogs}
              setShowErrorLogs={device.setShowErrorLogs}
              eventLogs={device.eventLogs as any}
              errorLogs={device.errorLogs as any}
              refetchEventLogs={device.refetchEventLogs}
              refetchErrorLogs={device.refetchErrorLogs}
            />
          </CollapsibleSection>

          <CollapsibleSection
            title="OTA Firmware"
            titleBn="OTA ফার্মওয়্যার"
            icon={Cloud}
            color="bg-cyan-500/10 text-cyan-500"
            language={language}
          >
            <OTAFirmwareTab />
          </CollapsibleSection>
        </>
      )}

      {/* Device Health — visible to ALL users (own farm only via RLS) */}
      {deviceHealthList && deviceHealthList.length > 0 && (
        <CollapsibleSection
          title="Device Health"
          titleBn="ডিভাইস হেলথ"
          icon={Activity}
          color="bg-green-500/10 text-green-500"
          language={language}
        >
          <div className="space-y-3">
            {deviceHealthList.map((health) => (
              <DeviceHealthCard key={health.id} device={health} deviceName={health.device_token_id} />
            ))}
          </div>
        </CollapsibleSection>
      )}

      <AlertDialog open={showFactoryResetDialog} onOpenChange={setShowFactoryResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <AlertDialogTitle>{language === 'bn' ? 'ফ্যাক্টরি রিসেট?' : 'Factory Reset?'}</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="pt-2">
              {language === 'bn'
                ? 'এটি ডিভাইসের সকল সেটিংস মুছে ফেলবে এবং ডিফল্ট অবস্থায় ফিরিয়ে আনবে।'
                : 'This will erase all device settings and restore to factory defaults.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{language === 'bn' ? 'বাতিল' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowFactoryResetDialog(false);
                device.factoryReset();
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              {language === 'bn' ? 'হ্যাঁ, রিসেট করুন' : 'Yes, Reset'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DeviceSecuritySheet
        open={!!securityDevice}
        onOpenChange={(o) => !o && setSecurityDevice(null)}
        deviceTokenId={securityDevice?.id}
        deviceName={securityDevice?.name}
        secretVersion={securityDevice?.version}
      />
    </div>
  );
}
