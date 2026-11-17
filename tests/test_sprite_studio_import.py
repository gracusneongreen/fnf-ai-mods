import struct
import tempfile
import unittest
import zipfile
from pathlib import Path

from tools.fnf_modder.import_sprite_studio_export import inspect_sprite_studio_zip, import_export

def fake_png(width=64, height=64):
    return b"\x89PNG\r\n\x1a\n" + b"\x00\x00\x00\rIHDR" + struct.pack(">II", width, height) + b"\x08\x06\x00\x00\x00"

def valid_xml(image="hero.png"):
    return f'<TextureAtlas imagePath="{image}"><SubTexture name="idle0000" x="0" y="0" width="20" height="30"/><SubTexture name="singLEFT0000" x="20" y="0" width="20" height="30"/></TextureAtlas>'

class SpriteStudioImportTests(unittest.TestCase):
    def make_zip(self, root, png=None, xml=None):
        path = root / "hero-spritesheet.zip"
        with zipfile.ZipFile(path, "w") as archive:
            archive.writestr("hero.png", png if png is not None else fake_png())
            archive.writestr("hero.xml", xml if xml is not None else valid_xml())
        return path

    def test_inspects_valid_export(self):
        with tempfile.TemporaryDirectory() as tmp:
            result = inspect_sprite_studio_zip(self.make_zip(Path(tmp)))
            self.assertEqual(result["frame_count"], 2)
            self.assertEqual(result["animation_prefixes"], ["idle", "singLEFT"])
            self.assertEqual(result["png_dimensions"], [64, 64])

    def test_imports_into_psych_character_folder(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            mod = root / "mods" / "Demo"
            result = import_export(self.make_zip(root), mod, "hero")
            self.assertTrue((mod / "images" / "characters" / "hero.png").is_file())
            self.assertTrue((mod / "images" / "characters" / "hero.xml").is_file())
            self.assertFalse(result["character_json_created"])

    def test_refuses_overwrite_by_default(self):
        with tempfile.TemporaryDirectory() as tmp:
            root, mod = Path(tmp), Path(tmp) / "mods" / "Demo"
            archive = self.make_zip(root)
            import_export(archive, mod, "hero")
            with self.assertRaises(FileExistsError):
                import_export(archive, mod, "hero")

    def test_rejects_xml_png_name_mismatch(self):
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaisesRegex(ValueError, "does not match PNG filename"):
                inspect_sprite_studio_zip(self.make_zip(Path(tmp), xml=valid_xml("other.png")))

    def test_rejects_frame_outside_atlas(self):
        with tempfile.TemporaryDirectory() as tmp:
            xml = '<TextureAtlas imagePath="hero.png"><SubTexture name="idle0000" x="60" y="0" width="10" height="10"/></TextureAtlas>'
            with self.assertRaisesRegex(ValueError, "outside"):
                inspect_sprite_studio_zip(self.make_zip(Path(tmp), xml=xml))

if __name__ == "__main__":
    unittest.main()
