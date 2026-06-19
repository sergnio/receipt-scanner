import type { ReceiptScanner, ScannedReceipt } from './types'

// Zero-dependency scanner for building the app loop without any API keys.
// Returns realistic structured data regardless of the image.
export class MockScanner implements ReceiptScanner {
  readonly name = 'mock'

  async scan(): Promise<ScannedReceipt> {
    return {
      vendor: 'Costco',
      purchasedAt: '2026-06-15T17:42:00.000Z',
      currency: 'USD',
      total: 38.94,
      items: [
        {
          rawName: 'KS ORG BANANAS',
          normalizedName: 'Organic Bananas',
          qty: 3,
          unit: 'lb',
          unitPrice: 1.99,
          totalPrice: 5.97,
        },
        {
          rawName: 'ROTISSERIE CHKN',
          normalizedName: 'Rotisserie Chicken',
          qty: 1,
          unit: 'ea',
          unitPrice: 4.99,
          totalPrice: 4.99,
        },
        {
          rawName: 'OLIVE OIL 2L',
          normalizedName: 'Olive Oil',
          qty: 1,
          unit: 'ea',
          unitPrice: 27.98,
          totalPrice: 27.98,
        },
      ],
    }
  }
}
