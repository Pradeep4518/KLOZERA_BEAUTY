/**
 * KLOZEVA Unified Virtual Makeup Rendering Orchestrator
 * Integrates modular foundation, eyeshadow, blush, and lipstick renderers
 * onto non-destructive offscreen canvas layers.
 */

import { createCoordMapper } from './colorBlending';
import { renderFoundation } from './foundationRenderer';
import { renderEyeshadow } from './eyeshadowRenderer';
import { renderBlush } from './blushRenderer';
import { renderLipstick } from './lipstickRenderer';

/**
 * Renders complete multi-layer virtual makeup look onto target canvas
 */
export const renderCompleteMakeup = ({
  canvas,
  maskCanvas,
  layerCanvas,
  baseImageOrVideo,
  mirrorX = false,
  landmarks = null,
  fallbackAnatomy,
  splitPercent = 100,
  holdOriginal = false,
  cosmetics = {
    foundation: { hex: 'transparent', intensity: 0 },
    eyeshadow: { hex: 'transparent', intensity: 0, shimmer: true },
    blush: { hex: 'transparent', intensity: 0 },
    lipstick: { hex: 'transparent', intensity: 0, finish: 'satin' }
  }
}) => {
  if (!canvas || !maskCanvas || !layerCanvas || !baseImageOrVideo) return;

  const ctx = canvas.getContext('2d');
  const maskCtx = maskCanvas.getContext('2d');
  const layerCtx = layerCanvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // Clear main frame
  ctx.clearRect(0, 0, w, h);

  const srcW = baseImageOrVideo.videoWidth || baseImageOrVideo.naturalWidth || baseImageOrVideo.width || w;
  const srcH = baseImageOrVideo.videoHeight || baseImageOrVideo.naturalHeight || baseImageOrVideo.height || h;

  // 1. Draw Unmodified Base Photograph / Camera Feed
  const scale = Math.max(w / srcW, h / srcH);
  const dw = srcW * scale;
  const dh = srcH * scale;
  const dx = (w - dw) / 2;
  const dy = (h - dh) / 2;

  ctx.save();
  if (mirrorX) {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(baseImageOrVideo, dx, dy, dw, dh);
  ctx.restore();

  const effectiveSplit = holdOriginal ? 0 : splitPercent;
  if (effectiveSplit <= 0) return;

  const mapCoord = createCoordMapper(srcW, srcH, w, h, mirrorX);

  // Clip cosmetic layers to Before/After comparison region
  const splitX = w * (1 - effectiveSplit / 100);
  ctx.save();
  ctx.beginPath();
  ctx.rect(splitX, 0, w - splitX, h);
  ctx.clip();

  // 2. Render Layer A: Foundation
  if (cosmetics.foundation?.intensity > 0) {
    renderFoundation({
      ctx,
      maskCtx,
      layerCtx,
      width: w,
      height: h,
      foundationState: cosmetics.foundation,
      landmarks,
      fallbackAnatomy,
      mapCoord
    });
  }

  // 3. Render Layer B: Eyeshadow
  if (cosmetics.eyeshadow?.intensity > 0) {
    renderEyeshadow({
      ctx,
      maskCtx,
      layerCtx,
      width: w,
      height: h,
      eyeshadowState: cosmetics.eyeshadow,
      landmarks,
      fallbackAnatomy,
      mapCoord
    });
  }

  // 4. Render Layer C: Blush
  if (cosmetics.blush?.intensity > 0) {
    renderBlush({
      ctx,
      layerCtx,
      width: w,
      height: h,
      blushState: cosmetics.blush,
      landmarks,
      fallbackAnatomy,
      mapCoord,
      mirrorX
    });
  }

  // 5. Render Layer D: Lipstick
  if (cosmetics.lipstick?.intensity > 0) {
    renderLipstick({
      ctx,
      maskCtx,
      layerCtx,
      width: w,
      height: h,
      lipstickState: cosmetics.lipstick,
      landmarks,
      fallbackAnatomy,
      mapCoord
    });
  }

  ctx.restore();

  // 6. Draw Split Divider Line
  if (!holdOriginal && effectiveSplit > 0 && effectiveSplit < 100) {
    const lineX = w * (1 - effectiveSplit / 100);
    ctx.save();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(lineX, 0);
    ctx.lineTo(lineX, h);
    ctx.stroke();
    ctx.restore();
  }
};

