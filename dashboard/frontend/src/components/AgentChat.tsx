import { useEffect, useRef, useState, useCallback } from 'react'
import Markdown from './Markdown'
import { AgentAvatar } from './AgentAvatar'
import { useNotifications } from '../context/NotificationContext'
import {
  Send, Square, ChevronDown, ChevronRight,
  FileCode, Terminal as TermIcon, CheckCircle2,
  Paperclip, X, File as FileIcon, ImageIcon, Upload,
  Ticket as TicketIcon, Plus, ShieldAlert, Check, Ban,
  Pencil, Copy, FileText, Edit2,
} from 'lucide-react'

interface SkillItem {
  name: string
  description: string
  prefix: string
  has_scripts: boolean
}

interface SlashPopup {
  open: boolean
  query: string
  items: SkillItem[]
  selectedIndex: number
  anchorStart: number
}

interface PermissionRequest {
  requestId: string
  toolName: string
  input: Record<string, unknown>
  title: string | null
  description: string | null
  createdAt: number
}

interface AgentChatProps {
  agent: string
  sessionId?: string
  accentColor?: string
  externalLoading?: boolean
  externalError?: string | null
  onSessionCreated?: (session: { id: string; name: string; active: boolean; ts: number }) => void
  onSessionMetaChange?: (sessionId: string, patch: { active?: boolean; preview?: string; ts?: number; ticketId?: string | null }) => void
  onPendingCountChange?: (sessionId: string, count: number) => void
  onNeedsAttention?: (sessionId: string) => void
}

// Terminal-server URL
import { TS_HTTP, TS_WS } from '../lib/terminal-url'

interface AttachedFile {
  file: File
  previewUrl?: string
  name: string
  type: string
}

interface FileRef {
  name: string
  type: string
  previewUrl?: string
  base64?: string
}

type ChatMessage =
  | { role: 'user'; text: string; files?: FileRef[]; ts: number; uuid?: string }
  | { role: 'assistant'; blocks: AssistantBlock[]; ts: number; streaming?: boolean; uuid?: string }
  | { role: 'system'; text: string; ts: number; uuid?: string }

type AssistantBlock =
  | { type: 'text'; text: string }
  | { type: 'thinking'; text: string }
  | { type: 'tool_use'; toolName: string; toolId: string; input: string; result?: string; done?: boolean; subagentType?: string; subagentStatus?: string; subagentSummary?: string; subagentTools?: Array<{ toolName: string; input: string; toolUseId: string; ts: number }>; elicitationRequestId?: string; elicitationMode?: 'form' | 'url'; elicitationMessage?: string; elicitationRequestedSchema?: unknown; elicitationSubmitted?: boolean }

type Status = 'idle' | 'connecting' | 'running' | 'error'

function safeText(value: unknown) {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return ''
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function getToolLabel(toolName: string) {
  switch (toolName) {
    case 'Bash':
      return 'Bash'
    case 'AskUserQuestion':
      return 'AskUserQuestion'
    case 'TodoWrite':
      return 'TodoWrite'
    default:
      return safeText(toolName)
  }
}

function getToolIcon(toolName: string, accentColor: string, size = 13, className = '') {
  const props = { size, className, style: className ? undefined : { color: accentColor } }

  switch (toolName) {
    case 'Bash':
      return <TermIcon {...props} />
    case 'Read':
      return <FileText {...props} />
    case 'Write':
    case 'Edit':
      return <Edit2 {...props} />
    case 'AskUserQuestion':
      return <ShieldAlert {...props} />
    case 'TodoWrite':
      return <CheckCircle2 {...props} />
    default:
      return <FileCode {...props} />
  }
}

function summarizeToolInput(toolName: string, parsedInput: any, rawInput = '') {
  if (toolName === 'Bash') {
    return safeText(parsedInput?.command || rawInput).replace(/\s+/g, ' ').trim()
  }

  if (toolName === 'Read') {
    return safeText(parsedInput?.file_path || parsedInput?.path || rawInput)
  }

  if (toolName === 'Write' || toolName === 'Edit') {
    return safeText(parsedInput?.file_path || parsedInput?.path || rawInput)
  }

  if (toolName === 'Glob') {
    return safeText(parsedInput?.pattern || parsedInput?.path || rawInput)
  }

  if (toolName === 'Grep') {
    return safeText(parsedInput?.pattern || parsedInput?.query || rawInput)
  }

  if (toolName === 'AskUserQuestion') {
    const questions = Array.isArray(parsedInput?.questions) ? parsedInput.questions : []
    const firstQuestion = safeText(questions[0]?.question || '')
    if (questions.length === 0) return ''
    return questions.length === 1 ? firstQuestion : `${questions.length} questions`
  }

  if (toolName === 'TodoWrite') {
    const todos = Array.isArray(parsedInput?.todos) ? parsedInput.todos : []
    const completed = todos.filter((todo: any) => todo?.status === 'completed').length
    return todos.length > 0 ? `${completed}/${todos.length} done` : ''
  }

  return safeText(
    parsedInput?.command
    || parsedInput?.file_path
    || parsedInput?.path
    || parsedInput?.pattern
    || parsedInput?.description
    || rawInput,
  )
}

function getToolDetailRows(toolName: string, parsedInput: any) {
  if (toolName === 'Bash') {
    const command = safeText(parsedInput?.command || '').replace(/\s+/g, ' ').trim()
    return {
      primary: command,
      secondary: '',
      chips: [
        parsedInput?.timeout ? `${parsedInput.timeout}ms` : '',
        parsedInput?.run_in_background ? 'background' : '',
      ].filter(Boolean) as string[],
    }
  }

  if (toolName === 'Read') {
    const filePath = safeText(parsedInput?.file_path || parsedInput?.path || '')
    const pages = Array.isArray(parsedInput?.pages) && parsedInput.pages.length > 0
      ? `pages ${parsedInput.pages.join(', ')}`
      : ''
    const offset = parsedInput?.offset !== undefined && parsedInput?.offset !== null ? `offset ${parsedInput.offset}` : ''
    const limit = parsedInput?.limit ? `limit ${parsedInput.limit}` : ''
    return {
      primary: filePath,
      secondary: '',
      chips: [pages, offset, limit].filter(Boolean) as string[],
    }
  }

  if (toolName === 'Write' || toolName === 'Edit') {
    const filePath = safeText(parsedInput?.file_path || parsedInput?.path || '')
    return {
      primary: filePath,
      secondary: '',
      chips: [],
    }
  }

  if (toolName === 'Glob') {
    return {
      primary: safeText(parsedInput?.pattern || ''),
      secondary: safeText(parsedInput?.path || ''),
      chips: [],
    }
  }

  if (toolName === 'Grep') {
    return {
      primary: safeText(parsedInput?.pattern || parsedInput?.query || ''),
      secondary: safeText(parsedInput?.path || ''),
      chips: [],
    }
  }

  return {
    primary: summarizeToolInput(toolName, parsedInput),
    secondary: '',
    chips: [],
  }
}

function normalizeAssistantBlock(block: any): AssistantBlock {
  if (!block || typeof block !== 'object') {
    return { type: 'text', text: safeText(block) }
  }

  if (block.type === 'text' || block.type === 'thinking') {
    return { ...block, text: safeText(block.text) }
  }

  if (block.type === 'tool_use') {
    return {
      ...block,
      toolName: safeText(block.toolName || block.name),
      toolId: safeText(block.toolId || block.id),
      input: safeText(block.input),
      result: block.result === undefined ? undefined : safeText(block.result),
      subagentType: block.subagentType ? safeText(block.subagentType) : undefined,
      subagentStatus: block.subagentStatus ? safeText(block.subagentStatus) : undefined,
      subagentSummary: block.subagentSummary ? safeText(block.subagentSummary) : undefined,
      subagentTools: Array.isArray(block.subagentTools)
        ? block.subagentTools.map((tool: any) => ({
            toolName: safeText(tool?.toolName),
            input: safeText(tool?.input),
            toolUseId: safeText(tool?.toolUseId),
            ts: typeof tool?.ts === 'number' ? tool.ts : Date.now(),
          }))
        : undefined,
      elicitationRequestId: block.elicitationRequestId ? safeText(block.elicitationRequestId) : undefined,
      elicitationMode: block.elicitationMode === 'url' ? 'url' : 'form',
      elicitationMessage: block.elicitationMessage ? safeText(block.elicitationMessage) : undefined,
      elicitationRequestedSchema: block.elicitationRequestedSchema,
      elicitationSubmitted: !!block.elicitationSubmitted,
      done: block.done === undefined ? undefined : !!block.done,
    }
  }

  return { type: 'text', text: safeText(block.text ?? block) }
}

function normalizeChatMessage(message: any): ChatMessage {
  if (message?.role === 'assistant') {
    const blocks = Array.isArray(message.blocks) ? message.blocks.map(normalizeAssistantBlock) : []
    return {
      role: 'assistant',
      blocks,
      ts: typeof message.ts === 'number' ? message.ts : Date.now(),
      streaming: !!message.streaming,
      uuid: message.uuid,
    }
  }

  if (message?.role === 'system') {
    return {
      role: 'system',
      text: safeText(message.text),
      ts: typeof message.ts === 'number' ? message.ts : Date.now(),
      uuid: message.uuid,
    }
  }

  return {
    role: 'user',
    text: safeText(message?.text),
    files: Array.isArray(message?.files) ? message.files : undefined,
    ts: typeof message?.ts === 'number' ? message.ts : Date.now(),
    uuid: message?.uuid,
  }
}

export default function AgentChat({ agent, sessionId, accentColor = '#00FFA7', externalLoading = false, externalError = null, onSessionCreated, onSessionMetaChange, onPendingCountChange, onNeedsAttention }: AgentChatProps) {
  const { dismissBySession } = useNotifications()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [ticketId, setTicketId] = useState<string | null>(null)
  const [tickets, setTickets] = useState<{ id: string; title: string; status: string }[]>([])
  const [showTicketPicker, setShowTicketPicker] = useState(false)
  const [allSkills, setAllSkills] = useState<SkillItem[]>([])
  const [slashPopup, setSlashPopup] = useState<SlashPopup>({
    open: false, query: '', items: [], selectedIndex: 0, anchorStart: -1,
  })
  const [pendingApprovals, setPendingApprovals] = useState<PermissionRequest[]>([])
  const [latestElicitationRequestId, setLatestElicitationRequestId] = useState<string | null>(null)
  const [editingUuid, setEditingUuid] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const dragCounterRef = useRef(0)
  const subagentToolRef = useRef<{ toolName: string; toolUseId: string; input: string; parentToolUseId: string } | null>(null)
  const latestElicitationRequestIdRef = useRef<string | null>(null)
  const pendingElicitationsRef = useRef<Array<{
    requestId: string
    mode?: 'form' | 'url'
    message?: string
    requestedSchema?: unknown
  }>>([])
  const pendingInitialSendRef = useRef<{ text: string; files: AttachedFile[] } | null>(null)

  // Auto-dismiss global notifications when the user opens this session
  useEffect(() => {
    if (sessionId) {
      dismissBySession(sessionId)
    }
  }, [sessionId, dismissBySession])

  useEffect(() => {
    latestElicitationRequestIdRef.current = latestElicitationRequestId
  }, [latestElicitationRequestId])

  // Notify parent when pending approvals count changes
  useEffect(() => {
    if (sessionId && onPendingCountChange) {
      onPendingCountChange(sessionId, pendingApprovals.length)
    }
  }, [pendingApprovals.length, sessionId, onPendingCountChange])

  useEffect(() => {
    if (!sessionId) {
      setMessages([])
      setPendingApprovals([])
      setTicketId(null)
      setStatus('idle')
      setErrorMsg(null)
    }
  }, [sessionId])

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      }
    })
  }, [])

  // Connect WebSocket
  useEffect(() => {
    if (!sessionId) return

    setMessages([])
    setPendingApprovals([])
    setTicketId(null)
    setStatus('connecting')
    setErrorMsg(null)
    let cancelled = false
    let ws: WebSocket | null = null

    ;(async () => {
      // 1) HTTP preflight — fails fast on ECONNREFUSED so we can show a real error
      //    instead of hanging in 'connecting' forever (same pattern as AgentTerminal).
      try {
        const res = await fetch(`${TS_HTTP}/api/health`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
      } catch {
        if (cancelled) return
        setStatus('error')
        setErrorMsg(`Could not reach terminal-server at ${TS_HTTP}. Is it running?`)
        return
      }
      if (cancelled) return

      // 2) Open WS
      ws = new WebSocket(`${TS_WS}/ws`)
      wsRef.current = ws

      ws.onopen = () => {
        ws!.send(JSON.stringify({ type: 'join_session', sessionId }))
        setStatus('idle')
      }

      ws.onmessage = (ev) => {
        if (cancelled) return
        let msg: any
        try { msg = JSON.parse(ev.data) } catch { return }

        switch (msg.type) {
          case 'session_joined':
            // Restore chat history from server — preserve uuid from each message
            if (msg.chatHistory && msg.chatHistory.length > 0) {
              setMessages(msg.chatHistory.map((m: any) => ({
                ...normalizeChatMessage(m),
                streaming: false,
              })))
              scrollToBottom()
            }
            // Restore ticket binding (Feature 1.3)
            setTicketId(msg.ticketId || null)
            if (sessionId) {
              onSessionMetaChange?.(sessionId, {
                active: false,
                ts: Date.now(),
                ticketId: msg.ticketId || null,
              })
            }
            break

          case 'chat_history':
            // Fallback history restore
            if (msg.messages?.length > 0) {
              setMessages(msg.messages.map((m: any) => ({ ...normalizeChatMessage(m), streaming: false })))
              scrollToBottom()
            }
            break

          case 'chat_event':
            handleChatEvent(msg.event || msg)
            break

          case 'ticket_bound':
            if (msg.ticketId) {
              setTicketId(msg.ticketId)
              if (sessionId) {
                onSessionMetaChange?.(sessionId, {
                  ticketId: msg.ticketId,
                  ts: Date.now(),
                })
              }
            }
            break

          case 'permission_request':
            if (msg.requestId) {
              setPendingApprovals(prev => [...prev, {
                requestId: msg.requestId,
                toolName: msg.toolName,
                input: msg.input || {},
                title: msg.title || null,
                description: msg.description || null,
                createdAt: Date.now(),
              }])
              // Request OS notification permission silently on first request
              if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
                Notification.requestPermission().catch(() => {})
              }
              // Fire OS notification when tab is hidden and notifications are enabled
              if (
                document.hidden &&
                typeof Notification !== 'undefined' &&
                Notification.permission === 'granted' &&
                localStorage.getItem('evonexus.notifications.enabled') !== 'false'
              ) {
                try {
                  const n = new Notification(`Agent @${agent} is waiting for your approval`, {
                    body: msg.title || msg.toolName || 'Permission request',
                    icon: '/favicon.ico',
                    tag: `approval-${msg.requestId}`,
                  })
                  n.onclick = () => { window.focus() }
                } catch {
                  // Notification API unavailable (e.g. Firefox private mode) — no-op
                }
              }
            }
            break

          case 'elicitation_request':
            if (msg.requestId) {
              handleChatEvent(msg)
            }
            break

          case 'chat_error':
            setStatus('error')
            setIsThinking(false)
            setPendingApprovals([])
            setErrorMsg(msg.message || 'Unknown error')
            setMessages(prev => [...prev, { role: 'system', text: `Error: ${msg.message}`, ts: Date.now() }])
            if (sessionId) {
              onSessionMetaChange?.(sessionId, {
                active: false,
                preview: `Error: ${msg.message || 'Unknown error'}`,
                ts: Date.now(),
              })
            }
            break

          case 'chat_complete':
            setStatus('idle')
            setIsThinking(false)
            setPendingApprovals([])
            if (sessionId) {
              onSessionMetaChange?.(sessionId, {
                active: false,
                ts: Date.now(),
              })
            }
            // Signal unread response when user is in another tab
            if (document.hidden && sessionId && onNeedsAttention) {
              onNeedsAttention(sessionId)
            }
            setMessages(prev => {
              const copy = [...prev]
              for (let i = copy.length - 1; i >= 0; i--) {
                if (copy[i].role === 'assistant') {
                  copy[i] = { ...copy[i], streaming: false } as any
                  break
                }
              }
              return copy
            })
            break

          case 'pong':
            break
        }
      }

      ws.onerror = () => {
        if (cancelled) return
        setStatus('error')
        setErrorMsg('WebSocket error')
      }

      ws.onclose = () => {
        if (pingRef.current) { clearInterval(pingRef.current); pingRef.current = null }
      }

      pingRef.current = setInterval(() => {
        if (ws!.readyState === WebSocket.OPEN) {
          ws!.send(JSON.stringify({ type: 'ping' }))
        }
      }, 25000)
    })()

    return () => {
      cancelled = true
      if (pingRef.current) { clearInterval(pingRef.current); pingRef.current = null }
      try { ws?.close() } catch {}
      wsRef.current = null
    }
  }, [sessionId, agent, onNeedsAttention, onSessionMetaChange, scrollToBottom])

  // Revoke object URLs on unmount
  useEffect(() => {
    return () => {
      attachedFiles.forEach(f => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl)
      })
    }
  }, [attachedFiles])

  // Fetch skills once on mount for slash-command autocomplete
  useEffect(() => {
    fetch('/api/skills', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.skills) {
          setAllSkills(data.skills.sort((a: SkillItem, b: SkillItem) => a.name.localeCompare(b.name)))
        }
      })
      .catch(() => {})
  }, [])

  // Fetch open tickets for this agent when picker opens (Feature 1.3)
  useEffect(() => {
    if (!showTicketPicker) return
    fetch(`/api/tickets?assignee_agent=${encodeURIComponent(agent)}&status=open&status=in_progress`, {
      credentials: 'include',
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.tickets) setTickets(data.tickets)
      })
      .catch(() => {})
  }, [showTicketPicker, agent])

  const performSend = useCallback(async (text: string, filesSnapshot: AttachedFile[]) => {
    if ((!text && filesSnapshot.length === 0) || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

    const fileMeta: FileRef[] = filesSnapshot.map(f => ({
      name: f.name,
      type: f.type,
      previewUrl: f.previewUrl,
    }))

    const filesForServer: FileRef[] = []
    for (const af of filesSnapshot) {
      const base64 = await fileToBase64(af.file)
      filesForServer.push({
        name: af.name,
        type: af.type,
        base64,
      })
    }

    setMessages(prev => [...prev, {
      role: 'user' as const,
      text,
      files: fileMeta.length > 0 ? fileMeta : undefined,
      ts: Date.now(),
    }])

    setInput('')
    setAttachedFiles([])
    setStatus('running')
    setErrorMsg(null)
    if (sessionId) {
      onSessionMetaChange?.(sessionId, {
        active: true,
        preview: text || (filesSnapshot.length > 0 ? `[${filesSnapshot.length} attachment${filesSnapshot.length > 1 ? 's' : ''}]` : ''),
        ts: Date.now(),
      })
    }

    wsRef.current.send(JSON.stringify({
      type: 'chat_send',
      prompt: text,
      files: filesForServer.length > 0 ? filesForServer : undefined,
    }))

    scrollToBottom()
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.focus()
    }
  }, [scrollToBottom, sessionId, onSessionMetaChange])

  useEffect(() => {
    if (!sessionId || !pendingInitialSendRef.current) return
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || status !== 'idle') return

    const pending = pendingInitialSendRef.current
    pendingInitialSendRef.current = null
    void performSend(pending.text, pending.files)
  }, [sessionId, status, performSend])

  const bindTicket = useCallback(async (newTicketId: string | null) => {
    if (!sessionId) return
    try {
      await fetch(`${TS_HTTP}/api/sessions/${sessionId}/ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: newTicketId }),
      })
      setTicketId(newTicketId)
      setShowTicketPicker(false)
    } catch (err) {
      console.error('Failed to bind ticket', err)
    }
  }, [sessionId])

  const createAndBindTicket = useCallback(async () => {
    const title = prompt('New ticket title:')
    if (!title?.trim()) return
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          assignee_agent: agent,
          priority: 'medium',
          status: 'open',
        }),
      })
      if (!res.ok) throw new Error('Failed to create')
      const ticket = await res.json()
      await bindTicket(ticket.id)
    } catch (err: any) {
      alert(err?.message || 'Failed to create ticket')
    }
  }, [agent, bindTicket])

  const respondToApproval = useCallback((requestId: string, approved: boolean) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    wsRef.current.send(JSON.stringify({ type: 'permission_response', requestId, approved }))
    setPendingApprovals(prev => prev.filter(r => r.requestId !== requestId))
  }, [])

  const respondToElicitation = useCallback((requestId: string, content: Record<string, unknown>) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return false
    wsRef.current.send(JSON.stringify({
      type: 'elicitation_response',
      requestId,
      action: 'accept',
      content,
    }))
    setMessages(prev => prev.map(msg => {
      if (msg.role !== 'assistant') return msg
      const blocks = (msg as any).blocks?.map((block: AssistantBlock) => {
        if (block.type === 'tool_use' && block.elicitationRequestId === requestId) {
          return { ...block, elicitationSubmitted: true }
        }
        return block
      })
      return blocks ? { ...msg, blocks } : msg
    }))
    setLatestElicitationRequestId(prev => (prev === requestId ? null : prev))
    return true
  }, [])

  const handleChatEvent = useCallback((msg: any) => {
    // Track thinking state for typing indicator
    if (msg.type === 'thinking_start') {
      setIsThinking(true)
    }
    if (msg.type === 'text_start' || msg.type === 'text_delta') {
      setIsThinking(false)
    }

    setMessages(prev => {
      const copy = [...prev]

      switch (msg.type) {
        case 'text_start':
        case 'message_start': {
          const last = copy[copy.length - 1]
          if (!last || last.role !== 'assistant' || !(last as any).streaming) {
            copy.push({ role: 'assistant', blocks: [], ts: Date.now(), streaming: true })
          }
          break
        }

        case 'text_delta': {
          const last = copy[copy.length - 1]
          if (last?.role === 'assistant') {
            const blocks = [...(last as any).blocks]
            const lastBlock = blocks[blocks.length - 1]
            if (lastBlock?.type === 'text') {
              blocks[blocks.length - 1] = { ...lastBlock, text: lastBlock.text + (msg.text || '') }
            } else {
              blocks.push({ type: 'text', text: msg.text || '' })
            }
            copy[copy.length - 1] = { ...last, blocks } as any
          }
          break
        }

        case 'thinking_start': {
          const last = copy[copy.length - 1]
          if (!last || last.role !== 'assistant' || !(last as any).streaming) {
            copy.push({ role: 'assistant', blocks: [], ts: Date.now(), streaming: true })
          }
          break
        }

        case 'thinking_delta': {
          // Silently consume — we show typing indicator instead
          break
        }

        case 'tool_use_start': {
          setIsThinking(false)
          // Subagent tool — accumulate in ref, don't add a block
          if (msg.parentToolUseId) {
            subagentToolRef.current = {
              toolName: msg.toolName,
              toolUseId: msg.toolId,
              input: '',
              parentToolUseId: msg.parentToolUseId,
            }
            break
          }
          const last = copy[copy.length - 1]
          if (last?.role === 'assistant') {
            const blocks = [...(last as any).blocks]
            const pendingElicitation = msg.toolName === 'AskUserQuestion'
              ? pendingElicitationsRef.current.shift()
              : undefined
            blocks.push({
              type: 'tool_use',
              toolName: msg.toolName,
              toolId: msg.toolId,
              input: '',
              done: false,
              elicitationRequestId: pendingElicitation?.requestId,
              elicitationMode: pendingElicitation?.mode || 'form',
              elicitationMessage: pendingElicitation?.message || '',
              elicitationRequestedSchema: pendingElicitation?.requestedSchema ?? null,
              elicitationSubmitted: false,
            })
            copy[copy.length - 1] = { ...last, blocks } as any
          }
          break
        }

        case 'tool_input_delta': {
          // Subagent tool input — accumulate in ref
          if (msg.parentToolUseId) {
            if (subagentToolRef.current && subagentToolRef.current.parentToolUseId === msg.parentToolUseId) {
              subagentToolRef.current = { ...subagentToolRef.current, input: subagentToolRef.current.input + (msg.json || '') }
            }
            break
          }
          const last = copy[copy.length - 1]
          if (last?.role === 'assistant') {
            const blocks = [...(last as any).blocks]
            const lastBlock = blocks[blocks.length - 1]
            if (lastBlock?.type === 'tool_use') {
              blocks[blocks.length - 1] = { ...lastBlock, input: lastBlock.input + (msg.json || '') }
              copy[copy.length - 1] = { ...last, blocks } as any
            }
          }
          break
        }

        case 'block_stop': {
          // Subagent block finished — flush to parent Agent block's subagentTools
          if (msg.parentToolUseId && subagentToolRef.current) {
            const entry = {
              toolName: subagentToolRef.current.toolName,
              input: subagentToolRef.current.input,
              toolUseId: subagentToolRef.current.toolUseId,
              ts: Date.now(),
            }
            const parentId = msg.parentToolUseId
            subagentToolRef.current = null
            // Find parent Agent block across all messages
            for (let mi = copy.length - 1; mi >= 0; mi--) {
              const m = copy[mi]
              if (m.role !== 'assistant') continue
              const blocks = [...(m as any).blocks]
              let found = false
              for (let bi = blocks.length - 1; bi >= 0; bi--) {
                if (blocks[bi].type === 'tool_use' && blocks[bi].toolId === parentId) {
                  const existing: typeof entry[] = blocks[bi].subagentTools || []
                  blocks[bi] = { ...blocks[bi], subagentTools: [...existing, entry] }
                  copy[mi] = { ...m, blocks } as any
                  found = true
                  break
                }
              }
              if (found) break
            }
            break
          }
          const last = copy[copy.length - 1]
          if (last?.role === 'assistant') {
            const blocks = [...(last as any).blocks]
            const lastBlock = blocks[blocks.length - 1]
            if (lastBlock?.type === 'tool_use' && !lastBlock.done) {
              blocks[blocks.length - 1] = { ...lastBlock, done: true }
              copy[copy.length - 1] = { ...last, blocks } as any
            }
          }
          break
        }

        case 'task_started': {
          // Subagent started — find the Agent tool_use block and enrich it
          const last2 = copy[copy.length - 1]
          if (last2?.role === 'assistant') {
            const blocks = [...(last2 as any).blocks]
            // Find the Agent tool block by toolUseId or last Agent block
            for (let k = blocks.length - 1; k >= 0; k--) {
              if (blocks[k].type === 'tool_use' && blocks[k].toolName === 'Agent') {
                blocks[k] = { ...blocks[k], subagentType: msg.description, subagentStatus: 'running' }
                break
              }
            }
            copy[copy.length - 1] = { ...last2, blocks } as any
          }
          break
        }

        case 'task_progress': {
          const last3 = copy[copy.length - 1]
          if (last3?.role === 'assistant') {
            const blocks = [...(last3 as any).blocks]
            for (let k = blocks.length - 1; k >= 0; k--) {
              if (blocks[k].type === 'tool_use' && blocks[k].toolName === 'Agent' && blocks[k].subagentStatus === 'running') {
                blocks[k] = { ...blocks[k], subagentSummary: msg.summary || msg.description }
                break
              }
            }
            copy[copy.length - 1] = { ...last3, blocks } as any
          }
          break
        }

        case 'task_complete': {
          const last4 = copy[copy.length - 1]
          if (last4?.role === 'assistant') {
            const blocks = [...(last4 as any).blocks]
            for (let k = blocks.length - 1; k >= 0; k--) {
              if (blocks[k].type === 'tool_use' && blocks[k].toolName === 'Agent') {
                blocks[k] = { ...blocks[k], subagentStatus: msg.status, done: true }
                break
              }
            }
            copy[copy.length - 1] = { ...last4, blocks } as any
          }
          break
        }

        case 'tool_use_summary': {
          // Show summary text after tool completes
          const last5 = copy[copy.length - 1]
          if (last5?.role === 'assistant' && msg.summary) {
            const blocks = [...(last5 as any).blocks]
            blocks.push({ type: 'text', text: msg.summary })
            copy[copy.length - 1] = { ...last5, blocks } as any
          }
          break
        }

        case 'elicitation_request': {
          let attached = false
          for (let mi = copy.length - 1; mi >= 0; mi--) {
            const m = copy[mi]
            if (m.role !== 'assistant') continue
            const blocks = [...(m as any).blocks]
            let found = false
            for (let bi = blocks.length - 1; bi >= 0; bi--) {
              const block = blocks[bi]
              if (block.type !== 'tool_use' || block.toolName !== 'AskUserQuestion') continue
              if (block.elicitationRequestId) continue
              blocks[bi] = {
                ...block,
                elicitationRequestId: msg.requestId,
                elicitationMode: msg.mode || 'form',
                elicitationMessage: msg.message || '',
                elicitationRequestedSchema: msg.requestedSchema || null,
                elicitationSubmitted: false,
              }
              copy[mi] = { ...m, blocks } as any
              found = true
              attached = true
              break
            }
            if (found) break
          }
          if (!attached && msg.requestId) {
            pendingElicitationsRef.current.push({
              requestId: msg.requestId,
              mode: msg.mode || 'form',
              message: msg.message || '',
              requestedSchema: msg.requestedSchema || null,
            })
          }
          if (msg.requestId) {
            setLatestElicitationRequestId(msg.requestId)
          }
          break
        }

        case 'result': {
          const last = copy[copy.length - 1]
          if (last?.role === 'assistant') {
            copy[copy.length - 1] = { ...last, streaming: false } as any
          }
          if (msg.isError && msg.errors?.length) {
            copy.push({ role: 'system', text: `Error: ${msg.errors.join(', ')}`, ts: Date.now() })
          }
          break
        }
      }

      return copy
    })

    if (msg.type === 'result') {
      setStatus('idle')
      setIsThinking(false)
    }

    scrollToBottom()
    if (msg.type === 'text_start' || msg.type === 'message_start') {
      setStatus('running')
    }
  }, [scrollToBottom])

  // File handling
  const processFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files)
    const newAttachments: AttachedFile[] = arr.map(file => {
      const isImage = file.type.startsWith('image/')
      return {
        file,
        name: file.name,
        type: file.type,
        previewUrl: isImage ? URL.createObjectURL(file) : undefined,
      }
    })
    setAttachedFiles(prev => [...prev, ...newAttachments])
  }, [])

  const removeFile = useCallback((index: number) => {
    setAttachedFiles(prev => {
      const next = [...prev]
      if (next[index].previewUrl) URL.revokeObjectURL(next[index].previewUrl!)
      next.splice(index, 1)
      return next
    })
  }, [])

  // Convert File to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // Strip data URL prefix
        const base64 = result.includes(',') ? result.split(',')[1] : result
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // Drag-drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragCounterRef.current++
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragCounterRef.current--
    if (dragCounterRef.current === 0) {
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragCounterRef.current = 0
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files)
    }
  }, [processFiles])

  // Extract plain text from a message for copying
  const getMessageText = (msg: ChatMessage): string => {
    if (msg.role === 'user' || msg.role === 'system') return msg.text
    return msg.blocks
      .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
      .map(b => b.text)
      .join('\n\n')
  }

  // Copy a message to clipboard with brief visual feedback
  const copyMessage = useCallback((msg: ChatMessage, idx: number) => {
    const text = getMessageText(msg)
    if (!text) return
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(idx)
      setTimeout(() => setCopiedIndex(prev => prev === idx ? null : prev), 1500)
    }).catch(() => {})
  }, [])

  // Pencil button: enter inline edit mode for the given user message
  const startEdit = useCallback((msg: ChatMessage) => {
    if (msg.role !== 'user' || !msg.uuid) return
    setEditingUuid(msg.uuid)
    setEditingText(msg.text)
  }, [])

  // Cancel inline edit
  const cancelEdit = useCallback(() => {
    setEditingUuid(null)
    setEditingText('')
  }, [])

  // Commit inline edit — truncates messages from edit point and sends rewind
  const commitEdit = useCallback(() => {
    const text = editingText.trim()
    const uuid = editingUuid
    if (!text || !uuid || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

    setMessages(prev => {
      const cutIdx = prev.findIndex(m => m.uuid === uuid)
      const base = cutIdx !== -1 ? prev.slice(0, cutIdx) : prev
      return [...base, {
        role: 'user' as const,
        text,
        ts: Date.now(),
      }]
    })

    setEditingUuid(null)
    setEditingText('')
    setStatus('running')
    setErrorMsg(null)

    wsRef.current.send(JSON.stringify({
      type: 'chat_send',
      prompt: text,
      rewindFromUuid: uuid,
    }))

    scrollToBottom()
  }, [editingText, editingUuid, scrollToBottom])

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items
    if (!items) return
    const imageFiles: File[] = []
    for (const item of items) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          const ext = file.type.split('/')[1] || 'png'
          const named = file.name && file.name !== 'image.png'
            ? file
            : new File([file], `pasted-${Date.now()}.${ext}`, { type: file.type })
          imageFiles.push(named)
        }
      }
    }
    if (imageFiles.length > 0) {
      e.preventDefault()
      processFiles(imageFiles)
    }
  }, [processFiles])

  // Send message
  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text && attachedFiles.length === 0) return

    if (!sessionId) {
      if (status === 'connecting') return
      pendingInitialSendRef.current = { text, files: [...attachedFiles] }
      setStatus('connecting')
      setErrorMsg(null)
      try {
        const res = await fetch(`${TS_HTTP}/api/sessions/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentName: agent }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        onSessionCreated?.({
          id: data.sessionId,
          name: data.session?.name || agent,
          active: data.session?.active ?? false,
          ts: Date.now(),
        })
      } catch {
        pendingInitialSendRef.current = null
        setStatus('error')
        setErrorMsg(`Could not reach terminal-server at ${TS_HTTP}. Is it running?`)
      }
      return
    }

    await performSend(text, attachedFiles)
  }, [agent, input, attachedFiles, sessionId, status, onSessionCreated, performSend])

  // Detect slash-command region from caret position
  const detectSlash = useCallback((text: string, caret: number) => {
    // Scan backwards from caret to find a '/' preceded by start-of-string, space, or newline
    const before = text.slice(0, caret)
    const match = before.match(/(^|[\s\n])(\/[\w-]*)$/)
    if (!match) return null
    const anchorStart = before.lastIndexOf('/')
    const query = match[2].slice(1) // text after '/'
    return { anchorStart, query }
  }, [])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    const caret = e.target.selectionStart ?? val.length
    setInput(val)

    const detected = detectSlash(val, caret)
    if (detected) {
      const { anchorStart, query } = detected
      const q = query.toLowerCase()
      const filtered = q
        ? allSkills
            .map(s => {
              const nameIdx = s.name.toLowerCase().indexOf(q)
              if (nameIdx === -1) return null
              return { skill: s, nameIdx }
            })
            .filter((x): x is { skill: SkillItem; nameIdx: number } => x !== null)
            .sort((a, b) => a.nameIdx - b.nameIdx || a.skill.name.localeCompare(b.skill.name))
            .slice(0, 8)
            .map(x => x.skill)
        : allSkills.slice(0, 8)
      setSlashPopup({ open: true, query, items: filtered, selectedIndex: 0, anchorStart })
    } else {
      setSlashPopup(p => p.open ? { ...p, open: false } : p)
    }
  }, [allSkills, detectSlash])

  const insertSlash = useCallback((skill: SkillItem) => {
    const ta = inputRef.current
    if (!ta) return
    const { anchorStart } = slashPopup
    const before = input.slice(0, anchorStart)
    const after = input.slice(ta.selectionStart ?? input.length)
    // Find end of partial word after anchorStart up to current caret
    const newVal = before + '/' + skill.name + ' ' + after
    setInput(newVal)
    setSlashPopup(p => ({ ...p, open: false }))
    // Restore focus & caret position
    requestAnimationFrame(() => {
      if (ta) {
        const pos = (before + '/' + skill.name + ' ').length
        ta.focus()
        ta.setSelectionRange(pos, pos)
      }
    })
  }, [input, slashPopup])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (slashPopup.open) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSlashPopup(p => ({
          ...p,
          selectedIndex: p.items.length === 0 ? 0 : (p.selectedIndex + 1) % p.items.length,
        }))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSlashPopup(p => ({
          ...p,
          selectedIndex: p.items.length === 0 ? 0 : (p.selectedIndex - 1 + p.items.length) % p.items.length,
        }))
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        if (slashPopup.items.length > 0) {
          insertSlash(slashPopup.items[slashPopup.selectedIndex])
        }
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setSlashPopup(p => ({ ...p, open: false }))
        return
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const stopChat = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'chat_stop' }))
    }
    setStatus('idle')
    setIsThinking(false)
  }, [])

  const isConnecting = externalLoading || status === 'connecting'
  const effectiveError = externalError || (status === 'error' ? errorMsg : null)
  const inputDisabled = isConnecting || !!effectiveError
  const canSend = (input.trim().length > 0 || attachedFiles.length > 0) && !inputDisabled && status !== 'running'

  return (
    <div
      className="flex flex-col h-full bg-[#0C111D] relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Corner status indicator */}
      {(isConnecting || effectiveError) && (
        <div
          className="absolute top-3 right-3 z-40 flex items-center gap-1.5 px-2 py-1 rounded-full border text-[10px] max-w-[280px]"
          style={{
            background: effectiveError ? '#ef444415' : '#F59E0B15',
            borderColor: effectiveError ? '#ef444440' : '#F59E0B40',
            color: effectiveError ? '#ef4444' : '#F59E0B',
          }}
          title={effectiveError || 'Connecting...'}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${effectiveError ? '' : 'animate-pulse'}`}
            style={{ background: effectiveError ? '#ef4444' : '#F59E0B' }}
          />
          <span className="truncate">{effectiveError || 'Connecting...'}</span>
        </div>
      )}

      {/* Ticket binding pill (Feature 1.3) */}
      {sessionId && (
        <div className="absolute top-3 left-3 z-40">
          <button
            onClick={() => setShowTicketPicker(v => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] transition-colors"
            style={{
              background: ticketId ? `${accentColor}10` : '#161b22',
              borderColor: ticketId ? `${accentColor}30` : '#21262d',
              color: ticketId ? accentColor : '#667085',
            }}
            title={ticketId ? `Ticket #${ticketId.slice(0, 8)} attached` : 'Attach to a ticket'}
          >
            <TicketIcon size={11} />
            <span className="font-mono">
              {ticketId ? `#${ticketId.slice(0, 8)}` : 'No ticket'}
            </span>
          </button>
          {showTicketPicker && (
            <div
              className="absolute mt-1.5 left-0 w-72 rounded-lg border bg-[#161b22] shadow-xl z-50 max-h-80 overflow-y-auto"
              style={{ borderColor: '#21262d' }}
            >
              <div className="px-3 py-2 border-b border-[#21262d] text-[10px] text-[#667085] uppercase tracking-wider">
                Attach to ticket
              </div>
              {ticketId && (
                <button
                  onClick={() => bindTicket(null)}
                  className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-white/5 border-b border-[#21262d] flex items-center gap-2"
                >
                  <X size={12} /> Detach current ticket
                </button>
              )}
              <button
                onClick={createAndBindTicket}
                className="w-full text-left px-3 py-2 text-xs text-[#e6edf3] hover:bg-white/5 border-b border-[#21262d] flex items-center gap-2"
                style={{ color: accentColor }}
              >
                <Plus size={12} /> Create new ticket
              </button>
              {tickets.length === 0 ? (
                <div className="px-3 py-3 text-[11px] text-[#667085] italic">
                  No open tickets for @{agent}
                </div>
              ) : (
                tickets.map(t => (
                  <button
                    key={t.id}
                    onClick={() => bindTicket(t.id)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-white/5 transition-colors flex items-start gap-2"
                  >
                    <span
                      className="font-mono text-[10px] mt-0.5 shrink-0"
                      style={{ color: t.id === ticketId ? accentColor : '#667085' }}
                    >
                      #{t.id.slice(0, 6)}
                    </span>
                    <span className="text-[#e6edf3] truncate flex-1">{t.title}</span>
                    {t.id === ticketId && <CheckCircle2 size={11} style={{ color: accentColor }} />}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Pending approval badge */}
      {pendingApprovals.length > 0 && (
        <div
          className="absolute top-3 z-40 flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] shadow-sm"
          style={{
            right: sessionId ? '12px' : '12px',
            background: '#F59E0B15',
            borderColor: '#F59E0B40',
            color: '#F59E0B',
          }}
        >
          <ShieldAlert size={11} />
          <span>{pendingApprovals.length === 1 ? 'Approval required' : `${pendingApprovals.length} approvals required`}</span>
        </div>
      )}

      {/* Drag-drop overlay */}
      {isDragging && (
        <div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 pointer-events-none"
          style={{
            background: `${accentColor}08`,
            border: `2px dashed ${accentColor}50`,
          }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: `${accentColor}15` }}
          >
            <Upload size={24} style={{ color: accentColor }} />
          </div>
          <p className="text-sm font-medium" style={{ color: accentColor }}>
            Drop files here
          </p>
        </div>
      )}

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 pb-24 space-y-5">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: `${accentColor}15`, border: `1px solid ${accentColor}30` }}
            >
              <TermIcon size={24} style={{ color: accentColor }} />
            </div>
            <p className="text-[#e6edf3] font-medium text-sm mb-1">
              Chat with @{agent}
            </p>
            <p className="text-[#667085] text-xs max-w-[300px]">
              Type a message below to start a conversation. The agent has access to your workspace tools.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i}>
            {msg.role === 'user' && editingUuid && msg.uuid === editingUuid && (
              <div className="flex justify-end">
                <div className="w-full max-w-[85%] rounded-2xl border bg-[#1a2744] px-3 py-2" style={{ borderColor: accentColor + '60' }}>
                  <textarea
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.preventDefault()
                        cancelEdit()
                      } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                        e.preventDefault()
                        commitEdit()
                      }
                    }}
                    autoFocus
                    rows={Math.min(10, Math.max(2, editingText.split('\n').length))}
                    className="w-full bg-transparent text-sm text-[#e6edf3] placeholder:text-[#667085] focus:outline-none resize-none"
                  />
                  <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-[#21262d]">
                    <button
                      onClick={cancelEdit}
                      className="px-3 py-1 rounded-md text-xs text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={commitEdit}
                      disabled={!editingText.trim()}
                      className="px-3 py-1 rounded-md text-xs border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        borderColor: `${accentColor}40`,
                        background: `${accentColor}15`,
                        color: accentColor,
                      }}
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            )}

            {msg.role === 'user' && !(editingUuid && msg.uuid === editingUuid) && (
              <div className="flex justify-end group/usermsg items-end gap-1">
                {/* Hover-revealed action buttons */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover/usermsg:opacity-100 transition-opacity mr-1">
                  <button
                    onClick={() => copyMessage(msg, i)}
                    className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-md text-[#667085] hover:text-[#e6edf3] hover:bg-[#21262d]"
                    title={copiedIndex === i ? 'Copied' : 'Copy message'}
                  >
                    {copiedIndex === i ? <Check size={12} className="text-[#00FFA7]" /> : <Copy size={12} />}
                  </button>
                  {msg.uuid && status !== 'running' && !editingUuid && (
                    <button
                      onClick={() => startEdit(msg)}
                      className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-md text-[#667085] hover:text-[#e6edf3] hover:bg-[#21262d]"
                      title="Edit message"
                    >
                      <Pencil size={12} />
                    </button>
                  )}
                </div>
                <div className="max-w-[70%] space-y-2">
                  {/* File attachments in bubble */}
                  {(msg as any).files && (msg as any).files.length > 0 && (
                    <div className="flex flex-wrap gap-2 justify-end">
                      {(msg as any).files.map((f: FileRef, fi: number) => (
                        f.previewUrl ? (
                          <img
                            key={fi}
                            src={f.previewUrl}
                            alt={f.name}
                            className="w-24 h-24 object-cover rounded-xl border border-[#21262d]"
                          />
                        ) : (
                          <div
                            key={fi}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#21262d] bg-[#161b22]"
                          >
                            <FileIcon size={12} className="text-[#667085]" />
                            <span className="text-[11px] text-[#8b949e] truncate max-w-[140px]">{f.name}</span>
                          </div>
                        )
                      ))}
                    </div>
                  )}
                  {/* Text bubble */}
                  {(msg as any).text && (
                    <div className="px-4 py-2.5 rounded-2xl rounded-br-md bg-[#1a2744] border border-[#21262d] text-[#e6edf3] text-sm leading-relaxed">
                      {(msg as any).text}
                    </div>
                  )}
                </div>
              </div>
            )}

            {msg.role === 'assistant' && (
              <div className="flex gap-3 group/asstmsg">
                <div className="flex-shrink-0 mt-0.5">
                  <AgentAvatar name={agent} size={28} />
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  {(msg as any).blocks.map((block: AssistantBlock, j: number) => (
                    <div key={j}>
                      {block.type === 'text' && (
                        <div className="text-sm text-[#e6edf3] leading-relaxed prose-invert max-w-none">
                          <Markdown>{block.text}</Markdown>
                        </div>
                      )}
                      {block.type === 'tool_use' && (
                        <ToolCard
                          block={block}
                          accentColor={accentColor}
                          fallbackElicitationRequestId={latestElicitationRequestId}
                          resolveFallbackElicitationRequestId={() => {
                            const pendingTail = pendingElicitationsRef.current[pendingElicitationsRef.current.length - 1]
                            return latestElicitationRequestIdRef.current || pendingTail?.requestId || null
                          }}
                          onSubmitElicitation={async (requestId, content) => {
                            return respondToElicitation(requestId, content)
                          }}
                          onSendPrompt={(prompt) => performSend(prompt, [])}
                        />
                      )}
                    </div>
                  ))}
                  {/* Typing indicator — shown while streaming with no visible content yet */}
                  {(msg as any).streaming && (() => {
                    const blocks = (msg as any).blocks as AssistantBlock[]
                    const hasVisibleContent = blocks.some(b => b.type === 'text' || b.type === 'tool_use')
                    return !hasVisibleContent
                  })() && (
                    <TypingIndicator accentColor={accentColor} isThinking={isThinking} />
                  )}
                  {/* Copy button — shown on hover when not streaming and there's text to copy */}
                  {!(msg as any).streaming && getMessageText(msg) && (
                    <div className="opacity-0 group-hover/asstmsg:opacity-100 transition-opacity">
                      <button
                        onClick={() => copyMessage(msg, i)}
                        className="flex items-center justify-center w-6 h-6 rounded-md text-[#667085] hover:text-[#e6edf3] hover:bg-[#21262d]"
                        title={copiedIndex === i ? 'Copied' : 'Copy message'}
                      >
                        {copiedIndex === i ? <Check size={12} className="text-[#00FFA7]" /> : <Copy size={12} />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {msg.role === 'system' && (
              <div className="text-center">
                <span className="text-[11px] text-[#667085] bg-[#161b22] px-3 py-1 rounded-full border border-[#21262d]">
                  {msg.text}
                </span>
              </div>
            )}
          </div>
        ))}

        {/* Permission approval cards */}
        {pendingApprovals.map(req => (
          <ApprovalCard
            key={req.requestId}
            req={req}
            accentColor={accentColor}
            onAllow={() => respondToApproval(req.requestId, true)}
            onDeny={() => respondToApproval(req.requestId, false)}
          />
        ))}

        {/* Global neutral indicator while the assistant has not emitted a visible block yet */}
        {status === 'running' && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <AgentAvatar name={agent} size={28} />
            </div>
            <div>
              <TypingIndicator accentColor={accentColor} isThinking={isThinking} />
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 border-t border-[#21262d] bg-[#0d1117] px-4 py-3">
        <div className="max-w-3xl mx-auto space-y-2">
          {/* File previews */}
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 px-1">
              {attachedFiles.map((af, idx) => (
                <div key={idx} className="relative group">
                  {af.previewUrl ? (
                    <div className="relative">
                      <img
                        src={af.previewUrl}
                        alt={af.name}
                        className="w-16 h-16 object-cover rounded-lg border border-[#21262d]"
                      />
                      <button
                        onClick={() => removeFile(idx)}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#161b22] border border-[#21262d] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[#667085] hover:text-[#ef4444]"
                      >
                        <X size={9} />
                      </button>
                    </div>
                  ) : (
                    <div className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#21262d] bg-[#161b22] pr-6">
                      <FileIcon size={11} className="text-[#667085] flex-shrink-0" />
                      <span className="text-[11px] text-[#8b949e] truncate max-w-[120px]">{af.name}</span>
                      <button
                        onClick={() => removeFile(idx)}
                        className="absolute right-1.5 text-[#667085] hover:text-[#ef4444] transition-colors"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Input row wrapper — relative so popup can anchor to bottom of it */}
          <div className="relative">
            {/* Slash-command autocomplete popup */}
            {slashPopup.open && (
              <div
                className="absolute left-0 right-0 rounded-xl border bg-[#161b22] shadow-xl overflow-y-auto z-50"
                style={{ borderColor: '#21262d', maxHeight: '280px', bottom: 'calc(100% + 6px)' }}
              >
                <div className="px-3 py-1.5 border-b border-[#21262d] text-[10px] text-[#667085] uppercase tracking-wider">
                  Skills
                </div>
                {slashPopup.items.length === 0 ? (
                  <div className="px-3 py-3 text-[11px] text-[#667085] italic">
                    No matching skills
                  </div>
                ) : (
                  slashPopup.items.map((skill, idx) => (
                    <button
                      key={skill.name}
                      onMouseDown={(e) => { e.preventDefault(); insertSlash(skill) }}
                      className="w-full text-left px-3 py-2 text-xs flex items-baseline gap-3 transition-colors"
                      style={{
                        background: idx === slashPopup.selectedIndex ? `${accentColor}15` : 'transparent',
                        borderLeft: idx === slashPopup.selectedIndex ? `2px solid ${accentColor}` : '2px solid transparent',
                      }}
                    >
                      <span
                        className="font-mono shrink-0"
                        style={{ color: accentColor }}
                      >
                        /{skill.name}
                      </span>
                      {skill.description && (
                        <span className="text-[#667085] truncate text-[11px]">
                          {skill.description.slice(0, 80)}
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}

          {/* Input row */}
          <div
            className="flex items-end gap-2 rounded-xl border bg-[#161b22] px-3 py-2"
            style={{ borderColor: '#21262d' }}
          >
            {/* Paperclip button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg text-[#667085] hover:text-[#e6edf3] hover:bg-[#21262d] transition-colors mb-0.5"
              title="Attach file"
            >
              <Paperclip size={14} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) processFiles(e.target.files)
                e.target.value = ''
              }}
            />

            {/* Textarea */}
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={`Message @${agent}...`}
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm text-[#e6edf3] placeholder:text-[#667085] focus:outline-none max-h-32 disabled:cursor-not-allowed disabled:opacity-60"
              style={{ minHeight: '28px' }}
              onInput={(e) => {
                const el = e.currentTarget
                el.style.height = 'auto'
                el.style.height = Math.min(el.scrollHeight, 128) + 'px'
              }}
              disabled={inputDisabled}
            />

            {/* Send / Stop */}
            {status === 'running' ? (
              <button
                onClick={stopChat}
                className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors mb-0.5"
              >
                <Square size={14} />
              </button>
            ) : (
              <button
                onClick={sendMessage}
                disabled={!canSend}
                className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg border transition-colors mb-0.5"
                style={{
                  borderColor: canSend ? `${accentColor}40` : '#21262d',
                  background: canSend ? `${accentColor}15` : 'transparent',
                  color: canSend ? accentColor : '#667085',
                }}
              >
                <Send size={14} />
              </button>
            )}
          </div>
          </div>{/* end input row wrapper (relative) */}
        </div>

      </div>

      {/* Typing indicator keyframe styles */}
      <style>{`
        @keyframes chat-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes chat-pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// ── Sub-components ──

function TypingIndicator({ accentColor, isThinking }: { accentColor: string; isThinking?: boolean }) {
  void isThinking
  return (
    <div className="flex items-center py-1">
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{
              backgroundColor: accentColor,
              animation: `chat-bounce 1.4s ease-in-out infinite`,
              animationDelay: `${i * 0.16}s`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

function AgentInputToggle({ parsedInput, rawInput }: { parsedInput: any; rawInput: string }) {
  const [showInput, setShowInput] = useState(false)
  return (
    <div className="border-t border-[#21262d]/50">
      <button
        onClick={() => setShowInput(v => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] text-[#667085] hover:text-[#8b949e] transition-colors w-full"
      >
        {showInput ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        Input
      </button>
      {showInput && (
        <pre className="px-3 pb-2 text-[11px] text-[#8b949e] font-mono whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
          {parsedInput ? JSON.stringify(parsedInput, null, 2) : rawInput}
        </pre>
      )}
    </div>
  )
}

function ToolCard({ block, accentColor, onSubmitElicitation, onSendPrompt, fallbackElicitationRequestId, resolveFallbackElicitationRequestId }: { block: Extract<AssistantBlock, { type: 'tool_use' }>; accentColor: string; onSubmitElicitation?: (requestId: string, content: Record<string, unknown>) => Promise<boolean> | boolean; onSendPrompt?: (prompt: string) => Promise<void> | void; fallbackElicitationRequestId?: string | null; resolveFallbackElicitationRequestId?: () => string | null }) {
  const normalizedBlock = normalizeAssistantBlock(block) as Extract<AssistantBlock, { type: 'tool_use' }>
  const [open, setOpen] = useState(false)
  const [askAnswers, setAskAnswers] = useState<Record<number, string[]>>({})
  const [askOtherText, setAskOtherText] = useState<Record<number, string>>({})
  const [sendingAskAnswers, setSendingAskAnswers] = useState(false)
  const [askFallbackSubmitted, setAskFallbackSubmitted] = useState(false)

  let parsedInput: any = null
  if (typeof normalizedBlock.input === 'string') {
    try { parsedInput = JSON.parse(normalizedBlock.input) } catch {}
  } else if (normalizedBlock.input && typeof normalizedBlock.input === 'object') {
    parsedInput = normalizedBlock.input
  }

  // Detect Agent/SendMessage tools — render special subagent card
  const isAgentTool = normalizedBlock.toolName === 'Agent' || normalizedBlock.toolName === 'SendMessage'
  const subagentName = safeText(parsedInput?.subagent_type || parsedInput?.name || parsedInput?.to || '')

  if (isAgentTool) {
    const isRunning = normalizedBlock.subagentStatus === 'running'
    const isDone = normalizedBlock.done || normalizedBlock.subagentStatus === 'completed' || normalizedBlock.subagentStatus === 'failed'
    const isFailed = normalizedBlock.subagentStatus === 'failed'
    const subagentTools = normalizedBlock.subagentTools || []
    const toolCount = subagentTools.length

    return (
      <div className="border border-[#21262d] rounded-lg overflow-hidden">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2.5 w-full px-3 py-2.5 text-[12px] bg-[#161b22] hover:bg-[#1c2333] transition-colors"
        >
          {open ? <ChevronDown size={12} className="text-[#667085]" /> : <ChevronRight size={12} className="text-[#667085]" />}

          {/* Subagent avatar */}
          {(() => {
            const isUuid = /^[0-9a-f]{8,}$/i.test(subagentName)
            const displayName = isUuid ? '' : subagentName
            return displayName ? (
              <AgentAvatar name={displayName.replace('custom-', '')} size={20} />
            ) : (
              getToolIcon(normalizedBlock.toolName, accentColor)
            )
          })()}

          <span className="font-medium text-[#e6edf3]">
            {(() => {
              const isUuid = /^[0-9a-f]{8,}$/i.test(subagentName)
              return isUuid ? getToolLabel(normalizedBlock.toolName) : subagentName ? `@${subagentName}` : getToolLabel(normalizedBlock.toolName)
            })()}
          </span>

          <span className="ml-auto flex-shrink-0 flex items-center gap-2">
            {toolCount > 0 && (
              <span className="text-[10px] text-[#667085] tabular-nums">
                {toolCount} {toolCount === 1 ? 'tool' : 'tools'}
              </span>
            )}
            {isRunning && block.subagentSummary && (
              <span className="text-[10px] text-[#667085] truncate max-w-[200px]" style={{ animation: 'chat-pulse 2s ease-in-out infinite' }}>
                {block.subagentSummary}
              </span>
            )}
            {isDone
              ? <ToolStateBadge state={isFailed ? 'failed' : 'done'} accentColor={accentColor} />
              : <ToolStateBadge state="running" accentColor={accentColor} />}
          </span>
        </button>
        {open && (
          <div className="border-t border-[#21262d] bg-[#0d1117]">
            <div className="max-h-80 overflow-y-auto">
              {subagentTools.length === 0 ? (
                <div className="px-3 py-2 text-[11px] text-[#667085]">No tool calls yet</div>
              ) : (
                subagentTools.map((t, i) => {
                  let parsedToolInput: any = null
                  try {
                    parsedToolInput = JSON.parse(t.input)
                  } catch {
                    parsedToolInput = null
                  }
                  const inputPreview = summarizeToolInput(t.toolName, parsedToolInput, t.input).slice(0, 80)
                  return (
                    <div key={t.toolUseId || i} className="flex items-center gap-2 px-3 py-1.5 text-[11px] border-t border-[#21262d]/50 first:border-t-0">
                      {getToolIcon(t.toolName, accentColor, 11, 'text-[#667085] flex-shrink-0')}
                      <span className="text-[#8b949e] font-medium flex-shrink-0">{getToolLabel(t.toolName)}</span>
                      {inputPreview && (
                        <span className="text-[#667085] truncate">{inputPreview}</span>
                      )}
                    </div>
                  )
                })
              )}
            </div>
            {normalizedBlock.input && <AgentInputToggle parsedInput={parsedInput} rawInput={safeText(normalizedBlock.input)} />}
          </div>
        )}
      </div>
    )
  }

  // TodoWrite — pretty checklist renderer
  if (normalizedBlock.toolName === 'TodoWrite' && Array.isArray(parsedInput?.todos)) {
    const todos: Array<{ content: string; status: string; priority?: string; id?: string }> = parsedInput.todos
    const completedCount = todos.filter(t => t.status === 'completed').length

    return (
      <div className="border border-[#21262d] rounded-lg overflow-hidden">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 w-full px-3 py-2 text-[12px] bg-[#161b22] hover:bg-[#1c2333] transition-colors"
        >
          {open ? <ChevronDown size={12} className="text-[#667085]" /> : <ChevronRight size={12} className="text-[#667085]" />}
          <CheckCircle2 size={13} style={{ color: accentColor }} />
          <span className="font-medium text-[#e6edf3]">TodoWrite</span>
          <span className="text-[#667085] text-[11px]">{completedCount}/{todos.length} done</span>
          <span className="ml-auto flex-shrink-0">
            {normalizedBlock.done
              ? <ToolStateBadge state="done" accentColor={accentColor} />
              : <ToolStateBadge state="running" accentColor={accentColor} />}
          </span>
        </button>
        <div className="px-3 py-2 border-t border-[#21262d] bg-[#0d1117] space-y-1">
          {todos.map((todo, i) => {
            const isPending = todo.status === 'pending'
            const isInProgress = todo.status === 'in_progress'
            const isCompleted = todo.status === 'completed'
            const icon = isPending ? '○' : isInProgress ? '◐' : '●'
            return (
              <div key={i} className="flex items-start gap-2 text-[12px]">
                <span
                  className="flex-shrink-0 mt-0.5 font-mono text-[13px]"
                  style={{ color: isPending ? '#667085' : '#00FFA7' }}
                >
                  {icon}
                </span>
                <span
                  className={isCompleted ? 'line-through opacity-60' : ''}
                  style={{ color: isPending ? '#8b949e' : isCompleted ? '#8b949e' : '#e6edf3' }}
                >
                  {todo.content}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (normalizedBlock.toolName === 'AskUserQuestion' && Array.isArray(parsedInput?.questions)) {
    const questions: Array<{ question?: string; header?: string; options?: Array<{ label?: string; description?: string }>; multiSelect?: boolean }> = parsedInput.questions
    const schemaPropertyKeys = (() => {
      const schema = normalizedBlock.elicitationRequestedSchema as any
      if (!schema || typeof schema !== 'object') return [] as string[]
      if (!schema.properties || typeof schema.properties !== 'object') return [] as string[]
      return Object.keys(schema.properties)
    })()
    const totalOptions = questions.reduce((acc, q) => acc + (Array.isArray(q.options) ? q.options.length : 0), 0)
    const OTHER_SENTINEL = '__other__'
    const hasSubmittedAsk = normalizedBlock.elicitationSubmitted || askFallbackSubmitted
    const isAskLocked = hasSubmittedAsk || sendingAskAnswers
    const allAnswered = questions.every((q, idx) => {
      if (!q.question) return true
      const selected = Array.isArray(askAnswers[idx]) ? askAnswers[idx] : []
      if (selected.includes(OTHER_SENTINEL)) {
        return (askOtherText[idx] || '').trim().length > 0
      }
      return selected.length > 0
    })
    const canSubmitStructured = !hasSubmittedAsk && !!onSubmitElicitation

    const toggleAnswer = (questionIdx: number, optionLabel: string, multiSelect?: boolean) => {
      setAskAnswers(prev => {
        const current = prev[questionIdx] || []
        if (!multiSelect) {
          return { ...prev, [questionIdx]: [optionLabel] }
        }
        const next = current.includes(optionLabel)
          ? current.filter(v => v !== optionLabel)
          : [...current, optionLabel]
        return { ...prev, [questionIdx]: next }
      })
    }

    const submitAnswers = async () => {
      const requestIdForSubmit = normalizedBlock.elicitationRequestId
        || resolveFallbackElicitationRequestId?.()
        || fallbackElicitationRequestId
        || null
      if (sendingAskAnswers || !allAnswered || isAskLocked) return
      const content = questions.reduce<Record<string, unknown>>((acc, q: any, idx) => {
        const selected = askAnswers[idx] || []
        const otherText = (askOtherText[idx] || '').trim()
        const selectedWithoutOther = selected.filter(v => v !== OTHER_SENTINEL)
        const key = schemaPropertyKeys[idx]
          || (typeof q?.id === 'string' && q.id.trim()
          ? q.id.trim()
          : (q.question || `question_${idx + 1}`))
        if (q.multiSelect) {
          acc[key] = otherText ? [...selectedWithoutOther, otherText] : selectedWithoutOther
        } else {
          acc[key] = otherText || selectedWithoutOther[0] || ''
        }
        return acc
      }, {})
      const fallbackPrompt = [
        'Aqui estao minhas respostas para as perguntas estruturadas:',
        ...questions.map((q: any, idx) => {
          const selected = askAnswers[idx] || []
          const otherText = (askOtherText[idx] || '').trim()
          const selectedWithoutOther = selected.filter(v => v !== OTHER_SENTINEL)
          const answer = q.multiSelect
            ? (otherText ? [...selectedWithoutOther, otherText] : selectedWithoutOther).join(', ')
            : (otherText || selectedWithoutOther[0] || '')
          return `- ${q.question || `Question ${idx + 1}`}: ${answer}`
        }),
      ].join('\n')
      try {
        setSendingAskAnswers(true)
        if (canSubmitStructured && requestIdForSubmit && onSubmitElicitation) {
          const submitted = await onSubmitElicitation(requestIdForSubmit, content)
          if (submitted) return
        }
        if (onSendPrompt) {
          await onSendPrompt(fallbackPrompt)
          setAskFallbackSubmitted(true)
        }
      } finally {
        setSendingAskAnswers(false)
      }
    }

    return (
      <div className="relative z-10 border border-[#21262d] rounded-lg overflow-hidden pointer-events-auto">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 w-full px-3 py-2 text-[12px] bg-[#161b22] hover:bg-[#1c2333] transition-colors"
        >
          {open ? <ChevronDown size={12} className="text-[#667085]" /> : <ChevronRight size={12} className="text-[#667085]" />}
          <ShieldAlert size={13} style={{ color: accentColor }} />
          <span className="font-medium text-[#e6edf3]">AskUserQuestion</span>
          <span className="text-[#667085] text-[11px]">
            {questions.length} question{questions.length !== 1 ? 's' : ''}{totalOptions ? ` • ${totalOptions} options` : ''}
          </span>
          <span className="ml-auto flex-shrink-0">
              {hasSubmittedAsk
              ? <ToolStateBadge state="done" accentColor={accentColor} />
              : <ToolStateBadge state="needs_input" accentColor={accentColor} />}
          </span>
        </button>
        {open && (
          <div className="relative z-10 px-3 py-3 border-t border-[#21262d] bg-[#0d1117] space-y-3 pointer-events-auto">
            {questions.map((q, idx) => (
              <div key={idx} className="rounded-lg border border-[#21262d] bg-[#11161d] p-3">
                <div className="flex items-center gap-2 mb-2">
                  {q.header && (
                    <span className="text-[10px] uppercase tracking-wide rounded-full px-2 py-0.5 border border-[#2b3442] text-[#8b949e]">
                      {q.header}
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-[#e6edf3] font-medium mb-2">{q.question || `Question ${idx + 1}`}</p>
                {Array.isArray(q.options) && q.options.length > 0 && (
                  <div className="space-y-1.5">
                    {q.options.map((opt, optIdx) => {
                      const optionLabel = opt.label || `Option ${optIdx + 1}`
                      const selected = (askAnswers[idx] || []).includes(optionLabel)
                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => toggleAnswer(idx, optionLabel, q.multiSelect)}
                          className="w-full text-left rounded-md border px-2.5 py-2 transition-colors"
                          style={{
                            borderColor: selected ? `${accentColor}66` : '#21262d',
                            background: selected ? `${accentColor}12` : '#0d1117',
                          }}
                          disabled={isAskLocked}
                        >
                          <div className="text-[11px] text-[#e6edf3]">{optionLabel}</div>
                          {opt.description && (
                            <div className="text-[10px] text-[#667085] mt-0.5">{opt.description}</div>
                          )}
                        </button>
                      )
                    })}
                    {(() => {
                      const selected = (askAnswers[idx] || []).includes(OTHER_SENTINEL)
                      return (
                        <div className="rounded-md border px-2.5 py-2" style={{ borderColor: selected ? `${accentColor}66` : '#21262d', background: selected ? `${accentColor}12` : '#0d1117' }}>
                          <button
                            type="button"
                            onClick={() => toggleAnswer(idx, OTHER_SENTINEL, q.multiSelect)}
                            className="w-full text-left"
                            disabled={isAskLocked}
                          >
                            <div className="text-[11px] text-[#e6edf3]">Other</div>
                            <div className="text-[10px] text-[#667085] mt-0.5">Provide a custom text answer.</div>
                          </button>
                          {selected && (
                            <input
                              type="text"
                              value={askOtherText[idx] || ''}
                              onChange={(e) => setAskOtherText(prev => ({ ...prev, [idx]: e.target.value }))}
                              placeholder="Type your answer"
                              className="mt-2 w-full rounded-md border border-[#21262d] bg-[#11161d] px-2.5 py-2 text-[11px] text-[#e6edf3] placeholder:text-[#667085] outline-none"
                              disabled={isAskLocked}
                            />
                          )}
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>
            ))}
            <div className="relative z-20 flex items-center justify-between gap-3 pt-2 pointer-events-auto">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  if (!allAnswered || isAskLocked) return
                  void submitAnswers()
                }}
                disabled={!allAnswered || isAskLocked}
                className="relative z-30 min-w-[96px] px-3 py-2 rounded-md text-[11px] font-medium pointer-events-auto disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: `${accentColor}20`, color: accentColor, border: `1px solid ${accentColor}40` }}
              >
                {hasSubmittedAsk ? 'Done' : sendingAskAnswers ? 'Sending...' : 'Submit'}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Regular tool card
  const displayInfo = summarizeToolInput(normalizedBlock.toolName, parsedInput, safeText(normalizedBlock.input)).slice(0, 140)
  const detailRows = getToolDetailRows(normalizedBlock.toolName, parsedInput)
  const isFileTool = normalizedBlock.toolName === 'Read' || normalizedBlock.toolName === 'Write' || normalizedBlock.toolName === 'Edit'
  const isTerminalTool = normalizedBlock.toolName === 'Bash'

  return (
    <div className="border border-[#21262d] rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-start gap-2 w-full px-3 py-2 text-[12px] bg-[#161b22] hover:bg-[#1c2333] transition-colors"
      >
        <span className="mt-0.5">
          {open ? <ChevronDown size={12} className="text-[#667085]" /> : <ChevronRight size={12} className="text-[#667085]" />}
        </span>
        <span className="mt-0.5">
          {getToolIcon(normalizedBlock.toolName, accentColor)}
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-[#e6edf3]">{getToolLabel(normalizedBlock.toolName)}</span>
            {detailRows.chips.length > 0 && (
              <span className="flex items-center gap-1 flex-wrap">
                {detailRows.chips.map((chip, index) => (
                  <span
                    key={`${chip}-${index}`}
                    className="rounded-full border px-1.5 py-0.5 text-[10px]"
                    style={{
                      borderColor: isTerminalTool ? `${accentColor}35` : isFileTool ? '#2b3442' : '#21262d',
                      background: isTerminalTool ? `${accentColor}10` : '#0d1117',
                      color: isTerminalTool ? accentColor : '#8b949e',
                    }}
                  >
                    {chip}
                  </span>
                ))}
              </span>
            )}
          </span>
          {detailRows.primary && (
            <span className={`block truncate max-w-[440px] text-[11px] mt-0.5 ${isFileTool || isTerminalTool ? 'font-mono' : ''}`} style={{ color: isFileTool ? '#c9d1d9' : '#8b949e' }}>
              {detailRows.primary}
            </span>
          )}
          {detailRows.secondary && (
            <span className="block truncate max-w-[440px] text-[10px] mt-0.5 text-[#667085]">
              {detailRows.secondary}
            </span>
          )}
          {!detailRows.primary && displayInfo && (
            <span className="block truncate max-w-[440px] text-[11px] mt-0.5 text-[#667085]">
              {displayInfo}
            </span>
          )}
        </span>
        <span className="ml-auto flex-shrink-0 mt-0.5">
          {normalizedBlock.done
            ? <ToolStateBadge state="done" accentColor={accentColor} />
            : <ToolStateBadge state="running" accentColor={accentColor} />}
        </span>
      </button>
      {open && normalizedBlock.input && (
        <div className="px-3 py-2 border-t border-[#21262d] bg-[#0d1117]">
          {(isFileTool || isTerminalTool) && detailRows.primary && (
            <div className="mb-2 rounded-md border border-[#21262d] bg-[#11161d] px-2.5 py-2">
              <div className="text-[11px] font-mono text-[#c9d1d9] break-all">
                {detailRows.primary}
              </div>
            </div>
          )}
          <pre className="text-[11px] text-[#8b949e] font-mono whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
            {parsedInput ? JSON.stringify(parsedInput, null, 2) : safeText(normalizedBlock.input)}
          </pre>
        </div>
      )}
    </div>
  )
}

interface ApprovalCardProps {
  req: PermissionRequest
  accentColor: string
  onAllow: () => void
  onDeny: () => void
}

function summarizeApproval(req: PermissionRequest) {
  const inp = req.input as any

  if (req.toolName === 'Bash') {
    const command = inp?.command ? String(inp.command).replace(/\s+/g, ' ').trim() : ''
    return {
      summary: command.slice(0, 140),
      detail: req.description,
    }
  }

  if (req.toolName === 'Write') {
    const filePath = inp?.file_path ? String(inp.file_path) : ''
    return {
      summary: filePath,
      detail: req.description,
    }
  }

  if (req.toolName === 'Edit') {
    const filePath = inp?.file_path ? String(inp.file_path) : ''
    return {
      summary: filePath,
      detail: req.description,
    }
  }

  if (req.toolName === 'Agent') {
    const agentName = inp?.subagent_type || inp?.agent || ''
    const prompt = inp?.prompt || inp?.description || ''
    return {
      summary: agentName ? `@${agentName}` : String(prompt).slice(0, 100),
      detail: req.description,
    }
  }

  if (req.toolName === 'AskUserQuestion') {
    const questions = Array.isArray(inp?.questions) ? inp.questions : []
    const firstQuestion = questions[0]?.question ? String(questions[0].question) : ''
    return {
      summary: questions.length > 0 ? `${questions.length} question${questions.length > 1 ? 's' : ''}` : '',
      detail: firstQuestion || req.description,
    }
  }

  return {
    summary: req.title || '',
    detail: req.description,
  }
}

function ApprovalCard({ req, accentColor, onAllow, onDeny }: ApprovalCardProps) {
  let summary = ''
  const inp = req.input as any
  if (req.toolName === 'Bash') {
    summary = inp?.command ? String(inp.command).slice(0, 120) : ''
  } else if (req.toolName === 'Write') {
    const lines = inp?.content ? String(inp.content).split('\n').slice(0, 5).join('\n') : ''
    summary = inp?.file_path ? `${inp.file_path}${lines ? '\n' + lines : ''}` : lines
  } else if (req.toolName === 'Edit') {
    summary = inp?.file_path ? String(inp.file_path) : ''
  } else if (req.toolName === 'Agent') {
    const agentName = inp?.subagent_type || inp?.agent || ''
    const prompt = inp?.prompt || inp?.description || ''
    summary = agentName ? `@${agentName}${prompt ? ' — ' + String(prompt).slice(0, 80) : ''}` : String(prompt).slice(0, 100)
  }
  if (!summary && req.title) summary = req.title
  const { summary: friendlySummary, detail } = summarizeApproval(req)

  return (
    <div
      className="rounded-lg border px-3 py-2.5 flex items-start gap-3"
      style={{ background: '#161b22', borderColor: '#F59E0B30' }}
    >
      <ShieldAlert size={14} className="flex-shrink-0 mt-0.5" style={{ color: '#F59E0B' }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="text-[11px] font-semibold text-[#e6edf3]">{getToolLabel(req.toolName)}</span>
          {(friendlySummary || summary) && (
            <span className="text-[10px] text-[#8b949e] truncate max-w-[320px]">{friendlySummary || summary}</span>
          )}
        </div>
        {(detail || req.description) && (
          <p className="text-[10px] text-[#667085] line-clamp-2">{detail || req.description}</p>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={onAllow}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors"
          style={{ background: `${accentColor}20`, color: accentColor, border: `1px solid ${accentColor}40` }}
        >
          <Check size={11} />
          Allow
        </button>
        <button
          onClick={onDeny}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors hover:bg-white/5"
          style={{ background: 'transparent', color: '#8b949e', border: '1px solid #21262d' }}
        >
          <Ban size={11} />
          Deny
        </button>
      </div>
    </div>
  )
}

function TypingIndicatorMini({ accentColor }: { accentColor: string }) {
  return (
    <span className="flex items-center gap-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block w-1 h-1 rounded-full"
          style={{
            backgroundColor: accentColor,
            opacity: 0.7,
            animation: `chat-bounce 1.4s ease-in-out infinite`,
            animationDelay: `${i * 0.16}s`,
          }}
        />
      ))}
    </span>
  )
}

function ToolStateBadge({
  state,
  accentColor,
  label,
}: {
  state: 'running' | 'done' | 'needs_input' | 'failed'
  accentColor: string
  label?: string
}) {
  if (state === 'running') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium"
        style={{ color: accentColor, borderColor: `${accentColor}40`, background: `${accentColor}12` }}
      >
        <TypingIndicatorMini accentColor={accentColor} />
        {label ? <span>{label}</span> : null}
      </span>
    )
  }

  if (state === 'needs_input') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium border-[#F59E0B40] bg-[#F59E0B12] text-[#F59E0B]">
        <ShieldAlert size={10} />
        {label ? <span>{label}</span> : null}
      </span>
    )
  }

  if (state === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium border-[#ef444440] bg-[#ef444412] text-[#ef4444]">
        <Ban size={10} />
        <span>{label || 'Failed'}</span>
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium border-[#22C55E40] bg-[#22C55E12] text-[#22C55E]">
      <CheckCircle2 size={10} />
      {label ? <span>{label}</span> : null}
    </span>
  )
}

// Suppress unused import warning
void ImageIcon
