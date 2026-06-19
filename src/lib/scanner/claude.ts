import Anthropic from '@anthropic-ai/sdk'
import {
  scannedReceiptSchema,
  type ReceiptScanner,
  type ScanInput,
  type ScannedReceipt,
} from './types'

const SYSTEM_PROMPT = `You extract structured data from a photo of a store receipt.
Return ONLY a JSON object matching this shape (no prose, no markdown):
{
  "vendor": string | null,            // store name, normalized (e.g. "Costco", "Target")
  "purchasedAt": string | null,       // ISO 8601 timestamp printed on the receipt
  "currency": string | null,          // ISO 4217 code, e.g. "USD"
  "total": number | null,             // grand total
  "items": [
    {
      "rawName": string,              // exactly as printed
      "normalizedName": string|null,  // human-readable canonical product name
      "qty": number | null,
      "unit": string | null,          // "lb","oz","g","ea", etc.
      "unitPrice": number | null,     // price per unit if derivable
      "totalPrice": number | null     // line total
    }
  ]
}
Infer normalizedName so the same product reads consistently across receipts.
If a value is unknown, use null. Do not invent items.`

export class ClaudeScanner implements ReceiptScanner {
  readonly name = 'claude'
  private client: Anthropic
  private model: string

  constructor(opts?: { apiKey?: string; model?: string }) {
    const apiKey = opts?.apiKey ?? process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is required for the Claude scanner')
    }
    this.client = new Anthropic({ apiKey })
    this.model = opts?.model ?? 'claude-opus-4-7'
  }

  async scan({ image, mimeType }: ScanInput): Promise<ScannedReceipt> {
    const res = await this.client.messages.create({
      model: this.model,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType as
                  | 'image/jpeg'
                  | 'image/png'
                  | 'image/webp'
                  | 'image/gif',
                data: image.toString('base64'),
              },
            },
            { type: 'text', text: 'Extract this receipt.' },
          ],
        },
      ],
    })

    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')

    const json = extractJson(text)
    return scannedReceiptSchema.parse(json)
  }
}

function extractJson(text: string): unknown {
  const trimmed = text.trim()
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start === -1 || end === -1) {
    throw new Error('Claude scanner: no JSON object found in response')
  }
  return JSON.parse(trimmed.slice(start, end + 1))
}
