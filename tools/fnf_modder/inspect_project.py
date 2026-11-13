#!/usr/bin/env python3
"""Read-only inspector for Psych Engine mod folders. Python 3.10+, stdlib only."""
from __future__ import annotations
import argparse
import json
from pathlib import Path
from typing import Any


def load_json(path: Path) -> tuple[dict[str, Any] | None, str | None]:
    try:
        value = json.loads(path.read_text(encoding="utf-8-sig"))
        return (value, None) if isinstance(value, dict) else (None, "JSON root is not an object")
    except Exception as exc:
        return None, str(exc)


def relative(path: Path, root: Path) -> str:
    return path.relative_to(root).as_posix()


def inspect_mod(folder: Path) -> dict[str, Any]:
    files = [p for p in folder.rglob("*") if p.is_file()]
    by_ext = {ext: [p for p in files if p.suffix.lower() == ext]
              for ext in (".png", ".xml", ".json", ".ogg", ".lua")}
    charts = []
    warnings = []
    for path in by_ext[".json"]:
        parts = {part.lower() for part in path.relative_to(folder).parts}
        if "data" not in parts:
            continue
        data, error = load_json(path)
        if data is None:
            charts.append({"file": relative(path, folder), "valid_json": False, "error": error})
            warnings.append("Invalid chart JSON: " + relative(path, folder))
            continue
        song = data.get("song", data)
        notes = song.get("notes", []) if isinstance(song, dict) else []
        note_count = sum(len(section.get("sectionNotes", [])) for section in notes
                         if isinstance(section, dict)) if isinstance(notes, list) else None
        charts.append({
            "file": relative(path, folder), "valid_json": True,
            "song_name": song.get("song") if isinstance(song, dict) else None,
            "bpm": song.get("bpm") if isinstance(song, dict) else None,
            "note_count": note_count,
        })
        if isinstance(song, dict) and song.get("bpm") is None:
            warnings.append("Chart has no BPM field: " + relative(path, folder))
        if "data" in parts and path.parent.name.lower() not in {"stages", "characters"}:
            audio = folder / "songs" / path.parent.name / "Inst.ogg"
            if not audio.is_file():
                warnings.append("No Inst.ogg found at " + relative(audio, folder))

    png_stems = {p.with_suffix("").as_posix().lower() for p in by_ext[".png"]}
    xml_stems = {p.with_suffix("").as_posix().lower() for p in by_ext[".xml"]}
    for stem in sorted(xml_stems - png_stems):
        warnings.append("XML without matching PNG: " + stem)
    for stem in sorted(png_stems - xml_stems):
        if "/characters/" in stem.replace("\\", "/"):
            warnings.append("Character PNG without matching XML: " + stem)

    return {
        "name": folder.name, "root": str(folder.resolve()), "file_count": len(files),
        "counts": {ext[1:]: len(paths) for ext, paths in by_ext.items()},
        "charts": charts,
        "character_png": [relative(p, folder) for p in by_ext[".png"] if "/characters/" in p.as_posix().lower()],
        "character_xml": [relative(p, folder) for p in by_ext[".xml"] if "/characters/" in p.as_posix().lower()],
        "stage_json": [relative(p, folder) for p in by_ext[".json"] if "/stages/" in p.as_posix().lower()],
        "stage_lua": [relative(p, folder) for p in by_ext[".lua"] if "/stages/" in p.as_posix().lower()],
        "lua_scripts": [relative(p, folder) for p in by_ext[".lua"]],
        "warnings": sorted(set(warnings)),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Inspect Psych Engine mods without modifying files.")
    parser.add_argument("path", type=Path, help="Psych Engine mods folder or one mod folder")
    parser.add_argument("--out", type=Path, help="Optional JSON report path")
    args = parser.parse_args()
    root = args.path.expanduser().resolve()
    if not root.is_dir():
        parser.error("Directory does not exist: " + str(root))
    if (root / "mods").is_dir():
        root = root / "mods"
    common_mod_dirs = {"images", "data", "songs", "stages", "scripts", "custom_events"}
    is_single_mod = any((root / name).is_dir() for name in common_mod_dirs)
    folders = [root] if is_single_mod else sorted(p for p in root.iterdir() if p.is_dir())
    if not folders:
        folders = [root]
    report = {
        "format": "fnf-ai-mods-project-inspection", "version": 1,
        "engine_target": "Psych Engine; exact version must be verified separately",
        "mods_root": str(root), "mod_count": len(folders),
        "mods": [inspect_mod(folder) for folder in folders],
    }
    rendered = json.dumps(report, indent=2, ensure_ascii=False)
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(rendered + "\n", encoding="utf-8")
        print("Report written: " + str(args.out))
    else:
        print(rendered)
    print("Inspected " + str(len(folders)) + " mod folder(s). No files were modified.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
