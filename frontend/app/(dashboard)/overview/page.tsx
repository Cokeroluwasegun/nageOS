'use client'
import { useEffect, useState } from 'react'
import { MessageSquare, ShoppingBag, TrendingUp, Clock, Zap, AlertCircle } from 'lucide-react'
import { useBusiness } from '@/lib/business-context'
import { formatCurrency } from '@/lib/utils'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

type Stats = {
  total_customers: number
  total_conversations: number
  open_orders: number
  unpaid_orders: number
  total_revenue: number
  pending_followups: number
}

export default function OverviewPage() {
  const { business, businessId, loading: bizLoading } = useBusiness()
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentMessages, setRecentMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (businessId) {
      fetchStats()
    }
  }, [businessId])

  async function fetchStats() {
    try {
      const [ordersRes, customersRes, convsRes] = await Promise.all([
        fetch(`${API}/orders/business/${businessId}`),
        fetch(`${API}/customers/business/${businessId}`),
        fetch(`${API}/conversations/business/${businessId}`),
      ])

      const ordersData = await ordersRes.json()
      const customersData = await customersRes.json()
      const convsData = await convsRes.json()

      const orders = ordersData.orders || []
      const customers = customersData.customers || []
      const conversations = convsData.conversations || []

      const openOrders = orders.filter((o: any) => o.status !== 'delivered' && o.status !== 'cancelled')
      const unpaidOrders = orders.filter((o: any) => o.payment_status === 'unpaid')
      const totalRevenue = orders
        .filter((o: any) => o.payment_status === 'paid')
        .reduce((sum: number, o: any) => sum + parseFloat(o.total_amount || 0), 0)
      const escalated = conversations.filter((c: any) => c.status === 'escalated')

      setStats({
        total_customers: customers.length,
        total_conversations: conversations.length,
        open_orders: openOrders.length,
        unpaid_orders: unpaidOrders.length,
        total_revenue: totalRevenue,
        pending_followups: escalated.length,
      })

      setRecentMessages(conversations.slice(0, 4))
    } catch (e) {
      console.error('Failed to fetch stats:', e)
    } finally {
      setLoading(false)
    }
  }

  if (bizLoading || loading) {
    return (
      <div style={{ padding: '28px 32px' }}>
        <div style={{ color: 'var(--neutral-400)', fontSize: 14 }}>Loading your dashboard...</div>
      </div>
    )
  }

  const metrics = [
    {
      label: 'Total conversations',
      value: stats?.total_conversations ?? 0,
      sub: `${stats?.total_customers ?? 0} customers`,
      subColor: 'var(--success)',
      icon: MessageSquare,
    },
    {
      label: 'Open orders',
      value: stats?.open_orders ?? 0,
      sub: stats?.unpaid_orders ? `${stats.unpaid_orders} unpaid` : 'All paid',
      subColor: stats?.unpaid_orders ? 'var(--warning)' : 'var(--success)',
      icon: ShoppingBag,
    },
    {
      label: 'Revenue',
      value: formatCurrency(stats?.total_revenue ?? 0),
      sub: 'From paid orders',
      subColor: 'var(--success)',
      icon: TrendingUp,
    },
    {
      label: 'Needs attention',
      value: stats?.pending_followups ?? 0,
      sub: stats?.pending_followups ? 'Escalated conversations' : 'All clear',
      subColor: stats?.pending_followups ? 'var(--danger)' : 'var(--success)',
      icon: Clock,
    },
  ]

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--neutral-900)', letterSpacing: '-0.02em' }}>
          Welcome, {business?.name || 'there'}
        </h1>
        <p style={{ color: 'var(--neutral-400)', fontSize: 13, marginTop: 2 }}>
          {new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · NageOS is active
        </p>
      </div>

      {/* WhatsApp not connected warning */}
      {!business?.phone_number_id && (
        <div style={{
          padding: '14px 18px', marginBottom: 24,
          background: 'var(--warning-bg)',
          border: '1px solid rgba(212,147,10,0.3)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <AlertCircle size={18} color="var(--warning)" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--warning)' }}>
              WhatsApp not connected
            </div>
            <div style={{ fontSize: 12, color: 'var(--neutral-500)', marginTop: 2 }}>
              Connect your WhatsApp Business number to start receiving and sending messages automatically.
            </div>
          </div>
          <button
            onClick={() => window.location.href = '/settings'}
            style={{
              padding: '7px 14px',
              background: 'var(--warning)',
              color: '#fff', border: 'none',
              borderRadius: 'var(--radius-md)',
              fontSize: 12, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'var(--font-main)',
              whiteSpace: 'nowrap',
            }}
          >
            Connect now
          </button>
        </div>
      )}

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        {metrics.map(({ label, value, sub, subColor, icon: Icon }) => (
          <div key={label} className="card" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: 'var(--neutral-400)', fontWeight: 500 }}>{label}</span>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'var(--neutral-100)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={15} color="var(--neutral-500)" />
              </div>
            </div>
            <div style={{ fontSize: 26, fontWeight: 600, color: 'var(--neutral-900)', letterSpacing: '-0.03em' }}>
              {value}
            </div>
            <div style={{ fontSize: 12, color: subColor, marginTop: 4 }}>{sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Recent conversations */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Zap size={15} color="var(--brand-primary)" />
            <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--neutral-800)' }}>
              Recent conversations
            </h2>
          </div>
          {recentMessages.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--neutral-400)', textAlign: 'center', padding: '20px 0' }}>
              No conversations yet. Share your WhatsApp number with customers to get started.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recentMessages.map((conv: any) => (
                <div key={conv.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px',
                  background: 'var(--neutral-50)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--neutral-200)',
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'var(--brand-primary-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 600, color: 'var(--brand-primary)',
                    flexShrink: 0,
                  }}>
                    {(conv.customers?.name || 'U')[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--neutral-800)' }}>
                      {conv.customers?.name || conv.customers?.wa_phone || 'Unknown'}
                    </div>
                    <div style={{
                      fontSize: 11, color: 'var(--neutral-400)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {conv.last_message_preview || 'No messages yet'}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 500,
                    background: conv.status === 'escalated' ? 'var(--danger-bg)' : 'var(--success-bg)',
                    color: conv.status === 'escalated' ? 'var(--danger)' : 'var(--success)',
                  }}>
                    {conv.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Getting started */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <AlertCircle size={15} color="var(--brand-gold)" />
            <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--neutral-800)' }}>
              Getting started
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              {
                done: !!business?.name,
                label: 'Account created',
                sub: 'Your NageOS account is ready',
              },
              {
                done: !!business?.phone_number_id,
                label: 'Connect WhatsApp',
                sub: 'Link your WhatsApp Business number',
              },
              {
                done: (stats?.total_customers ?? 0) > 0,
                label: 'First customer message',
                sub: 'Share your number with a customer',
              },
              {
                done: (stats?.open_orders ?? 0) > 0,
                label: 'First order created',
                sub: 'Create or receive your first order',
              },
            ].map(({ done, label, sub }) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 0',
                borderBottom: '1px solid var(--neutral-100)',
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  background: done ? 'var(--success-bg)' : 'var(--neutral-100)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {done
                    ? <span style={{ fontSize: 11, color: 'var(--success)' }}>✓</span>
                    : <span style={{ fontSize: 11, color: 'var(--neutral-400)' }}>·</span>
                  }
                </div>
                <div>
                  <div style={{
                    fontSize: 13, fontWeight: 500,
                    color: done ? 'var(--neutral-500)' : 'var(--neutral-800)',
                    textDecoration: done ? 'line-through' : 'none',
                  }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--neutral-400)' }}>{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}