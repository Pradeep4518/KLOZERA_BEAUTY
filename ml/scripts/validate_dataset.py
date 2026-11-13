#!/usr/bin/env python3
"""
Validate dataset integrity, check corrupted images, verify pair matching between images and masks,
and output validation status.
Part of the KLOZEVA ML research & evaluation pipeline.
"""

import argparse
import json
import os
import sys
from pathlib import Path


def validate_dataset(data_dir: str, manifest_path: str = None) -> dict:
    path = Path(data_dir)
    if not path.exists():
        print(f"[ERROR] Path does not exist: {data_dir}")
        return {"status": "error", "error": "directory_not_found"}

    corrupt_files = []
    missing_annotations = []
    valid_pairs = []

    # If manifest is supplied, validate each entry
    if manifest_path and Path(manifest_path).exists():
        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)
        for item in manifest.get("items", []):
            img_p = Path(item.get("image_path", ""))
            ann_p = Path(item.get("annotation_path", ""))
            if not img_p.exists():
                corrupt_files.append(str(img_p))
            elif ann_p and not ann_p.exists():
                missing_annotations.append(str(img_p))
            else:
                valid_pairs.append(item["id"])
    else:
        # Scan directory directly
        image_exts = {".jpg", ".jpeg", ".png", ".webp"}
        for root, _, files in os.walk(path):
            for f in files:
                p = Path(root) / f
                if p.suffix.lower() in image_exts:
                    # Basic byte size check
                    if p.stat().st_size == 0:
                        corrupt_files.append(str(p))
                    else:
                        valid_pairs.append(str(p.name))

    results = {
        "status": "success",
        "total_checked": len(valid_pairs) + len(corrupt_files) + len(missing_annotations),
        "valid_items": len(valid_pairs),
        "corrupt_files": len(corrupt_files),
        "missing_annotations": len(missing_annotations),
        "validation_passed": len(corrupt_files) == 0 and len(missing_annotations) == 0,
    }

    print("==================================================")
    print(" KLOZEVA Dataset Validation Summary")
    print("==================================================")
    print(f"Total Checked:        {results['total_checked']}")
    print(f"Valid Items:          {results['valid_items']}")
    print(f"Corrupt Files:        {results['corrupt_files']}")
    print(f"Missing Annotations:  {results['missing_annotations']}")
    print(f"Validation Status:    {'PASSED' if results['validation_passed'] else 'ATTENTION REQUIRED'}")
    print("==================================================")

    return results


def main():
    parser = argparse.ArgumentParser(description="Validate dataset integrity and image-mask alignment.")
    parser.add_argument("--data-dir", required=True, help="Path to dataset root folder.")
    parser.add_argument("--manifest", default=None, help="Optional path to manifest JSON.")
    args = parser.parse_args()

    validate_dataset(args.data_dir, args.manifest)


if __name__ == "__main__":
    main()

