# Anthropic AI Planner adapter (v0.3)

This adapter is the first live-model step in the FNF AI mod pipeline. It is inspired by the useful integration pattern found in [FunkinAI](https://github.com/Funkin-Programming/FunkinAI): a native FNF assistant sends a prompt to the Anthropic Messages API. This implementation is separate and runs as a Node.js CLI, then hands a validated JSON spec to the existing deterministic builder.

## Requirements

- Node.js 18+ (uses built-in `fetch`)
- An Anthropic API key and an API model enabled for your account
- Existing pipeline branch with `src/pipeline/generate-mod.mjs`

## Windows PowerShell

```powershell
$env:ANTHROPIC_API_KEY = "YOUR_KEY"
$env:ANTHROPIC_MODEL = "YOUR_AVAILABLE_ANTHROPIC_MODEL"
$env:FNF_SPEC_OUT = "examples/generated.spec.json"

node src/ai/plan-mod.mjs "Create a dark corruption mod: Gracjan becomes infected during a school party, 150 BPM, 3 minutes, Hard difficulty."
node src/pipeline/generate-mod.mjs examples/generated.spec.json build
```

The key stays in the current process environment; the planner never writes it into the generated spec or exported mod.

## Scope and safety

- The model creates a **mod planning spec**, not finished audio, graphics, animations, Lua, or a playable chart.
- The returned JSON is parsed and checked before it is written.
- The existing deterministic builder still creates the chart skeleton and metadata. Its chart notes are procedural, not AI-composed.
- No AI-generated code is executed. No computer-use game launch/test workflow is implemented yet.
- The adapter requires an Anthropic account/API key; it does not bundle a model or run offline.

## Why this adapter

The inspected [FunkinAI](https://github.com/Funkin-Programming/FunkinAI) project is a real in-game FNF chat assistant using Anthropic's Messages API, but its visible system prompt focuses on FNF Q&A and it does not generate complete mods. This adapter reuses the provider/API approach as a separate planning stage while keeping actual file creation deterministic and testable.
