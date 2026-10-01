import { useState, useEffect } from 'react'
import { api } from '../api'

export default function ComputerView() {
  const [running, setRunning] = useState(false)
  const [paused, setPaused] = useState(false)
  const [lastAction, setLastAction] = useState<string | null>(null)
  const [screenData, setScreenData] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])

  const fetchState = async () => {
    try {
      const state = await api.getComputerState()
      setRunning(state.running)
      setPaused(state.paused)
      if (state.lastAction) {
        setLastAction(`${state.lastAction.type} at ${state.lastAction.timestamp}`)
      }
      if (state.screenData) {
        setScreenData(JSON.stringify(state.screenData, null, 2))
      }
    } catch {}
  }

  useEffect(() => {
    fetchState()
    const interval = setInterval(fetchState, 3000)
    return () => clearInterval(interval)
  }, [])

  const handleStop = async () => {
    await api.stopAgent()
    setRunning(false)
    setPaused(false)
    setLogs(l => [...l, `[${new Date().toLocaleTimeString()}] Agent stopped`])
  }

  const handlePause = async () => {
    if (paused) {
      await api.resumeAgent()
      setPaused(false)
      setLogs(l => [...l, `[${new Date().toLocaleTimeString()}] Agent resumed`])
    } else {
      await api.pauseAgent()
      setPaused(true)
      setLogs(l => [...l, `[${new Date().toLocaleTimeString()}] Agent paused`])
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
      <div className="grid-2" style={{ flex: 1 }}>
        {/* Screen Preview */}
        <div>
          <div className="card-title mb-12">LIVE COMPUTER VIEW</div>
          <div className="screen-preview" style={{ height: 'calc(100% - 32px)' }}>
            <div className="sim-badge">SIMULATION</div>
            <div className="icon" style={{ fontSize: 48 }}>🖥️</div>
            <div className="text-muted text-sm">Windows 11 Desktop Preview</div>
            <div className="text-xs text-dim">
              {screenData ? 'Screen data available' : 'No screen captured yet'}
            </div>
            {lastAction && (
              <div className="text-xs text-dim" style={{ marginTop: 8 }}>
                Last action: {lastAction}
              </div>
            )}
          </div>
        </div>

        {/* Agent Controls + Logs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card">
            <div className="card-title">Agent Controls</div>
            <div className="agent-controls">
              <button className="btn btn-primary btn-sm" onClick={() => { setRunning(true); setLogs(l => [...l, `[${new Date().toLocaleTimeString()}] Agent started`]) }}>
                ▶ Start Agent
              </button>
              <button className="btn btn-sm" onClick={handlePause}>
                {paused ? '▶ Resume' : '⏸ Pause'}
              </button>
              <button className="btn btn-danger btn-sm" onClick={handleStop}>
                ⏹ Stop
              </button>
            </div>
            <div className="mt-12 text-sm text-muted">
              Status: {running ? (paused ? '⏸ Paused' : '🟢 Running') : '⬤ Stopped'}
            </div>
          </div>

          <div className="card" style={{ flex: 1 }}>
            <div className="card-title">Agent Loop</div>
            <div className="text-xs text-muted" style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
              {['OBSERVE → UNDERSTAND → PLAN → ACTION → OBSERVE → VERIFY → NEXT'].map((step, i) => (
                <div key={i} className="agent-flow-node">{step}</div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-title">Action Approvals</div>
            <div className="flex gap-8 mt-12">
              <button className="btn btn-sm" style={{ borderColor: 'rgba(74,222,128,0.3)', color: 'var(--success)' }}>✓ Approve</button>
              <button className="btn btn-danger btn-sm">✗ Deny</button>
            </div>
            <div className="text-xs text-dim mt-12">
              Dangerous operations require your explicit approval before execution.
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ maxHeight: 200 }}>
        <div className="card-title">Agent Log</div>
        <div className="terminal-output" style={{ maxHeight: 140, overflowY: 'auto' }}>
          {logs.length === 0 ? (
            <div className="text-dim text-xs">No agent activity yet.</div>
          ) : (
            logs.map((log, i) => <div key={i}>{log}</div>)
          )}
        </div>
      </div>
    </div>
  )
}
