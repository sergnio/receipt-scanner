import { MockScanner } from './mock'
import { TesseractScanner } from './tesseract'
import type { ReceiptScanner } from './types'

export type { ReceiptScanner, ScannedReceipt, ScannedItem } from './types'

// The ONE place that knows about concrete implementations.
// Add a provider = add a file + one entry here.
const registry: Record<string, () => ReceiptScanner> = {
  mock: () => new MockScanner(),
  tesseract: () => new TesseractScanner(),
}

let cached: ReceiptScanner | undefined

export function getScanner(): ReceiptScanner {
  if (cached) return cached
  const key = process.env.SCANNER ?? 'mock'
  const factory = registry[key]
  if (!factory) {
    throw new Error(
      `Unknown SCANNER "${key}". Available: ${Object.keys(registry).join(', ')}`,
    )
  }
  cached = factory()
  return cached
}
