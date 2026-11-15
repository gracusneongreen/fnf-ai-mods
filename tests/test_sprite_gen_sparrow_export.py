from __future__ import annotations

import json
import struct
import tempfile
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

from tools.fnf_modder.convert_sprite_gen_to_sparrow import convert, parse_mappings


def write_test_png(path: Path, width: int, height: int) -> None:
    header = (
        b"\x89PNG\r\n\x1a\n"
        + struct.pack(">I", 13)
        + b"IHDR"
        + struct.pack(">II", width, height)
    )
    path.write_bytes(header)


class SpriteGenSparrowExportTests(unittest.TestCase):
    def make_manifest(self, root: Path, rectangles=None) -> Path:
        write_test_png(root / "sprite-sheet-alpha.png", 128, 64)
        payload = {
            "game_input": "sprite-sheet-alpha.png",
            "animation": {
                "rows": {
                    "idle": {"fps": 8, "durations_ms": [125, 125], "loop": True},
                    "left": {"fps": 12, "durations_ms": [80, 80], "loop": False},
                }
            },
            "frame_layout": {
                "sheetWidth": 128,
                "sheetHeight": 64,
                "rows": rectangles or {
                    "idle": [
                        {"x": 0, "y": 0, "w": 32, "h": 32},
                        {"x": 32, "y": 0, "w": 32, "h": 32},
                    ],
                    "left": [{"x": 64, "y": 0, "w": 32, "h": 32}],
                },
            },
        }
        manifest = root / "manifest.json"
        manifest.write_text(json.dumps(payload), encoding="utf-8")
        return manifest

    def test_converts_rows_to_sparrow_and_animation_sidecar(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            manifest = self.make_manifest(root)
            out = root / "out"

            report = convert(manifest, out, {"left": "singLEFT"})

            self.assertTrue(report["valid"])
            self.assertEqual(report["frame_count"], 3)
            xml_root = ET.parse(out / "sprite-sheet.xml").getroot()
            self.assertEqual(xml_root.tag, "TextureAtlas")
            self.assertEqual(
                [frame.attrib["name"] for frame in xml_root.findall("SubTexture")],
                ["idle0000", "idle0001", "singLEFT0000"],
            )
            sidecar = json.loads((out / "character-animations.json").read_text(encoding="utf-8"))
            self.assertEqual(sidecar["animations"][1]["anim"], "singLEFT")
            self.assertEqual(sidecar["animations"][1]["fps"], 12)
            self.assertFalse(sidecar["animations"][1]["loop"])

    def test_rejects_atlas_rectangle_outside_bounds(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            manifest = self.make_manifest(root, {
                "idle": [{"x": 120, "y": 0, "w": 32, "h": 32}]
            })
            with self.assertRaisesRegex(ValueError, "exceeds atlas bounds"):
                convert(manifest, root / "out")

    def test_rejects_png_size_mismatch(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            manifest = self.make_manifest(root)
            write_test_png(root / "sprite-sheet-alpha.png", 64, 64)
            with self.assertRaisesRegex(ValueError, "does not match PNG"):
                convert(manifest, root / "out")

    def test_parses_explicit_state_mappings(self):
        self.assertEqual(
            parse_mappings(["idle=idle", "left=singLEFT"]),
            {"idle": "idle", "left": "singLEFT"},
        )
        with self.assertRaisesRegex(ValueError, "expected STATE=PREFIX"):
            parse_mappings(["singLEFT"])

    def test_rejects_duplicate_generated_prefixes(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            manifest = self.make_manifest(root)
            with self.assertRaisesRegex(ValueError, "Duplicate generated frame name"):
                convert(manifest, root / "out", {"left": "idle"})


if __name__ == "__main__":
    unittest.main()
