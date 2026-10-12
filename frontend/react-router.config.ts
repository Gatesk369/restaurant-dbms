import type { Config } from "@react-router/dev/config";

export default {
  // SPA mode (plan D1): every screen sits behind a browser-held token, so the
  // build is static files in build/client and all data loads in clientLoaders.
  ssr: false,
} satisfies Config;
