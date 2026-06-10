'use client'
import { useEffect, useState } from 'react'
import { TrendingUp, MessageSquare, Bot, Clock } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@/lib/utils'
import { useBusiness } from '@/lib/business-context'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function AnalyticsPage() {
  const { businessId, business, loading: bizLoading } = useBusiness()
  const [orders, setOrders] = useState<any[]>([])
  const [conversations, setConversations] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (businessId) fetchData()
  }, [businessId])

  async function fetchData() {
    try {
      const [ordersRes, convsRes] = await Promise.all([
        fetch(`${API}/orders/business/${businessId}`),
        fetch(`${API}/conversations/business/${businessId}`),
      ])
      const ordersData = await ordersRes.json()
      const convsData = await convsRes.json()
      setOrders(ordersData.orders || [])
      setConversations(convsData.conversations || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const paidOrders = orders.filter(o => o.payment_status === 'paid')
  const totalRevenue = paidOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0)
  const totalMessages = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0)
  const escalated = conversations.filter(c => c.status === 'escalated').length
  const aiHandled = conversations.filter(c => c.status === 'ai_handling').length
  const aiRate = conversations.length > 0
    ? Math.round((aiHandled / conversations.length) * 100)
    : 0

  // Group orders by week for chart
  const weeklyMap: Record<string, number> = { 'Wk 1': 0, 'Wk 2': 0, 'Wk 3': 0, 'Wk 4': 0 }
  paidOrders.forEach(o => {
    const date = new Date(o.created_at)
    const day = date.getDate()
    const wk = day <= 7 ? 'Wk 1' : day <= 14 ? 'Wk 2' : day <= 21 ? 'Wk 3' : 'Wk 4'
    weeklyMap[wk] = (weeklyMap[wk] || 0) + parseFloat(o.total_amount || 0)
  })
  const weeklyData = Object.entries(weeklyMap).map(([week, revenue]) => ({ week, revenue }))

  // Top products from order items
  const productMap: Record<string, { revenue: number; units: number }> = {}
  orders.forEach(o => {
    if (Array.isArray(o.items)) {
      o.items.forEach((item: any) => {
        const name = item.name || 'Unknown'
        if (!productMap[name]) productMap[name] = { revenue: 0, units: 0 }
        productMap[name].revenue += (item.price || 0) * (item.qty || 1)
        productMap[name].units += item.qty || 1
      })
    }
  })
  const topProducts = Object.entries(productMap)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 4)
    .map(([name, data]) => ({ name, ...data }))

  const metrics = [
    {
      label: 'Total revenue',
      value: formatCurrency(totalRevenue),
      sub: `${paidOrders.length} paid orders`,
      icon: TrendingUp,
      color: 'var(--success)',
    },
    {
      label: 'Total messages',
      value: conversations.length.toString(),
      sub: 'Conversations',
      icon: MessageSquare,
      color: 'var(--info)',
    },
    {
      label: 'AI reply rate',
      value: `${aiRate}%`,
      sub: `${escalated} escalated to human`,
      icon: Bot,
      color: 'var(--brand-primary)',
    },
    {
      label: 'Orders',
      value: orders.length.toString(),
      sub: `${orders.filter(o => o.payment_status === 'unpaid').length} unpaid`,
      icon: Clock,
      color: 'var(--brand-gold)',
    },
  ]

  if (bizLoading || loading) {
    return (
      <div style={{ padding: '28px 32px', color: 'var(--neutral-400)' }}>
        Loading analytics...
      </div>
    )
  }

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--neutral-900)', letterSpacing: '-0.02em' }}>
          Analytics
        </h1>
        <p style={{ color: 'var(--neutral-400)', fontSize: 13, marginTop: 2 }}>
          {business?.name} · {new Date().toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        {metrics.map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="card" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: 'var(--neutral-400)', fontWeight: 500 }}>{label}</span>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'var(--neutral-100)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={15} color={color} />
              </div>
            </div>
            <div style={{ fontSize: 26, fontWeight: 600, color: 'var(--neutral-900)', letterSpacing: '-0.03em' }}>
              {value}
            </div>
            <div style={{ fontSize: 12, color: 'var(--neutral-400)', marginTop: 4 }}>{sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--neutral-800)', marginBottom: 20 }}>
            Revenue by week (₦)
          </h2>
          {weeklyData.every(d => d.revenue === 0) ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--neutral-400)', fontSize: 13 }}>
              No paid orders yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyData} barSize={32}>
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'var(--neutral-400)' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  formatter={(value: unknown) => [formatCurrency(value as number), 'Revenue']}
                  contentStyle={{ fontSize: 12, border: '1px solid var(--neutral-200)', borderRadius: 8 }}
                />
                <Bar dataKey="revenue" fill="var(--brand-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--neutral-800)', marginBottom: 16 }}>
            Top products
          </h2>
          {topProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--neutral-400)', fontSize: 13 }}>
              No orders with products yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {topProducts.map((p, i) => (
                <div key={p.name} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 0',
                  borderBottom: i < topProducts.length - 1 ? '1px solid var(--neutral-100)' : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: 'var(--brand-primary)',
                      opacity: 1 - i * 0.2,
                    }} />
                    <span style={{ fontSize: 13, color: 'var(--neutral-700)' }}>{p.name}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--neutral-900)' }}>
                      {formatCurrency(p.revenue)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--neutral-400)' }}>{p.units} sold</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}