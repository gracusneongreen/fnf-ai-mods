import { useState, useEffect } from 'react'
import { api } from '../api'
import { AIConfig, Permissions, AuditEntry } from '../types'

interface Props {
  onConfigChange: () => void
}

export default function SettingsView({ onConfigChange }: Props) {
  const [config, setConfig] = useState<AIConfig | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [model, setModel] = useState('')
  const [permissions, setPermissions] = useState<Permissions>({})
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const [saved, setSaved] = useState(false)

  const load = async () => {
    try {
      const c = await api.getAIConfig()
      setConfig(c)
      setBaseUrl(c.baseUrl)
      setModel(c.model)
      setPermissions(await api.getPermissions())
      setAudit(await api.getAudit())
    } catch {}
  }

  useEffect(() => { load() }, [])

  const handleSave = async () => {
    try {
      await api.updateAIConfig({ apiKey: apiKey || undefined, baseUrl, model })
      setApiKey('')
      setSaved(true)
      onConfigChange()
      setTimeout(() => setSaved(false), 2000)
      await load()
    } catch (e: any) { alert(e.message) }
  }

  const handlePermChange = async (key: string, level: string) => {
    await api.updatePermission(key, level)
    setPermissions(prev => ({ ...prev, [key]: level as any }))
  }

  const PERM_LABELS: Record<string, string> = {
    READ_PROJECT_FILES: 'Read Project Files',
    WRITE_PROJECT_FILES: 'Write Project Files',
    RUN_PROJECT: 'Run Project',
    OPEN_DEVELOPMENT_APPS: 'Open Development Apps',
    MOUSE: 'Mouse Control',
    KEYBOARD: 'Keyboard Control',
    SCREEN_CAPTURE: 'Screen Capture',
    DELETE_FILES: 'Delete Files',
    INSTALL_SOFTWARE: 'Install Software',
    SYSTEM_SETTINGS: 'System Settings',
    ADMINISTRATOR_ACTIONS: 'Administrator Actions',
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="card mb-12">
        <div className="card-title">🤖 AI Provider Configuration</div>
        <div className="text-xs text-muted mb-12">
          Configure your AI provider. Supports OpenAI and any OpenAI-compatible API.
          Keys are stored in memory only and never written to disk.
        </div>
        <div className="form-group">
          <label className="form-label">API Key {config?.keyPresent && <span style={{ color: 'var(--success)' }}>✓ Present</span>}</label>
          <input
            className="form-input"
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder={config?.keyPresent ? '•••••••••••• (enter new key to replace)' : 'sk-...'}
          />
        </div>
        <div className="form-group">
          <label className="form-label">API Base URL</label>
          <input className="form-input" value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="https://api.openai.com/v1" />
        </div>
        <div className="form-group">
          <label className="form-label">Model</label>
          <input className="form-input" value={model} onChange={e => setModel(e.target.value)} placeholder="gpt-4o" />
        </div>
        <div className="flex gap-8" style={{ alignItems: 'center' }}>
          <button className="btn btn-primary btn-sm" onClick={handleSave}>Save</button>
          {saved && <span className="text-xs" style={{ color: 'var(--success)' }}>✓ Saved</span>}
        </div>
      </div>

      <div className="card mb-12">
        <div className="card-title">🔐 Permission Manager</div>
        <div className="mt-12">
          {Object.entries(permissions).map(([key, level]) => (
            <div key={key} className="perm-row">
              <span className="perm-label">{PERM_LABELS[key] || key}</span>
              <select
                className="perm-select"
                value={level}
                onChange={e => handlePermChange(key, e.target.value)}
                style={level === 'allow' ? { color: 'var(--success)' } : level === 'confirm' ? { color: 'var(--warning)' } : { color: 'var(--danger)' }}
              >
                <option value="allow">ALLOW</option>
                <option value="confirm">CONFIRM</option>
                <option value="block">BLOCK</option>
              </select>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-title">📋 Audit Log</div>
        <div className="mt-12" style={{ maxHeight: 300, overflowY: 'auto' }}>
          {audit.length === 0 ? (
            <div className="text-dim text-xs">No audit entries yet.</div>
          ) : (
            audit.map((entry, i) => (
              <div key={i} className="text-xs" style={{ padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                <span className="text-dim">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                <span style={{ marginLeft: 8, color: 'var(--accent-bright)' }}>{entry.action}</span>
                {entry.details && Object.keys(entry.details).length > 0 && (
                  <span className="text-dim" style={{ marginLeft: 8 }}>{JSON.stringify(entry.details)}</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
