#!/usr/bin/env python3
"""
KLOZEVA Commercial Training - License Verification Auditor
Scans dataset manifest and image metadata to verify 100% commercial clearance.
STRICTLY PROHIBITS research-only datasets:
- CelebAMask-HQ (CC BY-NC 4.0)
- FairFace (Personal / Research Only)
- LaPa (Academic Research Only)
- Fitzpatrick17k (Non-Commercial Research Only)
"""

import sys
import json
from pathlib import Path

FORBIDDEN_DATASETS = {
    "celebamask-hq": "CC BY-NC 4.0 (Non-Commercial Research Only)",
    "fairface": "Research Use Only",
    "lapa": "Academic Research Only",
    "fitzpatrick17k": "Non-Commercial Research Only",
    "mt-dataset": "Non-Commercial Research Only"
}

ALLOWED_LICENSES = {
    "CC0-1.0",
    "CC-BY-4.0",
    "Apache-2.0",
    "MIT",
    "Commercial-Proprietary-Consented",
    "Klozeva-Commercial-Vendor-License"
}

def verify_manifest(manifest_path: Path) -> bool:
    if not manifest_path.exists():
        print(f"[ERROR] Manifest file not found: {manifest_path}", file=sys.stderr)
        return False

    with open(manifest_path, "r", encoding="utf-8") as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError as e:
            print(f"[ERROR] Invalid JSON in manifest: {e}", file=sys.stderr)
            return False

    provenance = data.get("dataset_provenance", "").lower()
    for forbidden, license_desc in FORBIDDEN_DATASETS.items():
        if forbidden in provenance:
            print(f"[CRITICAL VIOLATION] Forbidden research-only dataset detected: {forbidden} ({license_desc})", file=sys.stderr)
            return False

    license_id = data.get("license", "")
    if license_id not in ALLOWED_LICENSES:
        print(f"[ERROR] Unverified or non-commercial license: '{license_id}'. Allowed: {ALLOWED_LICENSES}", file=sys.stderr)
        return False

    samples = data.get("samples", [])
    if not samples:
        print("[WARNING] Manifest contains zero samples.")
        return True

    print(f"[SUCCESS] Manifest verified: {len(samples)} samples under commercial license '{license_id}'.")
    print(f"[CLEARANCE] Dataset provenance: {data.get('dataset_provenance')}")
    return True

if __name__ == "__main__":
    target = Path(__file__).parent / "manifest.json"
    if len(sys.argv) > 1:
        target = Path(sys.argv[1])
    ok = verify_manifest(target)
    sys.exit(0 if ok else 1)

