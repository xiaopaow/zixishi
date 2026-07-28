/// <reference types="@capacitor/app" />
/// <reference types="@capacitor/local-notifications" />
/// <reference types="@capacitor/splash-screen" />

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.xiaopaow.qishi',
  appName: '栖时',
  webDir: 'dist/client',
  backgroundColor: '#173c36',
  loggingBehavior: 'none',
  android: {
    backgroundColor: '#173c36',
    minWebViewVersion: 109,
    allowMixedContent: false,
  },
  server: {
    androidScheme: 'https',
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_qishi',
      iconColor: '#e5bd78',
    },
    SplashScreen: {
      launchShowDuration: 900,
      launchAutoHide: true,
      backgroundColor: '#173c36',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    SystemBars: {
      insetsHandling: 'css',
      style: 'DEFAULT',
      hidden: false,
    },
  },
};

export default config;
