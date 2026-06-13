'use client'
import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { formatCurrency, getStatusBadge, timeAgo } from '@/lib/utils'
import { useBusiness } from '@/lib/business-context'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

type Order = {
  id: string
  order_number: string
  status: string
  payment_status: string
  delivery_status: string
  total_amount: number
  currency: string
  items: any[]
  notes: string
  created_at: string
  customers: { name: string; wa_phone: string } | null
}

const filters = [
  { label: 'All',       status: '',          payment: '' },
  { label: 'Pending',   status: 'pending',   payment: '' },
  { label: 'Unpaid',    status: '',          payment: 'unpaid' },
  { label: 'Delivered', status: 'delivered', payment: '' },
]

export default function OrdersPage() {
  const { businessId, loading: bizLoading } = useBusiness()
  const [orders, setOrders] = useState<Order[]>([])
  const [allOrders, setAllOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState(0)

  useEffect(() => {
    if (businessId) fetchOrders()
  }, [businessId])

  useEffect(() => {
    applyFilter(activeFilter)
  }, [activeFilter, allOrders])

  async function fetchOrders() {
    setLoading(true)
    try {
      const res = await fetch(`${API}/orders/business/${businessId}`)
      const data = await res.json()
      setAllOrders(data.orders || [])
    } finally {
      setLoading(false)
    }
  }

  function applyFilter(index: number) {
    const f = filters[index]
    let filtered = [...allOrders]
    if (f.status) filtered = filtered.filter(o => o.status === f.status)
    if (f.payment) filtered = filtered.filter(o => o.payment_status === f.payment)
    setOrders(filtered)
  }

  if (bizLoading) {
    return <div style={{ padding: '28px 32px', color: 'var(--neutral-400)' }}>Loading...</div>
  }

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--neutral-900)', letterSpacing: '-0.02em' }}>
            Orders
          </h1>
          <p style={{ color: 'var(--neutral-400)', fontSize: 13, marginTop: 2 }}>
            {orders.length} orders
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => alert('New order form — coming soon')}
        >
          <Plus size={14} /> New order
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {filters.map((f, i) => (
          <button
            key={f.label}
            onClick={() => setActiveFilter(i)}
            style={{
              padding: '7px 16px',
              borderRadius: 'var(--radius-md)',
              fontSize: 13, fontWeight: 500,
              cursor: 'pointer', border: '1px solid',
              borderColor: activeFilter === i ? 'var(--brand-primary-dark)' : 'var(--neutral-200)',
              background: activeFilter === i ? 'var(--brand-primary)' : '#fff',
              color: activeFilter === i ? '#fff' : 'var(--neutral-600)',
              transition: 'all 0.15s',
              fontFamily: 'var(--font-main)',
            }}
          >
            {f.label}
            {i === 0 && ` (${allOrders.length})`}
            {i === 1 && ` (${allOrders.filter(o => o.status === 'pending').length})`}
            {i === 2 && ` (${allOrders.filter(o => o.payment_status === 'unpaid').length})`}
            {i === 3 && ` (${allOrders.filter(o => o.status === 'delivered').length})`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--neutral-50)', borderBottom: '1px solid var(--neutral-200)' }}>
              {['Order', 'Customer', 'Items', 'Amount', 'Payment', 'Delivery', 'Date', ''].map(h => (
                <th key={h} style={{
                  padding: '10px 16px', textAlign: 'left',
                  fontSize: 11, fontWeight: 500, color: 'var(--neutral-400)',
                  letterSpacing: '0.03em', textTransform: 'uppercase',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ padding: 32, textAlign: 'center', color: 'var(--neutral-400)' }}>
                  Loading orders...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: 32, textAlign: 'center', color: 'var(--neutral-400)' }}>
                  No orders yet. Orders are created automatically when customers place them via WhatsApp.
                </td>
              </tr>
            ) : orders.map((order, i) => (
              <tr
                key={order.id}
                style={{
                  borderBottom: i < orders.length - 1 ? '1px solid var(--neutral-100)' : 'none',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--neutral-50)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--neutral-900)' }}>
                  {order.order_number}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontWeight: 500, color: 'var(--neutral-800)' }}>
                    {order.customers?.name || 'Unknown'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--neutral-400)' }}>
                    {order.customers?.wa_phone}
                  </div>
                </td>
                <td style={{ padding: '12px 16px', color: 'var(--neutral-600)' }}>
                  {Array.isArray(order.items)
                    ? order.items.map((item: any) => item.name).join(', ')
                    : '—'}
                </td>
                <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--neutral-900)' }}>
                  {formatCurrency(order.total_amount, order.currency)}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span className={`badge ${getStatusBadge(order.payment_status)}`}>
                    {order.payment_status.replace('_', ' ')}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span className={`badge ${getStatusBadge(order.delivery_status)}`}>
                    {order.delivery_status.replace('_', ' ')}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', color: 'var(--neutral-400)', fontSize: 12 }}>
                  {timeAgo(order.created_at)}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <button
                    onClick={() => alert(`Viewing order ${order.order_number}`)}
                    style={{
                      fontSize: 12, padding: '5px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--neutral-200)',
                      background: '#fff', cursor: 'pointer',
                      color: 'var(--neutral-600)',
                      fontFamily: 'var(--font-main)',
                    }}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}