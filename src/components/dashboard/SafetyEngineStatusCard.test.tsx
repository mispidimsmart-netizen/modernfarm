import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SafetyEngineStatusCard } from './SafetyEngineStatusCard';

// ---- mocks ----
const settingsMock = vi.fn();
const healthMock = vi.fn();
const farmCtxMock = vi.fn();

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ language: 'bn' }),
}));
vi.mock('@/hooks/useFarmData', () => ({
  useFarmSettings: () => settingsMock(),
}));
vi.mock('@/hooks/useDeviceHealth', () => ({
  useAllDeviceHealth: () => healthMock(),
}));
vi.mock('@/context/FarmContext', () => ({
  useFarmContext: () => farmCtxMock(),
}));

const FARM_ID = 'farm-1';

function setup({
  enabled,
  fwVersion = '8.1.1',
  online = true,
}: { enabled: boolean; fwVersion?: string | null; online?: boolean }) {
  farmCtxMock.mockReturnValue({ selectedFarmId: FARM_ID });
  settingsMock.mockReturnValue({ data: { safety_engine_enabled: enabled } });
  healthMock.mockReturnValue({
    data: [
      {
        farm_id: FARM_ID,
        firmware_version: fwVersion,
        is_online: online,
        last_seen_at: new Date().toISOString(),
      },
    ],
  });
}

beforeEach(() => {
  settingsMock.mockReset();
  healthMock.mockReset();
  farmCtxMock.mockReset();
});

describe('SafetyEngineStatusCard — Home page status display', () => {
  it('Safety Engine ON হলে "চালু" badge ও "স্বয়ংক্রিয় সুরক্ষা সক্রিয়" দেখায়, hard-floor warning থাকে না', () => {
    setup({ enabled: true });
    render(<SafetyEngineStatusCard />);

    expect(screen.getByText('চালু')).toBeInTheDocument();
    expect(screen.getByText('স্বয়ংক্রিয় সুরক্ষা সক্রিয়')).toBeInTheDocument();
    // hard-floor reminder only shows when OFF
    expect(screen.queryByText(/৪২°C ছাড়ালে/)).not.toBeInTheDocument();
  });

  it('Safety Engine OFF হলে "বন্ধ" badge, manual-only বার্তা ও hard-floor রিমাইন্ডার দেখায়', () => {
    setup({ enabled: false });
    render(<SafetyEngineStatusCard />);

    expect(screen.getByText('বন্ধ')).toBeInTheDocument();
    expect(screen.getByText(/শুধু ম্যানুয়াল ও schedule/)).toBeInTheDocument();
    expect(screen.getByText(/৪২°C ছাড়ালে/)).toBeInTheDocument();
  });

  it('ESP32 firmware version সবসময় (ON বা OFF) v-prefix সহ দেখায়', () => {
    setup({ enabled: true, fwVersion: '8.1.1' });
    const { rerender } = render(<SafetyEngineStatusCard />);
    expect(screen.getByText('v8.1.1')).toBeInTheDocument();

    setup({ enabled: false, fwVersion: '8.1.1' });
    rerender(<SafetyEngineStatusCard />);
    expect(screen.getByText('v8.1.1')).toBeInTheDocument();
  });

  it('firmware_version null হলে "অজানা" দেখায়', () => {
    setup({ enabled: true, fwVersion: null });
    render(<SafetyEngineStatusCard />);
    expect(screen.getByText(/v.*অজানা/)).toBeInTheDocument();
  });

  it('is_online=false হলে "অফলাইন" badge দেখায়', () => {
    setup({ enabled: true, online: false });
    render(<SafetyEngineStatusCard />);
    expect(screen.getByText('অফলাইন')).toBeInTheDocument();
    expect(screen.queryByText('অনলাইন')).not.toBeInTheDocument();
  });

  it('settings null হলে default ON হিসাবে treat করে', () => {
    farmCtxMock.mockReturnValue({ selectedFarmId: FARM_ID });
    settingsMock.mockReturnValue({ data: null });
    healthMock.mockReturnValue({ data: [] });
    render(<SafetyEngineStatusCard />);
    expect(screen.getByText('চালু')).toBeInTheDocument();
  });
});
