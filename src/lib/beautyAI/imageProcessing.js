/**
 * KLOZEVA Color Physics & Image Processing Utilities
 * Grounded in CIELAB (CIE 1976 L*a*b*) and Del Bino & Chardon Individual Typology Angle (ITA)
 */

// Standard D65 illuminant reference white points (2° standard observer)
const D65 = {
  Xn: 0.95047,
  Yn: 1.00000,
  Zn: 1.08883
};

/**
 * Convert standard sRGB (0..255) to Linear RGB (0..1)
 */
export const sRGBToLinear = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};

/**
 * Convert Linear RGB (0..1) to XYZ (D65)
 */
export const linearRGBToXYZ = (r, g, b) => {
  const X = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
  const Y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750;
  const Z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041;
  return { X, Y, Z };
};

const fLAB = (t) => {
  const delta = 6 / 29;
  return t > Math.pow(delta, 3) ? Math.cbrt(t) : t / (3 * Math.pow(delta, 2)) + 4 / 29;
};

/**
 * Convert standard sRGB (0..255) to CIELAB (L*, a*, b*)
 * L*: 0 (black) to 100 (diffuse white)
 * a*: negative (green) to positive (red/magenta)
 * b*: negative (blue) to positive (yellow)
 */
export const sRGBToCIELAB = (r, g, b) => {
  const lr = sRGBToLinear(r);
  const lg = sRGBToLinear(g);
  const lb = sRGBToLinear(b);

  const { X, Y, Z } = linearRGBToXYZ(lr, lg, lb);

  const fx = fLAB(X / D65.Xn);
  const fy = fLAB(Y / D65.Yn);
  const fz = fLAB(Z / D65.Zn);

  const L = Math.max(0, Math.min(100, 116 * fy - 16));
  const a = 500 * (fx - fy);
  const B = 200 * (fy - fz);

  return { L, a, b: B };
};

/**
 * Compute the Individual Typology Angle (ITA) in degrees:
 * ITA = (arctan((L* - 50) / b*) * 180) / PI
 * Higher ITA = lighter skin; lower ITA = deeper skin.
 */
export const calculateITA = (L, b) => {
  // Prevent division by zero or negative/zero b* instability
  const safeB = Math.max(0.1, b);
  const itaRad = Math.atan2(L - 50, safeB);
  return (itaRad * 180) / Math.PI;
};

/**
 * Map Individual Typology Angle (ITA) to standard cosmetic skin depth categories
 * (Del Bino & Chardon dermatological scale adapted to 5-tier cosmetic standards)
 */
export const classifySkinDepthFromITA = (ita) => {
  if (ita > 55) return 'Fair';
  if (ita > 41) return 'Light';
  if (ita > 28) return 'Medium';
  if (ita > 10) return 'Tan';
  return 'Deep';
};

/**
 * Filter pixel sample array using Interquartile Range (IQR) on L* to reject
 * specular highlights (glare) and deep facial shadows (crevices).
 */
export const filterSkinPixels = (samples) => {
  if (!samples || samples.length === 0) return [];

  // Exclude extreme specular highlights and pitch-black occlusions upfront
  const preliminary = samples.filter((s) => s.L >= 20 && s.L <= 94);
  if (preliminary.length < 10) return samples;

  // Sort by luminance L*
  preliminary.sort((p1, p2) => p1.L - p2.L);
  const q1 = preliminary[Math.floor(preliminary.length * 0.25)].L;
  const q3 = preliminary[Math.floor(preliminary.length * 0.75)].L;
  const iqr = q3 - q1;

  const lowerBound = Math.max(20, q1 - 1.5 * iqr);
  const upperBound = Math.min(94, q3 + 1.5 * iqr);

  return preliminary.filter((s) => s.L >= lowerBound && s.L <= upperBound);
};

/**
 * Load an image from dataURL or URL into an HTMLImageElement
 */
export const loadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
};

/**
 * Extract ImageData from an image or canvas at specified resolution
 */
export const getImageDataFromSource = (source, targetWidth = 512, targetHeight = 512) => {
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(source, 0, 0, targetWidth, targetHeight);
  return ctx.getImageData(0, 0, targetWidth, targetHeight);
};

