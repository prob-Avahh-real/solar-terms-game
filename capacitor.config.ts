import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.skatter.solarterms',
  appName: '节气世界',
  webDir: '.',
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  ios: {
    contentInset: 'always',
    scrollEnabled: false,
    limitsNavigationsToAppBoundDomains: ['localhost', 'unpkg.com']
  },
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: false
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0a0a14',
      showSpinner: false
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a0a14',
      overlaysWebView: true
    }
  }
};

export default config;
