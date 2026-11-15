#!/usr/bin/env python3
"""Convert a sprite-gen atlas manifest into a Psych Engine 0.6.3 Sparrow XML.

This is an independent adapter based on sprite-gen's documented manifest
contract. It does not import sprite-gen code or generate artwork.

Python 3.10+, standard library only.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import struct
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any


PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


def read_png_dimensions(path: Path) -> tuple[int, int]:
    with path.open("rb") as stream:
        header = stream.read(24)
    if len(header) < 24 or header[:8] != PNG_SIGNATURE or header[12:16] != b"IHDR":
        raise ValueError(f"Not a valid PNG with IHDR: {path}")
    width, height = struct.unpack(">II", header[16:24])
    if width <= 0 or height <= 0:
        raise ValueError(f"Invalid PNG dimensions: {width}x{height}")
    return width, height


def parse_mappings(values: list[str]) -> dict[str, str]:
    mappings: dict[str, str] = {}
    for value in values:
        if "=" not in value:
            raise ValueError(f"Invalid --map {value!r}; expected STATE=PREFIX")
        state, prefix = (part.strip() for part in value.split("=", 1))
        if not state or not prefix:
            raise ValueError(f"Invalid --map {value!r}; state and prefix are required")
        if state in mappings:
            raise ValueError(f"Duplicate mapping for state {state!r}")
        mappings[state] = prefix
    return mappings


def _safe_prefix(value: str) -> str:
    if not value or not re.fullmatch(r"[A-Za-z0-9 _.-]+", value):
        raise ValueError(
            f"Unsafe animation prefix {value!r}; use letters, digits, spaces, dot, dash or underscore"
        )
    return value


def convert(
    manifest_path: Path,
    output_dir: Path,
    mappings: dict[str, str] | None = None,
    png_override: Path | None = None,
) -> dict[str, Any]:
    manifest_path = manifest_path.expanduser().resolve()
    output_dir = output_dir.expanduser().resolve()
    mappings = mappings or {}

    if not manifest_path.is_file():
        raise FileNotFoundError(f"Manifest not found: {manifest_path}")

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if not isinstance(manifest, dict):
        raise ValueError("Manifest root must be a JSON object")

    layout = manifest.get("frame_layout")
    animation = manifest.get("animation")
    if not isinstance(layout, dict) or not isinstance(layout.get("rows"), dict):
        raise ValueError("Manifest is missing frame_layout.rows")
    if not isinstance(animation, dict) or not isinstance(animation.get("rows"), dict):
        raise ValueError("Manifest is missing animation.rows")

    atlas_name = manifest.get("game_input") or manifest.get("sprite_sheet_alpha")
    if not isinstance(atlas_name, str) or not atlas_name.strip():
        raise ValueError("Manifest must define game_input or sprite_sheet_alpha")

    png_path = png_override.expanduser().resolve() if png_override else (manifest_path.parent / atlas_name).resolve()
    sheet_width = int(layout.get("sheetWidth", 0))
    sheet_height = int(layout.get("sheetHeight", 0))
    if sheet_width <= 0 or sheet_height <= 0:
        raise ValueError("frame_layout.sheetWidth and sheetHeight must be positive")

    actual_width, actual_height = read_png_dimensions(png_path)
    if (actual_width, actual_height) != (sheet_width, sheet_height):
        raise ValueError(
            f"Manifest atlas size {sheet_width}x{sheet_height} does not match PNG "
            f"{actual_width}x{actual_height}"
        )

    atlas_reference = os.path.relpath(png_path, output_dir).replace(os.sep, "/")
    root = ET.Element("TextureAtlas", {"imagePath": atlas_reference})
    animation_entries: list[dict[str, Any]] = []
    warnings: list[str] = []
    frame_count = 0
    seen_names: set[str] = set()

    rows = layout["rows"]
    anim_rows = animation["rows"]
    if not rows:
        raise ValueError("frame_layout.rows is empty")

    for state, rectangles in rows.items():
        if not isinstance(state, str) or not isinstance(rectangles, list) or not rectangles:
            raise ValueError(f"Invalid or empty frame row for state {state!r}")
        prefix = _safe_prefix(mappings.get(state, state))
        anim = anim_rows.get(state, {})
        if not isinstance(anim, dict):
            anim = {}

        durations = anim.get("durations_ms")
        fps_value = anim.get("fps", 24)
        try:
            fps = float(fps_value)
        except (TypeError, ValueError):
            fps = 24.0
        if not (fps > 0 and fps < 1000):
            raise ValueError(f"Invalid FPS for state {state!r}: {fps_value!r}")

        if isinstance(durations, list) and durations:
            valid_durations = [float(d) for d in durations if isinstance(d, (int, float)) and d > 0]
            if len(valid_durations) != len(rectangles):
                warnings.append(
                    f"{state}: durations_ms count does not match frame count; using manifest FPS"
                )
            elif valid_durations:
                average_ms = sum(valid_durations) / len(valid_durations)
                fps = 1000.0 / average_ms
                if max(valid_durations) - min(valid_durations) > 1:
                    warnings.append(
                        f"{state}: variable frame durations are approximated by one FPS value "
                        "because Psych character animation entries use a single FPS"
                    )

        loop = anim.get("loop", True)
        if not isinstance(loop, bool):
            warnings.append(f"{state}: invalid loop value; defaulting to true")
            loop = True

        for index, rect in enumerate(rectangles):
            if not isinstance(rect, dict):
                raise ValueError(f"{state}[{index}] must be a rectangle object")
            try:
                x, y = int(rect["x"]), int(rect["y"])
                width, height = int(rect["w"]), int(rect["h"])
            except (KeyError, TypeError, ValueError):
                raise ValueError(f"{state}[{index}] is missing integer x/y/w/h") from None
            if x < 0 or y < 0 or width <= 0 or height <= 0:
                raise ValueError(f"{state}[{index}] has an invalid rectangle")
            if x + width > sheet_width or y + height > sheet_height:
                raise ValueError(f"{state}[{index}] exceeds atlas bounds")

            frame_name = f"{prefix}{index:04d}"
            if frame_name in seen_names:
                raise ValueError(f"Duplicate generated frame name: {frame_name}")
            seen_names.add(frame_name)
            ET.SubElement(
                root,
                "SubTexture",
                {
                    "name": frame_name,
                    "x": str(x),
                    "y": str(y),
                    "width": str(width),
                    "height": str(height),
                    "frameX": "0",
                    "frameY": "0",
                    "frameWidth": str(width),
                    "frameHeight": str(height),
                },
            )
            frame_count += 1

        animation_entries.append(
            {
                "anim": prefix,
                "name": prefix,
                "fps": round(fps, 3),
                "loop": loop,
                "source_state": state,
                "frame_count": len(rectangles),
            }
        )

    output_dir.mkdir(parents=True, exist_ok=True)
    xml_path = output_dir / "sprite-sheet.xml"
    animations_path = output_dir / "character-animations.json"

    tree = ET.ElementTree(root)
    ET.indent(tree, space="  ")
    tree.write(xml_path, encoding="utf-8", xml_declaration=True)

    sidecar = {
        "format": "psych-engine-0.6.3-character-animation-sidecar",
        "version": 1,
        "image": png_path.name,
        "animations": animation_entries,
        "notes": [
            "Merge these animation entries into your Psych Engine character JSON.",
            "Set the character image path to the atlas PNG in your mod.",
            "Review offsets, scale, camera position and sing animations in-game.",
        ],
    }
    animations_path.write_text(
        json.dumps(sidecar, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    return {
        "format": "sprite-gen-to-psych063-sparrow",
        "valid": True,
        "manifest": str(manifest_path),
        "png": str(png_path),
        "xml": str(xml_path),
        "animation_sidecar": str(animations_path),
        "frame_count": frame_count,
        "animation_count": len(animation_entries),
        "animation_prefixes": [entry["anim"] for entry in animation_entries],
        "warnings": warnings,
        "runtime_tested": False,
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Convert a sprite-gen atlas manifest into Sparrow XML for Psych Engine 0.6.3."
    )
    parser.add_argument("manifest", type=Path, help="sprite-gen manifest.json")
    parser.add_argument("--out-dir", type=Path, required=True, help="Output directory")
    parser.add_argument(
        "--map",
        action="append",
        default=[],
        metavar="STATE=PREFIX",
        help="Map a sprite-gen state to a Psych animation prefix; repeat as needed",
    )
    parser.add_argument("--png", type=Path, help="Override the atlas PNG path")
    args = parser.parse_args()

    try:
        mappings = parse_mappings(args.map)
        report = convert(args.manifest, args.out_dir, mappings, args.png)
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(json.dumps({"valid": False, "error": str(exc)}, ensure_ascii=False, indent=2))
        return 2

    print(json.dumps(report, ensure_ascii=False, indent=2))
    print("Note: this creates atlas XML and animation metadata only; it does not create a complete character JSON or run Psych Engine.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
