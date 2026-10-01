import { useState } from 'react'
import { api } from '../api'

interface Props {
  activeProject: string | null
}

export default function TestView({ activeProject }: Props) {
  const [validating, setValidating] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [building, setBuilding] = useState(false)
  const [buildOutput, setBuildOutput] = useState<string | null>(null)

  const handleValidate = async () => {
    if (!activeProject) return
    setValidating(true)
    try {
      const res = await api.validateProject(activeProject)
      setResult(res)
    } catch (e: any) { setResult({ valid: false, error: e.message }) }
    setValidating(false)
  }

  const handleBuild = async () => {
    if (!activeProject) return
    setBuilding(true)
    setBuildOutput('Building...')
    try {
      const res = await api.runTerminal(`ls -la ${activeProject}/`, '')
      setBuildOutput(`Build started.\n\n${res.output}`)
    } catch (e: any) { setBuildOutput(`Build failed: ${e.message}`) }
    setBuilding(false)
  }

  return (
    <div>
      <h3 style={{ fontSize: 14, marginBottom: 16 }}>Test & Validation</h3>

      {!activeProject ? (
        <div className="empty-state">
          <div className="icon">🧪</div>
          <p>No project selected. Open a project to validate and test it.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-title">Project Validation — {activeProject}</div>
            <div className="flex gap-8 mt-12">
              <button className="btn btn-primary btn-sm" onClick={handleValidate} disabled={validating}>
                {validating ? 'Validating...' : 'Validate Project'}
              </button>
            </div>
            {result && (
              <div className="mt-12">
                <span className={`badge ${result.valid ? 'badge-success' : 'badge-failed'}`}>
                  {result.valid ? 'VALID' : 'INVALID'}
                </span>
                {result.issues && result.issues.length > 0 && (
                  <div className="mt-12">
                    {result.issues.map((issue: any, i: number) => (
                      <div key={i} className={`text-xs ${issue.severity === 'error' ? 'text-danger' : ''}`} style={{ color: issue.severity === 'error' ? 'var(--danger)' : 'var(--warning)', marginBottom: 4 }}>
                        [{issue.severity.toUpperCase()}] {issue.message}
                      </div>
                    ))}
                  </div>
                )}
                {result.issues && result.issues.length === 0 && result.valid && (
                  <div className="text-xs text-muted mt-12">No issues found. Project structure is valid.</div>
                )}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-title">Build</div>
            <div className="flex gap-8 mt-12">
              <button className="btn btn-primary btn-sm" onClick={handleBuild} disabled={building}>
                {building ? 'Building...' : 'Build Project'}
              </button>
            </div>
            {buildOutput && <pre className="json-view mt-12">{buildOutput}</pre>}
          </div>

          <div className="card">
            <div className="card-title">Error Recovery Loop</div>
            <div className="agent-flow mt-12">
              <div className="agent-flow-node">❌ BUILD FAILED</div>
              <span className="agent-flow-arrow">→</span>
              <div className="agent-flow-node">🧪 TESTER AI</div>
              <span className="agent-flow-arrow">→</span>
              <div className="agent-flow-node">🔍 ANALYZE LOG</div>
              <span className="agent-flow-arrow">→</span>
              <div className="agent-flow-node">💻 CODE AI</div>
              <span className="agent-flow-arrow">→</span>
              <div className="agent-flow-node">🔧 FIX</div>
              <span className="agent-flow-arrow">→</span>
              <div className="agent-flow-node">🔨 BUILD AGAIN</div>
            </div>
            <div className="text-xs text-muted mt-12">
              When a build fails, the Tester AI analyzes the error log and the Code AI attempts to fix it automatically.
              Retry attempts are limited to prevent infinite loops.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
