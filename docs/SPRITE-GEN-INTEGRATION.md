# sprite-gen bridge: integration status

## Why this project is being considered

[aldegad/sprite-gen](https://github.com/aldegad/sprite-gen) is a general-purpose AI-assisted 2D game-sprite pipeline, not an FNF mod generator. Its upstream documentation describes a workflow that starts from one approved character image, generates pose rows with an image provider, extracts transparent frames, composes an atlas plus `manifest.json.frame_layout`, and creates an animation preview. It also has a video-to-loop route.

Upstream inspected for this integration:
- Version in `SKILL.md` and `pyproject.toml`: **4.3.0**.
- Latest inspected commit: **2026-11-07**, commit `35a27e1`.
- License: **Apache-2.0**.
- Runtime: Python **3.11+**, Pillow and NumPy; image/video providers are external. Some motion/video paths require FFmpeg, Node, `img2webp`, and optional RIFE. This is not a good fit for the project's low-memory local PC as a full local generation stack; run the model/provider pipeline on a suitable remote machine or use a compatible hosted provider.
- Upstream explicitly says the runtime consumes `manifest.json.frame_layout`; it does not claim native Psych Engine Sparrow XML export.

## What this repository adds

`tools/fnf_modder/check_sprite_gen.py` is a **read-only preflight adapter**. It:
1. locates the `sprite-gen` executable (PATH, `SPRITE_GEN_BIN`, or `--sprite-gen`);
2. checks the CLI responds to `--help`;
3. invokes the upstream documented read-only command `sprite-gen workflow --kind sprite`;
4. records only decision-relevant workflow fields in JSON;
5. does not generate assets, change provider settings, expose environment variables, or write into a mod folder.

Run from the repository root:

```powershell
py tools/fnf_modder/check_sprite_gen.py --out reports/sprite-gen-preflight.json
```

If the executable is not on PATH:

```powershell
py tools/fnf_modder/check_sprite_gen.py --sprite-gen "C:\\Tools\\sprite-gen\\Scripts\\sprite-gen.exe"
```

Exit codes:
- `0`: upstream workflow says `ready` (this is not proof that assets have been generated or tested in FNF);
- `1`: upstream workflow says `needs-input`;
- `2`: not installed or blocked;
- `3`: CLI/preflight error.

## Integration boundary and next implementation step

The intended FNF path is:

`character brief → sprite-gen base + pose generation → transparent frames + atlas/manifest → FNF adapter → Sparrow PNG/XML + character JSON → preview → Psych Engine 0.6.3 test`.

The bridge in this commit deliberately stops at preflight. Before implementing atlas-to-Sparrow conversion, the actual upstream output schema and a generated sample run must be inspected. The converter must map animation labels to Psych Engine prefixes (for example `idle`, `singLEFT`, `singDOWN`, `singUP`, `singRIGHT`), preserve frame rectangles and offsets, and validate the resulting XML/PNG pair. Do not assume `frame_layout` alone contains all per-frame coordinates or animation naming data.

The following are **not implemented by this bridge**:
- generating a character image or animation;
- music composition or vocal generation;
- note chart generation;
- stages, Lua scripts, events, cutscenes, or week data;
- launching Psych Engine or computer-use testing;
- packaging a complete playable mod.

The separate FNF chart pipeline and chart importer remain responsible for chart data. This integration does not copy upstream source code; it calls the upstream CLI as an optional external dependency.
