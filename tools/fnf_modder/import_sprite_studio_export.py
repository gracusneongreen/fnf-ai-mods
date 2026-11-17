#!/usr/bin/env python3
"""Import an FNF Sprite Studio PNG/XML ZIP into a Psych Engine mod folder."""
from __future__ import annotations
import argparse, json, re, struct, sys, zipfile
import xml.etree.ElementTree as ET
from pathlib import Path, PurePosixPath
from typing import Any

PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"

def png_dimensions(data: bytes) -> tuple[int, int]:
    if len(data) < 24 or data[:8] != PNG_SIGNATURE or data[12:16] != b"IHDR":
        raise ValueError("PNG file has no valid signature/IHDR header")
    width, height = struct.unpack(">II", data[16:24])
    if width <= 0 or height <= 0:
        raise ValueError("PNG dimensions must be positive")
    return width, height

def inspect_sprite_studio_zip(archive_path: Path) -> dict[str, Any]:
    with zipfile.ZipFile(archive_path) as archive:
        files = [item for item in archive.infolist() if not item.is_dir()]
        for item in files:
            member = PurePosixPath(item.filename)
            if member.is_absolute() or ".." in member.parts or "\\" in item.filename:
                raise ValueError(f"Unsafe ZIP member path: {item.filename!r}")
        pngs = [item for item in files if PurePosixPath(item.filename).suffix.lower() == ".png"]
        xmls = [item for item in files if PurePosixPath(item.filename).suffix.lower() == ".xml"]
        if len(pngs) != 1 or len(xmls) != 1:
            raise ValueError(f"Expected one PNG and one XML; found {len(pngs)} PNG and {len(xmls)} XML")
        png_item, xml_item = pngs[0], xmls[0]
        png_bytes, xml_bytes = archive.read(png_item), archive.read(xml_item)
        width, height = png_dimensions(png_bytes)
        try:
            root = ET.fromstring(xml_bytes)
        except ET.ParseError as exc:
            raise ValueError(f"Invalid Sparrow XML: {exc}") from exc
        if root.tag != "TextureAtlas":
            raise ValueError(f"Expected TextureAtlas XML root, found {root.tag!r}")
        image_path = root.attrib.get("imagePath", "").strip()
        if not image_path:
            raise ValueError("TextureAtlas is missing imagePath")
        if PurePosixPath(image_path).name.lower() != PurePosixPath(png_item.filename).name.lower():
            raise ValueError(f"XML imagePath {image_path!r} does not match PNG filename {png_item.filename!r}")
        frames = root.findall("SubTexture")
        if not frames:
            raise ValueError("Sparrow XML contains no SubTexture frames")
        names, prefixes = set(), set()
        for frame in frames:
            name = frame.attrib.get("name", "").strip()
            if not name:
                raise ValueError("A SubTexture frame is missing its name")
            if name in names:
                raise ValueError(f"Duplicate frame name: {name}")
            names.add(name)
            prefix = re.sub(r"\d+$", "", name)
            if prefix:
                prefixes.add(prefix)
            try:
                x, y = int(frame.attrib["x"]), int(frame.attrib["y"])
                w, h = int(frame.attrib["width"]), int(frame.attrib["height"])
            except (KeyError, ValueError) as exc:
                raise ValueError(f"Frame {name!r} has invalid rectangle attributes") from exc
            if min(x, y) < 0 or min(w, h) <= 0 or x + w > width or y + h > height:
                raise ValueError(f"Frame {name!r} is outside the {width}x{height} PNG bounds")
        return {
            "png_name": PurePosixPath(png_item.filename).name,
            "xml_name": PurePosixPath(xml_item.filename).name,
            "png_bytes": png_bytes, "xml_bytes": xml_bytes,
            "png_dimensions": [width, height], "frame_count": len(frames),
            "animation_prefixes": sorted(prefixes),
        }

def import_export(archive_path: Path, mod_root: Path, character: str, overwrite: bool = False) -> dict[str, Any]:
    if not re.fullmatch(r"[A-Za-z0-9_-]+", character):
        raise ValueError("Character name may contain only letters, numbers, '_' and '-'")
    export = inspect_sprite_studio_zip(archive_path)
    destination = mod_root / "images" / "characters"
    png_target, xml_target = destination / f"{character}.png", destination / f"{character}.xml"
    existing = [path for path in (png_target, xml_target) if path.exists()]
    if existing and not overwrite:
        raise FileExistsError("Refusing to overwrite: " + ", ".join(map(str, existing)) + ". Back up first, then use --overwrite.")
    destination.mkdir(parents=True, exist_ok=True)
    png_target.write_bytes(export["png_bytes"])
    xml_target.write_bytes(export["xml_bytes"])
    return {
        "imported": True, "png": str(png_target), "xml": str(xml_target),
        "png_dimensions": export["png_dimensions"], "frame_count": export["frame_count"],
        "animation_prefixes": export["animation_prefixes"],
        "character_json_created": False, "psych_engine_runtime_tested": False,
    }

def main() -> int:
    parser = argparse.ArgumentParser(description="Import an FNF Sprite Studio ZIP into mods/<mod>/images/characters.")
    parser.add_argument("archive", type=Path)
    parser.add_argument("--mod-root", type=Path, required=True)
    parser.add_argument("--character", required=True)
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args()
    try:
        report = import_export(args.archive, args.mod_root, args.character, args.overwrite)
    except (OSError, ValueError, zipfile.BadZipFile) as exc:
        print(f"Import failed: {exc}", file=sys.stderr)
        return 2
    print(json.dumps(report, indent=2, ensure_ascii=False))
    print("Note: this does not create character.json or test the assets in Psych Engine.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
