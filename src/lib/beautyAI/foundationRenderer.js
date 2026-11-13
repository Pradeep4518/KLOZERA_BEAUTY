/**
 * KLOZEVA Texture-Preserving Foundation Renderer
 * Excludes eyes, eyebrows, lips, and nostrils while feathering skin boundaries
 * and preserving underlying pore detail and specular facial bone highlights.
 */

import { traceSmoothLandmarkPath } from './colorBlending';
import { LANDMARK_INDICES } from './faceLandmarks';

/**
 * Renders realistic foundation into the destination canvas context.
 */
export const renderFoundation = ({
  ctx,
  maskCtx,
  layerCtx,
  width,
  height,
  foundationState,
  landmarks,
  fallbackAnatomy,
  mapCoord
}) => {
  const { hex, intensity } = foundationState;
  if (!hex || hex === 'transparent' || intensity <= 0) return;

  const alpha = intensity / 100;
  maskCtx.clearRect(0, 0, width, height);
  layerCtx.clearRect(0, 0, width, height);

  // 1. Build feathered facial skin mask
  maskCtx.save();
  maskCtx.filter = 'blur(14px)';
  maskCtx.fillStyle = '#FFFFFF';

  if (landmarks) {
    traceSmoothLandmarkPath(maskCtx, landmarks, LANDMARK_INDICES.faceOval, mapCoord);
    maskCtx.fill();

    // Subtract facial organs so eyes, brows, nostrils & lips stay completely clean
    maskCtx.globalCompositeOperation = 'destination-out';
    maskCtx.filter = 'blur(5px)';
    traceSmoothLandmarkPath(maskCtx, landmarks, LANDMARK_INDICES.leftEye, mapCoord);
    maskCtx.fill();
    traceSmoothLandmarkPath(maskCtx, landmarks, LANDMARK_INDICES.rightEye, mapCoord);
    maskCtx.fill();
    traceSmoothLandmarkPath(maskCtx, landmarks, LANDMARK_INDICES.leftEyebrow, mapCoord);
    maskCtx.fill();
    traceSmoothLandmarkPath(maskCtx, landmarks, LANDMARK_INDICES.rightEyebrow, mapCoord);
    maskCtx.fill();
    traceSmoothLandmarkPath(maskCtx, landmarks, LANDMARK_INDICES.lipsOuter, mapCoord);
    maskCtx.fill();
    traceSmoothLandmarkPath(maskCtx, landmarks, LANDMARK_INDICES.leftNostril, mapCoord);
    maskCtx.fill();
  } else {
    const fb = fallbackAnatomy;
    const pTop = mapCoord(fb.faceTop.x, fb.faceTop.y);
    const pChin = mapCoord(fb.faceChin.x, fb.faceChin.y);
    const pLEye = mapCoord(fb.leftEye.x, fb.leftEye.y);
    const pREye = mapCoord(fb.rightEye.x, fb.rightEye.y);
    const pLip = mapCoord(fb.lipCenter.x, fb.lipCenter.y);
    const fCx = (pTop.x + pChin.x) / 2;
    const fCy = (pTop.y + pChin.y) / 2;
    const fRx = Math.abs(pREye.x - pLEye.x) * 1.12;
    const fRy = Math.abs(pChin.y - pTop.y) * 0.51;

    maskCtx.beginPath();
    maskCtx.ellipse(fCx, fCy, fRx, fRy, 0, 0, Math.PI * 2);
    maskCtx.fill();

    maskCtx.globalCompositeOperation = 'destination-out';
    maskCtx.filter = 'blur(5px)';
    maskCtx.beginPath();
    maskCtx.ellipse(pLEye.x, pLEye.y, fRx * 0.23, fRy * 0.1, 0, 0, Math.PI * 2);
    maskCtx.ellipse(pREye.x, pREye.y, fRx * 0.23, fRy * 0.1, 0, 0, Math.PI * 2);
    maskCtx.ellipse(pLip.x, pLip.y, fRx * 0.36, fRy * 0.11, 0, 0, Math.PI * 2);
    maskCtx.fill();
  }
  maskCtx.restore();

  // 2. Fill foundation pigment into offscreen layer and mask cleanly
  layerCtx.save();
  layerCtx.fillStyle = hex;
  layerCtx.fillRect(0, 0, width, height);
  layerCtx.globalCompositeOperation = 'destination-in';
  layerCtx.drawImage(maskCtx.canvas, 0, 0);
  layerCtx.restore();

  // 3. Dual-pass blending:
  // soft-light preserves pores, cheekbone luster, and natural shadows
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = alpha * 0.68;
  ctx.drawImage(layerCtx.canvas, 0, 0);

  // color shifts undertone pigment without washing out micro-contrast
  ctx.globalCompositeOperation = 'color';
  ctx.globalAlpha = alpha * 0.26;
  ctx.drawImage(layerCtx.canvas, 0, 0);
  ctx.restore();
};

