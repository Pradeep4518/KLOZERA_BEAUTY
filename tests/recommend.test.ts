import { describe, expect, it } from 'vitest'
import { createInitialDatabase } from '../src/lib/seed'
import { computeInventoryRecommendations } from '../src/lib/KLOZEVAContext'

const profile = (skinTone: string, undertone: string, skinType: string) => ({ skinTone, undertone, skinType })

describe('computeInventoryRecommendations', () => {
  const db = createInitialDatabase()

  it('returns nothing without an analysis or database', () => {
    expect(computeInventoryRecommendations(null, db)).toEqual([])
    expect(computeInventoryRecommendations(profile('Medium', 'Warm', 'Oily'), null)).toEqual([])
  })

  it('scores every product, sorted best-first, within the 68-99 band', () => {
    const recs = computeInventoryRecommendations(profile('Medium', 'Warm', 'Combination'), db)
    expect(recs).toHaveLength(db.products.length)
    for (let i = 1; i < recs.length; i++) expect(recs[i - 1].matchScore).toBeGreaterThanOrEqual(recs[i].matchScore)
    for (const r of recs) {
      expect(r.matchScore).toBeGreaterThanOrEqual(68)
      expect(r.matchScore).toBeLessThanOrEqual(99)
      expect(r.reason.length).toBeGreaterThan(0)
    }
  })

  it('is deterministic for the same profile', () => {
    const a = computeInventoryRecommendations(profile('Deep', 'Olive', 'Oily'), db)
    const b = computeInventoryRecommendations(profile('Deep', 'Olive', 'Oily'), db)
    expect(a.map((r: { product: { id: string }; matchScore: number }) => [r.product.id, r.matchScore]))
      .toEqual(b.map((r: { product: { id: string }; matchScore: number }) => [r.product.id, r.matchScore]))
  })

  it('reports live stock from the inventory table', () => {
    const recs = computeInventoryRecommendations(profile('Fair', 'Cool', 'Dry'), db)
    for (const r of recs) {
      const inv = db.inventory.find((i: { productId: string }) => i.productId === r.product.id)
      expect(r.quantity).toBe(inv ? inv.quantity : 0)
    }
  })
})
