import { describe, expect, it } from 'vitest';
import { createInitialDatabase } from '../src/lib/seed';
import {
  computeInventoryRecommendations,
  applyCustomerCorrection,
  filterLipstickRecommendations,
  filterEyeshadowRecommendations
} from '../src/lib/KLOZEVAContext';

describe('Customer Corrections & Explainable Recommendations', () => {
  const db = createInitialDatabase();
  const rawAnalysis = {
    skinTone: 'Fair',
    undertone: 'Cool',
    skinType: 'Dry',
    confidence: 88,
    summary: 'Original model prediction'
  };

  it('stores customer corrections separately without overwriting original model outputs', () => {
    const corrected = applyCustomerCorrection(rawAnalysis, {
      skinTone: 'Medium',
      undertone: 'Warm'
    });

    expect(corrected.skinTone).toBe('Medium');
    expect(corrected.undertone).toBe('Warm');
    expect(corrected.originalPrediction.skinTone).toBe('Fair');
    expect(corrected.originalPrediction.undertone).toBe('Cool');
    expect(corrected.customerCorrections.skinTone).toBe('Medium');
  });

  it('recalculates inventory recommendations dynamically when customer corrections are applied', () => {
    const rawRecs = computeInventoryRecommendations(rawAnalysis, db);
    const correctedRecs = computeInventoryRecommendations(
      rawAnalysis,
      db,
      { skinTone: 'Deep', undertone: 'Warm' }
    );

    expect(rawRecs.length).toBeGreaterThan(0);
    expect(correctedRecs.length).toBeGreaterThan(0);

    // Deep customer match should select deep shade numbers rather than fair ones
    const topDeepFnd = correctedRecs.find((r: any) => r.product.category === 'Foundation');
    expect(topDeepFnd).toBeDefined();
    expect(topDeepFnd?.shade.targetTone).toContain('Deep');
    expect(topDeepFnd?.scoreBreakdown).toBeDefined();
    expect(topDeepFnd?.scoreBreakdown.skinToneScore).toBeDefined();
  });

  it('filters lipstick recommendations by color families accurately', () => {
    const recs = computeInventoryRecommendations(rawAnalysis, db);
    const warmLipsticks = filterLipstickRecommendations(recs, 'Warm');
    expect(warmLipsticks.every((r: any) => r.product.category === 'Lipstick')).toBe(true);

    const redLipsticks = filterLipstickRecommendations(recs, 'Red');
    expect(redLipsticks.every((r: any) => r.product.category === 'Lipstick')).toBe(true);
  });

  it('filters eyeshadow recommendations by styling styles accurately', () => {
    const recs = computeInventoryRecommendations(rawAnalysis, db);
    const bronzeEyeshadows = filterEyeshadowRecommendations(recs, 'Bronze');
    expect(bronzeEyeshadows.every((r: any) => r.product.category === 'Eyeshadow')).toBe(true);
  });
});
