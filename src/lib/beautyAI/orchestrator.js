/**
 * KLOZEVA Master AI Beauty Intelligence Orchestrator
 * Coordinates: Image Validation -> Face Detection & Landmarks -> Face Parsing ->
 * Skin & Undertone Analysis -> Calibrated Confidence -> Beauty Intelligence.
 */

import { validateImageQuality } from './imageValidation';
import { detectLandmarks, getFallbackAnatomy } from './faceLandmarks';
import { getFacialMasks } from '../huggingface';
import { analyzeCosmeticSkin } from './skinAnalysis';
import { calculateAnalysisConfidence } from './analysisConfidence';
import { loadImage, getImageDataFromSource } from './imageProcessing';

/**
 * Execute full AI beauty intelligence analysis pipeline
 */
export const runBeautyAIAnalysis = async (
  imageSource,
  presetHint = null,
  options = { onProgress: null }
) => {
  const t0 = performance.now();
  const reportProgress = (step, percent) => {
    if (typeof options.onProgress === 'function') {
      options.onProgress({ step, percent });
    }
  };

  // 1. Load image
  reportProgress('Validating photograph...', 15);
  let imgElement;
  if (typeof imageSource === 'string') {
    imgElement = await loadImage(imageSource);
  } else {
    imgElement = imageSource;
  }

  const width = imgElement.naturalWidth || imgElement.width || 512;
  const height = imgElement.naturalHeight || imgElement.height || 512;

  // Extract ImageData
  const fullImageData = getImageDataFromSource(imgElement, Math.min(640, width), Math.min(640, height));

  // 2. Validate Image Quality
  reportProgress('Evaluating lighting and sharpness...', 30);
  const imageQuality = validateImageQuality(fullImageData);

  // 3. Detect Face Landmarks (MediaPipe 478 points)
  reportProgress('Mapping 3D facial landmarks...', 50);
  const landmarkResult = await detectLandmarks(imgElement);

  // 4. Generate Semantic Parsing Masks (Hugging Face SegFormer with landmark fallback)
  reportProgress('Segmenting facial zones and skin boundaries...', 70);
  const parsingResult = await getFacialMasks(imgElement, {
    width: fullImageData.width,
    height: fullImageData.height
  });

  // 5. Grounded Skin Tone & Undertone Analysis
  reportProgress('Extracting skin pigments & analyzing undertone...', 85);
  const skinAnalysis = analyzeCosmeticSkin(fullImageData, parsingResult.regions.skin, presetHint);

  // 6. Calibrated Confidence Calculation (No fabricated percentages)
  reportProgress('Synthesizing beauty intelligence blueprint...', 95);
  const confidenceMetrics = calculateAnalysisConfidence({
    imageQuality,
    landmarkStatus: landmarkResult.status,
    parsingStatus: parsingResult.status,
    skinSampleStats: skinAnalysis.metrics,
    undertoneConfidence: skinAnalysis.undertoneDetails.confidenceScore
  });

  const totalDurationMs = Math.round(performance.now() - t0);

  // 7. Structured Beauty Intelligence Output
  return {
    status: 'success',
    mode: 'KLOZEVA Neural Beauty Intelligence Engine',
    confidence: confidenceMetrics.overallReliability, // Real grounded score
    confidenceMetrics,
    imageQuality,
    skinTone: skinAnalysis.skinTone,
    undertone: skinAnalysis.undertone,
    skinType: skinAnalysis.skinType,
    itaDegrees: skinAnalysis.itaDegrees,
    colorMetrics: skinAnalysis.metrics,
    undertoneDetails: skinAnalysis.undertoneDetails,
    concerns: skinAnalysis.observations,
    textureObservations: skinAnalysis.observations[2] || skinAnalysis.observations[0],
    summary: skinAnalysis.summary,
    colorPalette: skinAnalysis.colorPalette,
    makeupAnalysis: skinAnalysis.makeupAnalysis,
    skincareAnalysis: skinAnalysis.skincareAnalysis,
    landmarks: landmarkResult.landmarks,
    fallbackAnatomy: getFallbackAnatomy(),
    maskMetadata: {
      modelId: parsingResult.modelId,
      modelVersion: parsingResult.modelVersion,
      width: parsingResult.imageWidth,
      height: parsingResult.imageHeight,
      processingTimeMs: parsingResult.processingTimeMs
    },
    processingDurationMs: totalDurationMs
  };
};

