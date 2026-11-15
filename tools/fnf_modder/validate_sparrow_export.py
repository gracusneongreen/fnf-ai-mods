#!/usr/bin/env python3
"""Validate a Sparrow PNG/XML export before importing it into a Psych Engine mod.

Python 3.10+, standard library only. This is a structural preflight, not an
engine compatibility test and not an asset generator.
"""
from __future__ import annotations

import argparse
import json
import re
import struct
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any


PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


def png_dimensions(path: Path) -> tuple[int, int]:
    with path.open("rb") as stream:
        header = stream.read(24)
    if len(header) < 24 or header[:8] != PNG_SIGNATURE or header[12:16] != b"IHDR":
        raise ValueError("File is not a valid PNG with an IHDR header")
    width, height = struct.unpack(">II", header[16:24])
    if width <= 0 or height <= 0:
        raise ValueError("PNG dimensions must be positive")
    return width, height


def validate(xml_path: Path, png_override: Path | None, required: list[str]) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []
    xml_path = xml_path.expanduser().resolve()
    if not xml_path.is_file():
        return {"valid": False, "errors": [f"XML file not found: {xml_path}"], "warnings": []}

    try:
        root = ET.parse(xml_path).getroot()
    except (ET.ParseError, OSError) as exc:
        return {"valid": False, "errors": [f"Could not parse XML: {exc}"], "warnings": []}

    if root.tag != "TextureAtlas":
        errors.append(f"Expected TextureAtlas root, found {root.tag!r}")

    image_path = root.attrib.get("imagePath", "").strip()
    if not image_path:
        errors.append("TextureAtlas is missing imagePath")

    png_path = png_override.expanduser().resolve() if png_override else (xml_path.parent / image_path).resolve()
    if png_override and image_path and Path(image_path).name.lower() != png_path.name.lower():
        warnings.append(
            f"XML imagePath is {Path(image_path).name!r}, but --png points to {png_path.name!r}"
        )

    width = height = None
    try:
        width, height = png_dimensions(png_path)
    except (OSError, ValueError) as exc:
        errors.append(f"PNG check failed ({png_path}): {exc}")

    frames = root.findall("SubTexture")
    if not frames:
        errors.append("No SubTexture frames were found")

    names: set[str] = set()
    prefixes: set[str] = set()
    checked_frames = 0
    for index, frame in enumerate(frames):
        name = frame.attrib.get("name", "").strip()
        if not name:
            errors.append(f"Frame {index} has no name")
            continue
        if name in names:
            errors.append(f"Duplicate frame name: {name}")
        names.add(name)
        prefix = re.sub(r"\d+$", "", name)
        if prefix:
            prefixes.add(prefix)

        try:
            x = int(frame.attrib["x"])
            y = int(frame.attrib["y"])
            w = int(frame.attrib["width"])
            h = int(frame.attrib["height"])
        except (KeyError, ValueError):
            errors.append(f"Frame {name!r} has missing or non-integer x/y/width/height")
            continue

        if min(x, y) < 0 or min(w, h) <= 0:
            errors.append(f"Frame {name!r} has invalid rectangle ({x}, {y}, {w}, {h})")
        elif width is not None and height is not None and (x + w > width or y + h > height):
            errors.append(f"Frame {name!r} exceeds PNG bounds ({width}x{height})")
        else:
            checked_frames += 1

    missing = sorted(prefix for prefix in required if prefix not in prefixes)
    for prefix in missing:
        errors.append(f"Required animation prefix not found: {prefix}")

    if len(prefixes) == 0 and frames:
        warnings.append("Could not infer animation prefixes from frame names")
    if len(frames) > 0 and checked_frames == 0:
        warnings.append("No frame rectangles passed bounds validation")

    return {
        "format": "fnf-sparrow-atlas-preflight",
        "version": 1,
        "valid": not errors,
        "xml": str(xml_path),
        "png": str(png_path),
        "png_dimensions": {"width": width, "height": height} if width and height else None,
        "frame_count": len(frames),
        "checked_frame_count": checked_frames,
        "animation_prefixes": sorted(prefixes),
        "required_prefixes": required,
        "missing_required_prefixes": missing,
        "errors": errors,
        "warnings": warnings,
        "runtime_tested": False,
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Read-only structural check for a Sparrow spritesheet exported for FNF."
    )
    parser.add_argument("xml", type=Path, help="Sparrow XML file")
    parser.add_argument("--png", type=Path, help="Optional explicit PNG path (otherwise XML imagePath is used)")
    parser.add_argument(
        "--require-prefix",
        action="append",
        default=[],
        metavar="NAME",
        help="Required animation prefix; repeat for idle, singLEFT, singDOWN, singUP, singRIGHT",
    )
    parser.add_argument("--out", type=Path, help="Optional JSON report path")
    args = parser.parse_args()

    required = [item.strip() for value in args.require_prefix for item in value.split(",") if item.strip()]
    report = validate(args.xml, args.png, required)
    rendered = json.dumps(report, indent=2, ensure_ascii=False)

    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(rendered + "\n", encoding="utf-8")
        print(f"Report written: {args.out}")
    else:
        print(rendered)

    print("Atlas preflight: " + ("PASS" if report["valid"] else "FAIL"))
    print("Note: this does not launch Psych Engine or certify runtime compatibility.")
    return 0 if report["valid"] else 2


if __name__ == "__main__":
    sys.exit(main())
