import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ergan.bielat',
  appName: "Bi' El At",
  webDir: 'dist',
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ['phone'],
    },
    PrivacyScreen: {
      enable: true,
      imageName: 'Splash',
      contentMode: 'scaleAspectFill',
      preventScreenshots: true,
    },
  },
};

export default config;
