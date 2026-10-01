import { useState, useRef, useEffect, useCallback } from 'react'
import { api } from '../api'
import { ChatEvent } from '../types'

interface Props {
  activeProject: string | null
  setActiveProject: (name: string | null) => void
  onTaskUpdate: () => void
}

interface ChatMsg {
  role: 'user' | 'assistant' | 'error' | 'info'
  content: string
  events?: { type: string; label: string; detail?: string }[]
}

export default function ChatView({ activeProject, setActiveProject, onTaskUpdate }: Props) {
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEnd = useRef<HTMLDivElement>(null)
  const sessionId = useRef(`session-${Date.now()}`)

  const scrollToBottom = () => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => { scrollToBottom() }, [messages])

  const send = async () => {
    if (!input.trim() || sending) return
    const msg = input.trim()
    setInput('')
    setSending(true)
    setMessages(prev => [...prev, { role: 'user', content: msg }])

    const assistantMsg: ChatMsg = { role: 'assistant', content: '', events: [] }
    setMessages(prev => [...prev, assistantMsg])

    try {
      const res = await api.chatStream(msg, sessionId.current, activeProject)
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue
          try {
            const event: ChatEvent = JSON.parse(line.slice(6))

            if (event.type === 'text' && event.content) {
              setMessages(prev => {
                const copy = [...prev]
                copy[copy.length - 1] = {
                  ...copy[copy.length - 1],
                  content: (copy[copy.length - 1].content || '') + event.content,
                }
                return copy
              })
            } else if (event.type === 'tool_call') {
              setMessages(prev => {
                const copy = [...prev]
                const last = copy[copy.length - 1]
                last.events = [...(last.events || []), { type: 'tool', label: `🔧 Tool: ${event.name}`, detail: event.arguments }]
                return [...copy]
              })
            } else if (event.type === 'tool_result') {
              const detail = event.result?.simulation ? 'SIMULATION' : JSON.stringify(event.result).slice(0, 200)
              setMessages(prev => {
                const copy = [...prev]
                const last = copy[copy.length - 1]
                last.events = [...(last.events || []), { type: 'result', label: `✓ ${event.name}`, detail }]
                return [...copy]
              })
            } else if (event.type === 'info' || event.type === 'error') {
              const text = event.message || event.content || ''
              if (text) {
                setMessages(prev => {
                  const copy = [...prev]
                  const last = copy[copy.length - 1]
                  last.events = [...(last.events || []), { type: event.type, label: event.type === 'error' ? '❌ Error' : 'ℹ️ Info', detail: text }]
                  return [...copy]
                })
              }
            } else if (event.type === 'agent_start') {
              setMessages(prev => {
                const copy = [...prev]
                const last = copy[copy.length - 1]
                last.events = [...(last.events || []), { type: 'agent', label: `${event.icon || '🤖'} Agent: ${event.agentName}`, detail: 'started' }]
                return [...copy]
              })
            } else if (event.type === 'agent_done') {
              setMessages(prev => {
                const copy = [...prev]
                const last = copy[copy.length - 1]
                last.events = [...(last.events || []), { type: 'agent', label: `✓ ${event.agentId} done`, detail: '' }]
                return [...copy]
              })
            } else if (event.type === 'plan') {
              const planText = event.plan?.summary || 'Plan created'
              const steps = event.plan?.steps?.map((s: any) => `${s.agentId}: ${s.description}`).join('\n') || ''
              setMessages(prev => {
                const copy = [...prev]
                const last = copy[copy.length - 1]
                last.events = [...(last.events || []), { type: 'plan', label: '📋 Plan', detail: `${planText}\n${steps}` }]
                return [...copy]
              })
            } else if (event.type === 'task_created' || event.type === 'task_complete' || event.type === 'orchestration_done') {
              onTaskUpdate()
            }
          } catch {}
        }
      }

      setMessages(prev => {
        const copy = [...prev]
        if (!copy[copy.length - 1].content && (!copy[copy.length - 1].events || copy[copy.length - 1].events!.length === 0)) {
          copy[copy.length - 1] = { role: 'assistant', content: 'Done.' }
        }
        return copy
      })
    } catch (error: any) {
      setMessages(prev => {
        const copy = [...prev]
        copy[copy.length - 1] = { role: 'error', content: error.message }
        return copy
      })
    }
    setSending(false)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const suggestions = [
    'Create a new FNF corruption mod',
    'Create an FNF mod with a character named Gracjan',
    'Make a simple FNF mod with 3 songs',
  ]

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="empty-state" style={{ marginTop: '20%' }}>
            <div className="icon">💬</div>
            <h3>FNFAI Chat</h3>
            <p className="text-muted mt-12">Ask me to create FNF mods, generate charts, or manage your project.</p>
            <div className="flex gap-8 mt-16" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
              {suggestions.map(s => (
                <button key={s} className="btn btn-sm" onClick={() => { setInput(s); }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i}>
            <div className={`chat-message ${msg.role}`}>
              {msg.content}
            </div>
            {msg.events && msg.events.length > 0 && (
              <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4, maxWidth: '80%', alignSelf: 'flex-start' }}>
                {msg.events.map((ev, j) => (
                  <div key={j} className={`chat-event ${ev.type === 'tool' || ev.type === 'result' ? 'tool' : ''}`}>
                    <span className="label">{ev.label}</span>
                    {ev.detail && <div className="text-xs text-dim" style={{ marginTop: 2, whiteSpace: 'pre-wrap' }}>{ev.detail}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEnd} />
      </div>
      <div className="chat-input-area">
        <textarea
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={sending ? 'AI is working...' : 'Type a message... (Enter to send, Shift+Enter for new line)'}
          disabled={sending}
          rows={1}
        />
        <button className="btn btn-primary" onClick={send} disabled={sending || !input.trim()}>
          {sending ? '⏳' : 'Send'}
        </button>
      </div>
    </div>
  )
}
