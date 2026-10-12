/** Build-time configuration. See .env.example. */

const raw = import.meta.env.VITE_API_URL?.trim();

export const apiUrl = (raw || "http://127.0.0.1:8000").replace(/\/+$/, "");

export const prototypeControls = import.meta.env.VITE_PROTOTYPE_CONTROLS === "true";

export const demoPrefill = import.meta.env.VITE_DEMO_PREFILL === "true";
