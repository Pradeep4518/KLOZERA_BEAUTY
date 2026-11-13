import { describe, expect, it } from 'vitest'
import { createInitialDatabase } from '../src/lib/seed'

describe('KLOZEVA seed database', () => {
  const db = createInitialDatabase()

  it('contains every entity the app relies on', () => {
    for (const table of [
      'brands', 'products', 'product_shades', 'inventory', 'customers',
      'beauty_analyses', 'recommendations', 'customer_messages', 'retailer_accounts',
    ]) {
      expect(Array.isArray((db as Record<string, unknown>)[table]), table).toBe(true)
    }
    expect(typeof db.lowStockThreshold).toBe('number')
  })

  it('has unique ids and every product belongs to a known brand', () => {
    const ids = db.products.map((p: { id: string }) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    const brandIds = new Set(db.brands.map((b: { id: string }) => b.id))
    for (const p of db.products) expect(brandIds.has(p.brandId), p.id).toBe(true)
  })

  it('gives every product a shade and an inventory record', () => {
    for (const p of db.products) {
      expect(db.product_shades.some((s: { productId: string }) => s.productId === p.id), `shade ${p.id}`).toBe(true)
      expect(db.inventory.some((i: { productId: string }) => i.productId === p.id), `inventory ${p.id}`).toBe(true)
    }
  })

  it('returns a fresh object on every call (reset demo must not share state)', () => {
    expect(createInitialDatabase()).not.toBe(db)
  })
})
