#!/usr/bin/env python3
"""
Generate a structured JSON manifest for datasets in the KLOZEVA ML workspace.
Follows the KLOZEVA Dataset Manifest Specification.
"""

import argparse
import json
import os
from pathlib import Path


def create_manifest(
    data_dir: str,
    output_manifest: str,
    dataset_name: str,
    license_ref: str,
    annotation_type: str = "segmentation_mask",
    split: str = "train",
) -> dict:
    path = Path(data_dir)
    image_exts = {".jpg", ".jpeg", ".png", ".webp"}
    items = []

    if path.exists():
        for root, _, files in os.walk(path):
            for f in sorted(files):
                p = Path(root) / f
                if p.suffix.lower() in image_exts:
                    rel_img = str(p.relative_to(path))
                    ann_cand = p.with_name(p.stem + "_mask.png")
                    rel_ann = str(ann_cand.relative_to(path)) if ann_cand.exists() else None

                    item = {
                        "id": p.stem,
                        "source_dataset": dataset_name,
                        "relative_image_path": rel_img,
                        "annotation_path": rel_ann,
                        "annotation_type": annotation_type,
                        "license_reference": license_ref,
                        "split": split,
                        "image_dimensions": [512, 512],  # default or populated by PIL
                        "validation_status": "verified" if (rel_ann or annotation_type == "unsupervised") else "pending_annotation",
                    }
                    items.append(item)

    manifest = {
        "dataset_name": dataset_name,
        "license_reference": license_ref,
        "total_records": len(items),
        "split": split,
        "items": items,
    }

    out_p = Path(output_manifest)
    out_p.parent.mkdir(parents=True, exist_ok=True)
    with open(out_p, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    print(f"[SUCCESS] Created manifest with {len(items)} records at {output_manifest}")
    return manifest


def main():
    parser = argparse.ArgumentParser(description="Create structured dataset manifest.")
    parser.add_argument("--data-dir", required=True, help="Path to images directory.")
    parser.add_argument("--output", required=True, help="Output JSON path.")
    parser.add_argument("--dataset-name", required=True, help="Dataset identifier (e.g. celeba_mask_hq, lapa).")
    parser.add_argument("--license", required=True, help="License code (e.g. CC-BY-NC-4.0).")
    parser.add_argument("--annotation-type", default="segmentation_mask")
    parser.add_argument("--split", default="train", choices=["train", "val", "test", "eval"])
    args = parser.parse_args()

    create_manifest(args.data_dir, args.output, args.dataset_name, args.license, args.annotation_type, args.split)


if __name__ == "__main__":
    main()

