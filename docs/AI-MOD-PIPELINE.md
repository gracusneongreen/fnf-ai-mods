# AI Mod Pipeline v0.2

The generator is split into two layers:

1. **AI planner** — produces a validated `FNF AI Mod Spec`.
2. **Deterministic builder** — turns that spec into a reproducible Psych Engine 0.6.3 mod skeleton.

This separation is intentional. The model is allowed to plan content, but file generation is deterministic and testable.

## Pipeline

`prompt -> AI Mod Spec -> validation -> chart/metadata builder -> mod package -> Psych Engine test`

Future adapters can add:

- character PNG/XML import and animation metadata;
- stage JSON/Lua generation;
- event generation;
- music/stem/Inst.ogg adapters;
- sandboxed launch and log collection;
- ZIP packaging.

No API key is stored in the exported mod.

## Local run

```powershell
node src/pipeline/generate-mod.mjs examples/school-party.spec.json build
```

The generated package is written under:

`build/FNF-Corruption/`

The current builder creates a real JSON chart skeleton and mod metadata; it does **not** synthesize audio or graphics and does not claim that the result is playable until tested in Psych Engine 0.6.3.
