import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Tabs } from '@/components/ui/tabs';
import { InstallationPartsTab } from '@/components/installation/InstallationPartsTab';
import { InstallationWiringTab } from '@/components/installation/InstallationWiringTab';
import { InstallationSetupTab } from '@/components/installation/InstallationSetupTab';

const wrap = (ui: React.ReactNode, value: string) => (
  <MemoryRouter><Tabs value={value}>{ui}</Tabs></MemoryRouter>
);

describe('Installation guide tabs render', () => {
  it('parts tab', () => {
    render(wrap(<InstallationPartsTab />, 'parts'));
    expect(document.body.textContent!.length).toBeGreaterThan(100);
  });
  it('wiring tab', () => {
    render(wrap(<InstallationWiringTab />, 'wiring'));
    expect(document.body.textContent!.length).toBeGreaterThan(100);
  });
  it('setup tab', () => {
    render(wrap(<InstallationSetupTab copiedCode={null} onCopy={() => {}} wifiConfigCode="x" onNavigate={() => {}} />, 'setup'));
    expect(document.body.textContent!.length).toBeGreaterThan(50);
  });
});
