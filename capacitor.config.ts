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
    androidScheme: "https",
    iosScheme: "https",
    // Domínios permitidos dentro do app (checkout do Mercado Pago e backend).
    allowNavigation: [
      "www.smartcel.store",
      "smartcel.store",
      "*.mercadopago.com",
      "*.mercadopago.com.br",
      "*.mercadolibre.com",
      "*.supabase.co",
    ],
  },
  android: {
    backgroundColor: "#000000",
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
  },
  ios: {
    backgroundColor: "#000000",
    contentInset: "always",
    limitsNavigationsToAppBoundDomains: false,
  },
};

export default config;
