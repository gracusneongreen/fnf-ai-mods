import { useState, useEffect, useRef } from 'react'
import { api } from '../api'
import { TerminalEntry } from '../types'

interface Props {
  activeProject: string | null
}

export default function TerminalView({ activeProject }: Props) {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState<TerminalEntry[]>([])
  const [history, setHistory] = useState<TerminalEntry[]>([])
  const outputRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.getTerminalHistory().then(setHistory).catch(() => {})
  }, [])

  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight
  }, [output, history])

  const run = async () => {
    if (!input.trim()) return
    const cmd = input.trim()
    setInput('')
    setOutput(prev => [...prev, { timestamp: new Date().toISOString(), command: cmd, output: '', exitCode: 0 }])
    try {
      const res = await api.runTerminal(cmd, activeProject || undefined)
      setOutput(prev => {
        const copy = [...prev]
        copy[copy.length - 1] = { timestamp: new Date().toISOString(), command: cmd, output: res.output, exitCode: res.exitCode }
        return copy
      })
    } catch (e: any) {
      setOutput(prev => {
        const copy = [...prev]
        copy[copy.length - 1] = { timestamp: new Date().toISOString(), command: cmd, output: e.message, exitCode: 1 }
        return copy
      })
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); run() }
  }

  return (
    <div style={{ padding: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="terminal" style={{ margin: 0, borderRadius: 0, height: '100%' }}>
        <div className="terminal-output" ref={outputRef}>
          {history.length > 0 && (
            <div className="text-dim text-xs" style={{ marginBottom: 8 }}>── History ──</div>
          )}
          {history.map((entry, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <div className="cmd">{`> ${entry.command}`}</div>
              <pre style={{ margin: '4px 0', whiteSpace: 'pre-wrap', color: entry.exitCode !== 0 ? 'var(--danger)' : '#a0a0b8' }}>{entry.output}</pre>
              <div className="text-xs text-dim">exit code: {entry.exitCode}</div>
            </div>
          ))}
          {output.map((entry, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <div className="cmd">{`> ${entry.command}`}</div>
              {entry.output && <pre style={{ margin: '4px 0', whiteSpace: 'pre-wrap', color: entry.exitCode !== 0 ? 'var(--danger)' : '#a0a0b8' }}>{entry.output}</pre>}
              {entry.exitCode !== undefined && <div className="text-xs text-dim">exit code: {entry.exitCode}</div>}
            </div>
          ))}
        </div>
        <div className="terminal-input-area">
          <span className="prompt">{activeProject ? `${activeProject}$` : '$'} ></span>
          <input
            className="terminal-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Enter command..."
            autoFocus
          />
        </div>
      </div>
    </div>
  )
}
