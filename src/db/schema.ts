import { sql } from 'drizzle-orm'
import {
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'

export const vendors = sqliteTable(
  'vendors',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    normalizedName: text('normalized_name').notNull(),
  },
  (t) => ({
    normalizedIdx: uniqueIndex('vendors_normalized_idx').on(t.normalizedName),
  }),
)

// The anchor for price-over-time. Line items from different receipts
// point at one product.
export const products = sqliteTable(
  'products',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    canonicalName: text('canonical_name').notNull(),
    normalizedName: text('normalized_name').notNull(),
    defaultUnit: text('default_unit'),
  },
  (t) => ({
    normalizedIdx: uniqueIndex('products_normalized_idx').on(t.normalizedName),
  }),
)

export const receipts = sqliteTable('receipts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  vendorId: integer('vendor_id').references(() => vendors.id),
  purchasedAt: integer('purchased_at', { mode: 'timestamp' }).notNull(),
  currency: text('currency'),
  total: real('total'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

export const lineItems = sqliteTable('line_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  receiptId: integer('receipt_id')
    .notNull()
    .references(() => receipts.id, { onDelete: 'cascade' }),
  productId: integer('product_id').references(() => products.id),
  rawName: text('raw_name').notNull(),
  qty: real('qty'),
  unit: text('unit'),
  unitPrice: real('unit_price'),
  totalPrice: real('total_price'),
  // optional manual entry for cost-per-gram calculations
  weightGrams: real('weight_grams'),
})

export type Vendor = typeof vendors.$inferSelect
export type Product = typeof products.$inferSelect
export type Receipt = typeof receipts.$inferSelect
export type LineItem = typeof lineItems.$inferSelect
