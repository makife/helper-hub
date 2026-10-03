import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ergan.bielat',
  appName: "Bi' El At",
  webDir: 'dist',
  ios: {
    contentInset: 'never',
    scrollEnabled: true,
  },
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ['phone'],
    },
    PrivacyScreen: {
      enable: true,
      preventScreenshots: true,
    },
  },
};

export default config;
