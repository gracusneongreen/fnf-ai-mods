import { getState, logAudit } from './state.js';

// Permission levels: 'allow', 'confirm', 'block'
export const PERMISSION_LEVELS = {
  ALLOW: 'allow',
  CONFIRM: 'confirm',
  BLOCK: 'block',
};

// Tool -> required permission mapping
export const TOOL_PERMISSIONS = {
  read_file: 'READ_PROJECT_FILES',
  write_file: 'WRITE_PROJECT_FILES',
  list_directory: 'READ_PROJECT_FILES',
  create_directory: 'WRITE_PROJECT_FILES',
  search_files: 'READ_PROJECT_FILES',
  delete_file: 'DELETE_FILES',
  run_command: 'RUN_PROJECT',
  open_application: 'OPEN_DEVELOPMENT_APPS',
  start_process: 'RUN_PROJECT',
  stop_process: 'RUN_PROJECT',
  read_process_output: 'READ_PROJECT_FILES',
  get_screen: 'SCREEN_CAPTURE',
  mouse_move: 'MOUSE',
  mouse_click: 'MOUSE',
  keyboard_type: 'KEYBOARD',
  keyboard_press: 'KEYBOARD',
  install_software: 'INSTALL_SOFTWARE',
  system_settings: 'SYSTEM_SETTINGS',
};

export function checkPermission(toolName) {
  const state = getState();
  const permKey = TOOL_PERMISSIONS[toolName];

  if (!permKey) {
    // Unknown tool - block by default
    return { allowed: false, level: 'block', reason: 'Unknown tool' };
  }

  const level = state.permissions[permKey] || 'block';

  if (level === 'allow') {
    logAudit('permission_check', { tool: toolName, permission: permKey, result: 'allowed' });
    return { allowed: true, level: 'allow' };
  }

  if (level === 'confirm') {
    logAudit('permission_check', { tool: toolName, permission: permKey, result: 'confirm_required' });
    return { allowed: false, level: 'confirm', reason: `Requires confirmation: ${permKey}`, permission: permKey };
  }

  logAudit('permission_check', { tool: toolName, permission: permKey, result: 'blocked' });
  return { allowed: false, level: 'block', reason: `Blocked by permission: ${permKey}` };
}

export function updatePermission(key, level) {
  const state = getState();
  state.permissions[key] = level;
  logAudit('permission_update', { key, level });
}

export function getPermissions() {
  return getState().permissions;
}
