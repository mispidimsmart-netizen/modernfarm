/** Per-device color scheme for the manual control grid. */
export interface DeviceColorScheme {
  activeBg: string;
  activeShadow: string;
  switchOn: string;
  iconTint: string;
}

const DEVICE_COLORS: Record<string, DeviceColorScheme> = {
  heater:          { activeBg: 'bg-orange-500',  activeShadow: 'shadow-orange-500/30',  switchOn: 'data-[state=checked]:bg-orange-500',  iconTint: 'text-orange-500' },
  fan:             { activeBg: 'bg-sky-500',     activeShadow: 'shadow-sky-500/30',     switchOn: 'data-[state=checked]:bg-sky-500',     iconTint: 'text-sky-500' },
  ceiling_fan:     { activeBg: 'bg-cyan-500',    activeShadow: 'shadow-cyan-500/30',    switchOn: 'data-[state=checked]:bg-cyan-500',    iconTint: 'text-cyan-500' },
  circulation_fan: { activeBg: 'bg-teal-500',    activeShadow: 'shadow-teal-500/30',    switchOn: 'data-[state=checked]:bg-teal-500',    iconTint: 'text-teal-500' },
  fogger:          { activeBg: 'bg-blue-500',    activeShadow: 'shadow-blue-500/30',    switchOn: 'data-[state=checked]:bg-blue-500',    iconTint: 'text-blue-500' },
  sprinkler:       { activeBg: 'bg-indigo-500',  activeShadow: 'shadow-indigo-500/30',  switchOn: 'data-[state=checked]:bg-indigo-500',  iconTint: 'text-indigo-500' },
  light:           { activeBg: 'bg-amber-500',   activeShadow: 'shadow-amber-500/30',   switchOn: 'data-[state=checked]:bg-amber-500',   iconTint: 'text-amber-500' },
};

const FALLBACK: DeviceColorScheme = {
  activeBg: 'bg-emerald-500',
  activeShadow: 'shadow-emerald-500/30',
  switchOn: 'data-[state=checked]:bg-emerald-500',
  iconTint: 'text-emerald-500',
};

export const getDeviceColors = (deviceKey: string): DeviceColorScheme =>
  DEVICE_COLORS[deviceKey] ?? FALLBACK;
