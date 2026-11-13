#!/usr/bin/env python3
"""
Inspect dataset directory structure, count images and annotations, and verify basic file properties.
Part of the KLOZEVA ML research & evaluation pipeline.
"""

import argparse
import os
import sys
from pathlib import Path


def inspect_dataset(data_dir: str, dataset_type: str = "auto") -> dict:
    path = Path(data_dir)
    if not path.exists():
        print(f"[ERROR] Dataset directory does not exist: {data_dir}")
        return {"status": "error", "error": "directory_not_found"}

    image_exts = {".jpg", ".jpeg", ".png", ".webp"}
    mask_exts = {".png", ".bmp", ".npy"}

    images = []
    annotations = []

    for root, _, files in os.walk(path):
        for f in files:
            p = Path(root) / f
            ext = p.suffix.lower()
            if ext in image_exts and "mask" not in p.name.lower() and "label" not in p.name.lower():
                images.append(p)
            elif ext in mask_exts or "mask" in p.name.lower() or "label" in p.name.lower():
                annotations.append(p)

    summary = {
        "status": "success",
        "dataset_path": str(path.resolve()),
        "dataset_type": dataset_type,
        "total_images": len(images),
        "total_annotations": len(annotations),
        "image_extensions": list(set(p.suffix.lower() for p in images)),
        "annotation_extensions": list(set(p.suffix.lower() for p in annotations)),
    }

    print("==================================================")
    print(" KLOZEVA Dataset Inspection Report")
    print("==================================================")
    print(f"Path:                {summary['dataset_path']}")
    print(f"Dataset Type:        {summary['dataset_type']}")
    print(f"Total Images:        {summary['total_images']}")
    print(f"Total Annotations:   {summary['total_annotations']}")
    print(f"Image Formats:       {', '.join(summary['image_extensions']) if summary['image_extensions'] else 'None'}")
    print(f"Annotation Formats:  {', '.join(summary['annotation_extensions']) if summary['annotation_extensions'] else 'None'}")
    print("==================================================")

    return summary


def main():
    parser = argparse.ArgumentParser(description="Inspect dataset files and directory structure.")
    parser.add_argument("--data-dir", required=True, help="Path to dataset root folder.")
    parser.add_argument("--dataset-type", default="auto", choices=["auto", "celeba_mask_hq", "lapa", "fairface", "fitzpatrick17k"])
    args = parser.parse_args()

    inspect_dataset(args.data_dir, args.dataset_type)


if __name__ == "__main__":
    main()

