import { useState, useEffect, useCallback } from 'react'
import { api } from './api'
import { Agent, Project } from './types'
import ChatView from './components/ChatView'
import ComputerView from './components/ComputerView'
import ProjectView from './components/ProjectView'
import AssetsView from './components/AssetsView'
import AgentsView from './components/AgentsView'
import TasksView from './components/TasksView'
import TerminalView from './components/TerminalView'
import TestView from './components/TestView'
import SettingsView from './components/SettingsView'

export type TabId = 'chat' | 'computer' | 'project' | 'assets' | 'agents' | 'tasks' | 'terminal' | 'test' | 'settings'

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'chat', label: 'CHAT', icon: '💬' },
  { id: 'computer', label: 'COMPUTER', icon: '🖥️' },
  { id: 'project', label: 'PROJECT', icon: '📁' },
  { id: 'assets', label: 'ASSETS', icon: '🎨' },
  { id: 'agents', label: 'AGENTS', icon: '🤖' },
  { id: 'tasks', label: 'TASKS', icon: '📋' },
  { id: 'terminal', label: 'TERMINAL', icon: '⌨️' },
  { id: 'test', label: 'TEST', icon: '🧪' },
  { id: 'settings', label: 'SETTINGS', icon: '⚙️' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('chat')
  const [agents, setAgents] = useState<Agent[]>([])
  const [activeProject, setActiveProject] = useState<string | null>(null)
  const [aiConfigured, setAIConfigured] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(() => setRefreshKey(k => k + 1), [])

  useEffect(() => {
    api.getAgents().then(setAgents).catch(() => {})
    api.getAIConfig().then(c => setAIConfigured(c.configured)).catch(() => {})
  }, [])

  return (
    <div className="app">
      <div className="sidebar">
        <div className="sidebar-header">
          <h1>FNFAI REAL MODS</h1>
          <div className="subtitle">V1 — AI MOD STUDIO</div>
        </div>
        <nav className="sidebar-nav">
          {TABS.map(tab => (
            <div
              key={tab.id}
              className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="icon">{tab.icon}</span>
              <span>{tab.label}</span>
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div>
            <span className={`status-dot ${aiConfigured ? 'ok' : 'warn'}`}></span>
            {aiConfigured ? 'AI Connected' : 'AI Not Configured'}
          </div>
          <div style={{ marginTop: 4 }}>
            {activeProject ? `Project: ${activeProject}` : 'No project open'}
          </div>
        </div>
      </div>

      <div className="main">
        <div className="main-header">
          <h2>{TABS.find(t => t.id === activeTab)?.label}</h2>
          {activeProject && <span className="project-tag">{activeProject}</span>}
        </div>
        <div className="content" style={{ padding: activeTab === 'chat' || activeTab === 'terminal' ? 0 : 20 }}>
          {activeTab === 'chat' && <ChatView activeProject={activeProject} setActiveProject={setActiveProject} onTaskUpdate={refresh} />}
          {activeTab === 'computer' && <ComputerView />}
          {activeTab === 'project' && <ProjectView activeProject={activeProject} setActiveProject={setActiveProject} />}
          {activeTab === 'assets' && <AssetsView activeProject={activeProject} />}
          {activeTab === 'agents' && <AgentsView agents={agents} refreshKey={refreshKey} />}
          {activeTab === 'tasks' && <TasksView refreshKey={refreshKey} />}
          {activeTab === 'terminal' && <TerminalView activeProject={activeProject} />}
          {activeTab === 'test' && <TestView activeProject={activeProject} />}
          {activeTab === 'settings' && <SettingsView onConfigChange={() => setAIConfigured(true)} />}
        </div>
      </div>
    </div>
  )
}
