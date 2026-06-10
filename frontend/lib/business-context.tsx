'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/lib/supabase'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

type Business = {
  id: string
  name: string
  plan: string
  ai_enabled: boolean
  phone_number_id: string | null
  wa_access_token: string | null
}

type BusinessContextType = {
  business: Business | null
  businessId: string
  loading: boolean
  refetch: () => void
}

const BusinessContext = createContext<BusinessContextType>({
  business: null,
  businessId: '',
  loading: true,
  refetch: () => {},
})

export function BusinessProvider({ children }: { children: ReactNode }) {
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  async function fetchBusiness() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const res = await fetch(`${API}/onboarding/business/${user.id}`)
      const data = await res.json()

      if (data.status === 'ok' && data.business) {
        setBusiness(data.business)
      }
    } catch (e) {
      console.error('Failed to fetch business:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchBusiness() }, [])

  return (
    <BusinessContext.Provider value={{
      business,
      businessId: business?.id || '',
      loading,
      refetch: fetchBusiness,
    }}>
      {children}
    </BusinessContext.Provider>
  )
}

export function useBusiness() {
  return useContext(BusinessContext)
}