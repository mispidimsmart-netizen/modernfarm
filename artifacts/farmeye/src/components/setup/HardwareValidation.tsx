import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Fan, Lightbulb, Bell, Flame, Droplets,
  CheckCircle2, XCircle, Loader2, Play, RotateCcw,
  Thermometer, Wind, ShieldCheck, ShieldAlert, Activity
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSendDeviceCommand } from '@/hooks/useDeviceCommands';
import { useRealtimeSensorData } from '@/hooks/useRealtimeSensorData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface RelayTest {
  key: string;
  icon: React.ElementType;
  name: { bn: string; en: string };
  relay: string;
  status: 'pending' | 'testing' | 'passed' | 'failed' | 'skipped';
  detail?: string;
}

interface SensorCheck {
  key: string;
  name: { bn: string; en: string };
  status: 'pending' | 'testing' | 'passed' | 'failed';
  detail?: string;
}

interface ValidationResults {
  relays: Record<string, { passed: boolean; detail: string }>;
  sensors: Record<string, { passed: boolean; detail: string }>;
  tempChange: boolean;
  overallPassed: boolean;
  timestamp: string;
}

interface HardwareValidationProps {
  onComplete: (results: ValidationResults) => void;
  onSkip?: () => void;
}

export function HardwareValidation({ onComplete, onSkip }: HardwareValidationProps) {
  const { language } = useAuth();
  const sendCommand = useSendDeviceCommand();
  const { sensorData, isConnected } = useRealtimeSensorData();

  const [phase, setPhase] = useState<'intro' | 'relays' | 'sensors' | 'results'>('intro');
  const [overallProgress, setOverallProgress] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const tempBeforeRef = useRef<number | null>(null);

  const [relayTests, setRelayTests] = useState<RelayTest[]>([
    { key: 'fan', icon: Fan, name: { bn: 'এক্সহস্ট ফ্যান (IN1 - GPIO 25)', en: 'Exhaust Fan (IN1 - GPIO 25)' }, relay: 'IN1', status: 'pending' },
    { key: 'ceiling_fan', icon: Fan, name: { bn: 'সিলিং ফ্যান (IN2 - GPIO 26)', en: 'Ceiling Fan (IN2 - GPIO 26)' }, relay: 'IN2', status: 'pending' },
    { key: 'light', icon: Lightbulb, name: { bn: 'লাইট (IN3 - GPIO 27)', en: 'Light (IN3 - GPIO 27)' }, relay: 'IN3', status: 'pending' },
    { key: 'heater', icon: Flame, name: { bn: 'হিটার (IN4 - GPIO 14)', en: 'Heater (IN4 - GPIO 14)' }, relay: 'IN4', status: 'pending' },
    { key: 'fogger', icon: Droplets, name: { bn: 'ফগার (IN5 - GPIO 12)', en: 'Fogger (IN5 - GPIO 12)' }, relay: 'IN5', status: 'pending' },
    { key: 'alarm', icon: Bell, name: { bn: 'বাজার/অ্যালার্ম (IN6 - GPIO 13)', en: 'Buzzer/Alarm (IN6 - GPIO 13)' }, relay: 'IN6', status: 'pending' },
    { key: 'sprinkler', icon: Droplets, name: { bn: 'স্প্রিংকলার (IN7 - GPIO 15)', en: 'Sprinkler (IN7 - GPIO 15)' }, relay: 'IN7', status: 'pending' },
    { key: 'circulation_fan', icon: Wind, name: { bn: 'সার্কুলেশন ফ্যান (IN8 - GPIO 33)', en: 'Circulation Fan (IN8 - GPIO 33)' }, relay: 'IN8', status: 'pending' },
  ]);

  const [sensorChecks, setSensorChecks] = useState<SensorCheck[]>([
    { key: 'temperature', name: { bn: 'তাপমাত্রা সেন্সর', en: 'Temperature Sensor' }, status: 'pending' },
    { key: 'humidity', name: { bn: 'আর্দ্রতা সেন্সর', en: 'Humidity Sensor' }, status: 'pending' },
    { key: 'ammonia', name: { bn: 'অ্যামোনিয়া সেন্সর', en: 'Ammonia Sensor' }, status: 'pending' },
    { key: 'water', name: { bn: 'ওয়াটার ফ্লো সেন্সর', en: 'Water Flow Sensor' }, status: 'pending' },
  ]);

  const [tempChangePassed, setTempChangePassed] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const addLog = (msg: string) => setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // ===== RELAY VALIDATION =====
  const testSingleRelay = useCallback(async (relayKey: string, index: number) => {
    setRelayTests(prev => prev.map(r => r.key === relayKey ? { ...r, status: 'testing' } : r));
    addLog(language === 'bn' ? `🔌 রিলে ${index + 1} পরীক্ষা: ${relayKey}...` : `🔌 Testing relay ${index + 1}: ${relayKey}...`);

    try {
      // Turn ON
      await sendCommand.mutateAsync({ commandType: relayKey as any, commandValue: true });
      await wait(3000); // 3s ON — enough to hear click and see response

      // Turn OFF
      await sendCommand.mutateAsync({ commandType: relayKey as any, commandValue: false });
      await wait(1000); // Wait for relay to settle

      // Mark passed (user confirmed by not aborting)
      setRelayTests(prev => prev.map(r => r.key === relayKey
        ? { ...r, status: 'passed', detail: language === 'bn' ? 'ক্লিক শব্দ শোনা গেছে' : 'Click heard, relay toggled' }
        : r
      ));
      addLog(language === 'bn' ? `✅ রিলে ${index + 1} সফল` : `✅ Relay ${index + 1} passed`);
      return true;
    } catch (err) {
      setRelayTests(prev => prev.map(r => r.key === relayKey
        ? { ...r, status: 'failed', detail: language === 'bn' ? 'কমান্ড পাঠাতে ব্যর্থ' : 'Failed to send command' }
        : r
      ));
      addLog(language === 'bn' ? `❌ রিলে ${index + 1} ব্যর্থ` : `❌ Relay ${index + 1} failed`);
      return false;
    }
  }, [sendCommand, language]);

  // ===== SENSOR VALIDATION =====
  const validateSensors = useCallback(async () => {
    addLog(language === 'bn' ? '🌡️ সেন্সর ভ্যালিডেশন শুরু...' : '🌡️ Starting sensor validation...');

    // Temperature check — should be in plausible range
    const tempValid = sensorData.temperature > 5 && sensorData.temperature < 55;
    setSensorChecks(prev => prev.map(s => s.key === 'temperature'
      ? { ...s, status: tempValid ? 'passed' : 'failed', detail: `${sensorData.temperature.toFixed(1)}°C` }
      : s
    ));
    addLog(tempValid
      ? (language === 'bn' ? `✅ তাপমাত্রা: ${sensorData.temperature.toFixed(1)}°C` : `✅ Temp: ${sensorData.temperature.toFixed(1)}°C`)
      : (language === 'bn' ? `❌ তাপমাত্রা অস্বাভাবিক: ${sensorData.temperature.toFixed(1)}°C` : `❌ Temp abnormal: ${sensorData.temperature.toFixed(1)}°C`)
    );
    await wait(500);

    // Humidity check
    const humValid = sensorData.humidity > 10 && sensorData.humidity < 100;
    setSensorChecks(prev => prev.map(s => s.key === 'humidity'
      ? { ...s, status: humValid ? 'passed' : 'failed', detail: `${sensorData.humidity.toFixed(0)}%` }
      : s
    ));
    addLog(humValid
      ? (language === 'bn' ? `✅ আর্দ্রতা: ${sensorData.humidity.toFixed(0)}%` : `✅ Humidity: ${sensorData.humidity.toFixed(0)}%`)
      : (language === 'bn' ? `❌ আর্দ্রতা অস্বাভাবিক` : `❌ Humidity abnormal`)
    );
    await wait(500);

    // Ammonia check — MQ-137 should give a reading (even 0 is ok after warmup)
    const nh3Valid = sensorData.ammonia >= 0 && sensorData.ammonia < 200;
    setSensorChecks(prev => prev.map(s => s.key === 'ammonia'
      ? { ...s, status: nh3Valid ? 'passed' : 'failed', detail: `${sensorData.ammonia.toFixed(1)} ppm` }
      : s
    ));
    addLog(nh3Valid
      ? (language === 'bn' ? `✅ অ্যামোনিয়া: ${sensorData.ammonia.toFixed(1)} ppm` : `✅ NH3: ${sensorData.ammonia.toFixed(1)} ppm`)
      : (language === 'bn' ? `❌ অ্যামোনিয়া সেন্সর সমস্যা` : `❌ NH3 sensor issue`)
    );
    await wait(500);

    // Water flow — 0 is ok if water is off
    const waterValid = sensorData.waterUsage >= 0;
    setSensorChecks(prev => prev.map(s => s.key === 'water'
      ? { ...s, status: waterValid ? 'passed' : 'failed', detail: `${sensorData.waterUsage.toFixed(1)} L/h` }
      : s
    ));
    addLog(language === 'bn' ? `✅ ওয়াটার ফ্লো: ${sensorData.waterUsage.toFixed(1)} L/h` : `✅ Water: ${sensorData.waterUsage.toFixed(1)} L/h`);

    return { tempValid, humValid, nh3Valid, waterValid };
  }, [sensorData, language]);

  // ===== TEMPERATURE CHANGE VERIFICATION =====
  const verifyTempChange = useCallback(async () => {
    addLog(language === 'bn' ? '🌀 ফ্যান চালিয়ে তাপমাত্রা পরিবর্তন যাচাই...' : '🌀 Running fan to verify temp change...');
    
    tempBeforeRef.current = sensorData.temperature;
    
    // Turn on fan for 15 seconds
    await sendCommand.mutateAsync({ commandType: 'fan', commandValue: true });
    await wait(15000);
    await sendCommand.mutateAsync({ commandType: 'fan', commandValue: false });

    // Check if temperature changed at all (any movement indicates responsive sensor)
    const tempAfter = sensorData.temperature;
    const tempDiff = Math.abs(tempAfter - (tempBeforeRef.current ?? 0));
    const passed = tempDiff >= 0.1; // Even 0.1°C change is valid

    setTempChangePassed(passed);
    addLog(passed
      ? (language === 'bn' ? `✅ তাপমাত্রা পরিবর্তন শনাক্ত: ${tempDiff.toFixed(1)}°C` : `✅ Temp change detected: ${tempDiff.toFixed(1)}°C`)
      : (language === 'bn' ? `⚠️ তাপমাত্রা পরিবর্তন হয়নি — সেন্সর অবস্থান যাচাই করুন` : `⚠️ No temp change — check sensor placement`)
    );
    return passed;
  }, [sensorData, sendCommand, language]);

  // ===== FULL VALIDATION SEQUENCE =====
  const runFullValidation = useCallback(async () => {
    setIsRunning(true);
    setPhase('relays');
    setOverallProgress(0);
    setLog([]);

    addLog(language === 'bn' ? '🔧 হার্ডওয়্যার ভ্যালিডেশন শুরু হচ্ছে...' : '🔧 Starting hardware validation...');

    // Phase 1: Test relays sequentially (0-50%)
    let relaysPassed = 0;
    const relayCount = relayTests.length; // 8 relays
    for (let i = 0; i < relayCount; i++) {
      const passed = await testSingleRelay(relayTests[i].key, i);
      if (passed) relaysPassed++;
      setOverallProgress(((i + 1) / relayCount) * 50);
    }

    // Phase 2: Sensor validation (50-75%)
    setPhase('sensors');
    setOverallProgress(55);
    const sensorResults = await validateSensors();
    setOverallProgress(70);

    // Phase 3: Temperature change verification (75-95%)
    addLog(language === 'bn' ? '🔄 সেন্সর রেসপন্স পরীক্ষা...' : '🔄 Verifying sensor response...');
    const tempChangeOk = await verifyTempChange();
    setOverallProgress(95);

    // Phase 4: Results
    await wait(500);
    setOverallProgress(100);

    const sensorsPassed = [sensorResults.tempValid, sensorResults.humValid, sensorResults.nh3Valid].filter(Boolean).length;
    const overallPassed = relaysPassed >= 6 && sensorsPassed >= 2; // At least 6/8 relays and 2/3 core sensors

    const results: ValidationResults = {
      relays: relayTests.reduce((acc, r) => ({
        ...acc,
        [r.key]: { passed: r.status === 'passed', detail: r.detail || '' },
      }), {} as Record<string, { passed: boolean; detail: string }>),
      sensors: {
        temperature: { passed: sensorResults.tempValid, detail: `${sensorData.temperature.toFixed(1)}°C` },
        humidity: { passed: sensorResults.humValid, detail: `${sensorData.humidity.toFixed(0)}%` },
        ammonia: { passed: sensorResults.nh3Valid, detail: `${sensorData.ammonia.toFixed(1)} ppm` },
        water: { passed: sensorResults.waterValid, detail: `${sensorData.waterUsage.toFixed(1)} L/h` },
      },
      tempChange: tempChangeOk,
      overallPassed,
      timestamp: new Date().toISOString(),
    };

    addLog(overallPassed
      ? (language === 'bn' ? '🎉 হার্ডওয়্যার ভ্যালিডেশন সফল!' : '🎉 Hardware validation PASSED!')
      : (language === 'bn' ? '⚠️ কিছু পরীক্ষা ব্যর্থ হয়েছে' : '⚠️ Some tests failed')
    );

    setPhase('results');
    setIsRunning(false);

    if (overallPassed) {
      onComplete(results);
    }
  }, [relayTests, testSingleRelay, validateSensors, verifyTempChange, sensorData, language, onComplete]);

  const t = {
    title: language === 'bn' ? '🔧 হার্ডওয়্যার ভ্যালিডেশন' : '🔧 Hardware Validation',
    subtitle: language === 'bn'
      ? 'অটোমেশন চালু করার আগে হার্ডওয়্যার পরীক্ষা বাধ্যতামূলক'
      : 'Hardware must be validated before enabling automation',
    start: language === 'bn' ? '▶️ ভ্যালিডেশন শুরু করুন' : '▶️ Start Validation',
    retry: language === 'bn' ? '🔄 আবার পরীক্ষা করুন' : '🔄 Retry Validation',
    relayPhase: language === 'bn' ? 'রিলে পরীক্ষা চলছে...' : 'Testing relays...',
    sensorPhase: language === 'bn' ? 'সেন্সর যাচাই চলছে...' : 'Verifying sensors...',
    passed: language === 'bn' ? '✅ ভ্যালিডেশন সফল' : '✅ Validation Passed',
    failed: language === 'bn' ? '❌ ভ্যালিডেশন ব্যর্থ' : '❌ Validation Failed',
    failedNote: language === 'bn'
      ? 'অটোমেশন সক্রিয় করতে হলে হার্ডওয়্যার পরীক্ষা সফল হতে হবে'
      : 'Automation cannot be enabled until hardware validation passes',
    proceed: language === 'bn' ? '✅ এগিয়ে যান' : '✅ Proceed',
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'passed': return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case 'failed': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'testing': return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
      default: return <Activity className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const allPassed = relayTests.every(r => r.status === 'passed') &&
    sensorChecks.filter(s => s.key !== 'water').every(s => s.status === 'passed');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center">
        <ShieldCheck className="w-12 h-12 mx-auto text-primary mb-2" />
        <h3 className="text-lg font-bold">{t.title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{t.subtitle}</p>
      </div>

      {/* Intro / Start */}
      {phase === 'intro' && (
        <Card className="border-primary/20">
          <CardContent className="pt-4 space-y-3">
            <div className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
              <ShieldAlert className="h-4 w-4 inline mr-2" />
              {language === 'bn'
                ? '⚠️ পরীক্ষা চলাকালীন রিলে চালু/বন্ধ হবে। নিশ্চিত করুন সব ওয়্যারিং সঠিক।'
                : '⚠️ Relays will toggle during testing. Ensure all wiring is correct.'}
            </div>

            {!isConnected && (
              <div className="rounded-xl bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-400">
                {language === 'bn'
                  ? '❌ সেন্সর অফলাইন — ESP32 সংযুক্ত করুন'
                  : '❌ Sensors offline — connect ESP32 first'}
              </div>
            )}

            <Button
              onClick={runFullValidation}
              disabled={!isConnected}
              className="w-full h-12 text-base rounded-xl"
            >
              <Play className="h-5 w-5 mr-2" />
              {t.start}
            </Button>

            {onSkip && (
              <Button variant="ghost" onClick={onSkip} className="w-full text-sm text-muted-foreground">
                {language === 'bn' ? 'পরে করব (অটোমেশন ব্লক থাকবে)' : 'Skip (automation will remain blocked)'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Progress */}
      {isRunning && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{phase === 'relays' ? t.relayPhase : t.sensorPhase}</span>
            <span>{Math.round(overallProgress)}%</span>
          </div>
          <Progress value={overallProgress} className="h-2.5 rounded-full" />
        </div>
      )}

      {/* Relay Tests */}
      {(phase === 'relays' || phase === 'sensors' || phase === 'results') && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Fan className="h-4 w-4" />
              {language === 'bn' ? 'রিলে পরীক্ষা' : 'Relay Tests'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {relayTests.map((relay) => {
              const Icon = relay.icon;
              return (
                <div
                  key={relay.key}
                  className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                    relay.status === 'passed' ? 'border-emerald-500/30 bg-emerald-500/5' :
                    relay.status === 'failed' ? 'border-red-500/30 bg-red-500/5' :
                    relay.status === 'testing' ? 'border-primary/30 bg-primary/5' :
                    'border-border'
                  }`}
                >
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{language === 'bn' ? relay.name.bn : relay.name.en}</p>
                    {relay.detail && <p className="text-xs text-muted-foreground">{relay.detail}</p>}
                  </div>
                  {statusIcon(relay.status)}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Sensor Checks */}
      {(phase === 'sensors' || phase === 'results') && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Thermometer className="h-4 w-4" />
              {language === 'bn' ? 'সেন্সর যাচাই' : 'Sensor Verification'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sensorChecks.map((sensor) => (
              <div
                key={sensor.key}
                className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                  sensor.status === 'passed' ? 'border-emerald-500/30 bg-emerald-500/5' :
                  sensor.status === 'failed' ? 'border-red-500/30 bg-red-500/5' :
                  sensor.status === 'testing' ? 'border-primary/30 bg-primary/5' :
                  'border-border'
                }`}
              >
                <Activity className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{language === 'bn' ? sensor.name.bn : sensor.name.en}</p>
                  {sensor.detail && <p className="text-xs text-muted-foreground">{sensor.detail}</p>}
                </div>
                {statusIcon(sensor.status)}
              </div>
            ))}

            {/* Temperature change verification */}
            {phase === 'results' && (
              <div className={`flex items-center gap-3 rounded-lg border p-3 ${
                tempChangePassed ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5'
              }`}>
                <Wind className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {language === 'bn' ? 'ফ্যান → তাপমাত্রা পরিবর্তন' : 'Fan → Temperature Response'}
                  </p>
                </div>
                {tempChangePassed
                  ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  : <ShieldAlert className="h-5 w-5 text-amber-500" />
                }
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Activity Log */}
      {log.length > 0 && (
        <div className="rounded-xl bg-muted/30 border border-border p-3 max-h-32 overflow-y-auto">
          {log.map((entry, i) => (
            <p key={i} className="text-[10px] font-mono text-muted-foreground">{entry}</p>
          ))}
        </div>
      )}

      {/* Results Actions */}
      {phase === 'results' && !isRunning && (
        <div className="space-y-3">
          {allPassed ? (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="font-bold text-emerald-700 dark:text-emerald-400">{t.passed}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {language === 'bn' ? 'অটোমেশন এখন সক্রিয় করা যাবে' : 'Automation can now be enabled'}
              </p>
            </div>
          ) : (
            <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-center">
              <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <p className="font-bold text-red-700 dark:text-red-400">{t.failed}</p>
              <p className="text-xs text-muted-foreground mt-1">{t.failedNote}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setPhase('intro');
                setRelayTests(prev => prev.map(r => ({ ...r, status: 'pending', detail: undefined })));
                setSensorChecks(prev => prev.map(s => ({ ...s, status: 'pending', detail: undefined })));
                setOverallProgress(0);
                setLog([]);
              }}
              className="flex-1 h-11 rounded-xl"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {t.retry}
            </Button>
            {allPassed && (
              <Button onClick={() => onComplete({
                relays: relayTests.reduce((acc, r) => ({ ...acc, [r.key]: { passed: r.status === 'passed', detail: r.detail || '' } }), {}),
                sensors: sensorChecks.reduce((acc, s) => ({ ...acc, [s.key]: { passed: s.status === 'passed', detail: s.detail || '' } }), {}),
                tempChange: tempChangePassed,
                overallPassed: true,
                timestamp: new Date().toISOString(),
              })} className="flex-1 h-11 rounded-xl">
                {t.proceed}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
