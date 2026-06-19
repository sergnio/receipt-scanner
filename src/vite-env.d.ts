/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SCANNER?: 'tesseract' | 'mock'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
