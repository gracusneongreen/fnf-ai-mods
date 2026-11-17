# FNF Sprite Studio → Psych Engine 0.6.3 import bridge

This bridge imports the ZIP produced by [FNF Sprite Studio](https://github.com/dancaabrilse12-afk/fnf-sprite-studio) into a Psych Engine mod's character-image folder.

## Upstream project

FNF Sprite Studio is a browser-based, **non-AI** asset utility. It packs user-supplied frames into a PNG atlas and Sparrow XML, supports animated backgrounds and icon sheets, and runs locally in the browser. Its repository declares MIT. This bridge does not copy upstream source.

## Import

The upstream tool exports a ZIP containing one PNG and one XML file. Run from this repository root:

    python tools/fnf_modder/import_sprite_studio_export.py "C:\path\hero-spritesheet.zip" --mod-root "C:\Games\PsychEngine\mods\MyMod" --character "hero"

The importer validates ZIP paths, PNG signature/dimensions, Sparrow XML, imagePath, duplicate frame names and frame bounds. It writes:

- `mods/MyMod/images/characters/hero.png`
- `mods/MyMod/images/characters/hero.xml`

It refuses to overwrite existing files unless `--overwrite` is supplied. Back up the mod before using that option.

## Tests

    python -m unittest tests.test_sprite_studio_import -v

## Limits

- **This is not AI generation.** Sprite Studio only assembles frames supplied by the user.
- The bridge does not generate artwork or animation frames, infer offsets, or create Psych Engine's `characters/hero.json`.
- It reports animation prefixes (for example `idle` and `singLEFT`) for the next pipeline stage.
- Structural checks do not prove that the character loads in Psych Engine 0.6.3. A real game launch and in-engine test are still required.
