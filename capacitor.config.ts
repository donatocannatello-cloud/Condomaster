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
    : { androidScheme: 'https' },
  android: {
    // Android 15 (targetSdk 35) forces edge-to-edge, drawing the WebView
    // under the status bar and navigation bar. Capacitor's own margin
    // adjustment for this is opt-in (default "disable"); "auto" turns it
    // on so the WebView gets proper top/bottom margins on API 35+ instead
    // of its content overlapping the system bars.
    adjustMarginsForEdgeToEdge: 'auto'
  }
};

export default config;
