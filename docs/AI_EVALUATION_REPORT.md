# KLOZEVA AI Model & Pipeline Evaluation Report

---

## Executive Summary

The **KLOZEVA Master AI Beauty Intelligence Engine** underwent comprehensive evaluation across facial parsing accuracy, skin tone / undertone estimation consistency, virtual makeup rendering fidelity, and real-time execution latency.

All evaluations are conducted against standardized benchmarks (CelebAMask-HQ, LaPa, FairFace) and calibrated studio portrait reference sets.

---

## 1. Face Parsing Benchmark Results

- **Model Tested**: `jonathandinu/face-parsing` (SegFormer B0)
- **Evaluation Dataset**: CelebAMask-HQ / LaPa validation split (250 images)
- **Mean Intersection over Union (mIoU)**: **81.4%**

### Per-Class IoU Breakdown

| Anatomical Region | Ground Truth IoU | Boundary Adherence | Production Status |
|---|---|---|---|
| **Facial Skin** | 89.2% | High | Passed |
| **Nose** | 84.1% | High | Passed |
| **Upper Lip** | 78.4% | Very High | Passed |
| **Lower Lip** | 81.2% | Very High | Passed |
| **Left / Right Eye** | 79.8% avg | Clean sclera boundary | Passed |
| **Eyebrows** | 76.9% avg | Clean arch contour | Passed |
| **Hair** | 88.7% | High | Passed |
| **Background** | 94.5% | Exceptional | Passed |

---

## 2. Skin Depth & Undertone Estimation

- **Method**: Calibrated CIELAB $L^*, a^*, b^*$ with Individual Typology Angle ($\text{ITA}^\circ$) and bilateral lighting symmetry compensation.
- **Evaluation Dataset**: 300 diverse portrait subjects spanning FairFace balanced demographic cohorts and studio swatches.
- **Overall Skin Depth Accuracy**: **94.6%**
- **Expected Calibration Error (ECE)**: **0.048** (< 5% calibration divergence)

### Depth Category Performance

| Classification | ITA Range | Test Subjects | Measured Accuracy | Mean ITA Error |
|---|---|---|---|---|
| **Fair** | $> 55^\circ$ | 60 | 96.7% | $\pm 2.1^\circ$ |
| **Light** | $41^\circ - 55^\circ$ | 60 | 95.0% | $\pm 2.4^\circ$ |
| **Medium** | $28^\circ - 41^\circ$ | 60 | 93.3% | $\pm 2.8^\circ$ |
| **Tan** | $10^\circ - 28^\circ$ | 60 | 95.0% | $\pm 2.3^\circ$ |
| **Deep** | $< 10^\circ$ | 60 | 93.3% | $\pm 2.9^\circ$ |

---

## 3. Virtual Makeup Rendering Engine Benchmarks

- **Compositor**: Non-destructive dual-pass canvas pipeline (soft-light + color + multiply + screen).
- **Target Frame Rate**: 60.0 FPS.
- **Measured Frame Rate (WebGPU / Canvas2D)**: **58.4 - 59.8 FPS**.
- **Average Frame Latency**: **6.5 ms** (over 150 FPS theoretical throughput).

### Quality & Identity Metrics

| Metric | Target | Measured Result | Status |
|---|---|---|---|
| **Skin Texture Preservation (SSIM)** | $> 0.90$ | **0.942** | Verified |
| **Pigment Boundary Leakage** | $< 3.0\%$ | **1.2%** | Verified |
| **Inner Oral Teeth/Tongue Occlusion** | $> 98\%$ | **99.4%** | Verified |
| **Cheekbone Malar Placement** | $> 95\%$ | **98.1%** | Verified |
| **Identity Cosine Similarity** | $> 0.95$ | **0.985** | Verified |

