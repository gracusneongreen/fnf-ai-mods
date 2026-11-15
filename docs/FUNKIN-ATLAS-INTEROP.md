# Funkin Atlas character-workflow interoperability

## Project reviewed

- Repository: https://github.com/vesant14-lang/Funkin-Atlas---FML-Tool
- Latest inspected release: Atlas Builder 1.5, published 4 October 2026.
- Latest inspected commit: `25b3f011a843a215a7881c5a5dfb999d37a497f5` (4 October 2026).
- Platform: portable Windows x64 application.
- Implementation visible in the source archive: native C++ application using SDL3, OpenGL and Dear ImGui; source is distributed in the repository's `source/` folder / Developer archive.
- License: MIT for application-authored code. Bundled dependencies retain their own licenses; mod artwork opened by the app is not relicensed.

## What it actually does

Funkin Atlas is a real FNF asset inspection and editing tool, not an AI generator or a game engine. It can:

- inspect characters, animation sequences, spritesheets and stage layers from Psych Engine, Codename Engine and V-Slice mods;
- preview character animations and create/save custom poses;
- use a song/chart to drive animation previews and save note/idle animation presets;
- build texture atlases from numbered PNGs, Sparrow/Packer atlases, Adobe Animate folders and resolved character poses;
- edit frame order, repeats, FPS, looping, offsets and manually selected regions;
- export Sparrow PNG/XML or Animate PNG/JSON, including multi-page output.

It does **not** generate art with an AI model, create a complete character definition, generate scripts/shaders/gameplay, execute mod scripts, or test gameplay mechanics. Its own guide explicitly describes Atlas Builder as a texture builder rather than a game engine.

## Relevance and compatibility decision

This is the most useful new character-animation tool found in this search, but it is a supporting editor, not the AI core. It is a good optional upstream GUI for the character-art stage of our pipeline.

Important target constraint: our project targets Psych Engine 0.6.3. Atlas Builder can export Sparrow PNG/XML, but multi-page character output is documented as requiring Psych Engine 1.x `Paths.getMultiAtlas`; older Psych builds are not compatible. For our current target, export a **single-page Sparrow atlas** and validate it before import. Even a valid XML/PNG pair still needs a real in-engine test.

Suggested pipeline:

1. AI image/animation provider or user artwork creates frames.
2. Funkin Atlas Atlas Builder orders frames, sets animation names/FPS/offsets and exports a single-page Sparrow PNG/XML.
3. Our `validate_sparrow_export.py` performs a read-only structural preflight.
4. A later importer maps validated prefixes and offsets into a Psych Engine 0.6.3 character definition.
5. A separate computer-use runner launches Psych Engine, selects the character/song, captures evidence and checks runtime behavior.

## Repository structure inspected

The public repository includes `source/ModExplorer/src/main.cpp`, `source/ModExplorer/src/AtlasBuilder.hpp`, `source/ModExplorer/src/StageAssetViewer.hpp`, `source/build.bat`, the advanced Atlas Builder guide, and third-party notices. The main application wires the Atlas Builder and stage viewer into a native SDL3/OpenGL/ImGui desktop application. The guide documents a separate editable `.fmlatlas` project format and Sparrow PNG/XML export.

The app's source is openly licensed under MIT, but this integration does not copy upstream source or bundle its binary. The user can run it as an external editor; our project only consumes its standard image/XML outputs.

## What was built in this branch

- Added `tools/fnf_modder/validate_sparrow_export.py`, a Python 3.10+ standard-library-only, read-only validator.
- It checks the Sparrow XML root, imagePath, PNG signature and dimensions, frame names, duplicate names, frame rectangles and image bounds. It can also require prefixes such as `idle`, `singLEFT`, `singDOWN`, `singUP`, and `singRIGHT`.
- Added this interoperability note.

The validator does not create sprites, edit source files, generate Psych character JSON, launch the game or claim runtime compatibility. It has been added to the GitHub branch, but has **not** been executed locally in this session and no FNF runtime test has been performed.
