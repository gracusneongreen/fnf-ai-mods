import { useState, useEffect } from 'react'
import { api } from '../api'
import { Project, FileNode } from '../types'

interface Props {
  activeProject: string | null
  setActiveProject: (name: string | null) => void
}

export default function ProjectView({ activeProject, setActiveProject }: Props) {
  const [projects, setProjects] = useState<Project[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [engines, setEngines] = useState<any[]>([])
  const [selectedEngine, setSelectedEngine] = useState('psych-0.6.3')
  const [tree, setTree] = useState<FileNode[]>([])

  const load = async () => {
    try {
      setProjects(await api.listProjects())
      setEngines(await api.getEngines())
    } catch {}
  }

  const loadTree = async () => {
    if (!activeProject) return
    try { setTree(await api.getProjectTree(activeProject)) } catch {}
  }

  useEffect(() => { load() }, [])
  useEffect(() => { loadTree() }, [activeProject])

  const handleCreate = async () => {
    if (!newName.trim()) return
    try {
      await api.createProject(newName.trim(), selectedEngine)
      await load()
      setActiveProject(newName.trim())
      setShowCreate(false)
      setNewName('')
    } catch (e: any) { alert(e.message) }
  }

  const handleDelete = async (name: string) => {
    if (!confirm(`Delete project "${name}"? This cannot be undone.`)) return
    try {
      await api.deleteProject(name)
      if (activeProject === name) setActiveProject(null)
      await load()
    } catch (e: any) { alert(e.message) }
  }

  return (
    <div>
      <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 14 }}>Projects</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(!showCreate)}>+ New Project</button>
      </div>

      {showCreate && (
        <div className="card mb-12">
          <div className="form-group">
            <label className="form-label">Project Name</label>
            <input className="form-input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="my-mod" />
          </div>
          <div className="form-group">
            <label className="form-label">Engine</label>
            <select className="form-input" value={selectedEngine} onChange={e => setSelectedEngine(e.target.value)}>
              {engines.map(eng => <option key={eng.id} value={eng.id}>{eng.name}</option>)}
            </select>
          </div>
          <div className="flex gap-8">
            <button className="btn btn-primary btn-sm" onClick={handleCreate}>Create</button>
            <button className="btn btn-sm" onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Project list */}
        <div>
          {projects.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📁</div>
              <p>No projects yet. Create one to get started.</p>
            </div>
          ) : (
            projects.map(proj => (
              <div key={proj.name} className={`card mb-12 ${activeProject === proj.name ? '' : ''}`}
                style={{ cursor: 'pointer', borderColor: activeProject === proj.name ? 'var(--accent)' : undefined }}
                onClick={() => setActiveProject(proj.name)}>
                <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{proj.name}</div>
                    <div className="text-xs text-muted">{proj.engineName || proj.engine}</div>
                    {proj.created && <div className="text-xs text-dim">Created: {new Date(proj.created).toLocaleDateString()}</div>}
                  </div>
                  <div className="flex gap-8">
                    {activeProject === proj.name && <span className="badge badge-success">ACTIVE</span>}
                    <button className="btn btn-danger btn-sm" onClick={(e) => { e.stopPropagation(); handleDelete(proj.name) }}>Del</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Project tree */}
        <div>
          {activeProject ? (
            <div className="card">
              <div className="card-title">File Structure — {activeProject}</div>
              <div className="file-tree mt-12">
                {tree.length === 0 ? <div className="text-dim text-xs">No files</div> : tree.map(node => <FileTree key={node.path} node={node} />)}
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <div className="icon">📂</div>
              <p>Select a project to view its files</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function FileTree({ node }: { node: FileNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div>
      <div className="file-tree-node" onClick={() => node.type === 'dir' && setOpen(!open)}>
        <span>{node.type === 'dir' ? (open ? '📂' : '📁') : '📄'}</span>
        <span>{node.name}</span>
      </div>
      {node.type === 'dir' && open && node.children && (
        <div className="file-tree-children">
          {node.children.map(child => <FileTree key={child.path} node={child} />)}
        </div>
      )}
    </div>
  )
}
