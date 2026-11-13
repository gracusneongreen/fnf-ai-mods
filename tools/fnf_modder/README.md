# FNF Modder utilities

## Project inspector v0.1

A read-only Psych Engine mod-folder scanner. It uses only the Python standard library and runs on Windows,
macOS and Linux with Python 3.10+.

PowerShell example:

    py tools/fnf_modder/inspect_project.py "C:\Games\PsychEngine\mods" --out "reports\fnf-project.json"

You can also pass one mod folder instead of the whole mods directory:

    py tools/fnf_modder/inspect_project.py "C:\Games\PsychEngine\mods\MyMod"

The JSON report inventories PNG/XML/JSON/OGG/Lua files, finds chart JSON under data/, extracts BPM and note
counts when possible, lists character and stage assets, and reports likely missing pairs or audio.

### Safety

- Read-only: it never edits, deletes, renames, or launches game files.
- It does not infer that a mod is playable just because its JSON parses.
- It does not prove compatibility with Psych Engine 0.6.3; runtime validation is separate.
