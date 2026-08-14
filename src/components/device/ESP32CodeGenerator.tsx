import { useState, useEffect } from 'react';
import { Download, Sparkles, Loader2, CheckCircle2, Cpu, CloudDownload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { z } from 'zod';
import { verifyFirmwareContent } from '@/lib/firmwareVerifier';
import {
  configSchema,
  otaConfigSchema,
  type FarmType,
  type FirmwareMode,
  type FirmwareVersion,
  type HardwareVersion,
  type Language,
  type VerifyErrorState,
} from './codegen/types';
import { getCodegenLabels } from './codegen/labels';
import { buildFilename, buildTemplateUrl, buildV10Firmware, buildV8Firmware } from './codegen/firmwareBuilder';
import { fetchNoStore, triggerDownload } from './codegen/firmwareDownload';
import { useFirmwareCredentials } from './codegen/useFirmwareCredentials';
import { FarmSelectorSection } from './codegen/FarmSelectorSection';
import { VersionSelectors } from './codegen/VersionSelectors';
import { FirmwareModeSection } from './codegen/FirmwareModeSection';
import { WifiTokenSection } from './codegen/WifiTokenSection';
import { FarmTypeSafetySection } from './codegen/FarmTypeSafetySection';
import { VerifyErrorGuide } from './codegen/VerifyErrorGuide';
import { ConfirmDownloadDialog } from './codegen/ConfirmDownloadDialog';

interface ESP32CodeGeneratorProps {
  language?: Language;
  showFarmSelector?: boolean;
}

/**
 * ESP32 firmware generator — orchestrates config state, verification and the
 * gated download flow. Presentation lives in ./codegen/*, pure transforms in
 * ./codegen/firmwareBuilder.ts.
 */
export function ESP32CodeGenerator({ language = 'bn', showFarmSelector = false }: ESP32CodeGeneratorProps) {
  const [ssid, setSsid] = useState(() => localStorage.getItem('farmeye_wifi_ssid') || '');
  // SECURITY: WiFi password is intentionally NOT persisted (was vulnerable to XSS).
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDownloading, setIsDownloading] = useState(false);
  const [farmType, setFarmType] = useState<FarmType>('layer');
  const [firmwareMode, setFirmwareMode] = useState<FirmwareMode>('hardcoded');
  const [firmwareVersion, setFirmwareVersion] = useState<FirmwareVersion>('v8');
  const [hardwareVersion, setHardwareVersion] = useState<HardwareVersion>('unknown');
  const [mismatchAck, setMismatchAck] = useState(false);
  const [includeSafetyEngine, setIncludeSafetyEngine] = useState(true);
  const [hasDisplay, setHasDisplay] = useState(false);
  const [verifyError, setVerifyError] = useState<VerifyErrorState | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [finalAck, setFinalAck] = useState(false);

  const {
    allFarms, selectedFarmId, selectFarm, farmId,
    shedId, setShedId, shedName, setShedName,
    deviceToken, setDeviceToken, autoLoaded,
  } = useFirmwareCredentials(showFarmSelector);

  // Auto-fill SSID next session (password intentionally NOT stored)
  useEffect(() => {
    if (ssid) localStorage.setItem('farmeye_wifi_ssid', ssid);
  }, [ssid]);

  // Cleanup any previously persisted password from older versions
  useEffect(() => {
    localStorage.removeItem('farmeye_wifi_pass');
  }, []);

  const t = getCodegenLabels(language);

  const validateInputs = () => {
    try {
      if (firmwareMode === 'ota') otaConfigSchema.parse({ shedId, shedName });
      else configSchema.parse({ ssid, password, deviceToken, shedId, shedName });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.issues.forEach((err) => {
          if (err.path[0]) newErrors[err.path[0] as string] = err.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const isMismatch = hardwareVersion !== 'unknown' && hardwareVersion !== firmwareVersion;

  /** Shared pre-flight checks for both the confirm dialog and the actual download. */
  const preflight = () => {
    if (!validateInputs()) {
      toast.error(t.fillAllFields);
      return false;
    }
    if (hardwareVersion === 'unknown') {
      toast.error(language === 'bn'
        ? 'প্রথমে device-এর hardware version (v8/v10) select করুন'
        : 'Please select the device hardware version (v8/v10) first');
      return false;
    }
    if (isMismatch && !mismatchAck) {
      toast.error(language === 'bn'
        ? `⚠️ Hardware ${hardwareVersion.toUpperCase()} কিন্তু firmware ${firmwareVersion.toUpperCase()} — mismatch! নিচের checkbox-এ tick দিয়ে confirm করুন।`
        : `⚠️ Hardware is ${hardwareVersion.toUpperCase()} but firmware is ${firmwareVersion.toUpperCase()} — mismatch! Tick the confirm checkbox.`,
        { duration: 7000 });
      return false;
    }
    return true;
  };

  const openConfirm = () => {
    if (!preflight()) return;
    setFinalAck(false);
    setConfirmOpen(true);
  };

  const downloadPreparedFirmware = async () => {
    if (!preflight()) return;

    setIsDownloading(true);
    setVerifyError(null);
    try {
      // Cache-busted fetch so no stale .ino is ever served
      const templateUrl = buildTemplateUrl(firmwareVersion);
      const response = await fetchNoStore(templateUrl);
      if (!response.ok) throw new Error('Failed to fetch firmware template');
      const template = await response.text();

      // CONTENT VERIFICATION — see src/lib/firmwareVerifier.ts
      const verify = verifyFirmwareContent(template, firmwareVersion);
      if (!verify.matches) {
        setVerifyError({ expected: firmwareVersion, detected: verify.detected, url: templateUrl });
        toast.error(
          language === 'bn'
            ? '❌ যাচাই ব্যর্থ — নিচের গাইড দেখুন এবং Retry চাপুন।'
            : '❌ Verification failed — see the guide below and press Retry.',
          { duration: 6000 },
        );
        setIsDownloading(false);
        return;
      }
      console.info(
        `[FirmwareGen] ✓ Verified ${verify.detected.toUpperCase()} content (${template.length} bytes) from ${templateUrl}`,
      );

      const buildOptions = {
        ssid, password, deviceToken, shedId, shedName, farmId,
        farmType, firmwareMode, includeSafetyEngine,
      };

      // ── v10 BETA path (hardcoded only) ────────────────────────────────
      if (firmwareVersion === 'v10') {
        if (firmwareMode === 'ota') {
          toast.error(language === 'bn'
            ? 'v10 Beta এখনো OTA mode template support করে না — Hardcoded mode ব্যবহার করুন'
            : 'v10 Beta does not yet support OTA template mode — use Hardcoded mode');
          setIsDownloading(false);
          return;
        }
        await triggerDownload(
          buildV10Firmware(template, buildOptions),
          buildFilename('v10', firmwareMode, farmType),
        );
        setVerifyError(null);
        toast.success(language === 'bn'
          ? '✅ v10 Beta firmware ডাউনলোড হয়েছে! শুধুমাত্র নতুন v10 hardware-এ flash করুন।'
          : '✅ v10 Beta firmware downloaded! Flash only on new v10 hardware.',
          { duration: 6000 });
        setIsDownloading(false);
        return;
      }

      // ── v8 STABLE path ────────────────────────────────────────────────
      await triggerDownload(
        buildV8Firmware(template, buildOptions),
        buildFilename('v8', firmwareMode, farmType),
      );

      // Then the required safety engine header (sequential — avoids popup blocking)
      try {
        const headerResponse = await fetch('/esp32-safety-engine.h?t=' + Date.now());
        if (headerResponse.ok) {
          const headerCode = await headerResponse.text();
          await new Promise((r) => setTimeout(r, 800));
          await triggerDownload(headerCode, 'esp32-safety-engine.h');
        }
      } catch (headerErr) {
        console.warn('Could not download safety header:', headerErr);
      }

      setVerifyError(null);
      toast.success(
        language === 'bn'
          ? '✅ ফার্মওয়্যার + Safety Engine হেডার ডাউনলোড হয়েছে! দুটি ফাইল একই ফোল্ডারে রাখুন।'
          : '✅ Firmware + Safety Engine header downloaded! Keep both files in the same folder.',
        { duration: 6000 },
      );
    } catch (error) {
      console.error('Download error:', error);
      toast.error(t.downloadFailed);
    } finally {
      setIsDownloading(false);
    }
  };

  const isValid = firmwareMode === 'ota'
    ? true
    : ssid.trim().length > 0 && password.length >= 8 && deviceToken.trim().length >= 10;

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          {t.title}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{t.subtitle}</p>

        <div className="mt-3 p-3 bg-muted/50 rounded-lg">
          <p className="text-xs font-medium mb-2 flex items-center gap-1">
            <Cpu className="h-3 w-3" />
            {t.firmwareFeatures}
          </p>
          <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
            <span>{t.feature1}</span>
            <span>{t.feature2}</span>
            <span>{t.feature3}</span>
            <span>{t.feature4}</span>
            <span>{t.feature5}</span>
            <span>{t.feature6}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {showFarmSelector && (
          <FarmSelectorSection
            language={language}
            allFarms={allFarms}
            selectedFarmId={selectedFarmId}
            onSelect={selectFarm}
            deviceToken={deviceToken}
            autoLoaded={autoLoaded}
          />
        )}

        <VersionSelectors
          language={language}
          hardwareVersion={hardwareVersion}
          setHardwareVersion={setHardwareVersion}
          firmwareVersion={firmwareVersion}
          setFirmwareVersion={setFirmwareVersion}
          isMismatch={isMismatch}
          mismatchAck={mismatchAck}
          setMismatchAck={setMismatchAck}
        />

        <FirmwareModeSection
          language={language}
          t={t}
          firmwareMode={firmwareMode}
          setFirmwareMode={setFirmwareMode}
        />

        {firmwareMode === 'hardcoded' && (
          <WifiTokenSection
            language={language}
            t={t}
            ssid={ssid}
            setSsid={setSsid}
            password={password}
            setPassword={setPassword}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            deviceToken={deviceToken}
            setDeviceToken={setDeviceToken}
            errors={errors}
            clearError={(key) => setErrors((prev) => ({ ...prev, [key]: '' }))}
            autoLoaded={autoLoaded}
          />
        )}

        <FarmTypeSafetySection
          language={language}
          t={t}
          firmwareMode={firmwareMode}
          farmType={farmType}
          setFarmType={setFarmType}
          shedName={shedName}
          setShedName={setShedName}
          shedId={shedId}
          setShedId={setShedId}
          includeSafetyEngine={includeSafetyEngine}
          setIncludeSafetyEngine={setIncludeSafetyEngine}
        />

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs">
              {firmwareMode === 'hardcoded' ? '5' : '3'}
            </span>
            {t.step5}
          </div>

          <div className="pl-7 space-y-3">
            <Button className="w-full gap-2" size="lg" disabled={!isValid || isDownloading} onClick={openConfirm}>
              {isDownloading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t.downloading}
                </>
              ) : (
                <>
                  {firmwareMode === 'ota' ? <CloudDownload className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                  {firmwareMode === 'ota' ? t.downloadOTAFirmware : t.downloadFirmware}
                </>
              )}
            </Button>

            {verifyError && (
              <VerifyErrorGuide
                language={language}
                t={t}
                verifyError={verifyError}
                isDownloading={isDownloading}
                onRetry={() => { setVerifyError(null); openConfirm(); }}
                onDismiss={() => setVerifyError(null)}
              />
            )}

            {isValid && (
              <div className="flex items-start gap-2 p-3 bg-primary/10 border border-primary/30 rounded-lg">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-xs text-primary">{firmwareMode === 'ota' ? t.readyToOTA : t.readyToUpload}</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>

      <ConfirmDownloadDialog
        language={language}
        open={confirmOpen}
        setOpen={setConfirmOpen}
        isDownloading={isDownloading}
        finalAck={finalAck}
        setFinalAck={setFinalAck}
        hardwareVersion={hardwareVersion}
        firmwareVersion={firmwareVersion}
        isMismatch={isMismatch}
        onConfirmed={downloadPreparedFirmware}
      />
    </Card>
  );
}
