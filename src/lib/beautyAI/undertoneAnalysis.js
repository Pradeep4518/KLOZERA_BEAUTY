/**
 * KLOZEVA Undertone Analysis Engine
 * Calibrated determination of sub-surface undertone (Warm, Cool, Neutral, Olive)
 * using CIELAB chromaticity coordinates (a*, b*) and Hue Angle.
 */

/**
 * Calculates Hue Angle in degrees:
 * h_ab = atan2(b*, a*) * (180 / PI)
 */
export const calculateHueAngle = (a, b) => {
  let hue = Math.atan2(b, a) * (180 / Math.PI);
  if (hue < 0) hue += 360;
  return hue;
};

/**
 * Evaluates cosmetic undertone with clinical objectivity
 */
export const evaluateUndertone = (labStats) => {
  const { meanL, meanA, meanB, stdA, stdB } = labStats;
  const hueAngle = calculateHueAngle(meanA, meanB);
  const chroma = Math.sqrt(meanA * meanA + meanB * meanB);

  let undertone = 'Warm';
  let primaryDriver = '';
  let confidenceScore = 0.85;

  // 1. Olive Undertone: Greenish-golden complexion
  // Suppressed red a* (<= 11.5), prominent yellow b* (>= 16.0), and hue angle between 54° and 75°
  if (meanB >= 16.0 && meanA <= 11.5 && meanL >= 32.0 && meanL <= 72.0 && hueAngle >= 54 && hueAngle <= 75) {
    undertone = 'Olive';
    primaryDriver = `Olive sub-surface undertone indicated by yellow-to-red pigment ratio (b*/a* = ${(meanB / Math.max(1, meanA)).toFixed(2)}) with restrained erythema.`;
    confidenceScore = 0.89;
  }
  // 2. Warm Undertone: Golden, peach, or honey dominance (yellow b* significantly exceeds red a*)
  else if (meanB > meanA + 3.0) {
    undertone = 'Warm';
    primaryDriver = `Golden and peach melanin warmth identified (dominant b* = ${meanB.toFixed(1)}, hue = ${hueAngle.toFixed(1)}°).`;
    confidenceScore = 0.93;
  }
  // 3. Cool Undertone: Rosy, pink, or bluish-red undertone (red a* exceeds or rivals yellow b*)
  else if (meanA > meanB + 1.0 || hueAngle < 45) {
    undertone = 'Cool';
    primaryDriver = `Rosy and cool sub-surface clarity with elevated a* red reflection relative to golden b*.`;
    confidenceScore = 0.91;
  }
  // 4. Neutral Undertone: Balanced red and yellow pigments
  else {
    undertone = 'Neutral';
    primaryDriver = `Harmonious balance between warm golden (+b*) and cool rosy (+a*) pigments without dominant cast.`;
    confidenceScore = 0.86;
  }

  // Penalty if color standard deviation across face is high (uneven lighting)
  if (stdB > 5.0 || stdA > 4.5) {
    confidenceScore = Math.max(0.65, confidenceScore - 0.12);
  }

  return {
    undertone,
    hueAngle: Math.round(hueAngle * 10) / 10,
    chroma: Math.round(chroma * 10) / 10,
    confidenceScore: Math.round(confidenceScore * 100) / 100,
    primaryDriver
  };
};
