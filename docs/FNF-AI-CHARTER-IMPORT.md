# Import a chart from FNF AI Charter

The FNF AI Charter project can analyze `Inst.ogg` and character voice stems in the browser, then export a Psych Engine 0.6.3 chart JSON. This repository provides a dependency-free adapter for that exported JSON.

Upstream project: https://github.com/franciscomanriquezlinux/FNF-AI-Charter

## Workflow

1. Open FNF AI Charter and load the song's `Inst.ogg`, `Voices-Opponent.ogg` and `Voices-Player.ogg` files.
2. Generate the chart. Local audio analysis detects note timing; optional Gemini refinement chooses lanes and singer ownership.
3. Download the **Psych 0.6.3** chart JSON.
4. Make sure its BPM matches the target mod spec.
5. Run:

```powershell
node src/pipeline/import-chart.mjs examples/school-party.spec.json .\school-party.json build
```

The result is written to:

```text
build/fnf-corruption/mods/fnf-corruption/data/school-party/school-party.json
```

The adapter preserves section timing, lane values, sustain lengths and `mustHitSection`. It applies the target spec's song ID, character IDs, girlfriend ID and stage name. It rejects BPM mismatches and malformed note data rather than silently exporting a chart that may drift out of sync.

## Limitations

- It does not call Gemini or upload audio.
- It does not generate the instrumental or voice stems.
- It does not generate character sprites, animations, stages, Lua scripts or events.
- It does not launch Psych Engine or claim runtime compatibility has been tested.
- It does not copy or vendor upstream FNF AI Charter code. The upstream repository currently has no visible license file; use its hosted tool independently and export the chart JSON.

## Tests

Run the built-in Node.js tests (no extra package install required):

```powershell
node --test tests/import-chart.test.mjs
```
