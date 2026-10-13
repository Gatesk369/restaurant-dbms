/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the Django API, no trailing slash. */
  readonly VITE_API_URL?: string;
  /** "true" shows reviewer-only controls (the station's advance button). */
  readonly VITE_PROTOTYPE_CONTROLS?: string;
  /** "true" lets the sign-in role cards prefill demo usernames (dev only). */
  readonly VITE_DEMO_PREFILL?: string;
  /**
   * Table ids when the API cannot list tables yet (gap G1): "1-12" or
   * "1001,1002,1003". Defaults to 1-12.
   */
  readonly VITE_TABLE_IDS?: string;
  /** Password to prefill with the demo username (development only). */
  readonly VITE_DEMO_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
