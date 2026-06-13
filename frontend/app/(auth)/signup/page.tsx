'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Zap, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const businessTypes = [
  { value: 'fashion',   label: 'Fashion & clothing' },
  { value: 'food',      label: 'Food & drinks' },
  { value: 'logistics', label: 'Logistics & delivery' },
  { value: 'retail',    label: 'Retail & general store' },
  { value: 'other',     label: 'Other business' },
]

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    businessName: '',
    businessType: 'fashion',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const update = (key: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setForm(f => ({ ...f, [key]: e.target.value }))

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { business_name: form.businessName },
      },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (!authData.user) {
      setError('Signup failed. Please try again.')
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`${API}/onboarding/create-business`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: authData.user.id,
          email: form.email,
          business_name: form.businessName,
          business_type: form.businessType,
        }),
      })

      if (!res.ok) throw new Error('Failed to create business')

      // Go straight to dashboard — no onboarding friction
      router.push('/overview')
      router.refresh()
    } catch {
      setError('Account created but setup failed. Please contact support.')
      setLoading(false)
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: 440 }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{
          width: 48, height: 48,
          background: 'var(--brand-primary)',
          borderRadius: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 12px',
        }}>
          <Zap size={22} color="#fff" />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--neutral-900)', letterSpacing: '-0.02em' }}>
          Start using NageOS free
        </h1>
        <p style={{ color: 'var(--neutral-400)', fontSize: 13, marginTop: 4 }}>
          Ready in 60 seconds — no credit card, no WhatsApp setup
        </p>
      </div>

      {/* Value props */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 8,
        marginBottom: 20, padding: '14px 16px',
        background: 'var(--brand-primary-light)',
        borderRadius: 'var(--radius-lg)',
      }}>
        {[
          'AI handles your customer messages automatically',
          'Track orders and payments in one place',
          'Your dashboard is ready the moment you sign up',
        ].map((text, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle size={13} color="var(--brand-primary)" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--brand-primary)' }}>{text}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && (
            <div style={{
              padding: '10px 14px',
              background: 'var(--danger-bg)',
              color: 'var(--danger)',
              borderRadius: 'var(--radius-md)',
              fontSize: 13,
              border: '1px solid rgba(200,75,47,0.2)',
            }}>
              {error}
            </div>
          )}

          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--neutral-500)', display: 'block', marginBottom: 5 }}>
              Business name
            </label>
            <input
              type="text"
              value={form.businessName}
              onChange={update('businessName')}
              placeholder="e.g. Adunni Fashion Store"
              required
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--neutral-500)', display: 'block', marginBottom: 5 }}>
              Business type
            </label>
            <select
              value={form.businessType}
              onChange={update('businessType')}
              style={{ width: '100%' }}
            >
              {businessTypes.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--neutral-500)', display: 'block', marginBottom: 5 }}>
              Email address
            </label>
            <input
              type="email"
              value={form.email}
              onChange={update('email')}
              placeholder="you@yourbusiness.com"
              required
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--neutral-500)', display: 'block', marginBottom: 5 }}>
              Password
            </label>
            <input
              type="password"
              value={form.password}
              onChange={update('password')}
              placeholder="Min. 6 characters"
              required
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--neutral-500)', display: 'block', marginBottom: 5 }}>
              Confirm password
            </label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={update('confirmPassword')}
              placeholder="Repeat password"
              required
              style={{ width: '100%' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '11px',
              background: loading ? 'var(--neutral-300)' : 'var(--brand-primary)',
              color: '#fff', border: 'none',
              borderRadius: 'var(--radius-md)',
              fontSize: 14, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-main)',
              marginTop: 4,
            }}
          >
            {loading ? 'Setting up your account...' : 'Create free account'}
          </button>

          <p style={{ fontSize: 11, color: 'var(--neutral-400)', textAlign: 'center' }}>
            By signing up you agree to our terms of service
          </p>
        </form>

        <div style={{ textAlign: 'center', marginTop: 14, fontSize: 13, color: 'var(--neutral-400)' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--brand-primary)', textDecoration: 'none', fontWeight: 500 }}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}