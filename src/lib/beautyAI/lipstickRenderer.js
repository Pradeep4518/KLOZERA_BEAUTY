/**
 * KLOZEVA Realistic Lipstick Renderer
 * Strict adherence to vermilion borders, complete teeth/mouth cavity occlusion,
 * vertical lip wrinkle preservation, and matte/satin/gloss finishes.
 */

import { traceSmoothLandmarkPath } from './colorBlending';
import { LANDMARK_INDICES } from './faceLandmarks';

/**
 * Renders realistic lipstick into the destination canvas context.
 */
export const renderLipstick = ({
  ctx,
  maskCtx,
  layerCtx,
  width,
  height,
  lipstickState,
  landmarks,
  fallbackAnatomy,
  mapCoord
}) => {
  const { hex, intensity, finish = 'satin' } = lipstickState;
  if (!hex || hex === 'transparent' || intensity <= 0) return;

  const alpha = intensity / 100;
  maskCtx.clearRect(0, 0, width, height);
  layerCtx.clearRect(0, 0, width, height);

  // 1. Build lip mask with sub-pixel feathering
  maskCtx.save();
  maskCtx.filter = 'blur(1.8px)';
  maskCtx.fillStyle = '#FFFFFF';

  if (landmarks) {
    // Fill full outer vermilion border
    traceSmoothLandmarkPath(maskCtx, landmarks, LANDMARK_INDICES.lipsOuter, mapCoord);
    maskCtx.fill();

    // Subtract inner mouth cavity so teeth and tongue stay 100% natural
    maskCtx.globalCompositeOperation = 'destination-out';
    maskCtx.filter = 'blur(1.2px)';
    traceSmoothLandmarkPath(maskCtx, landmarks, LANDMARK_INDICES.lipsInner, mapCoord);
    maskCtx.fill();
  } else {
    // Calibrated anatomical bezier fallback
    const fb = fallbackAnatomy;
    const pLip = mapCoord(fb.lipCenter.x, fb.lipCenter.y);
    const lw = fb.lipWidth * width * 0.52;
    const lh = lw * 0.48;

    maskCtx.beginPath();
    maskCtx.moveTo(pLip.x - lw, pLip.y);
    maskCtx.bezierCurveTo(pLip.x - lw * 0.55, pLip.y - lh * 0.95, pLip.x - lw * 0.18, pLip.y - lh * 0.95, pLip.x, pLip.y - lh * 0.62);
    maskCtx.bezierCurveTo(pLip.x + lw * 0.18, pLip.y - lh * 0.95, pLip.x + lw * 0.55, pLip.y - lh * 0.95, pLip.x + lw, pLip.y);
    maskCtx.bezierCurveTo(pLip.x + lw * 0.65, pLip.y + lh * 1.15, pLip.x - lw * 0.65, pLip.y + lh * 1.15, pLip.x - lw, pLip.y);
    maskCtx.closePath();
    maskCtx.fill();
  }
  maskCtx.restore();

  // 2. Fill cosmetic pigment into offscreen layer and mask cleanly
  layerCtx.save();
  layerCtx.fillStyle = hex;
  layerCtx.fillRect(0, 0, width, height);
  layerCtx.globalCompositeOperation = 'destination-in';
  layerCtx.drawImage(maskCtx.canvas, 0, 0);
  layerCtx.restore();

  // 3. Multi-pass compositing: Multiply preserves natural vertical lip folds; Color transfers wavelength
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = alpha * 0.76;
  ctx.drawImage(layerCtx.canvas, 0, 0);

  ctx.globalCompositeOperation = 'color';
  ctx.globalAlpha = alpha * 0.44;
  ctx.drawImage(layerCtx.canvas, 0, 0);

  // 4. Specular highlight for satin and glossy finishes on lower lip contour
  if (finish !== 'matte') {
    const lipCenter = landmarks
      ? mapCoord(landmarks[17].x, (landmarks[14].y + landmarks[17].y) / 2)
      : mapCoord(fallbackAnatomy.lipCenter.x, fallbackAnatomy.lipCenter.y + 0.014);

    const lipSpan = landmarks
      ? Math.abs(mapCoord(landmarks[291].x, landmarks[291].y).x - mapCoord(landmarks[61].x, landmarks[61].y).x)
      : fallbackAnatomy.lipWidth * width;

    ctx.save();
    ctx.filter = 'blur(2.5px)';
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = alpha * (finish === 'glossy' ? 0.38 : 0.22);
    ctx.fillStyle = '#FFF5F2';
    ctx.beginPath();
    ctx.ellipse(lipCenter.x, lipCenter.y, lipSpan * 0.24, Math.max(2.5, lipSpan * 0.048), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
};

