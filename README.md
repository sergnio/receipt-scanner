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
cp .env.example .env      # VITE_SCANNER defaults to "tesseract"
pnpm db:push              # create tables in local.db
pnpm dev                  # http://localhost:3000
```

OCR runs **in the browser** with
[Tesseract.js](https://github.com/naptha/tesseract.js) — no API keys, no cost,
and the image never leaves the device. Tesseract returns raw text, which
`tesseract.ts` parses heuristically into items/prices; you confirm/correct the
result in the review screen before saving. Set `VITE_SCANNER=mock` to use canned
data instead (handy for working on the UI).

## Swappable scanner (client-side)

The OCR provider is fully isolated behind one interface. The rest of the app
only ever touches `getScanner()` / the `ReceiptScanner` contract, and it all runs
client-side.

- `src/lib/scanner/types.ts` — the `ReceiptScanner` interface + zod schema
- `src/lib/scanner/mock.ts` — canned data, zero deps
- `src/lib/scanner/tesseract.ts` — in-browser Tesseract.js OCR + heuristic parser
- `src/lib/scanner/index.ts` — the registry; selected by `VITE_SCANNER`

Add a provider = add one file implementing `ReceiptScanner` + one entry in the
registry. The only server-side work is persisting the reviewed result (Turso
writes need the auth token); the receipt image is never uploaded.

## Data model

`vendors`, `products`, `receipts`, `line_items`. Line items from different
receipts point at one `product`, so price-over-time is a single join. Product
matching is exact-match on a normalized name for now (`src/lib/normalize.ts`) —
swap in fuzzy/LLM matching later without touching callers.

## Deploy (Netlify + Turso)

The SSR function (built via `@netlify/vite-plugin-tanstack-start`, wired into
`vite.config.ts`) only handles data persistence — OCR is client-side, so the
function stays small. Build output goes to `dist/client` + a Netlify function;
see `netlify.toml`.

1. Create a Turso database and grab its URL + auth token.
2. In the Netlify dashboard set env vars: `VITE_SCANNER=tesseract`,
   `DATABASE_URL=libsql://...`, `DATABASE_AUTH_TOKEN=...`.
3. Apply the schema to Turso once: `DATABASE_URL=... DATABASE_AUTH_TOKEN=... pnpm db:migrate`.
4. Connect the repo in Netlify (build command `pnpm build`, publish `dist/client`),
   or deploy with the Netlify CLI (`netlify deploy`, requires netlify-cli ≥ 17.31).
# receipt-scanner
