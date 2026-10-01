# FNFAI-REAL-MODS V1 — Real FNF AI Mod Studio

A professional AI development studio for creating Friday Night Funkin' mods. Features AI chat with tool calling, a multi-agent orchestrator, project management, terminal, permission system, and computer-use agent capabilities.

## Features

- **AI Chat** — Stream-based conversation with AI, tool calling, and orchestration
- **Computer Agent** — Screen capture, mouse, keyboard control (SIMULATION on Linux, real on Windows 11)
- **Project Manager** — Create, open, validate, and manage FNF mod projects
- **12 Specialized Agents** — Director, Story, Draw, Animation, Music, Chart, Stage, Code, Cutscene, Shader, Tester, Builder
- **Agent Orchestrator** — Coordinates agents in an intelligent workflow pipeline
- **Permission System** — Per-tool allow/confirm/block controls
- **Task System** — Track AI tasks with steps and statuses
- **Terminal** — Real command execution with logging
- **Engine Adapters** — Psych Engine 0.6.3, 0.7.x, and Custom Engine support
- **Tool System** — Real file operations, command execution, and computer control
- **Audit Log** — Full audit trail of all actions

## Quick Start

### Docker Compose (Recommended)
```bash
docker compose -f docker-compose.base44.yml up -d
```
The app will be available at http://localhost:3000.

### Windows 11 Setup
1. Install Docker Desktop for Windows
2. Clone this repository
3. Run `docker compose -f docker-compose.base44.yml up -d`
4. Open http://localhost:3000 in your browser
5. Go to Settings → AI Provider Configuration and enter your API key
6. Start creating mods in the Chat tab

## AI Provider Configuration
The app supports any OpenAI-compatible API:
- **OpenAI**: API key from platform.openai.com, model: gpt-4o
- **Azure OpenAI**: Custom base URL and model deployment name
- **Local LLMs** (Ollama, LM Studio): Base URL http://localhost:11434/v1

Configure via Settings tab or environment variables:
- `AI_API_KEY` — Your API key
- `AI_API_BASE_URL` — API endpoint (default: https://api.openai.com/v1)
- `AI_MODEL` — Model name (default: gpt-4o)

## Architecture
See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed architecture documentation.

## Security
See [SECURITY.md](SECURITY.md) for security model and best practices.

## Development
See [DEVELOPMENT.md](DEVELOPMENT.md) for development setup and contribution guide.
