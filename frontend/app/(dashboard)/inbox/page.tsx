'use client'
import { useState, useEffect, useRef } from 'react'
import { Search, Send, PauseCircle, PlayCircle, User, Bot, Headphones, RefreshCw } from 'lucide-react'
import { getInitials, getStatusBadge, timeAgo, formatCurrency } from '@/lib/utils'
import { createClient } from '@/lib/supabase'
import { useBusiness } from '@/lib/business-context'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

type Conversation = {
  id: string
  status: string
  ai_paused: boolean
  last_message_at: string
  last_message_preview: string
  unread_count: number
  customers: {
    id: string
    name: string
    wa_phone: string
    tags: string[]
    total_spent: number
  }
}

type Message = {
  id: string
  direction: string
  sender_type: string
  content: string
  sent_at: string
  ai_intent?: string
  ai_confidence?: number
}

function MessageSquareIcon({ size, strokeWidth }: { size: number; strokeWidth: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

export default function InboxPage() {
  const { businessId } = useBusiness()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selected, setSelected] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [reply, setReply] = useState('')
  const [search, setSearch] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [newMessageAlert, setNewMessageAlert] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<Conversation | null>(null)
  const supabase = createClient()

  useEffect(() => {
    selectedRef.current = selected
  }, [selected])

  useEffect(() => {
    if (businessId) {
      fetchConversations()
      setupRealtimeConversations(businessId)
    }
    return () => {
      supabase.channel('conversations').unsubscribe()
      supabase.channel('messages').unsubscribe()
    }
  }, [businessId])

  useEffect(() => {
    if (selected) {
      fetchMessages(selected.id)
      setupRealtimeMessages(selected.id)
    }
    return () => {
      supabase.channel('messages').unsubscribe()
    }
  }, [selected?.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function setupRealtimeConversations(bizId: string) {
    supabase
      .channel('conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `business_id=eq.${bizId}`,
        },
        () => {
          fetchConversations()
        }
      )
      .subscribe()
  }

  function setupRealtimeMessages(conversationId: string) {
    supabase.channel('messages').unsubscribe()
    supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages(prev => {
            const exists = prev.find(m => m.id === newMsg.id)
            if (exists) return prev
            return [...prev, newMsg]
          })
          if (newMsg.direction === 'inbound') {
            setNewMessageAlert(true)
            setTimeout(() => setNewMessageAlert(false), 3000)
          }
          bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
      )
      .subscribe()
  }

  async function fetchConversations() {
    try {
      const res = await fetch(`${API}/conversations/business/${businessId}`)
      const data = await res.json()
      setConversations(data.conversations || [])
      setLoading(false)

      // Update selected conversation if it changed
      if (selectedRef.current) {
        const updated = data.conversations?.find(
          (c: Conversation) => c.id === selectedRef.current?.id
        )
        if (updated) setSelected(updated)
      }
    } catch {
      setLoading(false)
    }
  }

  async function fetchMessages(convId: string) {
    try {
      const res = await fetch(`${API}/conversations/${convId}/messages`)
      const data = await res.json()
      setMessages(data.messages || [])
    } catch {}
  }

  async function handleSend() {
    if (!reply.trim() || !selected) return
    setSending(true)
    try {
      await fetch(`${API}/conversations/${selected.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: reply }),
      })
      setReply('')
      await fetchMessages(selected.id)
      await fetchConversations()
    } finally {
      setSending(false)
    }
  }

  async function toggleAI() {
    if (!selected) return
    const newPaused = !selected.ai_paused
    await fetch(`${API}/conversations/${selected.id}/pause-ai`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paused: newPaused }),
    })
    setSelected({ ...selected, ai_paused: newPaused })
    fetchConversations()
  }

  const filtered = conversations.filter(c =>
    (c.customers?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.customers?.wa_phone || '').includes(search)
  )

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* Conversation list */}
      <div style={{
        width: 280, minWidth: 280,
        borderRight: '1px solid var(--neutral-200)',
        background: '#fff',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--neutral-100)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <h1 style={{ fontSize: 15, fontWeight: 600, color: 'var(--neutral-900)' }}>Inbox</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: 'var(--success)',
                boxShadow: '0 0 0 2px var(--success-bg)',
              }} />
              <span style={{ fontSize: 11, color: 'var(--neutral-400)' }}>Live</span>
            </div>
          </div>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{
              position: 'absolute', left: 10,
              top: '50%', transform: 'translateY(-50%)',
              color: 'var(--neutral-400)',
            }} />
            <input
              placeholder="Search conversations..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', paddingLeft: 30, fontSize: 12 }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading && (
            <div style={{ padding: 20, color: 'var(--neutral-400)', fontSize: 13, textAlign: 'center' }}>
              Loading...
            </div>
          )}
          {filtered.map(conv => {
            const customer = conv.customers
            const isSelected = selected?.id === conv.id
            return (
              <div
                key={conv.id}
                onClick={() => setSelected(conv)}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--neutral-100)',
                  background: isSelected ? 'var(--brand-primary-light)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: isSelected ? 'var(--brand-primary)' : 'var(--neutral-200)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 600,
                    color: isSelected ? '#fff' : 'var(--neutral-500)',
                    flexShrink: 0,
                  }}>
                    {getInitials(customer?.name || 'Unknown')}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--neutral-900)' }}>
                        {customer?.name || customer?.wa_phone || 'Unknown'}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--neutral-400)' }}>
                        {timeAgo(conv.last_message_at)}
                      </span>
                    </div>
                    <div style={{
                      fontSize: 11, color: 'var(--neutral-400)', marginTop: 2,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {conv.last_message_preview || 'No messages yet'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <span className={`badge ${getStatusBadge(conv.status)}`} style={{ fontSize: 10, padding: '1px 7px' }}>
                        {conv.status.replace('_', ' ')}
                      </span>
                      {conv.ai_paused && (
                        <span className="badge badge-neutral" style={{ fontSize: 10, padding: '1px 7px' }}>
                          AI paused
                        </span>
                      )}
                      {conv.unread_count > 0 && (
                        <span style={{
                          marginLeft: 'auto',
                          background: 'var(--brand-primary)',
                          color: '#fff', fontSize: 10, fontWeight: 600,
                          padding: '1px 6px', borderRadius: 10,
                        }}>
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
          {!loading && filtered.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--neutral-400)', fontSize: 13 }}>
              No conversations yet
            </div>
          )}
        </div>
      </div>

      {/* Chat area */}
      {selected ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* New message alert */}
          {newMessageAlert && (
            <div style={{
              padding: '8px 16px',
              background: 'var(--brand-primary)',
              color: '#fff',
              fontSize: 12,
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}>
              <RefreshCw size={12} />
              New message received
            </div>
          )}

          {/* Chat header */}
          <div style={{
            padding: '14px 24px',
            borderBottom: '1px solid var(--neutral-200)',
            background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: 'var(--brand-primary-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 600, color: 'var(--brand-primary)',
              }}>
                {getInitials(selected.customers?.name || 'UN')}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--neutral-900)' }}>
                  {selected.customers?.name || selected.customers?.wa_phone}
                </div>
                <div style={{ fontSize: 11, color: 'var(--neutral-400)', marginTop: 1 }}>
                  {selected.customers?.wa_phone} · {formatCurrency(selected.customers?.total_spent || 0)} spent
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={toggleAI} className="btn" style={{ fontSize: 12 }}>
                {selected.ai_paused
                  ? <><PlayCircle size={14} /> Resume AI</>
                  : <><PauseCircle size={14} /> Pause AI</>
                }
              </button>
            </div>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto',
            padding: '20px 24px',
            display: 'flex', flexDirection: 'column', gap: 12,
            background: 'var(--neutral-50)',
          }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--neutral-400)', fontSize: 13, marginTop: 40 }}>
                No messages yet
              </div>
            )}
            {messages.map(msg => {
              const isInbound = msg.direction === 'inbound'
              return (
                <div key={msg.id} style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: isInbound ? 'flex-start' : 'flex-end',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                    {isInbound
                      ? <User size={11} color="var(--neutral-400)" />
                      : msg.sender_type === 'ai'
                        ? <Bot size={11} color="var(--brand-primary)" />
                        : <Headphones size={11} color="var(--info)" />
                    }
                    <span style={{ fontSize: 10, color: 'var(--neutral-400)' }}>
                      {isInbound ? 'Customer' : msg.sender_type === 'ai' ? 'AI' : 'Agent'} · {timeAgo(msg.sent_at)}
                    </span>
                    {msg.ai_intent && (
                      <span className="badge badge-neutral" style={{ fontSize: 9, padding: '0px 5px' }}>
                        {msg.ai_intent}
                      </span>
                    )}
                  </div>
                  <div style={{
                    maxWidth: '65%',
                    padding: '10px 14px',
                    borderRadius: isInbound ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
                    background: isInbound
                      ? '#fff'
                      : msg.sender_type === 'ai'
                        ? 'var(--brand-primary)'
                        : 'var(--info-bg)',
                    color: isInbound
                      ? 'var(--neutral-800)'
                      : msg.sender_type === 'ai'
                        ? '#fff'
                        : 'var(--info)',
                    fontSize: 13,
                    lineHeight: 1.5,
                    border: isInbound ? '1px solid var(--neutral-200)' : 'none',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}>
                    {msg.content}
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {/* Reply input */}
          <div style={{
            padding: '14px 24px',
            background: '#fff',
            borderTop: '1px solid var(--neutral-200)',
          }}>
            {selected.ai_paused && (
              <div style={{
                padding: '8px 12px', marginBottom: 10,
                background: 'var(--warning-bg)',
                borderRadius: 'var(--radius-md)',
                fontSize: 12, color: 'var(--warning)',
                border: '1px solid rgba(212,147,10,0.2)',
              }}>
                AI is paused — you are in control of this conversation
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                placeholder="Type a reply... (Enter to send)"
                value={reply}
                onChange={e => setReply(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                style={{ flex: 1 }}
              />
              <button
                onClick={handleSend}
                disabled={sending || !reply.trim()}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  border: '1px solid var(--brand-primary-dark)',
                  background: sending || !reply.trim() ? 'var(--neutral-300)' : 'var(--brand-primary)',
                  color: '#fff',
                  fontFamily: 'var(--font-main)',
                  transition: 'all 0.15s',
                }}
              >
                <Send size={14} />
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexDirection: 'column',
          gap: 12, color: 'var(--neutral-400)',
        }}>
          <MessageSquareIcon size={40} strokeWidth={1} />
          <div style={{ fontSize: 14 }}>Select a conversation to start</div>
          <div style={{ fontSize: 12, color: 'var(--neutral-300)' }}>
            New messages appear automatically
          </div>
        </div>
      )}
    </div>
  )
}