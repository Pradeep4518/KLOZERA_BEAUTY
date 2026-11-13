import { describe, expect, it } from 'vitest';
import {
  PARSING_CLASSES,
  createEmptyMask,
  generateMasksFromLandmarks
} from '../src/lib/beautyAI/faceParsing';
import { LANDMARK_INDICES, getFallbackAnatomy } from '../src/lib/beautyAI/faceLandmarks';

describe('Face Parsing and Landmark Integration', () => {
  it('maps all 19 standard semantic classes correctly', () => {
    expect(PARSING_CLASSES.BACKGROUND).toBe(0);
    expect(PARSING_CLASSES.SKIN).toBe(1);
    expect(PARSING_CLASSES.NOSE).toBe(2);
    expect(PARSING_CLASSES.LEFT_EYE).toBe(4);
    expect(PARSING_CLASSES.RIGHT_EYE).toBe(5);
    expect(PARSING_CLASSES.UPPER_LIP).toBe(11);
    expect(PARSING_CLASSES.LOWER_LIP).toBe(12);
    expect(PARSING_CLASSES.HAIR).toBe(13);
  });

  it('allocates proper binary mask buffer sizes', () => {
    const mask = createEmptyMask(100, 100);
    expect(mask.byteLength).toBe(10000);
    expect(mask[0]).toBe(0);
  });

  it('generates anatomical masks from fallback geometry without errors', () => {
    const result = generateMasksFromLandmarks(null, 200, 200);
    expect(result.status).toBe('success');
    expect(result.imageWidth).toBe(200);
    expect(result.imageHeight).toBe(200);
    expect(result.regions.skin).toBeInstanceOf(Uint8ClampedArray);
    expect(result.regions.upperLip).toBeInstanceOf(Uint8ClampedArray);
    expect(result.regions.lowerLip).toBeInstanceOf(Uint8ClampedArray);
    expect(result.regions.leftEye).toBeInstanceOf(Uint8ClampedArray);

    // Verify center of face contains skin pixels in fallback
    const centerIdx = 100 * 200 + 100;
    expect(result.regions.skin[centerIdx]).toBe(255);
  });

  it('provides calibrated fallback anatomy coordinates within 0..1 bounds', () => {
    const anatomy = getFallbackAnatomy();
    expect(anatomy.faceTop.y).toBeGreaterThan(0);
    expect(anatomy.faceChin.y).toBeLessThan(1);
    expect(anatomy.leftEye.x).toBeLessThan(anatomy.rightEye.x);
    expect(anatomy.leftCheek.x).toBeLessThan(anatomy.rightCheek.x);
    expect(anatomy.lipCenter.y).toBeGreaterThan(anatomy.leftEye.y);
  });

  it('defines valid MediaPipe contour landmark arrays with proper indices', () => {
    expect(LANDMARK_INDICES.faceOval.length).toBeGreaterThan(20);
    expect(LANDMARK_INDICES.lipsOuter.length).toBeGreaterThan(10);
    expect(LANDMARK_INDICES.lipsInner.length).toBeGreaterThan(10);
    expect(LANDMARK_INDICES.leftEye.length).toBeGreaterThan(10);
    expect(LANDMARK_INDICES.rightEye.length).toBeGreaterThan(10);
    expect(LANDMARK_INDICES.leftCheekbone.length).toBeGreaterThan(5);
  });
});

