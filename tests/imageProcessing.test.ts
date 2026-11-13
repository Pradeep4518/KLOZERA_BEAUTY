import { describe, expect, it } from 'vitest';
import {
  sRGBToLinear,
  sRGBToCIELAB,
  calculateITA,
  classifySkinDepthFromITA,
  filterSkinPixels
} from '../src/lib/beautyAI/imageProcessing';

describe('Image Processing & CIELAB Color Physics', () => {
  it('converts sRGB to linear RGB correctly', () => {
    expect(sRGBToLinear(0)).toBe(0);
    expect(sRGBToLinear(255)).toBeCloseTo(1.0, 4);
    // Midpoint gamma transfer check
    expect(sRGBToLinear(128)).toBeGreaterThan(0.2);
    expect(sRGBToLinear(128)).toBeLessThan(0.23);
  });

  it('converts sRGB to CIELAB with standard reference values', () => {
    // Pure white (255, 255, 255) -> L* = 100, a* ≈ 0, b* ≈ 0
    const white = sRGBToCIELAB(255, 255, 255);
    expect(white.L).toBeCloseTo(100, 1);
    expect(Math.abs(white.a)).toBeLessThan(1.0);
    expect(Math.abs(white.b)).toBeLessThan(1.0);

    // Pure black (0, 0, 0) -> L* = 0, a* = 0, b* = 0
    const black = sRGBToCIELAB(0, 0, 0);
    expect(black.L).toBeCloseTo(0, 1);
    expect(black.a).toBeCloseTo(0, 1);
    expect(black.b).toBeCloseTo(0, 1);

    // Medium warm skin tone (r=201, g=147, b=107)
    const warmTone = sRGBToCIELAB(201, 147, 107);
    expect(warmTone.L).toBeGreaterThan(60);
    expect(warmTone.L).toBeLessThan(70);
    expect(warmTone.b).toBeGreaterThan(warmTone.a); // Yellow b* dominant over red a*
  });

  it('computes Individual Typology Angle (ITA) and maps to dermatological depth categories', () => {
    // Very light skin: high L*, low-moderate b* -> ITA > 55°
    const itaFair = calculateITA(85, 15);
    expect(itaFair).toBeGreaterThan(55);
    expect(classifySkinDepthFromITA(itaFair)).toBe('Fair');

    // Light skin: 41° < ITA <= 55°
    const itaLight = calculateITA(72, 20);
    expect(itaLight).toBeGreaterThan(41);
    expect(itaLight).toBeLessThanOrEqual(55);
    expect(classifySkinDepthFromITA(itaLight)).toBe('Light');

    // Medium skin: 28° < ITA <= 41°
    const itaMed = calculateITA(62, 19);
    expect(itaMed).toBeGreaterThan(28);
    expect(itaMed).toBeLessThanOrEqual(41);
    expect(classifySkinDepthFromITA(itaMed)).toBe('Medium');

    // Tan skin: 10° < ITA <= 28°
    const itaTan = calculateITA(54, 18);
    expect(itaTan).toBeGreaterThan(10);
    expect(itaTan).toBeLessThanOrEqual(28);
    expect(classifySkinDepthFromITA(itaTan)).toBe('Tan');

    // Deep skin: ITA <= 10°
    const itaDeep = calculateITA(38, 16);
    expect(itaDeep).toBeLessThanOrEqual(10);
    expect(classifySkinDepthFromITA(itaDeep)).toBe('Deep');
  });

  it('filters specular glare and shadow outliers with IQR', () => {
    const rawSamples = [
      { L: 98, a: 2, b: 3 }, // Specular highlight (should be excluded)
      { L: 12, a: 1, b: 1 }, // Occlusion shadow (should be excluded)
      { L: 62, a: 14, b: 18 },
      { L: 63, a: 13, b: 17 },
      { L: 61, a: 14, b: 19 },
      { L: 64, a: 15, b: 18 },
      { L: 62, a: 14, b: 17 },
      { L: 63, a: 14, b: 18 },
      { L: 62, a: 13, b: 19 },
      { L: 61, a: 14, b: 18 },
      { L: 64, a: 14, b: 18 },
      { L: 63, a: 15, b: 17 },
      { L: 62, a: 14, b: 18 }
    ];

    const filtered = filterSkinPixels(rawSamples);
    expect(filtered.every((s: { L: number }) => s.L >= 20 && s.L <= 94)).toBe(true);
    expect(filtered.length).toBeLessThan(rawSamples.length);
  });
});
