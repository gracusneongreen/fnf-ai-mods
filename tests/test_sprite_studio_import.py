import struct, tempfile, unittest, zipfile
from pathlib import Path
from tools.fnf_modder.import_sprite_studio_export import inspect_zip, import_export

def png():
    return b"\x89PNG\r\n\x1a\n" + b"\x00\x00\x00\rIHDR" + struct.pack(">II", 64, 64) + b"\x08\x06\x00\x00\x00"

def xml(image="hero.png"):
    return f'<TextureAtlas imagePath="{image}"><SubTexture name="idle0000" x="0" y="0" width="20" height="30"/><SubTexture name="singLEFT0000" x="20" y="0" width="20" height="30"/></TextureAtlas>'

def make_zip(root, xml_text=None):
    path = root / "hero-spritesheet.zip"
    with zipfile.ZipFile(path, "w") as z:
        z.writestr("hero.png", png())
        z.writestr("hero.xml", xml_text if xml_text is not None else xml())
    return path

class SpriteStudioImportTests(unittest.TestCase):
    def test_valid_export_reports_frames_and_prefixes(self):
        with tempfile.TemporaryDirectory() as tmp:
            result = inspect_zip(make_zip(Path(tmp)))
            self.assertEqual(result["frames"], 2)
            self.assertEqual(result["prefixes"], ["idle", "singLEFT"])
            self.assertEqual(result["dimensions"], [64, 64])

    def test_imports_into_mod_character_folder(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); mod = root / "mods" / "Demo"
            result = import_export(make_zip(root), mod, "hero")
            self.assertTrue((mod / "images/characters/hero.png").is_file())
            self.assertTrue((mod / "images/characters/hero.xml").is_file())
            self.assertFalse(result["character_json_created"])

    def test_refuses_overwrite_by_default(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); archive = make_zip(root); mod = root / "mods/Demo"
            import_export(archive, mod, "hero")
            with self.assertRaises(FileExistsError):
                import_export(archive, mod, "hero")

    def test_rejects_png_xml_name_mismatch(self):
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaisesRegex(ValueError, "imagePath"):
                inspect_zip(make_zip(Path(tmp), xml("other.png")))

    def test_rejects_out_of_bounds_frame(self):
        with tempfile.TemporaryDirectory() as tmp:
            bad = '<TextureAtlas imagePath="hero.png"><SubTexture name="idle0000" x="60" y="0" width="10" height="10"/></TextureAtlas>'
            with self.assertRaisesRegex(ValueError, "outside"):
                inspect_zip(make_zip(Path(tmp), bad))

if __name__ == "__main__":
    unittest.main()
