import type { CapacitorConfig } from '@capacitor/cli';

// Normal builds bundle dist/ into the app (fully offline, no server).
// For fast local development, set CAP_SERVER_URL to your machine's LAN
// address (e.g. CAP_SERVER_URL=http://192.168.1.50:5173) before running
// `npx cap sync android` / `npx cap run android`: the app on the phone
// then loads the live Vite dev server instead, so React changes appear
// instantly without rebuilding the native app.
const devServerUrl = process.env.CAP_SERVER_URL;

const config: CapacitorConfig = {
  appId: 'it.condomaster.app',
  appName: 'CondoMaster',
  webDir: 'dist',
  server: devServerUrl
    ? { url: devServerUrl, cleartext: true }
    : { androidScheme: 'https' }
};

export default config;
