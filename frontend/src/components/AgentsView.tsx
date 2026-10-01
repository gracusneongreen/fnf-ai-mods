import { useState, useEffect } from 'react'
import { api } from '../api'
import { Agent, AgentStatus } from '../types'

interface Props {
  agents: Agent[]
  refreshKey: number
}

export default function AgentsView({ agents, refreshKey }: Props) {
  const [statuses, setStatuses] = useState<Record<string, AgentStatus>>({})

  useEffect(() => {
    const load = async () => {
      try { setStatuses(await api.getAgentStatuses()) } catch {}
    }
    load()
    const interval = setInterval(load, 2000)
    return () => clearInterval(interval)
  }, [refreshKey])

  const flowOrder = ['director', 'story', 'draw', 'animation', 'music', 'chart', 'stage', 'code', 'cutscene', 'shader', 'tester', 'builder']

  return (
    <div>
      <h3 style={{ fontSize: 14, marginBottom: 16 }}>FNF Agent Orchestrator</h3>

      {/* Flow visualization */}
      <div className="agent-flow mb-12">
        {flowOrder.map((id, i) => {
          const agent = agents.find(a => a.id === id)
          if (!agent) return null
          const status = statuses[id]
          return (
            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className={`agent-flow-node ${status?.status === 'running' ? 'active' : status?.status === 'idle' ? 'done' : ''}`}>
                {agent.icon} {agent.name}
              </div>
              {i < flowOrder.length - 1 && <span className="agent-flow-arrow">↓</span>}
            </div>
          )
        })}
      </div>

      {/* Agent grid */}
      <div className="agent-grid">
        {agents.map(agent => {
          const status = statuses[agent.id]
          return (
            <div key={agent.id} className="agent-card">
              <div className="header">
                <span className="icon">{agent.icon}</span>
                <span className="name">{agent.name}</span>
              </div>
              <div className="desc">{agent.description}</div>
              <div className="tools">
                {agent.tools.map(t => <span key={t} className="tool-badge">{t}</span>)}
              </div>
              <div className="status">
                {status?.status === 'running' && <span className="badge badge-running">RUNNING</span>}
                {status?.status === 'idle' && <span className="badge badge-success">IDLE</span>}
                {status?.status === 'error' && <span className="badge badge-failed">ERROR</span>}
                {!status && <span className="badge badge-queued">READY</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
