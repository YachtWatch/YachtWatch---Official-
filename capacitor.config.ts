import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yachtwatch.ios',
  appName: 'YachtWatch',
  webDir: 'dist',
  ios: {
    backgroundColor: '#1B2A6B',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1000,
      launchAutoHide: false,
      backgroundColor: '#1B2A6B',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
      useDialog: false,
    }
  }
};

export default config;
