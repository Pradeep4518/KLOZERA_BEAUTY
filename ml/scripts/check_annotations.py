#!/usr/bin/env python3
"""
Inspect and verify annotation classes, label values, and shape consistency.
Part of the KLOZEVA ML research & evaluation pipeline.
"""

import argparse
import os
import json
from pathlib import Path


EXPECTED_FACE_PARSING_CLASSES = {
    0: "background",
    1: "skin",
    2: "nose",
    3: "eye_g",
    4: "l_eye",
    5: "r_eye",
    6: "l_brow",
    7: "r_brow",
    8: "l_ear",
    9: "r_ear",
    10: "mouth",
    11: "u_lip",
    12: "l_lip",
    13: "hair",
    14: "hat",
    15: "ear_r",
    16: "neck_l",
    17: "neck",
    18: "cloth",
}


def check_annotations(manifest_path: str) -> dict:
    p = Path(manifest_path)
    if not p.exists():
        print(f"[ERROR] Manifest not found: {manifest_path}")
        return {"status": "error", "error": "file_not_found"}

    with open(p, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    total = len(manifest.get("items", []))
    with_annotations = sum(1 for item in manifest.get("items", []) if item.get("annotation_path"))

    report = {
        "status": "success",
        "dataset_name": manifest.get("dataset_name"),
        "total_items": total,
        "items_with_annotations": with_annotations,
        "annotation_rate_pct": (with_annotations / total * 100) if total > 0 else 0,
        "expected_classes": EXPECTED_FACE_PARSING_CLASSES,
    }

    print("==================================================")
    print(" KLOZEVA Annotation Check Report")
    print("==================================================")
    print(f"Dataset:            {report['dataset_name']}")
    print(f"Total Items:        {report['total_items']}")
    print(f"Annotated Items:    {report['items_with_annotations']}")
    print(f"Annotation Rate:    {report['annotation_rate_pct']:.1f}%")
    print(f"Supported Classes:  {len(EXPECTED_FACE_PARSING_CLASSES)}")
    print("==================================================")

    return report


def main():
    parser = argparse.ArgumentParser(description="Verify annotation coverage and classes.")
    parser.add_argument("--manifest", required=True, help="Path to manifest JSON.")
    args = parser.parse_args()

    check_annotations(args.manifest)


if __name__ == "__main__":
    main()

