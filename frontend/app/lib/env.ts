/** Build-time configuration. See .env.example. */

const raw = import.meta.env.VITE_API_URL?.trim();

export const apiUrl = (raw || "http://127.0.0.1:8000").replace(/\/+$/, "");

export const prototypeControls = import.meta.env.VITE_PROTOTYPE_CONTROLS === "true";

export const demoPrefill = import.meta.env.VITE_DEMO_PREFILL === "true";

/** Development only; ignored unless `demoPrefill` is on. */
export const demoPassword = import.meta.env.VITE_DEMO_PASSWORD ?? "";

/** Interim table list for deployments without GET /api/tables/ (gap G1). */
export const tableIdsSpec = import.meta.env.VITE_TABLE_IDS?.trim() || "1-12";
