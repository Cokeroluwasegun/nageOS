'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/overview')
    router.refresh()
  }

  return (
    <div style={{ width: '100%', maxWidth: 400 }}>
      {/* Logo */}
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
          Welcome to NageOS
        </h1>
        <p style={{ color: 'var(--neutral-400)', fontSize: 13, marginTop: 4 }}>
          Sign in to your operations dashboard
        </p>
      </div>

      {/* Form */}
      <div className="card">
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--neutral-500)', display: 'block', marginBottom: 6 }}>
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@yourbusiness.com"
              required
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--neutral-500)', display: 'block', marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{ width: '100%' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px',
              background: loading ? 'var(--neutral-300)' : 'var(--brand-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontSize: 14,
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-main)',
              marginTop: 4,
            }}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'var(--neutral-400)' }}>
          Don&apos;t have an account?{' '}
          <Link href="/signup" style={{ color: 'var(--brand-primary)', textDecoration: 'none', fontWeight: 500 }}>
            Sign up
          </Link>
        </div>
      </div>
    </div>
  )
}