/**
 * KLOZEVA Color Blending & Texture-Preserving Compositing Pipeline
 * Implements non-destructive compositing modes: soft-light, multiply, screen, and color
 */

/**
 * Parses a hex color string (e.g. #B45643 or #B45643CC) into {r, g, b, a}
 */
export const hexToRgb = (hex) => {
  let cleaned = hex.replace('#', '');
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map((c) => c + c).join('');
  }
  const num = parseInt(cleaned.slice(0, 6), 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  let a = 1.0;
  if (cleaned.length === 8) {
    a = parseInt(cleaned.slice(6, 8), 16) / 255;
  }
  return { r, g, b, a };
};

/**
 * Soft-Light blending formula (Pegtop / Photoshop):
 * Preserves high-frequency skin textures, pores, and natural highlights while tinting
 */
export const softLightBlend = (backdrop, source) => {
  const b = backdrop / 255;
  const s = source / 255;
  const result = (1 - 2 * s) * b * b + 2 * s * b;
  return Math.round(result * 255);
};

/**
 * Multiply blending formula:
 * Darkens naturally and enhances lip folds and shadow creases
 */
export const multiplyBlend = (backdrop, source) => {
  return Math.round((backdrop * source) / 255);
};

/**
 * Screen blending formula:
 * Lightens and adds luminous specular sheen for satin/gloss finishes
 */
export const screenBlend = (backdrop, source) => {
  return Math.round(255 - ((255 - backdrop) * (255 - source)) / 255);
};

/**
 * Create coordinate mapping function between source dimensions and destination canvas
 */
export const createCoordMapper = (srcW, srcH, dstW, dstH, mirrorX = false) => {
  const scale = Math.max(dstW / srcW, dstH / srcH);
  const dw = srcW * scale;
  const dh = srcH * scale;
  const dx = (dstW - dw) / 2;
  const dy = (dstH - dh) / 2;

  return (nx, ny) => {
    const mx = mirrorX ? 1 - nx : nx;
    return {
      x: dx + mx * dw,
      y: dy + ny * dh
    };
  };
};

/**
 * Trace smooth Catmull-Rom / quadratic spline contour from landmark points
 */
export const traceSmoothLandmarkPath = (ctx, lm, indices, mapCoord) => {
  if (!lm || indices.length < 3) return;
  const pts = indices.map((idx) => mapCoord(lm[idx].x, lm[idx].y));
  ctx.beginPath();
  const firstMidX = (pts[pts.length - 1].x + pts[0].x) / 2;
  const firstMidY = (pts[pts.length - 1].y + pts[0].y) / 2;
  ctx.moveTo(firstMidX, firstMidY);
  for (let i = 0; i < pts.length; i++) {
    const curr = pts[i];
    const next = pts[(i + 1) % pts.length];
    const midX = (curr.x + next.x) / 2;
    const midY = (curr.y + next.y) / 2;
    ctx.quadraticCurveTo(curr.x, curr.y, midX, midY);
  }
  ctx.closePath();
};

