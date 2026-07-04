import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.azzahro.presensi',
  appName: 'Presensi',
  webDir: 'www', // ganti sesuai folder hasil build web kamu (mis. "dist" atau "." jika index.html di root)
  bundledWebRuntime: false,
  android: {
    backgroundColor: '#FFFFFF'
  }
};

export default config;
