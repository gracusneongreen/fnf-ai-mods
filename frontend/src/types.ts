export interface Project {
  name: string
  path: string
  engine?: string
  engineName?: string
  created?: string
  version?: string
  description?: string
}

export interface Agent {
  id: string
  name: string
  icon: string
  description: string
  tools: string[]
}

export interface AgentStatus {
  status: string
  details?: string | null
  timestamp: string
}

export interface Task {
  id: string
  title: string
  description: string
  agentId: string | null
  status: 'QUEUED' | 'RUNNING' | 'WAITING_FOR_USER' | 'SUCCESS' | 'FAILED' | 'CANCELLED'
  steps: TaskStep[]
  createdAt: string
  updatedAt: string
  result: string | null
}

export interface TaskStep {
  id: number
  label: string
  status: 'pending' | 'running' | 'success' | 'failed'
}

export interface FileNode {
  name: string
  path: string
  type: 'dir' | 'file'
  children?: FileNode[]
}

export interface TerminalEntry {
  timestamp: string
  command: string
  output: string
  exitCode: number
}

export interface ChatEvent {
  type: 'text' | 'tool_call' | 'tool_result' | 'error' | 'done' | 'info' | 'plan' | 'agent_start' | 'agent_done' | 'agent_error' | 'task_created' | 'task_complete' | 'task_step_update' | 'orchestration_done'
  content?: string
  message?: string
  name?: string
  arguments?: string
  result?: any
  agentId?: string
  agentName?: string
  icon?: string
  plan?: any
  task?: Task
  taskId?: string
  status?: string
  stepIndex?: number
  requiresConfirmation?: boolean
}

export interface AIConfig {
  configured: boolean
  model: string
  baseUrl: string
  keyPresent: boolean
}

export interface Permissions {
  [key: string]: 'allow' | 'confirm' | 'block'
}

export interface AuditEntry {
  timestamp: string
  action: string
  details: any
}
