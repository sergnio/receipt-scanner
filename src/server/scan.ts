import { createServerFn } from '@tanstack/react-start'
import Anthropic from '@anthropic-ai/sdk'
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema'
import { z } from 'zod'
import { scannedReceiptSchema } from '~/lib/scanner/types'

// Server-only Claude vision scanner. The API key never reaches the browser:
// this handler is stripped from the client bundle, and the client calls it as
// an RPC (see src/lib/scanner/vision.ts). Defaults to Haiku — plenty capable
// for reading a receipt and the cheapest option.

const MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const

const inputSchema = z.object({
  imageBase64: z.string().min(1),
  mediaType: z.enum(MEDIA_TYPES),
})

// JSON Schema mirror of scannedReceiptSchema, shaped for structured outputs:
// every object sets additionalProperties:false and lists all keys in required.
// We still validate the model's output through the zod schema below, so this
// stays the single source of truth for the *shape* the model must return.
const RECEIPT_FORMAT = jsonSchemaOutputFormat({
  type: 'object',
  additionalProperties: false,
  required: ['vendor', 'purchasedAt', 'currency', 'total', 'items'],
  properties: {
    vendor: { type: ['string', 'null'] },
    purchasedAt: { type: ['string', 'null'] },
    currency: { type: ['string', 'null'] },
    total: { type: ['number', 'null'] },
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'rawName',
          'normalizedName',
          'qty',
          'unit',
          'unitPrice',
          'totalPrice',
        ],
        properties: {
          rawName: { type: 'string' },
          normalizedName: { type: ['string', 'null'] },
          qty: { type: ['number', 'null'] },
          unit: { type: ['string', 'null'] },
          unitPrice: { type: ['number', 'null'] },
          totalPrice: { type: ['number', 'null'] },
        },
      },
    },
  },
} as const)

// Stable across every request → cache_control caches it as the prompt prefix.
// (Prompt caching only engages once a prefix exceeds the model's minimum —
// 4096 tokens for Haiku — so this short prompt won't cache in practice yet, but
// the placement is correct and starts paying off if the instructions grow.)
const SYSTEM_PROMPT = `You are a receipt-parsing engine. You are given a photo of a store receipt and must extract its contents as structured data.

Rules:
- vendor: the store/merchant name as printed, or null if not visible.
- purchasedAt: the purchase date/time as an ISO 8601 string (e.g. 2026-06-19T14:32:00Z). If only a date is visible, use midnight. null if no date is visible.
- currency: ISO 4217 code (e.g. "USD") if determinable, else null.
- total: the final amount paid as a number, or null.
- items: one entry per purchased line item. Skip subtotals, tax lines, totals, and payment/tender lines.
  - rawName: the item text exactly as printed on the receipt.
  - normalizedName: a clean, human-readable product name (expand obvious abbreviations), or null.
  - qty: quantity as a number, or null if not shown.
  - unit: unit of measure ("ea", "lb", "kg", etc.), or null.
  - unitPrice: price per unit as a number, or null.
  - totalPrice: line total as a number, or null.
- Use null for anything you cannot read or infer. Do not guess prices.`

export const scanReceiptVision = createServerFn({ method: 'POST' })
  .validator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data }) => {
    const t0 = Date.now()
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY is not set. Add it to your server environment to use the vision scanner.',
      )
    }
    const model = process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5'
    const client = new Anthropic({ apiKey })

    console.log('[scanReceiptVision] start', {
      model,
      mediaType: data.mediaType,
      base64KB: Math.round(data.imageBase64.length / 1024),
    })

    try {
      const response = await client.messages.parse({
        model,
        max_tokens: 8192,
        system: [
          {
            type: 'text',
            text: SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: data.mediaType,
                  data: data.imageBase64,
                },
              },
              { type: 'text', text: 'Extract this receipt as structured JSON.' },
            ],
          },
        ],
        output_config: { format: RECEIPT_FORMAT },
      })

      if (!response.parsed_output) {
        throw new Error('Model did not return a valid receipt.')
      }
      // Coerce to the canonical ScannedReceipt type + a runtime safety net.
      const parsed = scannedReceiptSchema.parse(response.parsed_output)

      console.log('[scanReceiptVision] ok', {
        ms: Date.now() - t0,
        vendor: parsed.vendor,
        items: parsed.items.length,
        total: parsed.total,
        cacheRead: response.usage.cache_read_input_tokens,
        cacheWrite: response.usage.cache_creation_input_tokens,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      })
      return parsed
    } catch (err) {
      console.error('[scanReceiptVision] failed', { ms: Date.now() - t0, err })
      throw err
    }
  })
