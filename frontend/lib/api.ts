const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function request(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export const api = {
  // Health
  health: () => request('/health'),

  // Customers
  getCustomers: (businessId: string, search?: string) =>
    request(`/customers/business/${businessId}${search ? `?search=${search}` : ''}`),
  getCustomer: (id: string) => request(`/customers/${id}`),
  updateCustomer: (id: string, data: object) =>
    request(`/customers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  addTag: (id: string, tag: string) =>
    request(`/customers/${id}/tags?tag=${tag}`, { method: 'POST' }),

  // Orders
  getOrders: (businessId: string, status?: string, paymentStatus?: string) => {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (paymentStatus) params.set('payment_status', paymentStatus)
    return request(`/orders/business/${businessId}?${params}`)
  },
  getOrder: (id: string) => request(`/orders/${id}`),
  createOrder: (data: object) =>
    request('/orders', { method: 'POST', body: JSON.stringify(data) }),
  updateOrder: (id: string, data: object) =>
    request(`/orders/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Messages
  getConversations: (businessId: string) =>
    request(`/conversations/business/${businessId}`),
  getMessages: (conversationId: string) =>
    request(`/conversations/${conversationId}/messages`),
  sendReply: (conversationId: string, content: string) =>
    request(`/conversations/${conversationId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
}