# KLOZEVA AI Beauty Intelligence Master Architecture

---

## 1. System Overview

The **KLOZEVA Master AI Beauty Intelligence Engine** is a commercial-grade, multi-stage computer vision and recommendation system designed for retail beauty kiosks and online customer personalization.

```
                      +-----------------------------+
                      |     CUSTOMER PHOTOGRAPH     |
                      +-----------------------------+
                                     |
                                     v
                      +-----------------------------+
                      |   IMAGE QUALITY VALIDATION  |
                      | (Blur, Exposure, Symmetry)  |
                      +-----------------------------+
                                     | (Pass)
                                     v
                      +-----------------------------+
                      |       AI ORCHESTRATOR       |
                      +-----------------------------+
                                     |
         +---------------------------+---------------------------+
         |                           |                           |
         v                           v                           v
+-----------------+         +-----------------+         +-----------------+
|  FACE PARSING   |         | FACE LANDMARKS  |         |  SKIN ANALYSIS  |
|  (SegFormer /   |         |   (MediaPipe    |         | (CIELAB & ITA,  |
| Semantic Masks) |         | 478-Point Mesh) |         | Lighting Check) |
+-----------------+         +-----------------+         +-----------------+
         |                           |                           |
         +---------------------------+---------------------------+
                                     |
                                     v
                      +-----------------------------+
                      |     BEAUTY INTELLIGENCE     |
                      |  (Confidence & Harmonizer)  |
                      +-----------------------------+
                                     |
                    +----------------+----------------+
                    |                                 |
                    v                                 v
   +----------------------------------+   +----------------------------------+
   |       SHADE RECOMMENDATION       |   |         MAKEUP TRANSFER          |
   | (Live Inventory & Delta-E Match) |   | (Deterministic & GAN Adapters)   |
   +----------------------------------+   +----------------------------------+
                    |                                 |
                    +----------------+----------------+
                                     |
                                     v
                      +-----------------------------+
                      |       MAKEUP RENDERING      |
                      |  (Texture-Preserving Dual   |
                      |   Pass Compositing Canvas)  |
                      +-----------------------------+
                                     |
                                     v
                      +-----------------------------+
                      |    FINAL CUSTOMER STUDIO    |
                      | (Interactive Try-On, Wishlist|
                      |    & Shade Passport Export) |
                      +-----------------------------+
```

---

## 2. Component Specifications

### 2.1 Image Quality Validation (`src/lib/beautyAI/imageValidation.js`)
- **Dimension Check**: Validates resolution ($\ge 256 \times 256$), aspect ratio sanity.
- **Laplacian Variance**: Evaluates image sharpness to reject blurry captures ($\text{Var}(\Delta I) \ge 35$).
- **Illumination Symmetry**: Measures bilateral luminance disparity ($|L_{\text{left}} - L_{\text{right}}| / L_{\text{avg}}$) to detect harsh directional side shadows.
- **Exposure Bounds**: Detects severe over-exposure ($>15\%$ pixels clipped at 255) and under-exposure ($>20\%$ pixels $<15$).

### 2.2 Face Parsing (`src/lib/beautyAI/faceParsing.js`)
- **Primary Model**: SegFormer B0 face parsing (`jonathandinu/face-parsing`) using `@huggingface/transformers` in ONNX WebAssembly/WebGPU.
- **19 Semantic Classes**: Background, skin, nose, eyes (L/R), eyebrows (L/R), lips (upper/lower), mouth cavity, hair, neck, etc.
- **Boundary Verification**: Masks are cross-checked against 478-point MediaPipe mesh landmarks to eliminate misaligned segmentation predictions.

### 2.3 Facial Landmark Tracking (`src/lib/beautyAI/faceLandmarks.js`)
- **MediaPipe Tasks Vision**: 478-point 3D facial mesh loaded via WebAssembly with GPU hardware acceleration and CPU fallback.
- **Contour Extraction**: Vermilion border, inner oral commissure, upper eyelid crease, malar cheekbone apple anchors.

### 2.4 Skin & Undertone Analysis (`src/lib/beautyAI/skinAnalysis.js` & `undertoneAnalysis.js`)
- **Color Space**: sRGB $\to$ CIELAB ($L^*, a^*, b^*$).
- **Individual Typology Angle (ITA)**:
  $$\text{ITA} = \frac{\arctan\left(\frac{L^* - 50}{b^*}\right) \times 180}{\pi}$$
  - **Fair**: $\text{ITA} > 55^\circ$
  - **Light**: $41^\circ < \text{ITA} \le 55^\circ$
  - **Medium**: $28^\circ < \text{ITA} \le 41^\circ$
  - **Tan**: $10^\circ < \text{ITA} \le 28^\circ$
  - **Deep**: $\text{ITA} \le 10^\circ$
- **Undertone Decision Boundaries**:
  - **Warm**: Dominant $+b^*$ (golden/peach hue angle, $b^* > a^* + 2$).
  - **Cool**: Dominant $+a^*$ or lower $b^*$ (rosy/pink hue angle).
  - **Olive**: Greenish-golden cast (moderate $L^*$, suppressed $a^* < 12$, elevated $b^* > 15$).
  - **Neutral**: Balanced $a^*$ and $b^*$, $|a^* - b^*| \le 3$.

### 2.5 Grounded Confidence & Reliability (`src/lib/beautyAI/analysisConfidence.js`)
- Eliminates hardcoded simulated confidence percentages.
- Computes `overallReliability` from:
  1. Lighting quality index (0.0 to 1.0).
  2. Sharpness score (0.0 to 1.0).
  3. Skin segmentation coverage and variance.
  4. Landmark-mask boundary agreement.

### 2.6 Modular Virtual Makeup Rendering (`src/lib/beautyAI/makeupRenderer.js`)
- **Dual-Pass Blending**:
  - `soft-light`: Preserves underlying pores, highlights, and fine skin micro-texture.
  - `color`: Imparts precise cosmetic pigment wavelength without altering luminance.
  - `multiply`: Retains depth and lip creases.
  - `screen`: Renders subtle satin/gloss specular highlights.
- **Inner Mouth Occlusion**: Cuts out teeth, tongue, and oral cavity using MediaPipe `lipsInner` contour so talking and smiling remain 100% natural.
- **Cheekbone Malar Placement**: Rotated radial gradients anchored strictly on the zygomatic apple, excluding under-eye circles and nasolabial folds.

