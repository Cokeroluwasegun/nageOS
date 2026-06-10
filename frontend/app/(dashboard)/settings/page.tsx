'use client'
import { useState, useEffect } from 'react'
import { Save, Check } from 'lucide-react'
import { useBusiness } from '@/lib/business-context'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      aria-label={on ? 'Disable' : 'Enable'}
      style={{
        width: 44, height: 24, borderRadius: 12,
        background: on ? 'var(--brand-primary)' : 'var(--neutral-300)',
        position: 'relative', cursor: 'pointer',
        transition: 'background 0.2s',
        flexShrink: 0, border: 'none', padding: 0,
      }}
    >
      <div style={{
        position: 'absolute', width: 18, height: 18,
        borderRadius: '50%', background: '#fff',
        top: 3, left: on ? 23 : 3,
        transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
      }} />
    </button>
  )
}

export default function SettingsPage() {
  const { business, businessId, refetch } = useBusiness()
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [aiSettings, setAiSettings] = useState({
    autoReply: true,
    paymentAutoConfirm: true,
    followUpAutomation: true,
    escalation: true,
  })
  const [form, setForm] = useState({
    name: '',
    greeting: '',
  })

  useEffect(() => {
    if (business) {
      setForm({
        name: business.name || '',
        greeting: (business as any).ai_greeting || 'Hi! Welcome. How can I help you today?',
      })
      setAiSettings(prev => ({
        ...prev,
        autoReply: (business as any).ai_enabled ?? true,
      }))
    }
  }, [business])

  function toggle(key: keyof typeof aiSettings) {
    setAiSettings(prev => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await fetch(`${API}/onboarding/update-business`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: businessId,
          name: form.name,
          ai_greeting: form.greeting,
          ai_enabled: aiSettings.autoReply,
        }),
      })
      await refetch()
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      alert('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const aiRows = [
    { key: 'autoReply' as const, label: 'Auto-reply to messages', desc: 'AI replies automatically when you are offline' },
    { key: 'paymentAutoConfirm' as const, label: 'Payment auto-confirm', desc: 'Verify Paystack/Flutterwave and update order instantly' },
    { key: 'followUpAutomation' as const, label: 'Follow-up automation', desc: 'Send reminders for unpaid invoices and abandoned chats' },
    { key: 'escalation' as const, label: 'Escalation alerts', desc: 'Alert you when AI confidence drops below threshold' },
  ]

  return (
    <div style={{ padding: '28px 32px', maxWidth: 640 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--neutral-900)', letterSpacing: '-0.02em' }}>
          Settings
        </h1>
        <p style={{ color: 'var(--neutral-400)', fontSize: 13, marginTop: 2 }}>
          Configure NageOS for your business
        </p>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 11, fontWeight: 600, color: 'var(--neutral-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
          AI behaviour
        </h2>
        <div className="card" style={{ padding: 0 }}>
          {aiRows.map(({ key, label, desc }, i) => (
            <div key={key} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: i < aiRows.length - 1 ? '1px solid var(--neutral-100)' : 'none',
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--neutral-800)' }}>{label}</div>
                <div style={{ fontSize: 12, color: 'var(--neutral-400)', marginTop: 2 }}>{desc}</div>
              </div>
              <Toggle on={aiSettings[key]} onChange={() => toggle(key)} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 11, fontWeight: 600, color: 'var(--neutral-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
          Business info
        </h2>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--neutral-500)', display: 'block', marginBottom: 6 }}>
              Business name
            </label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--neutral-500)', display: 'block', marginBottom: 6 }}>
              WhatsApp number
            </label>
            <input
              value={(business as any)?.phone_number_id || 'Not connected'}
              disabled
              style={{ width: '100%', opacity: 0.6 }}
            />
            <p style={{ fontSize: 11, color: 'var(--neutral-400)', marginTop: 4 }}>
              To change your WhatsApp number go to the onboarding page
            </p>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--neutral-500)', display: 'block', marginBottom: 6 }}>
              AI greeting message
            </label>
            <input
              value={form.greeting}
              onChange={e => setForm(f => ({ ...f, greeting: e.target.value }))}
              style={{ width: '100%' }}
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              alignSelf: 'flex-start',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 18px',
              borderRadius: 'var(--radius-md)',
              fontSize: 13, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer',
              border: '1px solid',
              borderColor: saved ? 'var(--success)' : 'var(--brand-primary-dark)',
              background: saved ? 'var(--success)' : saving ? 'var(--neutral-300)' : 'var(--brand-primary)',
              color: '#fff',
              transition: 'all 0.2s',
              fontFamily: 'var(--font-main)',
            }}
          >
            {saved ? <><Check size={14} /> Saved!</> : <><Save size={14} /> {saving ? 'Saving...' : 'Save changes'}</>}
          </button>
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: 11, fontWeight: 600, color: 'var(--neutral-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
          WhatsApp connection
        </h2>
        <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--neutral-800)' }}>
              {(business as any)?.phone_number_id ? 'WhatsApp connected' : 'WhatsApp not connected'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--neutral-400)', marginTop: 2 }}>
              {(business as any)?.phone_number_id
                ? `Phone Number ID: ${(business as any).phone_number_id}`
                : 'Connect your WhatsApp Business number to start receiving messages'}
            </div>
          </div>
          <button
            onClick={() => window.location.href = '/onboarding'}
            className="btn"
            style={{ fontSize: 12, whiteSpace: 'nowrap' }}
          >
            {(business as any)?.phone_number_id ? 'Reconnect' : 'Connect now'}
          </button>
        </div>
      </div>
    </div>
  )
}