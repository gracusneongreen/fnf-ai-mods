# ARCHITECTURE — FNFAI-REAL-MODS V1

## System Overview

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)             │
│  ┌──────┬──────┬──────┬──────┬──────┬──────┬──────┐ │
│  │ CHAT │COMPUTER│PROJECT│ASSETS│AGENTS│TASKS │TERM  │ │
│  └──┬───┴──────┴──────┴──────┴──────┴──────┴──────┘ │
│     │ TEST │ SETTINGS                               │
│     └──┬──┴──────────────────────────────────────────  │
│        │ /api/* (Vite proxy)                          │
└────────┼────────────────────────────────────────────┘
         ▼
┌─────────────────────────────────────────────────────┐
│                  BACKEND (Express + Node.js)          │
│                                                       │
│  ┌─────────┐  ┌──────────┐  ┌────────────────────┐  │
│  │ Routes  │→ │ AI Provider│→ │ Agent Orchestrator│  │
│  │         │  │ (OpenAI   │  │  (12 Agents)       │  │
│  │ /chat   │  │  compat)  │  │                    │  │
│  │ /project│  │           │  │  Director → Story   │  │
│  │ /tools  │  │ Streaming │  │  → Draw → ...       │  │
│  │ /agents │  │ + Tools   │  │  → Builder         │  │
│  │ /tasks  │  └──────────┘  └─────────┬──────────┘  │
│  │ /terminal│                          │              │
│  │ /computer│                          ▼              │
│  └─────────┘  ┌──────────────────────────────────┐   │
│               │ Tool System (Permission-checked)   │   │
│               │ read_file, write_file, run_command │   │
│               │ get_screen, mouse_click, keyboard  │   │
│               └──────────────────────────────────┘   │
│                                                       │
│  ┌────────────┐  ┌──────────┐  ┌────────────────┐   │
│  │ Project Mgr│  │ Tasks Mgr │  │ Permissions Mgr │   │
│  │ + Adapters │  │           │  │ (allow/confirm/ │   │
│  │            │  │           │  │  block)         │   │
│  └────────────┘  └──────────┘  └────────────────┘   │
└─────────────────────────────────────────────────────┘
```

## Data Flow

### Chat Flow
1. User sends message in Chat tab
2. Frontend POSTs to `/api/chat/stream` (SSE)
3. Backend checks if message triggers orchestration (contains "mod" + action verb)
4. If orchestration: Director creates plan → agents execute in sequence
5. If regular chat: AI responds with text + tool calls
6. Tool calls are permission-checked, executed, results fed back
7. All events streamed to frontend via SSE

### Agent Orchestration
```
User Request → Director (plan) → [Story → Draw → Animation → Music →
Chart → Stage → Code → Cutscene → Shader → Tester → Builder]
```
Only agents needed for the task are activated. Each agent uses tools to perform real work.

## Key Components

### AI Provider (`backend/src/ai.js`)
- OpenAI-compatible API abstraction
- Streaming via SSE
- Tool/function calling support
- Runtime-configurable (key, URL, model)

### Agent System (`backend/src/agents.js`)
- 12 specialized agents, each with system prompt and tool access
- Orchestrator creates plans and delegates to agents
- Tool calling loop with max iterations

### Tool System (`backend/src/tools.js`)
- File operations (read, write, list, search, create)
- Command execution
- Computer use (screen, mouse, keyboard — SIMULATION on Linux)
- All tools pass through permission checks

### Permission Manager (`backend/src/permissions.js`)
- Per-tool permission levels: allow, confirm, block
- Tool-to-permission mapping
- Audit logging for all checks

### Project Manager (`backend/src/project.js`)
- Create/open/delete/validate projects
- File tree generation
- Engine adapters (Psych 0.6.3, 0.7.x, Custom)
- Project structure follows engine-specific format
