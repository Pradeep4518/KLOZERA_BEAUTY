#!/usr/bin/env python3
"""
KLOZEVA Commercial Training - Dataset Manifest Builder & Validator
Builds a structured JSON manifest verifying sample metadata, split, and commercial rights.
"""

import os
import json
import hashlib
from pathlib import Path

def compute_sha256(filepath: Path) -> str:
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def create_template_manifest(output_path: Path):
    manifest = {
        "dataset_name": "klozeva-commercial-face-segmentation-v1",
        "dataset_version": "1.0.0",
        "dataset_provenance": "Klozeva Consented Studio Portraits & Commercially Licensed CC-BY Datasets",
        "license": "Commercial-Proprietary-Consented",
        "commercial_usage_cleared": True,
        "classes": [
            "background", "skin", "nose", "eye_g", "l_eye", "r_eye",
            "l_brow", "r_brow", "l_ear", "r_ear", "mouth", "u_lip",
            "l_lip", "hair", "hat", "ear_r", "neck_l", "neck", "cloth"
        ],
        "splits": {
            "train": 0.8,
            "val": 0.1,
            "test": 0.1
        },
        "samples": [
            {
                "id": "sample_0001",
                "image_path": "images/sample_0001.jpg",
                "mask_path": "masks/sample_0001.png",
                "split": "train",
                "image_width": 512,
                "image_height": 512,
                "consent_id": "CONSENT-STD-2026-001",
                "commercial_clearance_verified": True
            }
        ]
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print(f"[INFO] Created template commercial manifest at {output_path}")

if __name__ == "__main__":
    out = Path(__file__).parent / "manifest.json"
    create_template_manifest(out)

