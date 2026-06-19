// Canonical key used to match vendors/products across receipts.
// "BANANAS  ORG" and "Organic Bananas!" should collapse toward a stable key.
export function normalizeKey(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
