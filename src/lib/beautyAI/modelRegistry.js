/**
 * KLOZEVA AI Model Registry
 * Authoritative registry of all AI models, architectures, licenses,
 * commercial clearance status, and execution targets.
 */

export const MODEL_REGISTRY = {
  FACE_PARSING: {
    id: 'jonathandinu/face-parsing',
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
    commercialUsagePermission: false, // Training dataset (CelebAMask-HQ) has CC BY-NC 4.0; marked research/eval
    trainingDataset: 'CelebAMask-HQ (30,000 high-res facial masks)',
    hardwareRequirements: 'WebGPU recommended, multi-core CPU with WASM supported',
    knownLimitations: 'Edge feathering required around ear and hairline boundaries; may over-segment accessories like thick glasses.',
    version: '1.0.0',
    classes: [
      'background', 'skin', 'nose', 'eye_g', 'l_eye', 'r_eye',
      'l_brow', 'r_brow', 'l_ear', 'r_ear', 'mouth', 'u_lip',
      'l_lip', 'hair', 'hat', 'ear_r', 'neck_l', 'neck', 'cloth'
    ]
  },

  FACE_LANDMARKS: {
    id: 'mediapipe-face-landmarker',
    url: 'https://google.github.io/mediapipe/solutions/face_mesh',
    architecture: 'MobileNetV2 Attention Mesh',
    task: '3d-facial-landmarks',
    inputFormat: 'RGB video/image stream (natural dimensions)',
    outputFormat: '478 3D normalized landmark points with confidence scores',
    modelSizeMb: 4.1,
    dependencies: ['@mediapipe/tasks-vision'],
    inferenceCompatibility: {
      browser: true,
      webgpu: true,
      wasm: true,
      server: false
    },
    license: 'Apache-2.0',
    commercialUsagePermission: true, // Fully commercially cleared
    trainingDataset: 'Google proprietary internal consented biometric dataset',
    hardwareRequirements: 'Runs real-time at 60 FPS on standard integrated GPUs or WASM',
    knownLimitations: 'Extreme yaw (>60 degrees) degrades landmark depth accuracy; optimized for frontal poses.',
    version: '0.10.14'
  },

  SKIN_ANALYSIS_COLORIMETRIC: {
    id: 'klozeva-cielab-ita-engine',
    url: 'internal://klozeva/vision/cielab',
    architecture: 'Calibrated Analytical Color Physics (sRGB to CIELAB, Del Bino & Chardon ITA)',
    task: 'skin-depth-and-undertone-classification',
    inputFormat: 'Segmented skin pixel buffer (ImageData)',
    outputFormat: 'Grounded skin depth (Fair/Light/Medium/Tan/Deep), undertone (Warm/Cool/Neutral/Olive), ITA degrees, and lighting metrics',
    modelSizeMb: 0.05,
    dependencies: [],
    inferenceCompatibility: {
      browser: true,
      webgpu: false,
      wasm: false,
      server: true
    },
    license: 'Proprietary / MIT',
    commercialUsagePermission: true,
    trainingDataset: 'Colorimetric reference standards and cosmetic industry pigment spectrums',
    hardwareRequirements: 'Runs sub-millisecond on any JavaScript engine',
    knownLimitations: 'Requires segmented skin mask or facial bounding area; sensitive to uncompensated colored ambient lighting.',
    version: '2.0.0'
  },

  GEMINI_VISION: {
    id: 'gemini-2.5-flash',
    url: 'https://cloud.google.com/vertex-ai',
    architecture: 'Multimodal Foundation Transformer',
    task: 'multimodal-beauty-profile',
    inputFormat: 'JPEG/PNG/WebP base64 via Supabase Edge Function',
    outputFormat: 'Structured JSON cosmetic blueprint and ingredient guidance',
    modelSizeMb: 0, // Hosted server-side API
    dependencies: ['@supabase/supabase-js'],
    inferenceCompatibility: {
      browser: false,
      server: true
    },
    license: 'Google Cloud Terms of Service (Commercial API)',
    commercialUsagePermission: true,
    trainingDataset: 'Google foundational web-scale multimodal corpus',
    hardwareRequirements: 'Serverless Edge execution, zero local client memory footprint',
    knownLimitations: 'Requires network connection and active Supabase backend + Gemini API key.',
    version: '2.5'
  },

  MAKEUP_TRANSFER_ADAPTER: {
    id: 'klozeva-deterministic-compositor',
    url: 'internal://klozeva/makeup/compositor',
    architecture: 'Texture-Preserving Multi-Layer Offscreen Canvas Compositor',
    task: 'virtual-makeup-transfer',
    inputFormat: 'Source portrait + segmented region masks + cosmetic pigment parameters',
    outputFormat: 'Rendered portrait frame at 60 FPS with non-destructive alpha blending',
    modelSizeMb: 0.1,
    dependencies: ['HTML5 Canvas 2D Context'],
    inferenceCompatibility: {
      browser: true,
      webgpu: false,
      wasm: false,
      server: true
    },
    license: 'Proprietary / MIT',
    commercialUsagePermission: true,
    trainingDataset: 'N/A (Analytical Rendering Engine)',
    hardwareRequirements: 'Hardware accelerated 2D canvas',
    knownLimitations: 'Rendering adheres strictly to anatomical landmarks and masks without synthetic hallucination.',
    version: '2.0.0'
  }
};

/**
 * Returns complete model information for an engine key
 */
export const getModelInformation = (engineKey) => {
  return MODEL_REGISTRY[engineKey] || null;
};

/**
 * Validates whether a model is cleared for commercial production
 */
export const isCommerciallyCleared = (engineKey) => {
  return MODEL_REGISTRY[engineKey]?.commercialUsagePermission === true;
};

