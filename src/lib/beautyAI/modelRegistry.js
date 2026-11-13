/**
 * KLOZEVA AI Model Registry & Policy Engine
 * Authoritative registry of all AI models, architectures, licenses,
 * commercial clearance status, and execution policy enforcement.
 */

export const MODEL_TIERS = {
  COMMERCIAL_PRODUCTION: 'commercial_production',
  COMMERCIAL_FALLBACK: 'commercial_fallback',
  RESEARCH_ONLY: 'research_only',
  DISABLED: 'disabled'
};

export const MODEL_REGISTRY = {
  FACE_PARSING: {
    id: 'jonathandinu/face-parsing',
    name: 'SegFormer B0 Face Parser (Research Checkpoint)',
    tier: MODEL_TIERS.RESEARCH_ONLY,
    url: 'https://huggingface.co/jonathandinu/face-parsing',
    architecture: 'SegFormer B0',
    task: 'image-segmentation',
    inputFormat: 'RGB image tensor (512x512)',
    outputFormat: '19-class semantic segmentation map',
    modelSizeMb: 14.2,
    dependencies: ['@huggingface/transformers', 'onnxruntime-web'],
    inferenceCompatibility: {
      browser: true,
      webgpu: true,
      wasm: true,
      server: true
    },
    license: 'MIT (wrapper/code)',
    weightLicense: 'CC BY-NC 4.0 (derived from training data)',
    commercialUsagePermission: false, // Strictly blocked for commercial SaaS
    trainingDataset: 'CelebAMask-HQ (30,000 high-res facial masks)',
    trainingDatasetLicense: 'CC BY-NC 4.0 (Non-Commercial Research Only)',
    hardwareRequirements: 'WebGPU recommended, multi-core CPU with WASM supported',
    knownLimitations: 'Restricted to non-commercial research; edge feathering required around ear and hairline; over-segments thick frames.',
    version: '1.0.0',
    classes: [
      'background', 'skin', 'nose', 'eye_g', 'l_eye', 'r_eye',
      'l_brow', 'r_brow', 'l_ear', 'r_ear', 'mouth', 'u_lip',
      'l_lip', 'hair', 'hat', 'ear_r', 'neck_l', 'neck', 'cloth'
    ]
  },

  FACE_PARSING_RESEARCH: {
    id: 'jonathandinu/face-parsing',
    name: 'SegFormer B0 Face Parser (Research Checkpoint)',
    tier: MODEL_TIERS.RESEARCH_ONLY,
    url: 'https://huggingface.co/jonathandinu/face-parsing',
    architecture: 'SegFormer B0',
    task: 'image-segmentation',
    inputFormat: 'RGB image tensor (512x512)',
    outputFormat: '19-class semantic segmentation map',
    modelSizeMb: 14.2,
    dependencies: ['@huggingface/transformers', 'onnxruntime-web'],
    inferenceCompatibility: {
      browser: true,
      webgpu: true,
      wasm: true,
      server: true
    },
    license: 'MIT (wrapper/code)',
    weightLicense: 'CC BY-NC 4.0 (derived from training data)',
    commercialUsagePermission: false, // Strictly blocked for commercial SaaS
    trainingDataset: 'CelebAMask-HQ (30,000 high-res facial masks)',
    trainingDatasetLicense: 'CC BY-NC 4.0 (Non-Commercial Research Only)',
    hardwareRequirements: 'WebGPU recommended, multi-core CPU with WASM supported',
    knownLimitations: 'Restricted to non-commercial research; edge feathering required around ear and hairline; over-segments thick frames.',
    version: '1.0.0',
    classes: [
      'background', 'skin', 'nose', 'eye_g', 'l_eye', 'r_eye',
      'l_brow', 'r_brow', 'l_ear', 'r_ear', 'mouth', 'u_lip',
      'l_lip', 'hair', 'hat', 'ear_r', 'neck_l', 'neck', 'cloth'
    ]
  },

  FACE_PARSING_COMMERCIAL: {
    id: 'klozeva/face-parsing-commercial-b0',
    name: 'Klozeva SegFormer B0 (Commercially Authorized Checkpoint)',
    tier: MODEL_TIERS.COMMERCIAL_PRODUCTION,
    url: 'internal://klozeva/models/face-parsing-b0',
    architecture: 'SegFormer B0',
    task: 'image-segmentation',
    inputFormat: 'RGB image tensor (512x512)',
    outputFormat: '19-class semantic segmentation map',
    modelSizeMb: 14.2,
    dependencies: ['@huggingface/transformers', 'onnxruntime-web'],
    inferenceCompatibility: {
      browser: true,
      webgpu: true,
      wasm: true,
      server: true
    },
    license: 'Apache-2.0',
    weightLicense: 'Apache-2.0 / Commercial Proprietary',
    commercialUsagePermission: true,
    trainingDataset: 'Commercially Cleared Consented Portrait Masks (ml/commercial_training/)',
    trainingDatasetLicense: 'Commercially Licensed / Fully Consented',
    hardwareRequirements: 'WebGPU or WASM SIMD',
    knownLimitations: 'Requires custom ONNX weights hosted in commercial assets directory; falls back to MediaPipe baseline if asset un-deployed.',
    version: '1.0.0-commercial',
    classes: [
      'background', 'skin', 'nose', 'eye_g', 'l_eye', 'r_eye',
      'l_brow', 'r_brow', 'l_ear', 'r_ear', 'mouth', 'u_lip',
      'l_lip', 'hair', 'hat', 'ear_r', 'neck_l', 'neck', 'cloth'
    ]
  },

  FACE_LANDMARKS: {
    id: 'mediapipe-face-landmarker',
    name: 'MediaPipe FaceLandmarker Mesh (Production Baseline)',
    tier: MODEL_TIERS.COMMERCIAL_FALLBACK,
    url: 'https://google.github.io/mediapipe/solutions/face_mesh',
    architecture: 'MobileNetV2 Attention Mesh',
    task: '3d-facial-landmarks-and-geometry',
    inputFormat: 'RGB video/image stream (natural dimensions)',
    outputFormat: '478 3D normalized landmark points with sub-pixel iris tracking',
    modelSizeMb: 4.1,
    dependencies: ['@mediapipe/tasks-vision'],
    inferenceCompatibility: {
      browser: true,
      webgpu: true,
      wasm: true,
      server: false
    },
    license: 'Apache-2.0',
    weightLicense: 'Apache-2.0 (Google LLC Cleared)',
    commercialUsagePermission: true,
    trainingDataset: 'Google proprietary internal consented biometric dataset',
    trainingDatasetLicense: 'Google Commercial Release (Apache 2.0)',
    hardwareRequirements: 'Runs real-time at 60 FPS on standard integrated GPUs or WASM',
    knownLimitations: 'Extreme yaw (>60 degrees) degrades landmark depth accuracy; optimized for frontal/three-quarter poses.',
    version: '0.10.14'
  },

  SKIN_ANALYSIS_COLORIMETRIC: {
    id: 'klozeva-cielab-ita-engine',
    name: 'Klozeva Colorimetric Skin & Undertone Engine',
    tier: MODEL_TIERS.COMMERCIAL_PRODUCTION,
    url: 'internal://klozeva/vision/cielab',
    architecture: 'Calibrated Analytical Color Physics (sRGB to CIELAB, Del Bino & Chardon ITA, IQR Outlier Rejection)',
    task: 'skin-depth-and-undertone-classification',
    inputFormat: 'Segmented skin pixel buffer (ImageData)',
    outputFormat: 'Grounded skin depth (Fair/Light/Medium/Tan/Deep), calibrated undertone (Warm/Cool/Neutral/Olive), ITA degrees, and lighting metrics',
    modelSizeMb: 0.05,
    dependencies: [],
    inferenceCompatibility: {
      browser: true,
      webgpu: false,
      wasm: false,
      server: true
    },
    license: 'Proprietary / MIT',
    weightLicense: 'N/A (Deterministic Mathematical Code)',
    commercialUsagePermission: true,
    trainingDataset: 'Colorimetric reference standards and cosmetic industry pigment spectrums',
    trainingDatasetLicense: 'Open Standards (CIE 1976 / Public Domain)',
    hardwareRequirements: 'Runs sub-millisecond on any JavaScript engine',
    knownLimitations: 'Requires segmented skin mask or facial bounding area; sensitive to uncompensated colored ambient lighting.',
    version: '2.0.0'
  },

  MAKEUP_TRANSFER_ADAPTER: {
    id: 'klozeva-deterministic-compositor',
    name: 'Klozeva Non-Destructive Texture Compositor',
    tier: MODEL_TIERS.COMMERCIAL_PRODUCTION,
    url: 'internal://klozeva/makeup/compositor',
    architecture: 'Texture-Preserving Multi-Layer Offscreen Canvas Compositor',
    task: 'virtual-makeup-transfer',
    inputFormat: 'Source portrait + segmented region masks + cosmetic pigment parameters',
    outputFormat: 'Rendered portrait frame at 60 FPS with non-destructive soft-light / color-burn alpha blending',
    modelSizeMb: 0.1,
    dependencies: ['HTML5 Canvas 2D Context'],
    inferenceCompatibility: {
      browser: true,
      webgpu: false,
      wasm: false,
      server: true
    },
    license: 'Proprietary / MIT',
    weightLicense: 'N/A (Procedural Shader Code)',
    commercialUsagePermission: true,
    trainingDataset: 'N/A (Analytical Rendering Engine)',
    trainingDatasetLicense: 'N/A',
    hardwareRequirements: 'Hardware accelerated 2D canvas',
    knownLimitations: 'Rendering adheres strictly to anatomical landmarks and masks without synthetic hallucination.',
    version: '2.0.0'
  },

  GEMINI_VISION: {
    id: 'gemini-2.5-flash',
    name: 'Google Gemini Multimodal Vision API',
    tier: MODEL_TIERS.COMMERCIAL_PRODUCTION,
    url: 'https://cloud.google.com/vertex-ai',
    architecture: 'Multimodal Foundation Transformer',
    task: 'multimodal-beauty-profile',
    inputFormat: 'JPEG/PNG/WebP base64 via Supabase Edge Function',
    outputFormat: 'Structured JSON cosmetic blueprint and ingredient guidance',
    modelSizeMb: 0,
    dependencies: ['@supabase/supabase-js'],
    inferenceCompatibility: {
      browser: false,
      server: true
    },
    license: 'Google Cloud Terms of Service (Commercial API)',
    weightLicense: 'Commercial API License',
    commercialUsagePermission: true,
    trainingDataset: 'Google foundational web-scale multimodal corpus',
    trainingDatasetLicense: 'Google Commercial Release',
    hardwareRequirements: 'Serverless Edge execution, zero local client memory footprint',
    knownLimitations: 'Requires network connection and active Supabase backend + Gemini API key.',
    version: '2.5'
  }
};

// Alias for backward compatibility
MODEL_REGISTRY.FACE_PARSING = MODEL_REGISTRY.FACE_PARSING_RESEARCH;

/**
 * Validates whether a model is cleared for commercial production
 */
export const isCommerciallyCleared = (engineKeyOrId) => {
  const info = getModelInformation(engineKeyOrId);
  return info?.commercialUsagePermission === true && info?.tier !== MODEL_TIERS.RESEARCH_ONLY;
};

/**
 * Determine active model policy environment.
 * Order of precedence:
 * 1. VITE_BEAUTY_MODEL_POLICY ('commercial' | 'production' | 'research' | 'development')
 * 2. VITE_APP_MODE ('production' | 'staging' | 'kiosk' | 'development' | 'research')
 * 3. Default fallback: 'commercial' (strict-by-default for safety)
 */
export const getActiveModelPolicy = () => {
  const envPolicy = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BEAUTY_MODEL_POLICY)
    ? String(import.meta.env.VITE_BEAUTY_MODEL_POLICY).toLowerCase()
    : null;

  if (envPolicy && ['commercial', 'production', 'research', 'development'].includes(envPolicy)) {
    return envPolicy;
  }

  const appMode = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_MODE)
    ? String(import.meta.env.VITE_APP_MODE).toLowerCase()
    : null;

  if (appMode === 'research') return 'research';
  if (appMode === 'development') return 'development';
  if (appMode === 'kiosk') return 'commercial';

  // Default to commercial policy in production/staging or when unspecified
  return 'commercial';
};

/**
 * Returns complete model information for an engine key or model ID
 */
export const getModelInformation = (engineKeyOrId) => {
  if (MODEL_REGISTRY[engineKeyOrId]) {
    return MODEL_REGISTRY[engineKeyOrId];
  }
  for (const key of Object.keys(MODEL_REGISTRY)) {
    if (MODEL_REGISTRY[key].id === engineKeyOrId) {
      return MODEL_REGISTRY[key];
    }
  }
  return null;
};

/**
 * Validates whether a model is permitted to execute under the given or active policy.
 * Under 'commercial' or 'production' policies, research-only models are STRICTLY REJECTED.
 * @param {string} modelIdOrKey
 * @param {string|null} [explicitPolicy=null]
 * @returns {boolean}
 */
export const isModelPermitted = (modelIdOrKey, explicitPolicy = null) => {
  const policy = explicitPolicy || getActiveModelPolicy();
  const info = getModelInformation(modelIdOrKey);

  if (!info) return false;
  if (info.tier === MODEL_TIERS.DISABLED) return false;

  // In commercial or production policy, require explicit commercialUsagePermission === true
  if (policy === 'commercial' || policy === 'production') {
    return info.commercialUsagePermission === true && info.tier !== MODEL_TIERS.RESEARCH_ONLY;
  }

  // In research or development policy, research-only models are permitted for testing
  if (policy === 'research' || policy === 'development') {
    return true;
  }

  return false;
};

/**
 * Selects the authorized face parsing model for the current environment.
 * If commercial mode is active, returns the cleared model or commercial fallback.
 */
export const getActiveFaceParsingModel = () => {
  const policy = getActiveModelPolicy();

  if (policy === 'commercial' || policy === 'production') {
    // Only commercial cleared or fallback
    return MODEL_REGISTRY.FACE_LANDMARKS;
  }

  // Research mode allows SegFormer research checkpoint
  return MODEL_REGISTRY.FACE_PARSING_RESEARCH;
};
