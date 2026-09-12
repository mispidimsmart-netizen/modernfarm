import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GuideVersionProvider, useGuideVersion } from '@/components/installation/GuideVersionContext';
import { InstallationPartsTab } from '@/components/installation/InstallationPartsTab';
import { InstallationWiringTab } from '@/components/installation/InstallationWiringTab';
import { InstallationSetupTab } from '@/components/installation/InstallationSetupTab';
import {
  getPartsList,
  getWiringConnections,
  getWiringSensors,
  getSetupSteps,
  getWifiConfigCode,
} from '@/data/installationVersionMap';

// The code generator talks to the backend / downloads firmware — out of scope here.
vi.mock('@/components/device/ESP32CodeGenerator', () => ({
  ESP32CodeGenerator: () => <div data-testid="code-generator" />,
}));

/** Mirrors the real page: version switcher + the three content tabs. */
function GuideHarness({ tab }: { tab: 'parts' | 'wiring' | 'setup' }) {
  return (
    <MemoryRouter>
      <GuideVersionProvider>
        <VersionSwitcher />
        <Tabs value={tab}>
          <InstallationPartsTab />
          <InstallationWiringTab />
          <InstallationSetupTab copiedCode={null} onCopy={() => {}} onNavigate={() => {}} />
        </Tabs>
      </GuideVersionProvider>
    </MemoryRouter>
  );
}

function VersionSwitcher() {
  const { version, setVersion } = useGuideVersion();
  return (
    <Tabs value={version} onValueChange={(v) => setVersion(v as 'v8' | 'v10')}>
      <TabsList>
        <TabsTrigger value="v8">v8 কন্ট্রোলার</TabsTrigger>
        <TabsTrigger value="v10">v10 কন্ট্রোলার</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

const V8_ONLY = ['ILI9341', 'ULN2803'];
const V10_ONLY = ['SHT31', 'BH1750', 'SCD41', 'PMS5003'];

function bodyText() {
  return document.body.textContent ?? '';
}

async function switchToV10(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('tab', { name: /v10 কন্ট্রোলার/ }));
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('installation guide version switching (e2e)', () => {
  it('parts tab shows only the selected version hardware', async () => {
    const user = userEvent.setup();
    render(<GuideHarness tab="parts" />);

    const v8Text = bodyText();
    V8_ONLY.forEach((k) => expect(v8Text).toContain(k));
    V10_ONLY.forEach((k) => expect(v8Text).not.toContain(k));

    await switchToV10(user);

    const v10Text = bodyText();
    V10_ONLY.forEach((k) => expect(v10Text).toContain(k));
    V8_ONLY.forEach((k) => expect(v10Text).not.toContain(k));
  });

  it('wiring tab swaps sensor rows and GSM pins per version', async () => {
    const user = userEvent.setup();
    render(<GuideHarness tab="wiring" />);

    const v8Text = bodyText();
    expect(v8Text).toContain('GPIO 19 (ESP32 RX)'); // v8 GSM RX
    expect(v8Text).not.toContain('GPIO 27 (ESP32 RX)'); // v10 GSM RX
    // Category headings name both sensor families, so assert on v10-exclusive rows.
    ['SCD41', 'PMS5003'].forEach((k) => expect(v8Text).not.toContain(k));
    expect(v8Text).toContain('ILI9341'); // v8-only TFT wiring rows

    await switchToV10(user);

    const v10Text = bodyText();
    expect(v10Text).not.toContain('ILI9341');
    expect(v10Text).toContain('GPIO 27 (ESP32 RX)');
    expect(v10Text).not.toContain('GPIO 19 (ESP32 RX)');
    expect(v10Text).toContain('SHT31');
  });

  it('setup tab points at the matching firmware file', async () => {
    const user = userEvent.setup();
    render(<GuideHarness tab="setup" />);

    expect(bodyText()).toContain('esp32-industrial.ino');
    expect(bodyText()).not.toContain('esp32-industrial-v10.ino');

    await switchToV10(user);

    expect(bodyText()).toContain('esp32-industrial-v10.ino');
    expect(bodyText()).toContain('v10.1.1-beta');
  });

  it('remembers the chosen version across remounts', async () => {
    const user = userEvent.setup();
    const first = render(<GuideHarness tab="parts" />);
    await switchToV10(user);
    first.unmount();

    render(<GuideHarness tab="parts" />);
    expect(screen.getByRole('tab', { name: /v10 কন্ট্রোলার/ })).toHaveAttribute('data-state', 'active');
    expect(bodyText()).toContain('SHT31');
  });
});

describe('version-aware data getters', () => {
  it('never mixes version-exclusive parts', () => {
    const flat = (v: 'v8' | 'v10') =>
      getPartsList(v).flatMap((c) => c.items.map((i) => `${i.name} ${i.nameEn}`)).join(' ');
    expect(flat('v8')).toContain('ILI9341');
    expect(flat('v10')).not.toContain('ILI9341');
    // Premium I2C sensors are not in the shared parts catalogue; they come from
    // the v10-only notice block, so the v8 list must simply stay free of them.
    expect(flat('v8')).not.toContain('SHT31');
  });

  it('gives each version its own GSM rows, sensors and firmware banner', () => {
    expect(getWiringConnections('v8').some((c) => c.esp32Pin.includes('GPIO 19'))).toBe(true);
    expect(getWiringConnections('v10').some((c) => c.esp32Pin.includes('GPIO 27'))).toBe(true);

    const v8Ids = getWiringSensors('v8').map((s) => s.id);
    const v10Ids = getWiringSensors('v10').map((s) => s.id);
    expect(v8Ids).toContain('tft-display');
    expect(v10Ids).not.toContain('tft-display');
    expect(v10Ids).toContain('sht31');
    expect(v8Ids).not.toContain('sht31');

    expect(getSetupSteps('v10').flatMap((s) => s.tasks).join(' ')).toContain('esp32-industrial-v10.ino');
    expect(getWifiConfigCode('v8')).toContain('esp32-industrial.ino');
    expect(getWifiConfigCode('v10')).toContain('v10.1.1-beta');
  });
});
