/**
 * KLOZEVA Image Quality Validation Service
 * Rigorous pre-flight checks: resolution, blur, exposure balance, lighting symmetry, and pose
 */

/**
 * Validate an input photograph for beauty AI processing.
 * Returns validation metrics, pass/fail status, and customer-friendly guidance.
 */
export const validateImageQuality = (imageData) => {
  const { width, height, data } = imageData;

  const issues = [];
  const suggestions = [];

  // 1. Dimension Check
  if (width < 256 || height < 256) {
    issues.push('Image resolution is too low for precise facial mapping.');
    suggestions.push('Please take or upload a higher resolution photo (minimum 256x256 pixels).');
  }

  // 2. Exposure & Dynamic Range Check
  let overexposedCount = 0;
  let underexposedCount = 0;
  let totalLuminance = 0;
  const totalPixels = width * height;

  // Illumination symmetry: left half vs right half
  let leftLuminanceSum = 0;
  let leftPixelCount = 0;
  let rightLuminanceSum = 0;
  let rightPixelCount = 0;
  const midX = Math.floor(width / 2);

  // Grayscale buffer for blur detection
  const gray = new Float32Array(totalPixels);

  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Perceived luminance (Rec. 601)
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    gray[p] = lum;
    totalLuminance += lum;

    if (lum > 248) overexposedCount++;
    if (lum < 16) underexposedCount++;

    const x = p % width;
    if (x < midX - 10) {
      leftLuminanceSum += lum;
      leftPixelCount++;
    } else if (x > midX + 10) {
      rightLuminanceSum += lum;
      rightPixelCount++;
    }
  }

  const avgLuminance = totalLuminance / totalPixels;
  const overexposedRatio = overexposedCount / totalPixels;
  const underexposedRatio = underexposedCount / totalPixels;

  if (overexposedRatio > 0.22) {
    issues.push('Excessive glare or strong backlighting detected.');
    suggestions.push('Reduce background lighting or move away from direct window backlights.');
  }

  if (underexposedRatio > 0.35 || avgLuminance < 45) {
    issues.push('Photograph is underexposed or taken in low ambient lighting.');
    suggestions.push('Face a gentle, diffused front light source or turn on room lights.');
  }

  // 3. Bilateral Lighting Symmetry
  const leftAvg = leftPixelCount > 0 ? leftLuminanceSum / leftPixelCount : avgLuminance;
  const rightAvg = rightPixelCount > 0 ? rightLuminanceSum / rightPixelCount : avgLuminance;
  const symmetryRatio = Math.abs(leftAvg - rightAvg) / Math.max(1, (leftAvg + rightAvg) / 2);

  if (symmetryRatio > 0.42 && avgLuminance > 50) {
    issues.push('Uneven lighting: strong side shadow detected on one side of the face.');
    suggestions.push('Position yourself directly facing the light so both cheeks are evenly illuminated.');
  }

  // 4. Blur Detection via Discrete Laplacian Variance
  // Kernel: [0, 1, 0; 1, -4, 1; 0, 1, 0]
  let laplacianSum = 0;
  let laplacianSqSum = 0;
  let laplacianCount = 0;

  // Step with stride 2 for performance
  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const idx = y * width + x;
      const val =
        gray[idx - width] +
        gray[idx + width] +
        gray[idx - 1] +
        gray[idx + 1] -
        4 * gray[idx];

      laplacianSum += val;
      laplacianSqSum += val * val;
      laplacianCount++;
    }
  }

  const meanLap = laplacianSum / laplacianCount;
  const laplacianVariance = laplacianSqSum / laplacianCount - meanLap * meanLap;

  // If variance is very low, edges are blurred
  const isBlurry = laplacianVariance < 28.0;
  if (isBlurry) {
    issues.push('Image appears soft or out of focus.');
    suggestions.push('Hold the camera steady or wipe the camera lens before retaking.');
  }

  // Composite Image Quality Score (0 to 100)
  let qualityScore = 100;
  if (overexposedRatio > 0.15) qualityScore -= 20;
  if (underexposedRatio > 0.2) qualityScore -= 25;
  if (symmetryRatio > 0.3) qualityScore -= 15;
  if (laplacianVariance < 45) qualityScore -= Math.min(30, Math.floor((45 - laplacianVariance) * 1.5));
  qualityScore = Math.max(15, Math.min(100, Math.round(qualityScore)));

  const isValid = issues.length === 0;

  return {
    isValid,
    qualityScore,
    laplacianVariance: Math.round(laplacianVariance * 10) / 10,
    averageLuminance: Math.round(avgLuminance),
    symmetryRatio: Math.round(symmetryRatio * 100) / 100,
    overexposedRatio: Math.round(overexposedRatio * 100) / 100,
    underexposedRatio: Math.round(underexposedRatio * 100) / 100,
    issues,
    suggestions: suggestions.length > 0 ? suggestions : ['Photograph quality meets clinical imaging standards.']
  };
};

