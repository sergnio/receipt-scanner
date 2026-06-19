import { createServerFn } from '@tanstack/react-start'
import { queryOptions } from '@tanstack/react-query'
import { and, desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '~/db/client'
import { lineItems, products, receipts, vendors } from '~/db/schema'
import { scannedReceiptSchema } from '~/lib/scanner/types'
import { normalizeKey } from '~/lib/normalize'

// OCR runs entirely client-side (see src/lib/scanner). The server only persists
// the reviewed result, because Turso writes need the auth token.

// --- Save: reviewed/corrected receipt -> vendor + products + line items ---

const saveInputSchema = scannedReceiptSchema.extend({
  items: z.array(
    scannedReceiptSchema.shape.items.element.extend({
      weightGrams: z.number().nullable().optional(),
    }),
  ),
})

export const saveReceipt = createServerFn({ method: 'POST' })
  .validator((d: unknown) => {
    try {
      return saveInputSchema.parse(d)
    } catch (err) {
      console.error('[saveReceipt] validation failed', err)
      throw err
    }
  })
  .handler(async ({ data }) => {
    const t0 = Date.now()
    console.log('[saveReceipt] start', {
      vendor: data.vendor,
      items: data.items.length,
      total: data.total,
      currency: data.currency,
      purchasedAt: data.purchasedAt,
    })
    try {
      const vendorId = data.vendor ? await upsertVendor(data.vendor) : null
      console.log('[saveReceipt] vendor resolved', { vendorId })

      const [receipt] = await db
        .insert(receipts)
        .values({
          vendorId,
          purchasedAt: data.purchasedAt ? new Date(data.purchasedAt) : new Date(),
          currency: data.currency,
          total: data.total,
        })
        .returning()
      console.log('[saveReceipt] receipt inserted', { receiptId: receipt.id })

      for (const [i, item] of data.items.entries()) {
        try {
          const productId = await matchOrCreateProduct(item.normalizedName, item.unit)
          await db.insert(lineItems).values({
            receiptId: receipt.id,
            productId,
            rawName: item.rawName,
            qty: item.qty,
            unit: item.unit,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            weightGrams: item.weightGrams ?? null,
          })
        } catch (err) {
          console.error('[saveReceipt] line item insert failed', {
            index: i,
            item,
            err,
          })
          throw err
        }
      }

      console.log('[saveReceipt] ok', {
        receiptId: receipt.id,
        ms: Date.now() - t0,
      })
      return { receiptId: receipt.id }
    } catch (err) {
      console.error('[saveReceipt] failed', { ms: Date.now() - t0, err })
      throw err
    }
  })

async function upsertVendor(name: string): Promise<number> {
  const key = normalizeKey(name)
  const existing = await db.query.vendors.findFirst({
    where: eq(vendors.normalizedName, key),
  })
  if (existing) return existing.id
  const [created] = await db
    .insert(vendors)
    .values({ name, normalizedName: key })
    .returning()
  return created.id
}

// Exact-match on normalized name for now; good enough for a personal tool.
// A fuzzy/LLM merge step can replace this without touching callers.
async function matchOrCreateProduct(
  normalizedName: string | null,
  unit: string | null,
): Promise<number | null> {
  if (!normalizedName) return null
  const key = normalizeKey(normalizedName)
  const existing = await db.query.products.findFirst({
    where: eq(products.normalizedName, key),
  })
  if (existing) return existing.id
  const [created] = await db
    .insert(products)
    .values({
      canonicalName: normalizedName,
      normalizedName: key,
      defaultUnit: unit,
    })
    .returning()
  return created.id
}

// --- Queries ---

export const listReceipts = createServerFn({ method: 'GET' }).handler(
  async () => {
    return db
      .select({
        id: receipts.id,
        purchasedAt: receipts.purchasedAt,
        total: receipts.total,
        currency: receipts.currency,
        vendor: vendors.name,
      })
      .from(receipts)
      .leftJoin(vendors, eq(receipts.vendorId, vendors.id))
      .orderBy(desc(receipts.purchasedAt))
  },
)

export const getReceipt = createServerFn({ method: 'GET' })
  .validator((id: number) => id)
  .handler(async ({ data: id }) => {
    const receipt = await db.query.receipts.findFirst({
      where: eq(receipts.id, id),
    })
    if (!receipt) return null
    const vendor = receipt.vendorId
      ? await db.query.vendors.findFirst({ where: eq(vendors.id, receipt.vendorId) })
      : null
    const items = await db
      .select()
      .from(lineItems)
      .where(eq(lineItems.receiptId, id))
    return { receipt, vendor, items }
  })

export const listProducts = createServerFn({ method: 'GET' }).handler(
  async () => {
    return db
      .select()
      .from(products)
      .orderBy(products.canonicalName)
  },
)

export const getProductHistory = createServerFn({ method: 'GET' })
  .validator((id: number) => id)
  .handler(async ({ data: id }) => {
    const product = await db.query.products.findFirst({
      where: eq(products.id, id),
    })
    if (!product) return null
    const history = await db
      .select({
        purchasedAt: receipts.purchasedAt,
        vendor: vendors.name,
        unitPrice: lineItems.unitPrice,
        unit: lineItems.unit,
        qty: lineItems.qty,
        totalPrice: lineItems.totalPrice,
        weightGrams: lineItems.weightGrams,
      })
      .from(lineItems)
      .innerJoin(receipts, eq(lineItems.receiptId, receipts.id))
      .leftJoin(vendors, eq(receipts.vendorId, vendors.id))
      .where(and(eq(lineItems.productId, id)))
      .orderBy(desc(receipts.purchasedAt))
    return { product, history }
  })

// --- Query options (TanStack Query) ---

export const receiptsQueryOptions = () =>
  queryOptions({ queryKey: ['receipts'], queryFn: () => listReceipts() })

export const receiptQueryOptions = (id: number) =>
  queryOptions({
    queryKey: ['receipt', id],
    queryFn: () => getReceipt({ data: id }),
  })

export const productsQueryOptions = () =>
  queryOptions({ queryKey: ['products'], queryFn: () => listProducts() })

export const productHistoryQueryOptions = (id: number) =>
  queryOptions({
    queryKey: ['product', id],
    queryFn: () => getProductHistory({ data: id }),
  })
