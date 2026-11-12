import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.masblingguttermaintenanceservices.app',
  appName: 'Masbling Astar Services',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
  },
  android: {
    backgroundColor: '#0a1628',
  },
};

export default config;
