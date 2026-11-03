/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public URL of the EventHub API. Never put secrets in VITE_ variables: they ship to the browser. */
  readonly VITE_API_BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}