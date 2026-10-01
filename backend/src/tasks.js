import { getState, logAudit } from './state.js';

export function createTask(title, description = '', agentId = null) {
  const state = getState();
  const id = `TASK-${String(++state.taskCounter).padStart(3, '0')}`;
  const task = {
    id,
    title,
    description,
    agentId,
    status: 'QUEUED',
    steps: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    result: null,
  };
  state.tasks.set(id, task);
  logAudit('task_create', { id, title });
  return task;
}

export function updateTask(id, updates) {
  const state = getState();
  const task = state.tasks.get(id);
  if (!task) return null;
  Object.assign(task, updates, { updatedAt: new Date().toISOString() });
  return task;
}

export function addTaskStep(id, label, status = 'pending') {
  const state = getState();
  const task = state.tasks.get(id);
  if (!task) return null;
  const step = { id: task.steps.length + 1, label, status };
  task.steps.push(step);
  task.updatedAt = new Date().toISOString();
  return step;
}

export function updateTaskStep(id, stepIndex, status) {
  const state = getState();
  const task = state.tasks.get(id);
  if (!task) return null;
  const step = task.steps[stepIndex];
  if (step) step.status = status;
  task.updatedAt = new Date().toISOString();
  return step;
}

export function getTask(id) {
  return getState().tasks.get(id);
}

export function getAllTasks() {
  return Array.from(getState().tasks.values());
}

export function getAgentStatuses() {
  return getState().agentStatuses;
}

export function setAgentStatus(agentId, status, details = null) {
  const state = getState();
  state.agentStatuses[agentId] = { status, details, timestamp: new Date().toISOString() };
}
