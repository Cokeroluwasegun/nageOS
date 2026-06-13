'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  MessageSquare, ShoppingBag, Users, BarChart2,
  Settings, Zap, Circle, LayoutDashboard,
  Package, Radio
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useBusiness } from '@/lib/business-context'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const nav = [
  { href: '/overview',   icon: LayoutDashboard, label: 'Overview' },
  { href: '/inbox',      icon: MessageSquare,   label: 'Inbox' },
  { href: '/orders',     icon: ShoppingBag,     label: 'Orders' },
  { href: '/customers',  icon: Users,           label: 'Customers' },
  { href: '/products',   icon: Package,         label: 'Products' },
  { href: '/broadcast',  icon: Radio,           label: 'Broadcast' },
  { href: '/analytics',  icon: BarChart2,       label: 'Analytics' },
  { href: '/settings',   icon: Settings,        label: 'Settings' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { business, businessId } = useBusiness()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!businessId) return

    async function fetchUnread() {
      try {
        const res = await fetch(`${API}/conversations/business/${businessId}`)
        const data = await res.json()
        const total = (data.conversations || []).reduce(
          (sum: number, c: any) => sum + (c.unread_count || 0), 0
        )
        setUnreadCount(total)
      } catch {}
    }

    fetchUnread()
    const interval = setInterval(fetchUnread, 10000)
    return () => clearInterval(interval)
  }, [businessId])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside style={{
      width: 'var(--sidebar-w)',
      minWidth: 'var(--sidebar-w)',
      height: '100vh',
      background: '#fff',
      borderRight: '1px solid var(--neutral-200)',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 50,
    }}>
      {/* Logo */}
      <div style={{
        padding: '20px 20px 16px',
        borderBottom: '1px solid var(--neutral-100)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32, height: 32,
            background: 'var(--brand-primary)',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={16} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--neutral-900)', letterSpacing: '-0.02em' }}>
              NageOS
            </div>
            <div style={{ fontSize: 11, color: 'var(--neutral-400)' }}>Operations</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '12px 10px', flex: 1 }}>
        {nav.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href)
          const badge = href === '/inbox' ? unreadCount : 0
          return (
            <Link key={href} href={href} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 'var(--radius-md)',
                marginBottom: 2,
                background: active ? 'var(--brand-primary-light)' : 'transparent',
                color: active ? 'var(--brand-primary)' : 'var(--neutral-500)',
                fontWeight: active ? 500 : 400,
                fontSize: 13,
                transition: 'all 0.15s',
                cursor: 'pointer',
              }}>
                <Icon size={17} />
                <span style={{ flex: 1 }}>{label}</span>
                {badge > 0 && (
                  <span style={{
                    background: 'var(--brand-primary)',
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 600,
                    padding: '1px 6px',
                    borderRadius: 10,
                  }}>
                    {badge}
                  </span>
                )}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div style={{
        padding: '14px 20px',
        borderTop: '1px solid var(--neutral-100)',
      }}>
        <div style={{ fontSize: 11, color: 'var(--neutral-400)', marginBottom: 6 }}>AI status</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Circle size={7} fill="var(--success)" color="var(--success)" />
          <span style={{ fontSize: 12, color: 'var(--neutral-600)' }}>Active · handling messages</span>
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--neutral-400)' }}>
          {business?.name || 'Your business'}
        </div>
        <button
          onClick={handleLogout}
          style={{
            marginTop: 10,
            width: '100%',
            padding: '7px',
            background: 'transparent',
            border: '1px solid var(--neutral-200)',
            borderRadius: 'var(--radius-md)',
            fontSize: 12,
            color: 'var(--neutral-500)',
            cursor: 'pointer',
            fontFamily: 'var(--font-main)',
          }}
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}