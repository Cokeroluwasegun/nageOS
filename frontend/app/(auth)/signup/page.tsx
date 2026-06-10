'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    businessName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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

    // Step 1: Create Supabase auth user
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

    // Step 2: Create business record via backend
    try {
      const res = await fetch(`${API}/onboarding/create-business`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: authData.user.id,
          email: form.email,
          business_name: form.businessName,
        }),
      })

      if (!res.ok) throw new Error('Failed to create business')

      router.push('/onboarding')
      router.refresh()
    } catch (err) {
      setError('Account created but business setup failed. Please contact support.')
      setLoading(false)
    }
  }

  const update = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }))

  return (
    <div style={{ width: '100%', maxWidth: 420 }}>
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
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--neutral-900)', letterSpacing: '-0.02em' }}>
          Create your account
        </h1>
        <p style={{ color: 'var(--neutral-400)', fontSize: 13, marginTop: 4 }}>
          Start your 14-day free trial — no credit card needed
        </p>
      </div>

      <div className="card">
        <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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

          {[
            { key: 'businessName',    label: 'Business name',     type: 'text',     placeholder: 'Adunni Fashion Store' },
            { key: 'email',           label: 'Email address',     type: 'email',    placeholder: 'you@yourbusiness.com' },
            { key: 'password',        label: 'Password',          type: 'password', placeholder: '••••••••' },
            { key: 'confirmPassword', label: 'Confirm password',  type: 'password', placeholder: '••••••••' },
          ].map(({ key, label, type, placeholder }) => (
            <div key={key}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--neutral-500)', display: 'block', marginBottom: 6 }}>
                {label}
              </label>
              <input
                type={type}
                value={form[key as keyof typeof form]}
                onChange={update(key)}
                placeholder={placeholder}
                required
                style={{ width: '100%' }}
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '10px',
              background: loading ? 'var(--neutral-300)' : 'var(--brand-primary)',
              color: '#fff', border: 'none',
              borderRadius: 'var(--radius-md)',
              fontSize: 14, fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-main)', marginTop: 4,
            }}
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--neutral-400)' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--brand-primary)', textDecoration: 'none', fontWeight: 500 }}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}