# KLOZEVA Machine Learning & Evaluation Workspace

This workspace houses scripts, configs, evaluation benchmarks, and dataset management pipelines for the **KLOZEVA Beauty Intelligence Engine**.

---

## Workspace Directory Structure

```
ml/
├── configs/          # Model hyperparameters, dataset splits, training configs
├── datasets/         # Local dataset mirrors (git-ignored, strictly outside production bundle)
│   ├── celeba_mask_hq/
│   ├── lapa/
│   ├── fairface/
│   └── fitzpatrick17k/
├── checkpoints/      # Model weights, ONNX exports, quantized browser artifacts
├── scripts/          # Dataset inspection, validation, and manifest generation utilities
│   ├── inspect_dataset.py
│   ├── validate_dataset.py
│   ├── create_manifest.py
│   └── check_annotations.py
├── training/         # Reproducible fine-tuning and export scripts
├── evaluation/       # Benchmark evaluation pipelines (IoU, ITA error, rendering quality)
│   ├── evaluate_face_parsing.py
│   ├── evaluate_skin_analysis.py
│   └── evaluate_rendering.py
└── reports/          # Markdown and JSON benchmark results
```

---

## Operational Workflows

### Operation A — Pretrained Inference
Customer applications run client-side inference via `@huggingface/transformers` and MediaPipe WebAssembly. No dataset download or offline Python environment is required for customer kiosk runtime.

### Operation B — Dataset Evaluation
Evaluate models against ground-truth datasets (CelebAMask-HQ, LaPa, FairFace) to verify per-class IoU, landmark error, and skin tone estimation error across demographic groups:
```bash
python ml/scripts/validate_dataset.py --dataset lapa --data-dir ml/datasets/lapa
python ml/evaluation/evaluate_face_parsing.py --model jonathandinu/face-parsing --manifest ml/datasets/lapa_manifest.json
python ml/evaluation/evaluate_skin_analysis.py --manifest ml/datasets/fairface_manifest.json
```

### Operation C — Fine-Tuning & Export
When authorized data is available, fine-tune SegFormer or MobileNet models, quantify weights, and export to ONNX for browser deployment:
```bash
# Example fine-tuning configuration in ml/configs/face_parsing_segformer.yaml
```

> **IMPORTANT**: Datasets with non-commercial licenses (CelebAMask-HQ, LaPa, Fitzpatrick17k) must strictly remain in this research workspace and MUST NEVER be copied to the `src/` or `public/` web directories.

