/**
 * KLOZEVA Anatomical Eyeshadow Renderer
 * Renders pigments strictly into the upper eyelid crease contour,
 * completely excluding open eyeball sclera, pupil, and eyebrow arches.
 */

import { traceSmoothLandmarkPath } from './colorBlending';
import { LANDMARK_INDICES } from './faceLandmarks';

/**
 * Renders realistic eyeshadow into the destination canvas context.
 */
export const renderEyeshadow = ({
  ctx,
  maskCtx,
  layerCtx,
  width,
  height,
  eyeshadowState,
  landmarks,
  fallbackAnatomy,
  mapCoord
}) => {
  const { hex, intensity, shimmer = true } = eyeshadowState;
  if (!hex || hex === 'transparent' || intensity <= 0) return;

  const alpha = intensity / 100;
  maskCtx.clearRect(0, 0, width, height);
  layerCtx.clearRect(0, 0, width, height);

  maskCtx.save();
  if (landmarks) {
    maskCtx.filter = 'blur(6px)';
    maskCtx.fillStyle = '#FFFFFF';
    traceSmoothLandmarkPath(maskCtx, landmarks, LANDMARK_INDICES.leftUpperLid, mapCoord);
    maskCtx.fill();
    traceSmoothLandmarkPath(maskCtx, landmarks, LANDMARK_INDICES.rightUpperLid, mapCoord);
    maskCtx.fill();

    // Subtract eyeballs and eyebrows
    maskCtx.globalCompositeOperation = 'destination-out';
    maskCtx.filter = 'blur(2.5px)';
    traceSmoothLandmarkPath(maskCtx, landmarks, LANDMARK_INDICES.leftEye, mapCoord);
    maskCtx.fill();
    traceSmoothLandmarkPath(maskCtx, landmarks, LANDMARK_INDICES.rightEye, mapCoord);
    maskCtx.fill();
    traceSmoothLandmarkPath(maskCtx, landmarks, LANDMARK_INDICES.leftEyebrow, mapCoord);
    maskCtx.fill();
    traceSmoothLandmarkPath(maskCtx, landmarks, LANDMARK_INDICES.rightEyebrow, mapCoord);
    maskCtx.fill();
  } else {
    const fb = fallbackAnatomy;
    const pLEye = mapCoord(fb.leftEye.x, fb.leftEye.y);
    const pREye = mapCoord(fb.rightEye.x, fb.rightEye.y);
    const eyeSpan = Math.abs(pREye.x - pLEye.x);
    const rx = eyeSpan * 0.24;
    const ry = eyeSpan * 0.11;

    maskCtx.filter = 'blur(6px)';
    maskCtx.fillStyle = '#FFFFFF';
    [pLEye, pREye].forEach((ep) => {
      maskCtx.beginPath();
      maskCtx.ellipse(ep.x, ep.y - ry * 0.45, rx, ry, 0, Math.PI, Math.PI * 2);
      maskCtx.fill();
    });

    maskCtx.globalCompositeOperation = 'destination-out';
    maskCtx.filter = 'blur(2px)';
    [pLEye, pREye].forEach((ep) => {
      maskCtx.beginPath();
      maskCtx.ellipse(ep.x, ep.y, rx * 0.92, ry * 0.62, 0, 0, Math.PI * 2);
      maskCtx.fill();
    });
  }
  maskCtx.restore();

  // 2. Fill pigment into offscreen layer and mask
  layerCtx.save();
  layerCtx.fillStyle = hex;
  layerCtx.fillRect(0, 0, width, height);
  layerCtx.globalCompositeOperation = 'destination-in';
  layerCtx.drawImage(maskCtx.canvas, 0, 0);
  layerCtx.restore();

  // 3. Multiply blend for rich lid contour pigment
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = alpha * 0.62;
  ctx.drawImage(layerCtx.canvas, 0, 0);

  // 4. Subtle shimmer sheen
  if (shimmer) {
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = alpha * 0.22;
    ctx.drawImage(layerCtx.canvas, 0, 0);
  }
  ctx.restore();
};

