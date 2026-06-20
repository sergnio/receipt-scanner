import { prepareForVision } from './prepare-image'
import { scanReceiptVision } from '~/server/scan'
import type { ReceiptScanner, ScanInput, ScannedReceipt } from './types'

// Decodes the image in the browser (handling HEIC and downscaling), then hands
// it to a server function that calls Claude. The image leaves the device, but
// the API key stays on the server — that's the tradeoff for real understanding
// of the receipt instead of best-effort OCR.
export class VisionScanner implements ReceiptScanner {
  readonly name = 'vision'

  async scan({ image }: ScanInput): Promise<ScannedReceipt> {
    const tPrep = performance.now()
    const { base64, mediaType } = await prepareForVision(image)
    console.log('[vision] image prepared', {
      ms: Math.round(performance.now() - tPrep),
      mediaType,
      base64KB: Math.round(base64.length / 1024),
    })
    return scanReceiptVision({ data: { imageBase64: base64, mediaType } })
  }
}
