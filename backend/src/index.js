import express from 'express';
import cors from 'cors';
import { getState, logAudit, getOrCreateConversation, addTerminalCommand } from './state.js';
import { checkPermission, getPermissions, updatePermission } from './permissions.js';
import {
  listProjects, createProject, openProject, deleteProject,
  getProjectTree, readProjectFile, writeProjectFile, getEngines, validateProject,
} from './project.js';
import { createTask, getAllTasks, getTask, addTaskStep, updateTask, updateTaskStep, getAgentStatuses } from './tasks.js';
import { getAllAgents, getAgent, Orchestrator } from './agents.js';
import { TOOL_DEFINITIONS, executeTool } from './tools.js';
import { getConfig, updateConfig, isConfigured, chatCompletion } from './ai.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ─── Health ───
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', aiConfigured: isConfigured() });
});

// ─── Chat (SSE streaming) ───
app.post('/api/chat/stream', async (req, res) => {
  const { message, sessionId = 'default', project = null } = req.body;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const send = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const conversation = getOrCreateConversation(sessionId);
    conversation.messages.push({ role: 'user', content: message });

    // If AI is not configured, return helpful message
    if (!isConfigured()) {
      send({ type: 'error', message: 'AI provider not configured. Please set your API key in Settings → AI Provider.' });
      send({ type: 'done' });
      res.end();
      return;
    }

    // Check if this is a project creation request — trigger orchestrator
    const orchestrationTriggers = /create|make|build|generate|mod|corruption|mod/i;
    const shouldOrchestrate = message.length > 10 && orchestrationTriggers.test(message) && message.toLowerCase().includes('mod');

    if (shouldOrchestrate) {
      // Run orchestrator
      const orchestrator = new Orchestrator();

      // Check if project needs to be created
      let projectName = project;
      if (!projectName) {
        // Try to extract a name from the message
        const nameMatch = message.match(/(?:mod|called|named)\s+(\w+)/i);
        projectName = nameMatch ? nameMatch[1].toLowerCase() + '-mod' : 'new-mod';
        try {
          createProject(projectName, 'psych-0.6.3');
          send({ type: 'info', message: `Created project: ${projectName}` });
        } catch {
          // Project may already exist — that's fine
        }
      }

      for await (const event of orchestrator.run(message, projectName)) {
        send(event);
      }

      conversation.messages.push({ role: 'assistant', content: 'Orchestration complete. See task list for details.' });
    } else {
      // Regular chat with tool calling
      const config = getConfig();
      const messages = [
        {
          role: 'system',
          content: `You are FNFAI-REAL-MODS, an AI assistant for creating Friday Night Funkin' mods.
You help users plan, create, and manage FNF mod projects. You can create projects, generate files, and run commands.
Be helpful, technical, and specific. When a user asks to create a mod, provide a detailed plan.
If tools are available, use them to perform real actions (create files, run commands, etc.).`,
        },
        ...conversation.messages.slice(-20), // Keep last 20 messages for context
      ];

      let fullResponse = '';
      const toolCalls = [];

      for await (const event of chatCompletion(messages, TOOL_DEFINITIONS)) {
        if (event.type === 'text') {
          fullResponse += event.content;
          send({ type: 'text', content: event.content });
        } else if (event.type === 'tool_call') {
          toolCalls.push(event);
          send({ type: 'tool_call', id: event.id, name: event.name, arguments: event.arguments });
        } else if (event.type === 'error') {
          send(event);
          break;
        } else if (event.type === 'done') {
          break;
        }
      }

      // Execute any tool calls
      if (toolCalls.length > 0) {
        for (const tc of toolCalls) {
          let args = {};
          try { args = JSON.parse(tc.arguments); } catch {}

          if (project && !args.project) args.project = project;

          const perm = checkPermission(tc.name);
          if (!perm.allowed) {
            send({ type: 'tool_result', tool: tc.name, result: perm, requiresConfirmation: perm.level === 'confirm' });
            continue;
          }

          const result = await executeTool(tc.name, args);
          send({ type: 'tool_result', tool: tc.name, result });
        }
      }

      if (fullResponse) {
        conversation.messages.push({ role: 'assistant', content: fullResponse });
      }
    }

    send({ type: 'done' });
  } catch (error) {
    send({ type: 'error', message: error.message });
    send({ type: 'done' });
  }

  res.end();
});

// ─── Projects ───
app.get('/api/projects', (req, res) => {
  res.json(listProjects());
});

app.post('/api/projects', (req, res) => {
  try {
    const { name, engine = 'psych-0.6.3' } = req.body;
    res.json(createProject(name, engine));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/projects/:name', (req, res) => {
  try {
    res.json(openProject(req.params.name));
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

app.delete('/api/projects/:name', (req, res) => {
  try {
    res.json(deleteProject(req.params.name));
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

app.get('/api/projects/:name/tree', (req, res) => {
  try {
    res.json(getProjectTree(req.params.name, req.query.subdir || ''));
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

app.get('/api/projects/:name/files/*', (req, res) => {
  try {
    const filePath = req.params[0];
    res.json({ path: filePath, content: readProjectFile(req.params.name, filePath) });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

app.post('/api/projects/:name/files', (req, res) => {
  try {
    const { path: relPath, content } = req.body;
    res.json(writeProjectFile(req.params.name, relPath, content));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/projects/:name/validate', (req, res) => {
  try {
    res.json(validateProject(req.params.name));
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// ─── Engines ───
app.get('/api/engines', (req, res) => {
  res.json(getEngines());
});

// ─── Agents ───
app.get('/api/agents', (req, res) => {
  res.json(getAllAgents());
});

app.get('/api/agents/:id', (req, res) => {
  const agent = getAgent(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json(agent);
});

app.get('/api/agents/status/all', (req, res) => {
  res.json(getAgentStatuses());
});

// ─── Tasks ───
app.get('/api/tasks', (req, res) => {
  res.json(getAllTasks());
});

app.get('/api/tasks/:id', (req, res) => {
  const task = getTask(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

// ─── Tools ───
app.get('/api/tools', (req, res) => {
  res.json(TOOL_DEFINITIONS);
});

app.post('/api/tools/execute', async (req, res) => {
  const { name, args } = req.body;
  const result = await executeTool(name, args);
  res.json(result);
});

// ─── Terminal ───
app.post('/api/terminal/run', async (req, res) => {
  const { command, cwd } = req.body;
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    const PROJECTS_DIR = process.env.PROJECTS_DIR || '/app/projects';
    const workingDir = cwd ? `${PROJECTS_DIR}/${cwd}` : PROJECTS_DIR;

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: workingDir,
        timeout: 30000,
        maxBuffer: 1024 * 1024,
      });
      const output = (stdout || '') + (stderr ? '\n[stderr]\n' + stderr : '');
      addTerminalCommand(command, output, 0);
      res.json({ command, output, exitCode: 0 });
    } catch (error) {
      const output = (error.stdout || '') + (error.stderr ? '\n[stderr]\n' + error.stderr : '') + '\n' + error.message;
      addTerminalCommand(command, output, error.code || 1);
      res.json({ command, output, exitCode: error.code || 1 });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/terminal/history', (req, res) => {
  res.json(getState().terminalHistory);
});

// ─── Permissions ───
app.get('/api/permissions', (req, res) => {
  res.json(getPermissions());
});

app.put('/api/permissions', (req, res) => {
  const { key, level } = req.body;
  updatePermission(key, level);
  res.json(getPermissions());
});

// ─── Computer Agent ───
app.get('/api/computer/state', (req, res) => {
  res.json(getState().computerAgent);
});

app.post('/api/computer/agent/stop', (req, res) => {
  getState().computerAgent.running = false;
  getState().computerAgent.paused = false;
  res.json({ running: false, stopped: true });
});

app.post('/api/computer/agent/pause', (req, res) => {
  getState().computerAgent.paused = true;
  res.json({ paused: true });
});

app.post('/api/computer/agent/resume', (req, res) => {
  getState().computerAgent.paused = false;
  res.json({ paused: false });
});

// ─── Audit Log ───
app.get('/api/audit', (req, res) => {
  res.json(getState().auditLog.slice(-100).reverse());
});

// ─── AI Config ───
app.get('/api/ai/config', (req, res) => {
  const config = getConfig();
  // Don't expose the full key
  res.json({
    configured: isConfigured(),
    model: config.model,
    baseUrl: config.baseUrl,
    keyPresent: !!config.apiKey,
  });
});

app.put('/api/ai/config', (req, res) => {
  const { apiKey, baseUrl, model } = req.body;
  const updates = {};
  if (apiKey !== undefined) updates.apiKey = apiKey;
  if (baseUrl) updates.baseUrl = baseUrl;
  if (model) updates.model = model;
  updateConfig(updates);
  logAudit('ai_config_update', { fields: Object.keys(updates) });
  res.json({ success: true, configured: isConfigured() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`FNFAI backend running on port ${PORT}`);
  console.log(`AI configured: ${isConfigured()}`);
});
