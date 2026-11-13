# KLOZEVA Dataset Setup & Management Guide

This guide describes how to connect, validate, and manage datasets for training and benchmarking the **KLOZEVA Beauty Intelligence Platform**.

---

## 1. Supported Research Datasets

| Dataset | URL / Authorized Source | License | Required Storage | Primary Purpose |
|---|---|---|---|---|
| **CelebAMask-HQ** | `https://github.com/switchablenorms/CelebAMask-HQ` | CC BY-NC 4.0 | ~15 GB | 19-class semantic face parsing benchmarking |
| **LaPa** | `https://github.com/lucia123/lapa-dataset` | Non-Commercial Academic | ~8 GB | Landmark alignment & parsing boundary validation |
| **FairFace** | `https://github.com/joojs/fairface` | Custom Academic | ~5 GB | Cross-demographic skin tone bias & fairness audit |
| **Fitzpatrick17k** | `https://github.com/mattgroh/fitzpatrick17k` | CC BY-NC 4.0 | ~4 GB | Dermatological diversity research (Non-cosmetic) |

---

## 2. Directory Layout & Setup

Store downloaded datasets strictly in `ml/datasets/`:
```bash
ml/datasets/
├── celeba_mask_hq/
│   ├── CelebA-HQ-img/
│   └── CelebAMask-HQ-mask-anno/
├── lapa/
│   ├── images/
│   └── labels/
└── fairface/
    ├── train/
    ├── val/
    └── fairface_label_val.csv
```

---

## 3. Data Integrity & Manifest Creation

Run the inspection and manifest generation tools:

```bash
# 1. Inspect dataset structure
python ml/scripts/inspect_dataset.py --data-dir ml/datasets/lapa --dataset-type lapa

# 2. Validate corrupt files and pair alignment
python ml/scripts/validate_dataset.py --data-dir ml/datasets/lapa

# 3. Create structured JSON manifest
python ml/scripts/create_manifest.py \
  --data-dir ml/datasets/lapa/images \
  --output ml/datasets/lapa_manifest.json \
  --dataset-name lapa \
  --license Non-Commercial-Academic \
  --split val

# 4. Check class annotation coverage
python ml/scripts/check_annotations.py --manifest ml/datasets/lapa_manifest.json
```

---

## 4. Privacy & Compliance Rules

1. **Customer Image Firewall**: Never place customer photos into `ml/datasets/`.
2. **No Production Bundling**: Vite build excludes `ml/` from production distributions (`dist/`).
3. **No Public Uploads**: Never upload non-commercial datasets or internal photos to public Hugging Face spaces or git remotes.

