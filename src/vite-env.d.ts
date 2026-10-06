/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_COMPANY_NAME?: string;
  readonly VITE_COMPANY_EMAIL?: string;
  readonly VITE_COMPANY_PHONE?: string;
  readonly VITE_COMPANY_ADDRESS?: string;
  readonly VITE_CURRENCY_CODE?: string;
  readonly VITE_CURRENCY_SYMBOL?: string;
  readonly VITE_CURRENCY_LOCALE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}