import { describe, expect, it } from 'vitest';
import * as ai from '../src/lib/beautyAI';
import { createInitialDatabase } from '../src/lib/seed';
import { computeInventoryRecommendations, applyCustomerCorrection } from '../src/lib/KLOZEVAContext';

describe('End-to-End Customer Workflow Verification', () => {
  const db = createInitialDatabase();

  it('executes full 10-step customer pipeline and validates boundaries & scores', async () => {
    // 1. Simulate customer image data (512x512 with realistic medium warm skin)
    const w = 512;
    const h = 512;
    const data = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        data[idx] = 205;     // R
        data[idx + 1] = 152; // G
        data[idx + 2] = 118; // B
        data[idx + 3] = 255;
      }
    }
    const mockImageData = { width: w, height: h, data } as ImageData;

    // 2. Pre-flight Quality Validation
    const val = ai.validateImageQuality(mockImageData);
    expect(val.qualityScore).toBeGreaterThan(0);
    expect(Array.isArray(val.suggestions)).toBe(true);

    // 3. Landmark & Face Parsing
    const masks = ai.generateMasksFromLandmarks(null, w, h);
    expect(masks.status).toBe('success');
    expect(masks.regions.skin).toBeInstanceOf(Uint8ClampedArray);
    expect(masks.regions.upperLip).toBeInstanceOf(Uint8ClampedArray);
    expect(masks.regions.lowerLip).toBeInstanceOf(Uint8ClampedArray);

    // Verify non-zero skin mask pixels
    const skinPixelCount = masks.regions.skin.filter((p: number) => p > 0).length;
    expect(skinPixelCount).toBeGreaterThan(1000);

    // 4. Grounded Skin Analysis (CIELAB & ITA)
    const skin = ai.analyzeCosmeticSkin(mockImageData, masks.regions.skin);
    expect(skin.skinTone).toBe('Medium');
    expect(skin.undertone).toBe('Warm');
    expect(skin.itaDegrees).toBeGreaterThan(28);
    expect(skin.itaDegrees).toBeLessThanOrEqual(41);
    expect(skin.observations.length).toBeGreaterThanOrEqual(3);

    // 5. Calibrated Confidence Calculation
    const conf = ai.calculateAnalysisConfidence({
      imageQuality: val,
      landmarkStatus: 'fallback_geometry',
      skinSampleStats: skin.metrics,
      undertoneConfidence: skin.undertoneDetails.confidenceScore
    });
    expect(conf.overallReliability).toBeGreaterThanOrEqual(60);
    expect(conf.overallReliability).toBeLessThanOrEqual(100);

    // 6. Recommendation Matching from Actual Store Inventory
    const recs = computeInventoryRecommendations({
      skinTone: skin.skinTone,
      undertone: skin.undertone,
      skinType: skin.skinType
    }, db);
    expect(recs.length).toBe(db.products.length);

    const topFnd = recs.find((r: any) => r.product.category === 'Foundation');
    expect(topFnd).toBeDefined();
    expect(topFnd?.matchScore).toBeGreaterThanOrEqual(68);
    expect(topFnd?.scoreBreakdown).toHaveProperty('skinToneScore');
    expect(topFnd?.scoreBreakdown).toHaveProperty('undertoneScore');

    // 7. Customer Manual Overrides
    const corrected = applyCustomerCorrection({
      skinTone: skin.skinTone,
      undertone: skin.undertone,
      skinType: skin.skinType
    }, { skinTone: 'Deep', undertone: 'Cool' });

    expect(corrected.skinTone).toBe('Deep');
    expect(corrected.originalPrediction.skinTone).toBe('Medium');

    const correctedRecs = computeInventoryRecommendations(corrected, db, corrected.customerCorrections);
    const topDeepFnd = correctedRecs.find((r: any) => r.product.category === 'Foundation');
    expect(topDeepFnd?.shade.targetTone).toContain('Deep');
  });
});

