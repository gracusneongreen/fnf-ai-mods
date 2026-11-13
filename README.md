# FNF AI Mods

An experimental, modular workspace for building Friday Night Funkin' mods with AI assistance.

## Current prototype

The root page is a small **Psych Engine 0.6.3 chart-pack generator**:

- Configure a mod/song name, BPM, duration, difficulty, characters, and stage.
- Generate a deterministic starter chart locally in the browser.
- Preview the chart JSON and export a ZIP with the expected `mods/<mod>/data/<song>/` layout.
- No API key is requested or stored. No server is needed for this prototype.

**Important:** this is not yet a complete AI mod generator. It does not synthesize a finished song, draw character sprites, animate assets, or validate the output inside Psych Engine. Add an `Inst.ogg` file and test the chart in your target engine before treating a package as playable.

## Run

Open `index.html` in a modern browser, or enable GitHub Pages for the repository. ZIP export uses JSZip from a CDN, so internet access is needed for that feature.

## Roadmap

1. Validate/export charts against Psych Engine 0.6.3 fixtures.
2. Add an AI planner through a small local backend (keep provider keys out of exported mods and browser storage).
3. Add asset/character import, animation metadata, stage and event builders.
4. Add optional music-generation adapters and stem/Inst.ogg import.
5. Add sandboxed validation, test launch, and build/export profiles.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the module boundaries and safety requirements.


## FNF agent workflow adapter (new branch)

The branch feat/fnf-agent-workflow-v0.1 adds an FNF-specific AI modding workflow and a read-only project
inspector for Psych Engine mod folders.

Run the inspector with Python 3.10+:

    py tools/fnf_modder/inspect_project.py "C:\Games\PsychEngine\mods" --out "reports\fnf-project.json"

See:
- skills/fnf-modder/SKILL.md for the agent workflow.
- docs/UNIVERSAL-MODDER-FNF-ADAPTER.md for the integration plan.
- tools/fnf_modder/README.md for inspector usage.

This is an initial adapter slice, not a complete AI mod generator. The inspector is read-only and does not
generate assets, create charts, launch Psych Engine or certify runtime compatibility.
