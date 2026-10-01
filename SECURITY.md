# SECURITY — FNFAI-REAL-MODS V1

## Permission Model

All AI tools pass through the Permission Manager before execution:

| Permission | Default | Description |
|---|---|---|
| READ_PROJECT_FILES | ALLOW | Read files in project |
| WRITE_PROJECT_FILES | ALLOW | Write files in project |
| RUN_PROJECT | ALLOW | Execute project commands |
| OPEN_DEVELOPMENT_APPS | ALLOW | Open external applications |
| MOUSE | ALLOW | Mouse control |
| KEYBOARD | ALLOW | Keyboard control |
| SCREEN_CAPTURE | ALLOW | Screen capture |
| DELETE_FILES | CONFIRM | Delete files (requires approval) |
| INSTALL_SOFTWARE | CONFIRM | Install packages (requires approval) |
| SYSTEM_SETTINGS | BLOCK | System configuration (blocked) |
| ADMINISTRATOR_ACTIONS | BLOCK | Admin operations (blocked) |

## Safety Features

### Tool Allowlist
Only predefined tools can be called by AI. No arbitrary code execution outside the tool framework.

### Confirmation System
Operations marked as "confirm" require explicit user approval before execution. The UI shows exactly what the AI wants to do.

### Emergency Stop
The Computer Agent can be stopped at any time via the Stop Agent button. This immediately halts the agent loop.

### Audit Log
All tool executions, permission checks, and agent actions are logged with timestamps. Viewable in Settings → Audit Log.

### Timeout & Cancellation
- Terminal commands have a 30-second timeout
- Agent tool calling loops have a maximum of 10 iterations
- Agent can be paused/resumed/stopped at any time

## API Key Security
- AI API keys are stored in memory only (runtime state)
- Keys are never written to disk or logged
- The `/api/ai/config` endpoint never returns the key — only whether one is present
- On the Base44 platform, keys are delivered via encrypted env file at `/run/base44/app.env`

## Computer Use
On this Linux sandbox platform, computer-use tools (screen capture, mouse, keyboard) run in SIMULATION mode and clearly indicate this. On a real Windows 11 deployment, these would use actual system APIs with full permission controls.
