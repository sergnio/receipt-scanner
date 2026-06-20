/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SCANNER?: 'tesseract' | 'mock' | 'vision'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
