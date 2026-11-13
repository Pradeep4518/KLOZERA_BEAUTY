/**
 * KLOZEVA Mask Processor
 * High-performance morphological and feathering operations on binary and alpha masks
 */

/**
 * Feathers an offscreen canvas context with Gaussian blur
 */
export const featherCanvas = (ctx, blurRadiusPx = 4) => {
  ctx.filter = `blur(${blurRadiusPx}px)`;
};

/**
 * Converts a Uint8ClampedArray binary mask (0 or 255) into an ImageData object
 */
export const maskToImageData = (mask, width, height) => {
  const imgData = new ImageData(width, height);
  const data = imgData.data;

  // Default white alpha mask
  for (let i = 0, p = 0; i < mask.length; i++, p += 4) {
    if (mask[i] > 128) {
      data[p] = 255;
      data[p + 1] = 255;
      data[p + 2] = 255;
      data[p + 3] = 255;
    } else {
      data[p + 3] = 0;
    }
  }

  return imgData;
};

/**
 * Morphological dilation of binary mask
 */
export const dilateMask = (srcMask, width, height, radius = 1) => {
  const dst = new Uint8ClampedArray(srcMask.length);
  for (let y = radius; y < height - radius; y++) {
    for (let x = radius; x < width - radius; x++) {
      const idx = y * width + x;
      if (srcMask[idx] > 128) {
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            dst[(y + dy) * width + (x + dx)] = 255;
          }
        }
      }
    }
  }
  return dst;
};

/**
 * Morphological erosion of binary mask
 */
export const erodeMask = (srcMask, width, height, radius = 1) => {
  const dst = new Uint8ClampedArray(srcMask.length);
  for (let y = radius; y < height - radius; y++) {
    for (let x = radius; x < width - radius; x++) {
      const idx = y * width + x;
      let allOn = true;
      for (let dy = -radius; dy <= radius && allOn; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (srcMask[(y + dy) * width + (x + dx)] <= 128) {
            allOn = false;
            break;
          }
        }
      }
      if (allOn) dst[idx] = 255;
    }
  }
  return dst;
};

