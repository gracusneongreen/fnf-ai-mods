import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { checkPermission } from './permissions.js';
import { getState, logAudit } from './state.js';

const execAsync = promisify(exec);
const PROJECTS_DIR = process.env.PROJECTS_DIR || '/app/projects';

// Tool definitions (for AI function calling)
export const TOOL_DEFINITIONS = [
  {
    name: 'read_file',
    description: 'Read the contents of a file in the current project',
    parameters: {
      type: 'object',
      properties: {
        project: { type: 'string', description: 'Project name' },
        path: { type: 'string', description: 'Relative file path within the project' },
      },
      required: ['project', 'path'],
    },
  },
  {
    name: 'write_file',
    description: 'Write content to a file in the current project',
    parameters: {
      type: 'object',
      properties: {
        project: { type: 'string', description: 'Project name' },
        path: { type: 'string', description: 'Relative file path within the project' },
        content: { type: 'string', description: 'File content to write' },
      },
      required: ['project', 'path', 'content'],
    },
  },
  {
    name: 'list_directory',
    description: 'List files and directories in a project path',
    parameters: {
      type: 'object',
      properties: {
        project: { type: 'string', description: 'Project name' },
        path: { type: 'string', description: 'Relative directory path (empty for root)', default: '' },
      },
      required: ['project'],
    },
  },
  {
    name: 'create_directory',
    description: 'Create a new directory in the project',
    parameters: {
      type: 'object',
      properties: {
        project: { type: 'string', description: 'Project name' },
        path: { type: 'string', description: 'Relative directory path to create' },
      },
      required: ['project', 'path'],
    },
  },
  {
    name: 'search_files',
    description: 'Search for files matching a pattern in the project',
    parameters: {
      type: 'object',
      properties: {
        project: { type: 'string', description: 'Project name' },
        pattern: { type: 'string', description: 'Glob pattern or search term' },
      },
      required: ['project', 'pattern'],
    },
  },
  {
    name: 'run_command',
    description: 'Execute a shell command in the project directory. Use for building, testing, and development tasks.',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'The shell command to execute' },
        cwd: { type: 'string', description: 'Working directory (project name or path)', default: '' },
      },
      required: ['command'],
    },
  },
  {
    name: 'get_screen',
    description: 'Capture the current screen (Windows 11 desktop). Returns a description of visible content.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'mouse_click',
    description: 'Click the mouse at specified screen coordinates',
    parameters: {
      type: 'object',
      properties: {
        x: { type: 'number', description: 'X coordinate' },
        y: { type: 'number', description: 'Y coordinate' },
        button: { type: 'string', enum: ['left', 'right', 'middle'], default: 'left' },
      },
      required: ['x', 'y'],
    },
  },
  {
    name: 'keyboard_type',
    description: 'Type text via keyboard',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Text to type' },
      },
      required: ['text'],
    },
  },
];

// Execute a tool by name with given arguments
export async function executeTool(name, args) {
  // Permission check
  const perm = checkPermission(name);
  if (!perm.allowed) {
    logAudit('tool_blocked', { name, args, reason: perm.reason });
    return {
      success: false,
      error: perm.reason,
      requiresConfirmation: perm.level === 'confirm',
      permission: perm.permission,
    };
  }

  logAudit('tool_execute', { name, args });

  try {
    switch (name) {
      case 'read_file':
        return await readFile(args);
      case 'write_file':
        return await writeFile(args);
      case 'list_directory':
        return await listDirectory(args);
      case 'create_directory':
        return await createDirectory(args);
      case 'search_files':
        return await searchFiles(args);
      case 'run_command':
        return await runCommand(args);
      case 'get_screen':
        return await getScreen();
      case 'mouse_click':
        return await mouseClick(args);
      case 'keyboard_type':
        return await keyboardType(args);
      default:
        return { success: false, error: `Unknown tool: ${name}` };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function readFile({ project, path: relPath }) {
  const filePath = path.join(PROJECTS_DIR, project, relPath);
  if (!fs.existsSync(filePath)) return { success: false, error: `File not found: ${relPath}` };
  const content = fs.readFileSync(filePath, 'utf8');
  return { success: true, result: content };
}

async function writeFile({ project, path: relPath, content }) {
  const filePath = path.join(PROJECTS_DIR, project, relPath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
  return { success: true, result: `Written: ${relPath}` };
}

async function listDirectory({ project, path: relPath = '' }) {
  const dirPath = path.join(PROJECTS_DIR, project, relPath);
  if (!fs.existsSync(dirPath)) return { success: false, error: `Directory not found: ${relPath}` };
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const items = entries
    .filter((e) => !e.name.startsWith('.'))
    .map((e) => ({ name: e.name, type: e.isDirectory() ? 'dir' : 'file' }));
  return { success: true, result: JSON.stringify(items) };
}

async function createDirectory({ project, path: relPath }) {
  const dirPath = path.join(PROJECTS_DIR, project, relPath);
  fs.mkdirSync(dirPath, { recursive: true });
  return { success: true, result: `Created directory: ${relPath}` };
}

async function searchFiles({ project, pattern }) {
  const projectPath = path.join(PROJECTS_DIR, project);
  if (!fs.existsSync(projectPath)) return { success: false, error: 'Project not found' };
  const results = [];
  function search(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.name.toLowerCase().includes(pattern.toLowerCase())) {
        results.push(path.relative(projectPath, fullPath));
      }
      if (entry.isDirectory()) search(fullPath);
    }
  }
  search(projectPath);
  return { success: true, result: JSON.stringify(results) };
}

async function runCommand({ command, cwd = '' }) {
  const workingDir = cwd ? path.join(PROJECTS_DIR, cwd) : PROJECTS_DIR;
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: workingDir,
      timeout: 30000,
      maxBuffer: 1024 * 1024,
    });
    return { success: true, result: stdout, stderr: stderr || '' };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      stdout: error.stdout || '',
      stderr: error.stderr || '',
      exitCode: error.code,
    };
  }
}

// Computer use tools — SIMULATION on this platform (Linux sandbox, not Windows 11)
// On a real Windows 11 deployment these would use real screen capture + input injection

async function getScreen() {
  const state = getState();
  // SIMULATION: Return a placeholder screen description
  // Real implementation would use screen capture (e.g. PowerShell + .NET on Windows)
  const screenInfo = {
    simulation: true,
    message: 'Screen capture is SIMULATION on this platform. On Windows 11, this captures the real desktop.',
    resolution: '1920x1080',
    timestamp: new Date().toISOString(),
    visibleWindows: [],
  };
  state.computerAgent.screenData = screenInfo;
  return { success: true, result: JSON.stringify(screenInfo), simulation: true };
}

async function mouseClick({ x, y, button = 'left' }) {
  const state = getState();
  state.computerAgent.lastAction = { type: 'mouse_click', x, y, button, timestamp: new Date().toISOString() };
  // SIMULATION
  return {
    success: true,
    result: `SIMULATION: Clicked ${button} button at (${x}, ${y})`,
    simulation: true,
  };
}

async function keyboardType({ text }) {
  const state = getState();
  state.computerAgent.lastAction = { type: 'keyboard_type', text, timestamp: new Date().toISOString() };
  // SIMULATION
  return {
    success: true,
    result: `SIMULATION: Typed "${text}"`,
    simulation: true,
  };
}
