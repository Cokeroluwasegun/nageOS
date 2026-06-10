'use client'
import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import { formatCurrency, getInitials, timeAgo } from '@/lib/utils'

const BUSINESS_ID = 'a0000000-0000-0000-0000-000000000001'
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

type Customer = {
  id: string
  name: string
  wa_phone: string
  tags: string[]
  total_spent: number
  order_count: number
  last_seen_at: string
}

const avatarColors = [
  { bg: 'var(--brand-primary-light)', color: 'var(--brand-primary)' },
  { bg: 'var(--brand-green-light)',   color: 'var(--brand-green)' },
  { bg: 'var(--brand-gold-light)',    color: 'var(--brand-gold)' },
  { bg: 'var(--info-bg)',             color: 'var(--info)' },
]

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => fetchCustomers(), 300)
    return () => clearTimeout(t)
  }, [search])

  async function fetchCustomers() {
    setLoading(true)
    try {
      const res = await fetch(
        `${API}/customers/business/${BUSINESS_ID}${search ? `?search=${search}` : ''}`
      )
      const data = await res.json()
      setCustomers(data.customers || [])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--neutral-900)', letterSpacing: '-0.02em' }}>Customers</h1>
          <p style={{ color: 'var(--neutral-400)', fontSize: 13, marginTop: 2 }}>{customers.length} total</p>
        </div>
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-400)' }} />
          <input
            placeholder="Search by name or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 30, width: 240 }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--neutral-400)' }}>Loading customers...</div>
      ) : customers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--neutral-400)' }}>No customers yet</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {customers.map((c, i) => {
            const colors = avatarColors[i % avatarColors.length]
            const isVIP = c.total_spent > 50000
            const isNew = c.order_count === 0
            return (
              <div key={c.id} className="card" style={{ cursor: 'pointer', transition: 'border-color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--brand-primary)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--neutral-200)')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: '50%',
                    background: colors.bg, color: colors.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 600, flexShrink: 0,
                  }}>
                    {getInitials(c.name || c.wa_phone)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--neutral-900)' }}>
                      {c.name || c.wa_phone}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--neutral-400)', marginTop: 1 }}>{c.wa_phone}</div>
                  </div>
                  {isVIP && <span className="badge badge-success">VIP</span>}
                  {isNew && <span className="badge badge-neutral">New</span>}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { label: 'Orders', value: c.order_count },
                    { label: 'Total spent', value: formatCurrency(c.total_spent || 0) },
                    { label: 'Last seen', value: timeAgo(c.last_seen_at) },
                  ].map(({ label, value }) => (
                    <div key={label} style={{
                      display: 'flex', justifyContent: 'space-between',
                      padding: '6px 0',
                      borderBottom: '1px solid var(--neutral-100)',
                      fontSize: 12,
                    }}>
                      <span style={{ color: 'var(--neutral-400)' }}>{label}</span>
                      <span style={{ fontWeight: 500, color: 'var(--neutral-800)' }}>{value}</span>
                    </div>
                  ))}
                </div>

                {c.tags && c.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 10 }}>
                    {c.tags.map(tag => (
                      <span key={tag} style={{
                        fontSize: 10, padding: '2px 8px',
                        background: 'var(--neutral-100)',
                        color: 'var(--neutral-500)',
                        borderRadius: 10,
                      }}>{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}