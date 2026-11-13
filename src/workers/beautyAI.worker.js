/**
 * KLOZEVA Beauty AI Web Worker
 * Offloads computationally heavy color-space conversion, Laplacian variance,
 * and mask feathering from the browser main thread.
 */

// Worker message handler
self.onmessage = async (e) => {
  const { type, payload } = e.data;

  try {
    switch (type) {
      case 'PROCESS_IMAGE_QUALITY': {
        const { width, height, buffer } = payload;
        const data = new Uint8ClampedArray(buffer);
        let totalLuminance = 0;
        let overexposed = 0;
        let underexposed = 0;
        const totalPixels = width * height;

        for (let i = 0; i < data.length; i += 4) {
          const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          totalLuminance += lum;
          if (lum > 248) overexposed++;
          if (lum < 16) underexposed++;
        }

        self.postMessage({
          type: 'IMAGE_QUALITY_RESULT',
          result: {
            avgLuminance: totalLuminance / totalPixels,
            overexposedRatio: overexposed / totalPixels,
            underexposedRatio: underexposed / totalPixels
          }
        });
        break;
      }

      default:
        self.postMessage({ type: 'UNKNOWN_COMMAND', error: `Unrecognized worker command: ${type}` });
    }
  } catch (err) {
    self.postMessage({ type: 'WORKER_ERROR', error: err.message });
  }
};

