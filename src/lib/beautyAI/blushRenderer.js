/**
 * KLOZEVA Malar Cheekbone Blush Renderer
 * Anchors soft feathered radial gradients strictly on the malar cheek apples,
 * excluding under-eye circles, nasolabial folds, and lower jawline.
 */

import { traceSmoothLandmarkPath } from './colorBlending';
import { LANDMARK_INDICES } from './faceLandmarks';

/**
 * Computes centroid and bounding radius for landmark indices
 */
const getRegionMetrics = (lm, indices, mapCoord) => {
  let sx = 0, sy = 0;
  indices.forEach((idx) => {
    const p = mapCoord(lm[idx].x, lm[idx].y);
    sx += p.x;
    sy += p.y;
  });
  return {
    cx: sx / indices.length,
    cy: sy / indices.length
  };
};

/**
 * Renders realistic feathered blush into destination canvas context.
 */
export const renderBlush = ({
  ctx,
  layerCtx,
  width,
  height,
  blushState,
  landmarks,
  fallbackAnatomy,
  mapCoord,
  mirrorX = false
}) => {
  const { hex, intensity } = blushState;
  if (!hex || hex === 'transparent' || intensity <= 0) return;

  const alpha = intensity / 100;
  layerCtx.clearRect(0, 0, width, height);

  const renderSoftCheekGradient = (cx, cy, rx, ry, angle) => {
    layerCtx.save();
    layerCtx.translate(cx, cy);
    layerCtx.rotate(angle);
    layerCtx.scale(1, ry / rx);
    const grad = layerCtx.createRadialGradient(0, 0, 0, 0, 0, rx);
    grad.addColorStop(0, hex);
    grad.addColorStop(0.28, `${hex}CC`);
    grad.addColorStop(0.62, `${hex}44`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    layerCtx.fillStyle = grad;
    layerCtx.beginPath();
    layerCtx.arc(0, 0, rx, 0, Math.PI * 2);
    layerCtx.fill();
    layerCtx.restore();
  };

  if (landmarks) {
    const lCheek = getRegionMetrics(landmarks, LANDMARK_INDICES.leftCheekbone, mapCoord);
    const rCheek = getRegionMetrics(landmarks, LANDMARK_INDICES.rightCheekbone, mapCoord);
    const lEyeCenter = getRegionMetrics(landmarks, LANDMARK_INDICES.leftEye, mapCoord);
    const rEyeCenter = getRegionMetrics(landmarks, LANDMARK_INDICES.rightEye, mapCoord);
    const noseTip = mapCoord(landmarks[1].x, landmarks[1].y);

    // Anchor each blush exactly on the malar cheek apple
    const lAnchorX = lCheek.cx * 0.65 + lEyeCenter.cx * 0.35;
    const rAnchorX = rCheek.cx * 0.65 + rEyeCenter.cx * 0.35;
    const lAnchorY = lEyeCenter.cy + (noseTip.y - lEyeCenter.cy) * 0.56;
    const rAnchorY = rEyeCenter.cy + (noseTip.y - rEyeCenter.cy) * 0.56;

    const cheekSpan = Math.hypot(rEyeCenter.cx - lEyeCenter.cx, rEyeCenter.cy - lEyeCenter.cy);
    const blushRx = cheekSpan * 0.25;
    const blushRy = cheekSpan * 0.145;

    renderSoftCheekGradient(lAnchorX, lAnchorY, blushRx, blushRy, mirrorX ? 0.36 : -0.36);
    renderSoftCheekGradient(rAnchorX, rAnchorY, blushRx, blushRy, mirrorX ? -0.36 : 0.36);

    // Clip blush strictly inside face oval and exclude under-eye circles
    layerCtx.save();
    layerCtx.globalCompositeOperation = 'destination-in';
    layerCtx.filter = 'blur(8px)';
    layerCtx.fillStyle = '#FFFFFF';
    traceSmoothLandmarkPath(layerCtx, landmarks, LANDMARK_INDICES.faceOval, mapCoord);
    layerCtx.fill();

    layerCtx.globalCompositeOperation = 'destination-out';
    layerCtx.filter = 'blur(6px)';
    traceSmoothLandmarkPath(layerCtx, landmarks, LANDMARK_INDICES.leftEye, mapCoord);
    layerCtx.fill();
    traceSmoothLandmarkPath(layerCtx, landmarks, LANDMARK_INDICES.rightEye, mapCoord);
    layerCtx.fill();
    layerCtx.restore();
  } else {
    const fb = fallbackAnatomy;
    const pLC = mapCoord(fb.leftCheek.x, fb.leftCheek.y);
    const pRC = mapCoord(fb.rightCheek.x, fb.rightCheek.y);
    const span = Math.abs(pRC.x - pLC.x);
    renderSoftCheekGradient(pLC.x, pLC.y, span * 0.17, span * 0.1, -0.36);
    renderSoftCheekGradient(pRC.x, pRC.y, span * 0.17, span * 0.1, 0.36);
  }

  // Dual-pass blending: Multiply for pigment warmth; soft-light for natural flush luster
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = alpha * 0.34;
  ctx.drawImage(layerCtx.canvas, 0, 0);

  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = alpha * 0.32;
  ctx.drawImage(layerCtx.canvas, 0, 0);
  ctx.restore();
};

