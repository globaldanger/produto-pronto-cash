import type { CapacitorConfig } from "@capacitor/cli";

// App nativo (Play Store / App Store) via Capacitor.
// O app nativo carrega o site publicado — assim qualquer atualização do site
// aparece no app sem precisar de nova versão nas lojas.
const config: CapacitorConfig = {
  appId: "store.smartcel.app",
  appName: "SmartCell",
  webDir: "dist/client",
  server: {
    url: "https://www.smartcel.store",
    cleartext: false,
  },
  android: {
    backgroundColor: "#000000",
  },
  ios: {
    backgroundColor: "#000000",
    contentInset: "always",
  },
};

export default config;