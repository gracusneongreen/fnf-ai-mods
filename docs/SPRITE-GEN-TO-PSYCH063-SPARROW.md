# sprite-gen → Psych Engine 0.6.3 Sparrow export

This adapter converts a completed sprite-gen atlas manifest into:

- `sprite-sheet.xml` — Sparrow `TextureAtlas` XML referencing the existing atlas PNG.
- `character-animations.json` — animation metadata that can be reviewed and merged into a Psych Engine character JSON.

It does **not** generate artwork, create a complete Psych Engine character JSON, infer animation offsets, or launch Psych Engine.

## Why this adapter exists

[`aldegad/sprite-gen`](https://github.com/aldegad/sprite-gen) can generate transparent character frames and a runtime atlas with a machine-readable `manifest.json`. Its documented atlas layout contains:

- `game_input` — atlas PNG path.
- `frame_layout.sheetWidth` / `sheetHeight` — atlas dimensions.
- `frame_layout.rows.<state>[]` — absolute `{x, y, w, h}` frame rectangles.
- `animation.rows.<state>` — FPS, frame durations and loop metadata.

This adapter independently consumes that documented interchange format. It does not copy or import sprite-gen source code. See sprite-gen's [run contract](https://github.com/aldegad/sprite-gen/blob/main/docs/run-contract.md) and [architecture contract](https://github.com/aldegad/sprite-gen/blob/main/docs/architecture.md#8-runtime-contract-manifestjson).

## Requirements

- Python 3.10 or newer.
- No third-party Python packages.
- A completed sprite-gen run containing `manifest.json` and its atlas PNG.

## Example

```powershell
py tools/fnf_modder/convert_sprite_gen_to_sparrow.py `
  "C:\AI\sprites\gracjan\manifest.json" `
  --out-dir "C:\FNF\mods\FNF-Corruption\images\characters\gracjan" `
  --map idle=idle `
  --map sing_left=singLEFT `
  --map sing_down=singDOWN `
  --map sing_up=singUP `
  --map sing_right=singRIGHT
```

The exact state names depend on the sprite-gen request. Map every generated state to the animation prefix expected by your character JSON. The converter does not invent missing poses: if a state is absent, its animation will not appear in the output.

If the atlas path in the manifest is incorrect or the atlas is stored elsewhere, pass `--png` with the correct PNG path.

## Output

```text
<out-dir>/
  sprite-sheet.xml
  character-animations.json
```

The XML uses sequential Sparrow frame names such as `idle0000`, `idle0001`, `singLEFT0000`. The JSON sidecar records `anim`, `name`, `fps`, `loop`, source state and frame count for each animation. The converter does not copy the atlas PNG; copy that PNG into the intended mod asset folder too, or preserve the relative path recorded in `imagePath`.

Psych Engine character JSON also needs project-specific values such as image path, scale, offsets, camera position and health icon. Review and merge the sidecar entries rather than replacing your character JSON wholesale.

## Timing limitations

Sparrow XML stores frame rectangles, not playback timing. Psych Engine animation entries use one FPS value per animation. If sprite-gen records different `durations_ms` for frames in one state, the adapter approximates them with the average FPS and emits a warning. Check timing in the engine.

## Validation boundary

The converter checks:

- manifest structure and required fields;
- atlas PNG signature and dimensions;
- every frame rectangle is positive and inside the atlas;
- state-to-prefix mappings do not create duplicate frame names.

It does not certify Psych Engine runtime compatibility. Run the existing `validate_sparrow_export.py` against the output, then open the character in Psych Engine 0.6.3 and check animation names, offsets, scale, camera position and timing.

## Tests

Run:

```powershell
py -m unittest discover -s tests -p "test_sprite_gen_sparrow_export.py" -v
```

The tests use a tiny synthetic PNG header and synthetic manifest; they do not require sprite-gen, an image-generation provider or Psych Engine.
