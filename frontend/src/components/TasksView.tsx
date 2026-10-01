import { useState, useEffect } from 'react'
import { api } from '../api'
import { Task } from '../types'

interface Props {
  refreshKey: number
}

export default function TasksView({ refreshKey }: Props) {
  const [tasks, setTasks] = useState<Task[]>([])

  useEffect(() => {
    const load = async () => {
      try { setTasks(await api.getTasks()) } catch {}
    }
    load()
    const interval = setInterval(load, 2000)
    return () => clearInterval(interval)
  }, [refreshKey])

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      QUEUED: 'badge-queued', RUNNING: 'badge-running', SUCCESS: 'badge-success',
      FAILED: 'badge-failed', CANCELLED: 'badge-cancelled', WAITING_FOR_USER: 'badge-waiting',
    }
    return <span className={`badge ${map[status] || 'badge-queued'}`}>{status}</span>
  }

  return (
    <div>
      <h3 style={{ fontSize: 14, marginBottom: 16 }}>Task System</h3>
      {tasks.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📋</div>
          <h3>No Tasks</h3>
          <p className="text-muted mt-12">Tasks are created when AI agents work on your mod. Send a message in the Chat tab to get started.</p>
        </div>
      ) : (
        tasks.slice().reverse().map(task => (
          <div key={task.id} className="task-card">
            <div className="header">
              <div className="flex" style={{ alignItems: 'center', gap: 4 }}>
                <span className="id">{task.id}</span>
                <span className="title">{task.title}</span>
              </div>
              {statusBadge(task.status)}
            </div>
            {task.description && <div className="text-xs text-muted mb-12">{task.description}</div>}
            {task.steps.length > 0 && (
              <div className="task-steps">
                {task.steps.map((step, i) => (
                  <div key={i} className="task-step">
                    <span className="check">
                      {step.status === 'success' ? '✓' : step.status === 'running' ? '→' : step.status === 'failed' ? '✗' : '○'}
                    </span>
                    <span style={{ color: step.status === 'success' ? 'var(--success)' : step.status === 'failed' ? 'var(--danger)' : 'inherit' }}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}
