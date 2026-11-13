import { describe, expect, it } from 'vitest';
import { validateImageQuality } from '../src/lib/beautyAI/imageValidation';

describe('Image Quality Validation Service', () => {
  const createMockImageData = (width: number, height: number, fillR = 180, fillG = 140, fillB = 120) => {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = fillR;
      data[i + 1] = fillG;
      data[i + 2] = fillB;
      data[i + 3] = 255;
    }
    return { width, height, data } as ImageData;
  };

  it('rejects low-resolution images below 256x256', () => {
    const small = createMockImageData(120, 120);
    const result = validateImageQuality(small);
    expect(result.isValid).toBe(false);
    expect(result.issues.some((iss) => iss.includes('resolution'))).toBe(true);
  });

  it('detects severe underexposure', () => {
    // Almost black image (R=10, G=10, B=10)
    const dark = createMockImageData(300, 300, 10, 10, 10);
    const result = validateImageQuality(dark);
    expect(result.isValid).toBe(false);
    expect(result.issues.some((iss) => iss.includes('underexposed'))).toBe(true);
    expect(result.qualityScore).toBeLessThan(70);
  });

  it('detects severe overexposure / glare', () => {
    // Clipped bright white image (R=252, G=252, B=252)
    const blownOut = createMockImageData(300, 300, 252, 252, 252);
    const result = validateImageQuality(blownOut);
    expect(result.isValid).toBe(false);
    expect(result.issues.some((iss) => iss.includes('glare') || iss.includes('backlighting'))).toBe(true);
  });

  it('passes evenly lit, balanced portrait frames with actionable suggestions', () => {
    // Balanced natural lighting
    const balanced = createMockImageData(300, 300, 185, 145, 125);
    // Add artificial edge texture to satisfy sharpness filter
    for (let y = 10; y < 290; y += 4) {
      for (let x = 10; x < 290; x += 4) {
        const idx = (y * 300 + x) * 4;
        balanced.data[idx] = 130;
      }
    }
    const result = validateImageQuality(balanced);
    expect(result.qualityScore).toBeGreaterThanOrEqual(60);
    expect(Array.isArray(result.suggestions)).toBe(true);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });
});

