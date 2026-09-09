import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.puertoapp.grupo',
  appName: 'Puerto App',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
};

export default config;
