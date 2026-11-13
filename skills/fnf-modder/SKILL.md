---
name: fnf-modder
description: Plan, build, inspect, test and package Friday Night Funkin' mods, especially Psych Engine 0.6.3. Use for characters, sprite animations, stages, songs, charts, Lua scripts or playable ZIPs.
---

# FNF modder workflow

This is the FNF-specific adapter layer for a general AI game-modding workflow. The target is a real Psych
Engine mod, not a generic rhythm-game mockup.

## Default target profile

Unless the user says otherwise:
- Engine: Psych Engine 0.6.3.
- Mod output: mods/<mod-name>/.
- Charts: data/<song-name>/<song-name>-<difficulty>.json; verify exact naming in the target build.
- Audio: songs/<song-name>/Inst.ogg and optional Voices.ogg.
- Character sprites: images/characters/*.png plus Sparrow XML when required.
- Stages: stages/*.json and optional matching Lua stage script.
- Scripts: use only Lua locations and APIs verified for the exact engine build.

Never assume another Psych version or V-Slice has identical formats.

## Required workflow

1. Brief: capture title, premise, engine version, OS, songs, BPM, characters, stages and difficulty.
2. Recon: inspect the installed engine, mod folder, existing assets and known-good charts. Run:
   py tools/fnf_modder/inspect_project.py "<mods-folder>" --out reports/fnf-project.json
3. Safe workspace: work in staging, back up before replacing any file, never overwrite user assets without
   explicit approval and a recoverable backup. Keep API keys out of mods, ZIPs, logs and source control.
4. Mod spec: validate a machine-readable spec for metadata, songs, BPM, characters, stages, assets, events
   and export profile before generation.
5. Character/animation: generate or import poses, inspect silhouette, transparency and facing, pack frames,
   produce Sparrow XML, and preview actual frames. Check idle, singLEFT, singDOWN, singUP and singRIGHT
   when required. XML entries alone do not prove animation quality.
6. Music/chart: keep music generation and chart generation separate. Record audio duration, BPM and sample
   rate. Build charts from audio timing or reviewed note plans. Preserve timestamps, lanes, sustain lengths
   and section ownership when importing existing Psych JSON. Check BPM consistency.
7. Stage/scripts: generate stage JSON, Lua and events only from verified engine APIs. Prefer Lua supported
   by the target build; avoid Haxe injection in mobile-safe builds unless explicitly requested.
8. Real-game test: ask before controlling the user's desktop or focusing the game. Launch the exact engine
   in a safe test profile, load the mod, play each song and inspect screenshots/logs. If desktop automation
   is unavailable, mark runtime testing as unverified.
9. Package: export only the mod folder, not the engine executable or copyrighted base-game assets. Include
   manifest, credits, asset provenance and test report.

## Agent roles

- Mod planner: validated Mod Spec and task graph.
- Asset artist/animator: concepts, poses, frame consistency, atlases and XML.
- Music/chart worker: audio, BPM, notes, vocals and timing checks.
- Engine integrator: stages, Lua, events, paths and compatibility.
- QA/test operator: backups, desktop workflow, runtime tests, screenshots, logs and packaging.

The orchestrator owns the task ledger. Never mark work complete without an artifact or test result.

## Low-resource hardware

Keep the local controller lightweight for Windows PCs with 4 GB RAM and no dedicated GPU. Use standard
library tools for scanning, validation and packaging. Run large image, animation, music or language models
remotely only with the user's approval. Do not silently download multi-gigabyte model weights.
