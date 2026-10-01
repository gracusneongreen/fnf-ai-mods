# AGENTS.md — FNFAI-REAL-MODS V1

## Overview
FNFAI-REAL-MODS is a full-stack web application for creating Friday Night Funkin' mods with AI assistance. It features an AI chat with tool calling, a multi-agent orchestrator, project management, terminal, permission system, and computer-use agent capabilities.

## Tech Stack
- **Frontend**: React 18 + Vite 5 + TypeScript (port 5173, exposed on host port 3000)
- **Backend**: Node.js 20 + Express 4 (port 3001, internal only — accessed via Vite proxy)
- **Runtime**: Docker Compose with `node:20-slim` base images, bind-mounted source

## Architecture
- Frontend proxies `/api/*` to the backend via Vite's dev proxy (`http://backend:3001`)
- Backend is an Express server with REST endpoints + SSE streaming for chat
- AI provider abstraction supports OpenAI-compatible APIs (OpenAI, Azure, local LLMs)
- 12 specialized agents orchestrated by a Director agent
- Tool system with permission checks (allow/confirm/block per tool)
- Projects stored on a Docker volume (`projects_data`)

## Key Directories
- `backend/src/` — Express server, AI provider, agents, tools, permissions, project manager, tasks
- `frontend/src/` — React app with 9 tab views (Chat, Computer, Project, Assets, Agents, Tasks, Terminal, Test, Settings)

## Running
```bash
docker compose -f docker-compose.base44.yml up -d
```
Frontend: http://localhost:3000
Backend health: http://localhost:3000/api/health

## AI Configuration
The app boots without an API key. To enable AI chat:
1. Go to Settings tab → AI Provider Configuration
2. Enter your API key (OpenAI-compatible), base URL, and model name
3. Or set env vars: `AI_API_KEY`, `AI_API_BASE_URL`, `AI_MODEL`

## Computer Use (Screen/Mouse/Keyboard)
On this Linux sandbox platform, computer-use tools (screen capture, mouse, keyboard) run in SIMULATION mode. On a real Windows 11 deployment, these would use real screen capture and input injection.

## Secrets
- `AI_API_KEY` — API key for AI provider (optional, not required to boot)
- `AI_API_BASE_URL` — Base URL (optional, defaults to OpenAI)
- `AI_MODEL` — Model name (optional, defaults to gpt-4o)

## Health Checks
- Backend: `GET /api/health` — returns `{"status":"ok","aiConfigured":bool}`
- Frontend: HTTP 200 on `/`
