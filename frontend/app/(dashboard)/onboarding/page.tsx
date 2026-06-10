'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Zap, MessageSquare, CheckCircle } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    phone_number_id: '',
    wa_access_token: '',
    wa_verify_token: 'nageos-verify-token',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch(API + '/onboarding/connect-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Failed')
      setStep(3)
    } catch {
      setError('Failed to connect. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--neutral-50)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 520 }}>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 48, height: 48,
            background: 'var(--brand-primary)',
            borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <Zap size={22} color="#fff" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--neutral-900)' }}>
            Set up NageOS
          </h1>
          <p style={{ color: 'var(--neutral-400)', fontSize: 13, marginTop: 4 }}>
            Connect your WhatsApp Business number
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                background: step >= s ? 'var(--brand-primary)' : 'var(--neutral-200)',
                color: step >= s ? '#fff' : 'var(--neutral-400)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 600,
              }}>
                {step > s ? <CheckCircle size={13} /> : s}
              </div>
              {s < 3 && (
                <div style={{
                  width: 50, height: 2,
                  background: step > s ? 'var(--brand-primary)' : 'var(--neutral-200)',
                }} />
              )}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="card">
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--neutral-900)', marginBottom: 8 }}>
              Before you begin
            </h2>
            <p style={{ fontSize: 13, color: 'var(--neutral-500)', marginBottom: 16, lineHeight: 1.7 }}>
              You need a Meta Business account with WhatsApp Cloud API access.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {[
                'A Meta Business Manager account',
                'A WhatsApp Business phone number',
                'Your Phone Number ID from Meta Developer Console',
                'A permanent access token from Meta',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CheckCircle size={14} color="var(--success)" />
                  <span style={{ fontSize: 13, color: 'var(--neutral-700)' }}>{item}</span>
                </div>
              ))}
            </div>
            <div style={{
              padding: '10px 14px', marginBottom: 16,
              background: 'var(--brand-primary-light)',
              borderRadius: 'var(--radius-md)',
              fontSize: 12, color: 'var(--brand-primary)',
            }}>
              Need help? Search: WhatsApp Cloud API get started on Google
            </div>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="btn btn-primary"
              style={{ width: '100%', padding: '10px', fontSize: 14 }}
            >
              I have my credentials
            </button>
            <button
              type="button"
              onClick={() => router.push('/overview')}
              style={{
                width: '100%', padding: '8px', marginTop: 8,
                background: 'transparent', border: 'none',
                fontSize: 13, color: 'var(--neutral-400)',
                cursor: 'pointer', fontFamily: 'var(--font-main)',
              }}
            >
              Skip for now
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <MessageSquare size={18} color="var(--success)" />
              <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--neutral-900)' }}>
                Connect WhatsApp
              </h2>
            </div>
            {error && (
              <div style={{
                padding: '10px 14px', marginBottom: 14,
                background: 'var(--danger-bg)', color: 'var(--danger)',
                borderRadius: 'var(--radius-md)', fontSize: 13,
              }}>
                {error}
              </div>
            )}
            <form onSubmit={handleConnect} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--neutral-500)', display: 'block', marginBottom: 5 }}>
                  Phone Number ID
                </label>
                <input
                  value={form.phone_number_id}
                  onChange={e => setForm(f => ({ ...f, phone_number_id: e.target.value }))}
                  placeholder="e.g. 123456789012345"
                  required
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--neutral-500)', display: 'block', marginBottom: 5 }}>
                  Access Token
                </label>
                <input
                  value={form.wa_access_token}
                  onChange={e => setForm(f => ({ ...f, wa_access_token: e.target.value }))}
                  placeholder="EAAxxxxxxxxxxxxxxx..."
                  required
                  type="password"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--neutral-500)', display: 'block', marginBottom: 5 }}>
                  Webhook Verify Token
                </label>
                <input
                  value={form.wa_verify_token}
                  onChange={e => setForm(f => ({ ...f, wa_verify_token: e.target.value }))}
                  placeholder="nageos-verify-token"
                  required
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{
                padding: '10px 14px',
                background: 'var(--neutral-100)',
                borderRadius: 'var(--radius-md)',
                fontSize: 12, color: 'var(--neutral-600)',
              }}>
                Webhook URL: your-backend.railway.app/webhook
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="btn"
                  style={{ flex: 1, padding: '9px' }}
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 2, padding: '9px',
                    background: loading ? 'var(--neutral-300)' : 'var(--brand-primary)',
                    color: '#fff', border: 'none',
                    borderRadius: 'var(--radius-md)',
                    fontSize: 13, fontWeight: 500,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontFamily: 'var(--font-main)',
                  }}
                >
                  {loading ? 'Connecting...' : 'Connect WhatsApp'}
                </button>
              </div>
            </form>
          </div>
        )}

        {step === 3 && (
          <div className="card" style={{ textAlign: 'center', padding: 36 }}>
            <div style={{
              width: 60, height: 60, borderRadius: '50%',
              background: 'var(--success-bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <CheckCircle size={28} color="var(--success)" />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--neutral-900)', marginBottom: 8 }}>
              NageOS is ready
            </h2>
            <p style={{ fontSize: 13, color: 'var(--neutral-500)', marginBottom: 24, lineHeight: 1.7 }}>
              Your WhatsApp Business number is connected.
            </p>
            <button
              type="button"
              onClick={() => router.push('/overview')}
              className="btn btn-primary"
              style={{ width: '100%', padding: '10px', fontSize: 14 }}
            >
              Go to dashboard
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
