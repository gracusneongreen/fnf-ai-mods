#!/usr/bin/env python3
"""Import an FNF Sprite Studio PNG/XML ZIP into a Psych Engine mod folder."""
from __future__ import annotations
import argparse, json, re, struct, sys, zipfile
import xml.etree.ElementTree as ET
from pathlib import Path, PurePosixPath

PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"

def inspect_zip(path: Path) -> dict:
    with zipfile.ZipFile(path) as archive:
        files = [x for x in archive.infolist() if not x.is_dir()]
        for item in files:
            member = PurePosixPath(item.filename)
            if member.is_absolute() or ".." in member.parts or "\\" in item.filename:
                raise ValueError(f"Unsafe ZIP member path: {item.filename!r}")
        pngs = [x for x in files if PurePosixPath(x.filename).suffix.lower() == ".png"]
        xmls = [x for x in files if PurePosixPath(x.filename).suffix.lower() == ".xml"]
        if len(pngs) != 1 or len(xmls) != 1:
            raise ValueError(f"Expected one PNG and one XML; found {len(pngs)} PNG and {len(xmls)} XML")
        png_item, xml_item = pngs[0], xmls[0]
        png, xml = archive.read(png_item), archive.read(xml_item)
    if len(png) < 24 or png[:8] != PNG_SIGNATURE or png[12:16] != b"IHDR":
        raise ValueError("PNG file has no valid signature/IHDR header")
    width, height = struct.unpack(">II", png[16:24])
    if width <= 0 or height <= 0:
        raise ValueError("PNG dimensions must be positive")
    try:
        root = ET.fromstring(xml)
    except ET.ParseError as exc:
        raise ValueError(f"Invalid Sparrow XML: {exc}") from exc
    if root.tag != "TextureAtlas":
        raise ValueError(f"Expected TextureAtlas XML root, found {root.tag!r}")
    image_path = root.attrib.get("imagePath", "").strip()
    if not image_path or PurePosixPath(image_path).name.lower() != PurePosixPath(png_item.filename).name.lower():
        raise ValueError("XML imagePath is missing or does not match the PNG filename")
    frames = root.findall("SubTexture")
    if not frames:
        raise ValueError("Sparrow XML contains no SubTexture frames")
    names, prefixes = set(), set()
    for frame in frames:
        name = frame.attrib.get("name", "").strip()
        if not name or name in names:
            raise ValueError(f"Missing or duplicate frame name: {name!r}")
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
    return {"png": png, "xml": xml, "dimensions": [width, height], "frames": len(frames), "prefixes": sorted(prefixes)}

def import_export(archive: Path, mod_root: Path, character: str, overwrite: bool = False) -> dict:
    if not re.fullmatch(r"[A-Za-z0-9_-]+", character):
        raise ValueError("Character name may contain only letters, numbers, '_' and '-'")
    data = inspect_zip(archive)
    target = mod_root / "images" / "characters"
    png_path, xml_path = target / f"{character}.png", target / f"{character}.xml"
    existing = [p for p in (png_path, xml_path) if p.exists()]
    if existing and not overwrite:
        raise FileExistsError("Refusing to overwrite: " + ", ".join(map(str, existing)) + ". Back up first, then use --overwrite.")
    target.mkdir(parents=True, exist_ok=True)
    png_path.write_bytes(data["png"])
    xml_path.write_bytes(data["xml"])
    return {"imported": True, "png": str(png_path), "xml": str(xml_path),
            "png_dimensions": data["dimensions"], "frame_count": data["frames"],
            "animation_prefixes": data["prefixes"], "character_json_created": False,
            "psych_engine_runtime_tested": False}

def main() -> int:
    parser = argparse.ArgumentParser(description="Import an FNF Sprite Studio ZIP into a Psych Engine mod.")
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
    print("Note: no character JSON is created and Psych Engine runtime is not tested.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
