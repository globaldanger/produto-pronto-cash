// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// On Netlify CI (or any non-Lovable build) we let Nitro use its own server
// entry so the platform-specific handler is generated correctly. Inside the
// Lovable sandbox/build we keep the Cloudflare Worker entry with the SSR
// error wrapper. Set NITRO_PRESET=netlify in Netlify env to target Netlify.
const isNetlify = !!process.env.NETLIFY || process.env.NITRO_PRESET === "netlify";

export default defineConfig({
  tanstackStart: isNetlify ? {} : { server: { entry: "server" } },
  nitro: isNetlify ? { preset: "netlify" } : undefined,
});
