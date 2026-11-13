import { describe, expect, it } from 'vitest';
import {
  MODEL_REGISTRY,
  getModelInformation,
  isCommerciallyCleared
} from '../src/lib/beautyAI/modelRegistry';
import {
  initializeHuggingFace,
  getModelStatus,
  validateModelCompatibility,
  getFacialMasks,
  releaseAIResources
} from '../src/lib/huggingface';

describe('Hugging Face Service & Model Lifecycle', () => {
  it('registers all required models with detailed architectural metadata', () => {
    expect(MODEL_REGISTRY.FACE_PARSING).toBeDefined();
    expect(MODEL_REGISTRY.FACE_LANDMARKS).toBeDefined();
    expect(MODEL_REGISTRY.SKIN_ANALYSIS_COLORIMETRIC).toBeDefined();
    expect(MODEL_REGISTRY.GEMINI_VISION).toBeDefined();

    const fp = getModelInformation('FACE_PARSING');
    expect(fp?.architecture).toBe('SegFormer B0');
    expect(fp?.classes.length).toBe(19);
    expect(fp?.dependencies).toContain('@huggingface/transformers');
  });

  it('correctly discriminates commercial clearance between production and research models', () => {
    // MediaPipe & CIELAB are commercially cleared
    expect(isCommerciallyCleared('FACE_LANDMARKS')).toBe(true);
    expect(isCommerciallyCleared('SKIN_ANALYSIS_COLORIMETRIC')).toBe(true);

    // SegFormer trained on CelebAMask-HQ is flagged restricted for research evaluation
    expect(isCommerciallyCleared('FACE_PARSING')).toBe(false);
  });

  it('initializes Hugging Face environment gracefully', async () => {
    const ok = await initializeHuggingFace();
    expect(typeof ok).toBe('boolean');
    const status = getModelStatus();
    expect(status).toHaveProperty('initialized');
    expect(status).toHaveProperty('activeEngine');
  });

  it('validates model environment compatibility', () => {
    const compat = validateModelCompatibility('FACE_PARSING');
    expect(compat.compatible).toBe(true);
    expect(compat).toHaveProperty('recommendedDevice');
  });

  it('extracts structured facial masks matching schema with real Uint8ClampedArray buffers', async () => {
    const mockCanvas = { width: 100, height: 100 };
    const masks = await getFacialMasks(mockCanvas as any, { width: 100, height: 100 });
    expect(masks.status).toBe('success');
    expect(masks.imageWidth).toBe(100);
    expect(masks.imageHeight).toBe(100);
    expect(masks.regions.skin).toBeInstanceOf(Uint8ClampedArray);
    expect(masks.regions.upperLip).toBeInstanceOf(Uint8ClampedArray);
    expect(masks.regions.lowerLip).toBeInstanceOf(Uint8ClampedArray);
    expect(masks.regions.leftEye).toBeInstanceOf(Uint8ClampedArray);
  });

  it('releases AI memory and resources cleanly', () => {
    expect(() => releaseAIResources()).not.toThrow();
  });
});

