# KLOZEVA AI Model & Dataset License Register

This document serves as the formal commercial licensing and provenance gate for all AI models, architectures, checkpoints, and datasets evaluated or integrated into the **KLOZEVA Beauty Intelligence Platform**.

---

## 1. Commercial Licensing Policy & Gate Criteria

KLOZEVA is a commercial enterprise application. Under the commercial licensing policy:
1. **Commercially Cleared (Green)**: Permitted for production inference, weight distribution, and commercial SaaS/kiosk usage (e.g., MIT, Apache 2.0, BSD-3-Clause, OpenRAIL-M with compatible commercial terms).
2. **Restricted / Research-Only (Yellow)**: Explicitly prohibited from commercial runtime and direct binary distribution. Restricted to offline experimental benchmarking, evaluation, and academic replication within isolated research environments (e.g., CC BY-NC 4.0, non-commercial research licenses).
3. **Blocked (Red)**: Unresolved rights, viral copyleft with proprietary restrictions, or conflicting terms. Strictly blocked from entering production code, models, or datasets.

---

## 2. AI Model & Checkpoint License Register

| Resource / Model ID | Repository URL | Architecture | Task | License | Commercially Cleared | Production Status & Action |
|---|---|---|---|---|---|---|
| **MediaPipe FaceLandmarker** | `google.github.io/mediapipe` | MobileNetV2 / Attention Mesh (478 pts) | 3D Facial Landmark & Mesh Detection | Apache 2.0 | **YES** | **Active Production**. Used on-device via WebAssembly/GPU delegate for 478-point 3D facial geometry. |
| **jonathandinu/face-parsing** | `huggingface.co/jonathandinu/face-parsing` | SegFormer (B0) | 19-class Facial Semantic Segmentation | MIT (Model Wrapper / Code); trained on CelebAMask-HQ | **RESTRICTED** | **Evaluation & Research Baseline**. Provides ONNX weights for browser testing. For commercial distribution, must be replaced with SegFormer trained on commercially cleared synthetic/consented data or paired with on-device landmark segmentation. |
| **briaai/RMBG-1.4 / BiRefNet** | `huggingface.co/briaai/RMBG-1.4` | BiRefNet / Transformer | High-resolution background removal & subject isolation | Creative Commons BY-NC 4.0 / Bria Commercial License | **CONDITIONAL** | **Requires Bria Enterprise License** for commercial production use; isolated in research configuration. |
| **BeautyGAN** | `github.com/Honlan/BeautyGAN` | Dual-Input CycleGAN with Makeup Loss | Exemplar-based Makeup Transfer | Non-Commercial Research License | **NO (Research Only)** | **Blocked from direct commercial weights**. Used as an algorithmic reference; production uses deterministic texture-preserving canvas makeup rendering. |
| **Colorimetric CIELAB & ITA Engine** | Internal KLOZEVA Algorithmic Engine | Analytical Color Physics & Geometry | Skin depth, undertone, and lighting assessment | Proprietary / MIT | **YES** | **Active Production Baseline**. 100% deterministic, mathematically grounded in CIELAB $L^*, a^*, b^*$ and Individual Typology Angle ($\text{ITA}^\circ$). |
| **Gemini 2.5 Vision** | Google Cloud / Vertex AI / Gemini API | Multimodal Large Language Model | Comprehensive Multimodal Beauty Profile | Google Cloud Terms of Service | **YES (API terms)** | **Active Optional Cloud Provider**. Hosted server-side via Supabase Edge Function `beauty-analyze`. No API keys exposed to browser. |

---

## 3. Dataset License & Provenance Register

| Dataset | Source URL | Purpose | License | Commercially Cleared | Research / Production Action |
|---|---|---|---|---|---|
| **CelebAMask-HQ** | `github.com/switchablenorms/CelebAMask-HQ` | 30,000 high-res facial masks (19 classes) | CC BY-NC 4.0 (Non-Commercial) | **NO** | **Research & Benchmark Only**. Isolated in `ml/datasets/celeba_mask_hq/`. Never bundled into the React production build or customer app. |
| **LaPa** | `github.com/lucia123/lapa-dataset` | 22,000 images with 11 parsing classes & 106 landmarks | Non-Commercial Academic License | **NO** | **Research & Evaluation Only**. Used exclusively for offline IoU and landmark validation scripts in `ml/evaluation/`. |
| **Fitzpatrick17k** | `github.com/mattgroh/fitzpatrick17k` | Clinical dermatology diversity (Types I-VI) | CC BY-NC 4.0 | **NO** | **Diversity & Bias Evaluation Only**. Never used as cosmetic foundation ground truth. Dermatological clinical labels are excluded from cosmetic skin tone modeling. |
| **FairFace** | `github.com/joojs/fairface` | Balanced race, gender, and age face dataset | Custom Research License | **NO** | **Fairness & Bias Benchmarking Only**. Isolated in `ml/datasets/fairface/` to verify skin tone stability across diverse ethnic profiles. |
| **KLOZEVA Internal Calibrated Presets** | Internal KLOZEVA Studio | Studio portraits with calibrated lighting and measured skin swatches | Proprietary (KLOZEVA Owned) | **YES** | **Active Production Demo & Verification Assets**. Fully cleared commercial studio assets. |

---

## 4. Model Training & Data Leakage Safeguards

1. **Customer Privacy Guarantee**: Customer photographs captured through the Kiosk or uploaded by guests are processed Ephemerally in browser memory or short-lived memory during Edge Function calls. They are **NEVER** stored in public buckets, used for training, or uploaded to public Hugging Face hubs.
2. **Isolation of Research Weights**: Any models trained on non-commercial datasets (such as CelebAMask-HQ or LaPa) are strictly tagged as `research-only` in the model registry.
3. **Production Gate**: The production deployment workflow enforces that only models with `commercialClearance: true` are enabled for customer-facing commercial transactions.

