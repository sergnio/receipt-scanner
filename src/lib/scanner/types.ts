import { z } from 'zod'

// The contract every scanner implementation must satisfy.
// The rest of the app depends ONLY on this file — never on a provider.

export const scannedItemSchema = z.object({
  rawName: z.string(),
  normalizedName: z.string().nullable(),
  qty: z.number().nullable(),
  unit: z.string().nullable(),
  unitPrice: z.number().nullable(),
  totalPrice: z.number().nullable(),
})

export const scannedReceiptSchema = z.object({
  vendor: z.string().nullable(),
  purchasedAt: z.string().nullable(), // ISO 8601
  currency: z.string().nullable(),
  total: z.number().nullable(),
  items: z.array(scannedItemSchema),
})

export type ScannedItem = z.infer<typeof scannedItemSchema>
export type ScannedReceipt = z.infer<typeof scannedReceiptSchema>

// Scanners run in the browser, so they take a Blob/File directly.
export interface ScanInput {
  image: Blob
}

export interface ReceiptScanner {
  readonly name: string
  scan(input: ScanInput): Promise<ScannedReceipt>
}
