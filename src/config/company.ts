/**
 * Central company configuration.
 *
 * This is the ONLY place company-wide branding and contact info should be
 * defined. Anywhere else in the app must import from here — never hard-code.
 *
 * Real values are pulled from environment variables at build/deploy time.
 * Placeholders are used locally until the company provides real values.
 */
export const company = {
  name: (import.meta.env.VITE_COMPANY_NAME as string | undefined) ?? "Macaw",
  tagline: "Clothing that fits real life.",
  description:
    "Modern, comfortable clothing for Men and Kids — designed to last.",

  // Logo can be a public path or absolute URL. Defaults to the inline wordmark.
  logo: "/logo.svg",

  contact: {
    email: (import.meta.env.VITE_COMPANY_EMAIL as string | undefined) ??
      "hello@macaw.example",
    phone: (import.meta.env.VITE_COMPANY_PHONE as string | undefined) ??
      "+880 1700-000000",
    address: (import.meta.env.VITE_COMPANY_ADDRESS as string | undefined) ??
      "House 00, Road 00, Dhaka, Bangladesh",
  },

  // Display currency. Prices in products.ts are stored in this currency's
  // smallest unit (e.g. BDT). The backend simply multiplies by quantity.
  currency: {
    code: (import.meta.env.VITE_CURRENCY_CODE as string | undefined) ?? "BDT",
    symbol: (import.meta.env.VITE_CURRENCY_SYMBOL as string | undefined) ?? "৳",
    locale: (import.meta.env.VITE_CURRENCY_LOCALE as string | undefined) ??
      "en-BD",
  },

  // Brand theme colors — also referenced in tailwind.config.js.
  theme: {
    primary: "#7c3aed", // brand-600
    primaryDark: "#6d28d9", // brand-700
    accent: "#f59e0b",
  },
} as const;

export type CompanyConfig = typeof company;