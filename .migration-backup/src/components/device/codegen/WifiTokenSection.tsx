import { Wifi, Eye, EyeOff, Database } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Language } from './types';
import type { CodegenLabels } from './labels';

interface Props {
  language: Language;
  t: CodegenLabels;
  ssid: string;
  setSsid: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  deviceToken: string;
  setDeviceToken: (v: string) => void;
  errors: Record<string, string>;
  clearError: (key: string) => void;
  autoLoaded: boolean;
}

/** Steps 2 & 3 — WiFi credentials and device token (hardcoded mode only). */
export function WifiTokenSection({
  language,
  t,
  ssid,
  setSsid,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  deviceToken,
  setDeviceToken,
  errors,
  clearError,
  autoLoaded,
}: Props) {
  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs">2</span>
          {t.step2}
        </div>

        <div className="space-y-2 pl-7">
          <Label htmlFor="ssid" className="text-sm flex items-center gap-2">
            <Wifi className="h-3 w-3" />
            {t.wifiName}
          </Label>
          <Input
            id="ssid"
            value={ssid}
            onChange={(e) => {
              setSsid(e.target.value);
              if (errors.ssid) clearError('ssid');
            }}
            placeholder={t.wifiNamePlaceholder}
            className={errors.ssid ? 'border-destructive' : ''}
            maxLength={32}
          />
          {errors.ssid && <p className="text-xs text-destructive">{errors.ssid}</p>}
        </div>

        <div className="space-y-2 pl-7">
          <Label htmlFor="password" className="text-sm">
            🔐 {t.wifiPassword}
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) clearError('password');
              }}
              placeholder={t.wifiPasswordPlaceholder}
              className={`pr-10 ${errors.password ? 'border-destructive' : ''}`}
              maxLength={64}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs">3</span>
          {t.step3}
        </div>

        <div className="space-y-2 pl-7">
          <Label htmlFor="token" className="text-sm">
            🔑 {t.deviceToken}
          </Label>
          <Input
            id="token"
            value={deviceToken}
            onChange={(e) => {
              setDeviceToken(e.target.value);
              if (errors.deviceToken) clearError('deviceToken');
            }}
            placeholder={t.deviceTokenPlaceholder}
            className={`font-mono text-sm ${errors.deviceToken ? 'border-destructive' : ''}`}
            maxLength={100}
          />
          {errors.deviceToken && <p className="text-xs text-destructive">{errors.deviceToken}</p>}
          {autoLoaded && (
            <div className="flex items-center gap-1.5 p-2 bg-accent/50 border border-primary/30 rounded-lg">
              <Database className="h-3 w-3 text-primary" />
              <p className="text-xs text-primary">
                {language === 'bn'
                  ? '✅ ডিভাইস টোকেন, Farm ID ও Shed ID স্বয়ংক্রিয়ভাবে লোড হয়েছে!'
                  : '✅ Device Token, Farm ID & Shed ID auto-loaded from database!'}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
