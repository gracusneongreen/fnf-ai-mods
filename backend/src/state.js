// In-memory state store for the application
// Persists for the lifetime of the server process

const state = {
  // Chat conversation history (per session)
  conversations: new Map(),

  // Active and completed tasks
  tasks: new Map(),
  taskCounter: 0,

  // Agent statuses
  agentStatuses: {},

  // Terminal command history
  terminalHistory: [],

  // Audit log for all actions
  auditLog: [],

  // Permission settings (overridable by user)
  permissions: {
    READ_PROJECT_FILES: 'allow',
    WRITE_PROJECT_FILES: 'allow',
    RUN_PROJECT: 'allow',
    OPEN_DEVELOPMENT_APPS: 'allow',
    MOUSE: 'allow',
    KEYBOARD: 'allow',
    SCREEN_CAPTURE: 'allow',
    DELETE_FILES: 'confirm',
    INSTALL_SOFTWARE: 'confirm',
    SYSTEM_SETTINGS: 'block',
    ADMINISTRATOR_ACTIONS: 'block',
  },

  // AI provider config (runtime override of env)
  aiConfig: {
    apiKey: process.env.AI_API_KEY || '',
    baseUrl: process.env.AI_API_BASE_URL || 'https://api.openai.com/v1',
    model: process.env.AI_MODEL || 'gpt-4o',
  },

  // Active project (path to current project)
  activeProject: null,

  // Computer agent state
  computerAgent: {
    running: false,
    paused: false,
    screenData: null,
    lastAction: null,
  },

  // Agent loop state
  agentLoop: {
    active: false,
    currentStep: null,
    steps: [],
  },
};

export function getState() {
  return state;
}

export function logAudit(action, details = {}) {
  state.auditLog.push({
    timestamp: new Date().toISOString(),
    action,
    details,
  });
  // Keep last 500 entries
  if (state.auditLog.length > 500) {
    state.auditLog.shift();
  }
}

export function getOrCreateConversation(sessionId) {
  if (!state.conversations.has(sessionId)) {
    state.conversations.set(sessionId, { messages: [], created: Date.now() });
  }
  return state.conversations.get(sessionId);
}

export function addTerminalCommand(command, output, exitCode) {
  state.terminalHistory.push({
    timestamp: new Date().toISOString(),
    command,
    output,
    exitCode,
  });
  if (state.terminalHistory.length > 200) {
    state.terminalHistory.shift();
  }
}
