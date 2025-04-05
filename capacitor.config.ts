
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.travelbuddy.app',
  appName: 'TravelBuddy',
  webDir: 'dist',
  server: {
    url: 'https://593e989e-04bc-4e66-a02f-4f0150a7067a.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  ios: {
    contentInset: 'automatic'
  },
  android: {
    contentInset: 'automatic'
  }
};

export default config;
