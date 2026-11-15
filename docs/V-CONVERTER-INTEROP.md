# V-Converter interoperability research

## Project reviewed

Repository: https://github.com/BrenninhoTools/V-Converter
License: MIT (verified from the repository LICENSE file)
Latest inspected commit: 2026-11-14, `c1c386db66472e7bff1f683ebd0b13d9fd300869`
Implementation: Kotlin + Jetpack Compose; shared Android/JVM source under `app/src/main/java`, desktop module under `desktop/`, Gradle multi-module build.
Targets documented by upstream: Windows, Android, Linux, macOS and iOS.

## What it actually does

V-Converter is an FNF mod conversion and authoring/editor application. Its documented functionality includes:
- whole-mod conversion among Psych Engine, V-Slice, Codename Engine and NightmareVision, with FPS Plus as an additional target;
- chart editing with audio playback, BPM changes, notes, holds, events, difficulties and playtest;
- character editor for spritesheets, animations and offsets;
- stage editor, week editor and script generation;
- ZIP export or writing results into a mod folder.

The project says it was written with Claude-assisted "vibe coding". That describes how the application was developed; it is not an in-app AI model or an AI mod-generation service.

## Relevance to this generator

V-Converter is **not** a replacement for the AI planner, sprite generator, audio/chart generator or computer-use agent. It is a useful optional downstream editor/converter and a reference for the kinds of editing and validation screens a full generator should eventually provide.

Potential workflow:
1. Our AI pipeline creates a Psych Engine 0.6.3 mod workspace.
2. Our own validators inspect the files and create a report.
3. A human can open the workspace in V-Converter for manual chart/character/stage editing and playtest where supported.
4. Our pipeline re-inspects the changed files and packages the final Psych mod.

## Integration decision

- Do not embed V-Converter source or claim a direct API integration: the reviewed README/build files document a desktop/mobile UI and Gradle modules, not a stable automation API or command-line interface.
- Do not use it as a dependency in the low-memory local runtime. It is a full Kotlin/Compose desktop application.
- Do not silently convert the user's Psych 0.6.3 output to another engine. Psych 0.6.3 remains our target.
- Use V-Converter as an optional external GUI tool for human review, not as an unattended test runner. The user's computer-use workflow must separately launch Psych Engine, operate it, capture evidence and inspect runtime results.

## Repository structure inspected

- `settings.gradle.kts`: Gradle includes `:app` and `:desktop` modules, with iOS included on macOS when selected.
- `build.gradle.kts`: root Gradle plugin declarations.
- `desktop/build.gradle.kts`: Kotlin/JVM desktop target, JVM 17, Compose desktop packaging; reuses shared code from `app/src/main/java`.
- `README.md`: feature matrix, supported conversion directions, generator/editor functions and release/build instructions.
- `LICENSE`: MIT.

## What was changed here

This file records the verified interoperability research and the integration boundary. No V-Converter source code was copied or modified, no external repository was written to, and no executable was installed or run. No FNF mod was converted or runtime-tested as part of this research.
