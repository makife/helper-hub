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
      // Ekran görüntüsü engeli tüm platformlarda kapalı.
      enable: false,
      preventScreenshots: false,
    },
  },
};

export default config;
