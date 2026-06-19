# Receipt Scanner

Snap a photo of a receipt, OCR the items + prices, and track prices over time per
product and vendor.

Built on the TanStack ecosystem:

- **TanStack Start** — full-stack React framework + server functions
- **TanStack Router** — type-safe file-based routing
- **TanStack Query** — server-state caching / loaders
- **TanStack Table** — the price-history grid (sortable)
- **TanStack Form** — the "review & correct the scan" screen
- **Drizzle ORM + libSQL/SQLite** — storage (local file in dev, Turso in prod)

## Quick start

```bash
pnpm install
cp .env.example .env      # SCANNER defaults to "mock" — no API key needed
pnpm db:push              # create tables in local.db
pnpm dev                  # http://localhost:3000
```

The `mock` scanner returns canned receipt data so you can use the whole app
without any setup. Set `SCANNER=tesseract` to run real OCR locally with
[Tesseract.js](https://github.com/naptha/tesseract.js) — no API keys, no cost.
Tesseract returns raw text, which `tesseract.ts` parses heuristically into
items/prices; you confirm/correct the result in the review screen before saving.

## Swappable scanner

The OCR provider is fully isolated behind one interface. The rest of the app
only ever touches `getScanner()` / the `ReceiptScanner` contract.

- `src/lib/scanner/types.ts` — the `ReceiptScanner` interface + zod schema
- `src/lib/scanner/mock.ts` — canned data, zero deps
- `src/lib/scanner/tesseract.ts` — local Tesseract.js OCR + heuristic parser
- `src/lib/scanner/index.ts` — the registry; selected by the `SCANNER` env var

Add a provider = add one file implementing `ReceiptScanner` + one entry in the
registry. Receipt images are sent to the scanner and **never persisted**.

## Data model

`vendors`, `products`, `receipts`, `line_items`. Line items from different
receipts point at one `product`, so price-over-time is a single join. Product
matching is exact-match on a normalized name for now (`src/lib/normalize.ts`) —
swap in fuzzy/LLM matching later without touching callers.

## Deploy

TanStack's recommended path: **Netlify + Turso**. Set `DATABASE_URL` /
`DATABASE_AUTH_TOKEN` to your Turso DB and run `pnpm db:migrate`.
# receipt-scanner
