import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nokz.studio',        // GANTI INI sesuai dengan app id kamu
  appName: 'Nokz Studio',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    OneSignal: {
      googleProjectNumber: "REMOTE",
    }
  }
};

export default config;