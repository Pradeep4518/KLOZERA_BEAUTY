# KLOZEVA COMMERCIAL RETRAINING WORKSPACE

This workspace contains the complete, reproducible training and export pipeline for fine-tuning SegFormer B0 (`nvidia/mit-b0`, Apache 2.0) on **commercially cleared face segmentation data**.

## 1. Strict Licensing Rules

> [!CAUTION]
> Under no circumstances may any of the following research-only datasets be placed into this training directory:
> - **CelebAMask-HQ** (CC BY-NC 4.0)
> - **FairFace** (Research Use Only)
> - **LaPa** (Academic Research Only)
> - **Fitzpatrick17k** (Non-Commercial Research Only)
> - **BeautyGAN MT Dataset** (Non-Commercial Research Only)

All training images must be accompanied by explicit commercial provenance or CC0 / CC-BY licensing in `manifest.json`.

## 2. Directory Layout

- `manifest.json`: Sample inventory with verified commercial clearance tags and consent IDs.
- `train_config.yaml`: Model architecture, hyperparameters, loss weighting, and hardware sizing.
- `verify_licenses.py`: Pre-training audit tool validating that no restricted dataset is referenced.
- `preprocess_images.py`: Standardizes input images to 512x512 and maps classes to indices `[0..18]`.
- `train_segformer.py`: Distributed PyTorch training script with automatic mixed precision (fp16).
- `export_onnx.py`: Converts best checkpoint to ONNX format compatible with Transformers.js.
- `evaluate_checkpoint.py`: Calculates mIoU, skin IoU, and lip IoU against held-out test splits.

## 3. Hardware Requirements & Cost Estimate

- **Compute:** 1x NVIDIA A100 (40GB or 80GB) or 2x RTX 4090.
- **Estimated Wall-Clock Time:** 10–12 hours for 40 epochs on 5,000 images.
- **Estimated Cloud GPU Cost:** ~$25–$35 USD on Google Cloud Compute Engine / AWS EC2.

## 4. Execution Workflow

```bash
# 1. Audit dataset licenses
python verify_licenses.py manifest.json

# 2. Preprocess images and masks
python preprocess_images.py

# 3. Launch training
python train_segformer.py

# 4. Export to browser ONNX
python export_onnx.py

# 5. Evaluate checkpoint
python evaluate_checkpoint.py
```

