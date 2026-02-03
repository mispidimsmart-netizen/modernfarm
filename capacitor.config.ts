import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.775899d0e03c4c5eb9e0fd88eee4e18a',
  appName: 'modernfarm',
  webDir: 'dist',
  server: {
    url: 'https://775899d0-e03c-4c5e-b9e0-fd88eee4e18a.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#2d5a3d',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#2d5a3d',
    },
  },
};

export default config;
