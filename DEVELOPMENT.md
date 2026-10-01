# DEVELOPMENT — FNFAI-REAL-MODS V1

## Project Structure
```
fnf-ai-mods/
├── docker-compose.base44.yml   # Docker Compose configuration
├── .base44/environment.json     # Platform metadata
├── backend/
│   ├── package.json
│   └── src/
│       ├── index.js             # Express server + routes
│       ├── state.js             # In-memory state store
│       ├── ai.js                # AI provider abstraction
│       ├── agents.js            # Agent definitions + orchestrator
│       ├── tools.js             # Tool system (file, terminal, computer)
│       ├── permissions.js       # Permission manager
│       ├── project.js           # Project manager + engine adapters
│       └── tasks.js             # Task system
├── frontend/
│   ├── package.json
│   ├── vite.config.ts           # Vite config with API proxy
│   ├── index.html
│   └── src/
│       ├── main.tsx             # Entry point
│       ├── App.tsx              # Main app + sidebar navigation
│       ├── api.ts               # API client
│       ├── types.ts             # TypeScript types
│       ├── styles.css           # Dark theme styles
│       └── components/          # 9 tab view components
│           ├── ChatView.tsx
│           ├── ComputerView.tsx
│           ├── ProjectView.tsx
│           ├── AssetsView.tsx
│           ├── AgentsView.tsx
│           ├── TasksView.tsx
│           ├── TerminalView.tsx
│           ├── TestView.tsx
│           └── SettingsView.tsx
```

## Development Workflow

### Running Locally
```bash
docker compose -f docker-compose.base44.yml up -d
```
Both frontend and backend have live reload enabled:
- Frontend: Vite HMR (changes appear instantly)
- Backend: Nodemon (auto-restarts on file changes)

### Adding a New Agent
1. Add agent definition in `backend/src/agents.js` (AGENTS array)
2. Specify: id, name, icon, description, systemPrompt, tools
3. The agent will appear automatically in the Agents tab and orchestrator flow

### Adding a New Tool
1. Add tool definition in `backend/src/tools.js` (TOOL_DEFINITIONS array)
2. Add permission mapping in `backend/src/permissions.js` (TOOL_PERMISSIONS)
3. Implement the tool handler in `executeTool()` function
4. Add tool name to desired agents' `tools` array in `agents.js`

### Adding a New Engine Adapter
1. Add engine definition in `backend/src/project.js` (ENGINES object)
2. Specify: name, directory structure, file types
3. The engine will appear in the project creation dropdown

## Coding Conventions
- Backend: Plain JavaScript (ES modules), Express patterns
- Frontend: TypeScript, React functional components with hooks
- Styling: CSS classes in `styles.css`, no CSS-in-JS
- API calls: All go through the `api` object in `frontend/src/api.ts`
- No hardcoded API keys — use Settings or environment variables

## Testing
```bash
# Check backend health
curl http://localhost:3000/api/health

# List agents
curl http://localhost:3000/api/agents

# Create a project
curl -X POST http://localhost:3000/api/projects \
  -H 'Content-Type: application/json' \
  -d '{"name":"test","engine":"psych-0.6.3"}'
```
