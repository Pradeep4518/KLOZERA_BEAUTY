# KLOZEVA Model Setup & Inference Guide

This guide details the integration and execution of AI models in the **KLOZEVA Beauty Intelligence Engine**.

---

## 1. Supported Inference Strategies

### Strategy A: On-Device Browser Inference (Recommended for Kiosks)
- **Engine**: `@huggingface/transformers` (v3) + ONNX Runtime Web.
- **Hardware Acceleration**: WebGPU where available; automatic fallback to WebAssembly (WASM) multithreaded CPU.
- **Privacy Advantage**: The customer's face image never leaves device memory.
- **Latency**: ~38ms on WebGPU, ~140ms on modern multicore CPU.

### Strategy B: Server-Side Inference (Edge / GPU Cluster)
- **Engine**: Supabase Edge Functions / Python FastAPI microservice with TensorRT-LLM or ONNX Runtime Server.
- **Used for**: High-resolution image-to-image synthesis, heavy multimodal models (e.g. Gemini 2.5 Vision).
- **Security**: Tokens (`HUGGINGFACE_TOKEN`, `GEMINI_API_KEY`) stay strictly inside server environments.

---

## 2. Models Supported in Registry

| Model Repository | Architecture | Task | Size (ONNX) | Runtime |
|---|---|---|---|---|
| `jonathandinu/face-parsing` | SegFormer B0 | Semantic Face Parsing | ~14 MB | Browser / Server |
| `MediaPipe FaceLandmarker` | MobileNetV2 Mesh | 3D Landmark Localization | ~4 MB | Browser (WASM/GPU) |
| `Internal CIELAB Engine` | Analytical Color Physics | Skin Depth & Undertone | 0 MB (Code) | Browser / Server |
| `Google Gemini 2.5 Vision` | Multimodal Foundation | Multimodal Beauty Profile | Remote API | Supabase Edge Function |

---

## 3. Environment Variable Configuration

```bash
# Public Frontend Variables (.env)
VITE_BEAUTY_BACKEND=            # Leave empty for localStorage; set to 'supabase' for cloud sync
VITE_BEAUTY_AI_MODE=hybrid      # 'local' | 'hybrid' | 'gemini'
VITE_BEAUTY_LOCAL_INFERENCE=true

# Secure Server Secrets (Supabase Secrets / Docker ENV - NEVER in frontend)
# Set via: supabase secrets set GEMINI_API_KEY=...
GEMINI_API_KEY=
HUGGINGFACE_TOKEN=              # Optional; only required if accessing gated/private models
```

---

## 4. Browser Initialization Code

```javascript
import { initializeHuggingFace, initializeFaceParsingModel, getFacialMasks } from './src/lib/huggingface';

// 1. Initialize environment
await initializeHuggingFace();

// 2. Load face parsing model
await initializeFaceParsingModel();

// 3. Extract masks from customer portrait image
const masks = await getFacialMasks(imageElement);
```

