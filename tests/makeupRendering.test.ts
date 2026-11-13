import { describe, expect, it } from 'vitest';
import {
  hexToRgb,
  softLightBlend,
  multiplyBlend,
  screenBlend,
  createCoordMapper
} from '../src/lib/beautyAI/colorBlending';
import { validateMakeupTransferSafety, MAKEUP_TRANSFER_ENGINES } from '../src/lib/beautyAI/makeupTransfer';

describe('Virtual Makeup Rendering & Color Blending', () => {
  it('parses hex colors with and without alpha cleanly', () => {
    const red = hexToRgb('#FF0000');
    expect(red).toEqual({ r: 255, g: 0, b: 0, a: 1.0 });

    const terracotta = hexToRgb('#B45643');
    expect(terracotta.r).toBe(180);
    expect(terracotta.g).toBe(86);
    expect(terracotta.b).toBe(67);
    expect(terracotta.a).toBe(1.0);

    const transparentPink = hexToRgb('#E598A880');
    expect(transparentPink.a).toBeCloseTo(0.5, 1);
  });

  it('computes soft-light, multiply, and screen blending formulas correctly', () => {
    // Multiply darkens: 200 * 200 / 255 ≈ 157
    expect(multiplyBlend(200, 200)).toBe(157);
    // Screen lightens: 255 - (255 - 100)*(255 - 100)/255 ≈ 161
    expect(screenBlend(100, 100)).toBe(161);
    // Soft-light midpoint
    expect(softLightBlend(128, 128)).toBeCloseTo(128, 1);
  });

  it('maps normalized coordinates correctly with cover aspect ratio and optional mirroring', () => {
    const mapper = createCoordMapper(640, 480, 640, 480, false);
    const pCenter = mapper(0.5, 0.5);
    expect(pCenter.x).toBe(320);
    expect(pCenter.y).toBe(240);

    // Mirrored X for webcam
    const mirrorMapper = createCoordMapper(640, 480, 640, 480, true);
    const pRight = mirrorMapper(0.8, 0.5);
    expect(pRight.x).toBeCloseTo(640 * 0.2, 1);
  });

  it('validates makeup transfer safety and identity preservation threshold', () => {
    const w = 32;
    const h = 32;
    const origData = new Uint8ClampedArray(w * h * 4).fill(150);
    const safeData = new Uint8ClampedArray(w * h * 4).fill(160); // Drift = 10
    const unsafeData = new Uint8ClampedArray(w * h * 4).fill(240); // Drift = 90

    const safeResult = validateMakeupTransferSafety({
      originalImageData: { data: origData } as ImageData,
      renderedImageData: { data: safeData } as ImageData
    });
    expect(safeResult.safe).toBe(true);
    expect(safeResult.identityPreserved).toBe(true);

    const unsafeResult = validateMakeupTransferSafety({
      originalImageData: { data: origData } as ImageData,
      renderedImageData: { data: unsafeData } as ImageData
    });
    expect(unsafeResult.safe).toBe(false);
  });

  it('documents commercial clearance for all registered makeup transfer adapters', () => {
    expect(MAKEUP_TRANSFER_ENGINES.DETERMINISTIC_COMPOSITOR.commercialStatus).toContain('Commercially Cleared');
    expect(MAKEUP_TRANSFER_ENGINES.BEAUTY_GAN.commercialStatus).toContain('Research Only');
  });
});

