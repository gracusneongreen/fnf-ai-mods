import fs from 'fs';
import path from 'path';
import { logAudit } from './state.js';

const PROJECTS_DIR = process.env.PROJECTS_DIR || '/app/projects';

// Engine adapters
const ENGINES = {
  'psych-0.6.3': {
    name: 'Psych Engine 0.6.3',
    structure: {
      'assets/characters': 'Character sprite sheets and XML data',
      'assets/stages': 'Stage backgrounds and props',
      'assets/images': 'General images and UI',
      'assets/songs': 'Song audio files (Inst.ogg, Voices.ogg)',
      'assets/sounds': 'Sound effects',
      'assets/shaders': 'Fragment and vertex shaders (.frag)',
      'data/charts': 'Chart files (JSON format)',
      'data/events': 'Event definitions',
      'data/weeks': 'Week definitions (weekX.json)',
      'data/dialogues': 'Dialogue files',
      'scripts': 'Lua/Haxe scripts',
      'cutscenes': 'Cutscene data',
      'stages': 'Stage configuration Lua',
      'characters': 'Character configuration',
      'shaders': 'Shader configuration',
      'logs': 'Build and test logs',
    },
    fileTypes: {
      chart: '.json',
      character: '.json + .png + .xml',
      stage: '.lua',
      shader: '.frag',
      script: '.lua',
      week: '.json',
    },
  },
  'psych-0.7.x': {
    name: 'Psych Engine 0.7.x',
    structure: {
      'assets/characters': 'Character data (JSON + sprites)',
      'assets/stages': 'Stage backgrounds',
      'assets/images': 'UI and general images',
      'assets/songs': 'Audio files',
      'assets/sounds': 'Sound effects',
      'assets/shaders': 'Shader files',
      'data/charts': 'Chart data',
      'data/events': 'Event data',
      'data/weeks': 'Week data',
      'data/dialogues': 'Dialogue data',
      'scripts': 'Lua scripts',
      'cutscenes': 'Cutscene scripts',
      'logs': 'Logs',
    },
    fileTypes: {
      chart: '.json',
      character: '.json',
      stage: '.lua',
      shader: '.frag',
      script: '.lua',
      week: '.json',
    },
  },
  'custom': {
    name: 'Custom Engine',
    structure: {
      'assets': 'All assets',
      'data': 'All data files',
      'scripts': 'All scripts',
      'logs': 'Logs',
    },
    fileTypes: {},
  },
};

export function listProjects() {
  ensureProjectsDir();
  const entries = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => {
      const projectPath = path.join(PROJECTS_DIR, e.name);
      const projectJsonPath = path.join(projectPath, 'project.json');
      let meta = { name: e.name, created: null, engine: 'psych-0.6.3' };
      if (fs.existsSync(projectJsonPath)) {
        try {
          meta = { ...meta, ...JSON.parse(fs.readFileSync(projectJsonPath, 'utf8')) };
        } catch {}
      }
      return { name: e.name, path: projectPath, ...meta };
    });
}

export function createProject(name, engine = 'psych-0.6.3') {
  ensureProjectsDir();
  const projectPath = path.join(PROJECTS_DIR, name);
  if (fs.existsSync(projectPath)) {
    throw new Error(`Project "${name}" already exists`);
  }

  const adapter = ENGINES[engine] || ENGINES['psych-0.6.3'];

  // Create directory structure
  for (const dir of Object.keys(adapter.structure)) {
    const dirPath = path.join(projectPath, dir);
    fs.mkdirSync(dirPath, { recursive: true });
    // Add a .gitkeep to preserve empty dirs
    fs.writeFileSync(path.join(dirPath, '.gitkeep'), '');
  }

  // Create project.json
  const projectJson = {
    name,
    engine,
    engineName: adapter.name,
    created: new Date().toISOString(),
    version: '1.0.0',
    description: '',
    weeks: [],
    songs: [],
    characters: [],
    stages: [],
  };
  fs.writeFileSync(path.join(projectPath, 'project.json'), JSON.stringify(projectJson, null, 2));

  logAudit('project_create', { name, engine, path: projectPath });
  return { name, path: projectPath, ...projectJson };
}

export function openProject(name) {
  const projectPath = path.join(PROJECTS_DIR, name);
  if (!fs.existsSync(projectPath)) {
    throw new Error(`Project "${name}" not found`);
  }
  const projectJsonPath = path.join(projectPath, 'project.json');
  let meta = { name, path: projectPath };
  if (fs.existsSync(projectJsonPath)) {
    meta = { ...meta, ...JSON.parse(fs.readFileSync(projectJsonPath, 'utf8')) };
  }
  logAudit('project_open', { name, path: projectPath });
  return meta;
}

export function deleteProject(name) {
  const projectPath = path.join(PROJECTS_DIR, name);
  if (!fs.existsSync(projectPath)) {
    throw new Error(`Project "${name}" not found`);
  }
  fs.rmSync(projectPath, { recursive: true, force: true });
  logAudit('project_delete', { name, path: projectPath });
  return { name, deleted: true };
}

export function getProjectTree(name, subdir = '') {
  const projectPath = path.join(PROJECTS_DIR, name);
  const targetPath = path.join(projectPath, subdir);
  if (!fs.existsSync(targetPath)) {
    return [];
  }
  return buildTree(targetPath, projectPath);
}

function buildTree(currentPath, rootPath, depth = 0, maxDepth = 5) {
  const entries = fs.readdirSync(currentPath, { withFileTypes: true });
  const tree = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.gitkeep') continue;
    const relativePath = path.relative(rootPath, path.join(currentPath, entry.name));
    const node = {
      name: entry.name,
      path: relativePath,
      type: entry.isDirectory() ? 'dir' : 'file',
    };
    if (entry.isDirectory() && depth < maxDepth) {
      node.children = buildTree(path.join(currentPath, entry.name), rootPath, depth + 1, maxDepth);
    }
    tree.push(node);
  }
  return tree;
}

export function readProjectFile(name, relativePath) {
  const filePath = path.join(PROJECTS_DIR, name, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${relativePath}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

export function writeProjectFile(name, relativePath, content) {
  const filePath = path.join(PROJECTS_DIR, name, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
  logAudit('file_write', { project: name, path: relativePath });
  return { path: relativePath, written: true };
}

export function getEngines() {
  return Object.entries(ENGINES).map(([id, adapter]) => ({
    id,
    name: adapter.name,
    structure: adapter.structure,
    fileTypes: adapter.fileTypes,
  }));
}

export function validateProject(name) {
  const projectPath = path.join(PROJECTS_DIR, name);
  if (!fs.existsSync(projectPath)) {
    throw new Error(`Project "${name}" not found`);
  }
  const projectJsonPath = path.join(projectPath, 'project.json');
  const issues = [];

  if (!fs.existsSync(projectJsonPath)) {
    issues.push({ severity: 'error', message: 'Missing project.json' });
  } else {
    try {
      const pj = JSON.parse(fs.readFileSync(projectJsonPath, 'utf8'));
      if (!pj.name) issues.push({ severity: 'warning', message: 'project.json missing name field' });
      if (!pj.engine) issues.push({ severity: 'warning', message: 'project.json missing engine field' });
    } catch (e) {
      issues.push({ severity: 'error', message: `Invalid project.json: ${e.message}` });
    }
  }

  // Check essential directories
  const essentialDirs = ['assets', 'data'];
  for (const dir of essentialDirs) {
    if (!fs.existsSync(path.join(projectPath, dir))) {
      issues.push({ severity: 'warning', message: `Missing directory: ${dir}/` });
    }
  }

  return { name, valid: issues.filter((i) => i.severity === 'error').length === 0, issues };
}

function ensureProjectsDir() {
  if (!fs.existsSync(PROJECTS_DIR)) {
    fs.mkdirSync(PROJECTS_DIR, { recursive: true });
  }
}
