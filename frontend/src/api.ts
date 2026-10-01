const API_BASE = import.meta.env.VITE_API_BASE || '/api';

async function fetchJSON(url: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export const api = {
  health: () => fetchJSON('/health'),

  // Chat
  chatStream: (message: string, sessionId: string, project: string | null) => {
    return fetch(`${API_BASE}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, sessionId, project }),
    });
  },

  // Projects
  listProjects: () => fetchJSON('/projects'),
  createProject: (name: string, engine: string) =>
    fetchJSON('/projects', { method: 'POST', body: JSON.stringify({ name, engine }) }),
  openProject: (name: string) => fetchJSON(`/projects/${name}`),
  deleteProject: (name: string) => fetchJSON(`/projects/${name}`, { method: 'DELETE' }),
  getProjectTree: (name: string, subdir?: string) =>
    fetchJSON(`/projects/${name}/tree${subdir ? `?subdir=${subdir}` : ''}`),
  readFile: (name: string, path: string) => fetchJSON(`/projects/${name}/files/${path}`),
  writeFile: (name: string, path: string, content: string) =>
    fetchJSON(`/projects/${name}/files`, { method: 'POST', body: JSON.stringify({ path, content }) }),
  validateProject: (name: string) => fetchJSON(`/projects/${name}/validate`, { method: 'POST' }),

  // Engines
  getEngines: () => fetchJSON('/engines'),

  // Agents
  getAgents: () => fetchJSON('/agents'),
  getAgentStatuses: () => fetchJSON('/agents/status/all'),

  // Tasks
  getTasks: () => fetchJSON('/tasks'),
  getTask: (id: string) => fetchJSON(`/tasks/${id}`),

  // Tools
  getTools: () => fetchJSON('/tools'),
  executeTool: (name: string, args: any) =>
    fetchJSON('/tools/execute', { method: 'POST', body: JSON.stringify({ name, args }) }),

  // Terminal
  runTerminal: (command: string, cwd?: string) =>
    fetchJSON('/terminal/run', { method: 'POST', body: JSON.stringify({ command, cwd }) }),
  getTerminalHistory: () => fetchJSON('/terminal/history'),

  // Permissions
  getPermissions: () => fetchJSON('/permissions'),
  updatePermission: (key: string, level: string) =>
    fetchJSON('/permissions', { method: 'PUT', body: JSON.stringify({ key, level }) }),

  // Computer
  getComputerState: () => fetchJSON('/computer/state'),
  stopAgent: () => fetchJSON('/computer/agent/stop', { method: 'POST' }),
  pauseAgent: () => fetchJSON('/computer/agent/pause', { method: 'POST' }),
  resumeAgent: () => fetchJSON('/computer/agent/resume', { method: 'POST' }),

  // Audit
  getAudit: () => fetchJSON('/audit'),

  // AI Config
  getAIConfig: () => fetchJSON('/ai/config'),
  updateAIConfig: (config: { apiKey?: string; baseUrl?: string; model?: string }) =>
    fetchJSON('/ai/config', { method: 'PUT', body: JSON.stringify(config) }),
};
