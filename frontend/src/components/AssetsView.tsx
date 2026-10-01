import { useState, useEffect } from 'react'
import { api } from '../api'
import { FileNode } from '../types'

interface Props {
  activeProject: string | null
}

export default function AssetsView({ activeProject }: Props) {
  const [tree, setTree] = useState<FileNode[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string | null>(null)

  const load = async () => {
    if (!activeProject) return
    try { setTree(await api.getProjectTree(activeProject)) } catch {}
  }

  useEffect(() => { load() }, [activeProject])

  const openFile = async (path: string) => {
    if (!activeProject) return
    setSelectedFile(path)
    try {
      const res = await api.readFile(activeProject, path)
      setFileContent(res.content)
    } catch (e: any) {
      setFileContent(`Error: ${e.message}`)
    }
  }

  if (!activeProject) {
    return (
      <div className="empty-state">
        <div className="icon">🎨</div>
        <h3>No Project Selected</h3>
        <p className="text-muted mt-12">Open a project in the Project tab to browse assets.</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16, height: 'calc(100% - 40px)' }}>
      {/* File browser */}
      <div className="card" style={{ overflow: 'auto' }}>
        <div className="card-title">Asset Browser</div>
        <div className="mt-12">
          {tree.length === 0 ? <div className="text-dim text-xs">No assets</div> : tree.map(n => <AssetNode key={n.path} node={n} onOpen={openFile} depth={0} />)}
        </div>
      </div>

      {/* File viewer */}
      <div className="card" style={{ overflow: 'auto' }}>
        <div className="card-title">
          {selectedFile ? `📄 ${selectedFile}` : 'File Viewer'}
        </div>
        {selectedFile ? (
          <div className="json-view mt-12">{fileContent}</div>
        ) : (
          <div className="empty-state" style={{ height: '100%' }}>
            <div className="icon">📄</div>
            <p>Select a file to view its content</p>
          </div>
        )}
      </div>
    </div>
  )
}

function AssetNode({ node, onOpen, depth }: { node: FileNode; onOpen: (path: string) => void; depth: number }) {
  const [open, setOpen] = useState(true)
  return (
    <div>
      <div
        className="file-tree-node"
        style={{ paddingLeft: depth * 12 }}
        onClick={() => node.type === 'dir' ? setOpen(!open) : onOpen(node.path)}
      >
        <span>{node.type === 'dir' ? (open ? '📂' : '📁') : '📄'}</span>
        <span>{node.name}</span>
      </div>
      {node.type === 'dir' && open && node.children && (
        <div>
          {node.children.map(c => <AssetNode key={c.path} node={c} onOpen={onOpen} depth={depth + 1} />)}
        </div>
      )}
    </div>
  )
}
