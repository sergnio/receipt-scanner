import { createWorker } from 'tesseract.js'
import type {
  ReceiptScanner,
  ScanInput,
  ScannedItem,
  ScannedReceipt,
} from './types'

// Tesseract gives us raw OCR text only — no structure. So this scanner runs
// OCR and then applies heuristics to pull out vendor / date / line items.
// It is best-effort by design: the user reviews & corrects in the UI before
// saving. Swap to a smarter provider later without touching any caller.
export class TesseractScanner implements ReceiptScanner {
  readonly name = 'tesseract'
  private lang: string

  constructor(opts?: { lang?: string }) {
    this.lang = opts?.lang ?? 'eng'
  }

  async scan({ image }: ScanInput): Promise<ScannedReceipt> {
    const worker = await createWorker(this.lang)
    try {
      const {
        data: { text },
      } = await worker.recognize(image)
      return parseReceiptText(text)
    } finally {
      await worker.terminate()
    }
  }
}

const PRICE_RE = /(-?\d{1,4}[.,]\d{2})(?:\s*[A-Z]{1,2})?\s*$/
const TOTAL_RE = /\b(total|amount due|balance|grand total)\b/i
const SUBTOTAL_RE = /\b(sub\s*total|tax|change|tender|cash|debit|credit|visa|mastercard)\b/i
const DATE_RE =
  /\b(\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})(?:\s+(\d{1,2}:\d{2}(?::\d{2})?))?/

function toAmount(raw: string): number {
  return Number(raw.replace(',', '.'))
}

function parseReceiptText(text: string): ScannedReceipt {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  const vendor = guessVendor(lines)
  const purchasedAt = guessDate(lines)
  const { items, total } = parseLines(lines)

  return {
    vendor,
    purchasedAt,
    currency: null,
    total,
    items,
  }
}

// Vendor is usually one of the first non-numeric lines at the top.
function guessVendor(lines: string[]): string | null {
  for (const line of lines.slice(0, 6)) {
    const letters = line.replace(/[^a-zA-Z]/g, '')
    if (letters.length >= 3 && !PRICE_RE.test(line) && !DATE_RE.test(line)) {
      return line
    }
  }
  return null
}

function guessDate(lines: string[]): string | null {
  for (const line of lines) {
    const m = line.match(DATE_RE)
    if (!m) continue
    const date = new Date(`${m[1]}${m[2] ? ' ' + m[2] : ''}`)
    if (!Number.isNaN(date.getTime())) return date.toISOString()
  }
  return null
}

function parseLines(lines: string[]): {
  items: ScannedItem[]
  total: number | null
} {
  const items: ScannedItem[] = []
  let total: number | null = null

  for (const line of lines) {
    const priceMatch = line.match(PRICE_RE)
    if (!priceMatch) continue
    const amount = toAmount(priceMatch[1])
    const label = line.slice(0, priceMatch.index).trim()

    if (TOTAL_RE.test(line)) {
      total = amount
      continue
    }
    // Skip subtotal/tax/payment noise lines.
    if (SUBTOTAL_RE.test(line)) continue
    // A bare price with no label is not a useful item.
    if (label.replace(/[^a-zA-Z]/g, '').length < 2) continue

    items.push({
      rawName: label,
      normalizedName: cleanName(label),
      qty: null,
      unit: null,
      unitPrice: null,
      totalPrice: amount,
    })
  }

  return { items, total }
}

function cleanName(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .replace(/^[\d\s*#]+/, '')
    .trim()
}
