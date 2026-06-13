'use client'
import { useState, useEffect } from 'react'
import { Send, Users, Tag, Star } from 'lucide-react'
import { useBusiness } from '@/lib/business-context'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function BroadcastPage() {
  const { businessId } = useBusiness()
  const [message, setMessage] = useState('')
  const [target, setTarget] = useState('all')
  const [tagFilter, setTagFilter] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    if (businessId) {
      fetchStats()
      checkFeature()
    }
  }, [businessId])

  async function fetchStats() {
    try {
      const res = await fetch(`${API}/broadcast/stats/${businessId}`)
      const data = await res.json()
      setStats(data)
    } catch {}
  }

  async function checkFeature() {
    try {
      const res = await fetch(`${API}/onboarding/features/${businessId}`)
      const data = await res.json()
      setEnabled(data.features?.broadcast === true)
    } catch {}
  }

  async function handleSend() {
    if (!message.trim()) return
    if (!confirm(`Send this message to your ${target === 'all' ? 'all' : 'selected'} customers?`)) return

    setSending(true)
    setResult(null)
    try {
      const res = await fetch(`${API}/broadcast/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: businessId,
          message,
          target,
          tag_filter: tagFilter || null,
        }),
      })
      const data = await res.json()
      setResult(data)
      if (data.status === 'ok') setMessage('')
    } catch {
      setResult({ status: 'error', detail: 'Failed to send broadcast' })
    } finally {
      setSending(false)
    }
  }

  const targetOptions = [
    { value: 'all', label: 'All customers', icon: Users, count: stats?.total_customers },
    { value: 'vip', label: 'VIP customers', icon: Star, count: stats?.vip_customers },
    { value: 'tag', label: 'By tag', icon: Tag, count: null },
  ]

  return (
    <div style={{ padding: '28px 32px', maxWidth: 700 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--neutral-900)', letterSpacing: '-0.02em' }}>
          Broadcast
        </h1>
        <p style={{ color: 'var(--neutral-400)', fontSize: 13, marginTop: 2 }}>
          Send a message to multiple customers at once
        </p>
      </div>

      {!enabled && (
        <div style={{
          padding: '16px 20px', marginBottom: 24,
          background: 'var(--warning-bg)',
          border: '1px solid rgba(212,147,10,0.3)',
          borderRadius: 'var(--radius-lg)',
          fontSize: 13, color: 'var(--warning)',
        }}>
          Broadcast messaging is available on the Pro plan. Contact us to upgrade.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
        {targetOptions.map(({ value, label, icon: Icon, count }) => (
          <div
            key={value}
            onClick={() => setTarget(value)}
            style={{
              padding: '14px',
              borderRadius: 'var(--radius-lg)',
              border: `1.5px solid ${target === value ? 'var(--brand-primary)' : 'var(--neutral-200)'}`,
              background: target === value ? 'var(--brand-primary-light)' : '#fff',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <Icon size={16} color={target === value ? 'var(--brand-primary)' : 'var(--neutral-400)'} />
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--neutral-800)', marginTop: 8 }}>
              {label}
            </div>
            {count !== null && count !== undefined && (
              <div style={{ fontSize: 11, color: 'var(--neutral-400)', marginTop: 2 }}>
                {count} customers
              </div>
            )}
          </div>
        ))}
      </div>

      {target === 'tag' && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--neutral-500)', display: 'block', marginBottom: 5 }}>
            Tag name
          </label>
          <input
            value={tagFilter}
            onChange={e => setTagFilter(e.target.value)}
            placeholder="e.g. vip, repeat, lace"
            style={{ width: '100%' }}
          />
          {stats?.tags && Object.keys(stats.tags).length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {Object.entries(stats.tags).map(([tag, count]) => (
                <button
                  key={tag}
                  onClick={() => setTagFilter(tag)}
                  style={{
                    padding: '3px 10px', borderRadius: 10,
                    border: '1px solid var(--neutral-200)',
                    background: tagFilter === tag ? 'var(--brand-primary-light)' : '#fff',
                    color: tagFilter === tag ? 'var(--brand-primary)' : 'var(--neutral-600)',
                    fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-main)',
                  }}
                >
                  {tag} ({count as number})
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="card">
        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--neutral-500)', display: 'block', marginBottom: 8 }}>
          Message
        </label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Hi {name}! Our new collection is available. Reply to order. 🎉"
          rows={5}
          style={{
            width: '100%', resize: 'vertical',
            fontFamily: 'var(--font-main)', fontSize: 13,
            border: '1px solid var(--neutral-200)',
            borderRadius: 'var(--radius-md)', padding: '10px 12px',
            color: 'var(--neutral-900)',
          }}
        />
        <p style={{ fontSize: 11, color: 'var(--neutral-400)', marginTop: 6 }}>
          Use {'{name}'} to personalise with each customer's name
        </p>

        {result && (
          <div style={{
            marginTop: 14, padding: '12px 14px',
            background: result.status === 'ok' ? 'var(--success-bg)' : 'var(--danger-bg)',
            borderRadius: 'var(--radius-md)',
            fontSize: 13,
            color: result.status === 'ok' ? 'var(--success)' : 'var(--danger)',
          }}>
            {result.status === 'ok'
              ? `Sent to ${result.sent} customers. ${result.failed > 0 ? `${result.failed} failed.` : ''}`
              : result.detail || 'Failed to send'}
          </div>
        )}

        <button
          onClick={handleSend}
          disabled={sending || !message.trim() || !enabled}
          style={{
            marginTop: 14,
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 20px',
            background: sending || !enabled ? 'var(--neutral-300)' : 'var(--brand-primary)',
            color: '#fff', border: 'none',
            borderRadius: 'var(--radius-md)',
            fontSize: 13, fontWeight: 500,
            cursor: sending || !enabled ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-main)',
          }}
        >
          <Send size={14} />
          {sending ? 'Sending...' : 'Send broadcast'}
        </button>
      </div>
    </div>
  )
}