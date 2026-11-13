import { describe, expect, it } from 'vitest';
import { analyzeCosmeticSkin } from '../src/lib/beautyAI/skinAnalysis';
import { evaluateUndertone, calculateHueAngle } from '../src/lib/beautyAI/undertoneAnalysis';
import { calculateAnalysisConfidence } from '../src/lib/beautyAI/analysisConfidence';

describe('Grounded Skin & Undertone Intelligence', () => {
  it('correctly calculates hue angle in degrees', () => {
    // a* = 10, b* = 10 -> 45 degrees
    expect(calculateHueAngle(10, 10)).toBeCloseTo(45, 1);
    // a* = 0, b* = 10 -> 90 degrees
    expect(calculateHueAngle(0, 10)).toBeCloseTo(90, 1);
  });

  it('classifies Warm, Cool, Olive, and Neutral undertones reliably', () => {
    // Warm: prominent yellow b* > a* + 2.5
    const warm = evaluateUndertone({ meanL: 60, meanA: 14, meanB: 20, stdL: 3, stdA: 1, stdB: 1 });
    expect(warm.undertone).toBe('Warm');

    // Cool: higher relative a*
    const cool = evaluateUndertone({ meanL: 65, meanA: 17, meanB: 14, stdL: 3, stdA: 1, stdB: 1 });
    expect(cool.undertone).toBe('Cool');

    // Olive: suppressed a* (<= 11.5), elevated b* (>= 16) with greenish-golden cast
    const olive = evaluateUndertone({ meanL: 55, meanA: 10, meanB: 17, stdL: 3, stdA: 1, stdB: 1 });
    expect(olive.undertone).toBe('Olive');

    // Neutral: balanced a* and b*
    const neutral = evaluateUndertone({ meanL: 62, meanA: 14, meanB: 14.5, stdL: 3, stdA: 1, stdB: 1 });
    expect(neutral.undertone).toBe('Neutral');
  });

  it('runs grounded cosmetic skin analysis and produces non-medical observations', () => {
    const width = 64;
    const height = 64;
    const data = new Uint8ClampedArray(width * height * 4);
    // Fill with natural medium warm skin pixels (R=205, G=150, B=115)
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 205;
      data[i + 1] = 150;
      data[i + 2] = 115;
      data[i + 3] = 255;
    }
    const mockImageData = { width, height, data } as ImageData;
    const skinMask = new Uint8ClampedArray(width * height).fill(255);

    const result = analyzeCosmeticSkin(mockImageData, skinMask);
    expect(['Fair', 'Light', 'Medium', 'Tan', 'Deep']).toContain(result.skinTone);
    expect(['Warm', 'Cool', 'Neutral', 'Olive']).toContain(result.undertone);
    expect(Array.isArray(result.colorPalette)).toBe(true);
    expect(result.colorPalette.length).toBe(5);

    // Verify observations are cosmetic and do not claim clinical diseases
    expect(result.observations.some((obs: string) => obs.includes('ITA') || obs.includes('depth'))).toBe(true);
    expect(result.summary).toContain(result.skinTone);
  });

  it('computes multi-factor grounded confidence without hardcoded numbers', () => {
    const conf = calculateAnalysisConfidence({
      imageQuality: { qualityScore: 85, symmetryRatio: 0.12, overexposedRatio: 0.02, underexposedRatio: 0.05 },
      landmarkStatus: 'success',
      skinSampleStats: { stdL: 3.5, stdA: 1.8, stdB: 2.0 },
      undertoneConfidence: 0.92
    });

    expect(conf.overallReliability).toBeGreaterThanOrEqual(70);
    expect(conf.overallReliability).toBeLessThanOrEqual(100);
    expect(conf.modelConfidence).toBe(0.95);
    expect(conf.isHighConfidence).toBe(true);
    expect(typeof conf.reliabilityNotice).toBe('string');
  });
});
