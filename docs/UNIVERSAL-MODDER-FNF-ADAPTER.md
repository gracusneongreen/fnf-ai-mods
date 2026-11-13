# Universal Modder to FNF adapter

## Why this integration

rehan-remade/universal-modder is a general AI game-modding toolkit under the MIT license. Its documented
capabilities include agent skills and role-based workers, game recon, safe backups, Windows game launch and
input automation, screenshots, generated art/audio, asset conversion, real-game verification and packaging.

It is not an FNF generator and does not currently ship a Psych Engine playbook. This repository adds an
FNF-specific workflow rather than claiming upstream already understands Psych Engine.

Upstream: https://github.com/rehan-remade/universal-modder
License: MIT. No upstream source code has been copied in this initial adapter; the workflow is based on
documented public capabilities. If upstream code is copied later, preserve its MIT copyright notice.

## Initial implementation

- skills/fnf-modder/SKILL.md: FNF-specific agent workflow and target file formats.
- tools/fnf_modder/inspect_project.py: read-only, dependency-free Psych mod-folder scanner.
- tools/fnf_modder/README.md: usage and safety notes.

## Integration map

| Upstream capability | FNF adapter responsibility |
|---|---|
| Game recon | Inspect Psych version, mod folder, assets and charts |
| Asset generation | Character concepts, backgrounds, SFX and music |
| Sprite pipeline | Cut out, fit, pack frames and produce Sparrow XML |
| Windows automation | Launch Psych, load a test mod, capture screenshots and read logs |
| Agent workers | Planner, artist/animator, music/chart worker, engine integrator, QA |
| Packaging | Validate mod tree, credits, provenance, manifest and ZIP |

## Next vertical slices

1. JSON Schema validation for the FNF Mod Spec and Psych 0.6.3 chart fixtures.
2. Character asset importer that checks PNG/XML animation names and frame references.
3. Audio analyzer/importer for Inst.ogg, BPM and duration metadata.
4. Safe Windows test runner with explicit confirmation before desktop control.
5. Reproducible ZIP exporter and runtime test report.

## Limits

The current inspector is read-only and structural; it does not launch Psych Engine or generate assets.
External generation services may cost money and require API keys. Ask before using them.
A parsed chart or matching PNG/XML pair is not proof that a mod plays correctly. Runtime verification requires
the user's actual engine build and permission to control the desktop.
