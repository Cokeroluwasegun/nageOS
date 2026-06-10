import Sidebar from '@/components/Sidebar'
import { BusinessProvider } from '@/lib/business-context'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <BusinessProvider>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar />
        <main style={{
          marginLeft: 'var(--sidebar-w)',
          flex: 1,
          minHeight: '100vh',
          background: 'var(--neutral-50)',
        }}>
          {children}
        </main>
      </div>
    </BusinessProvider>
  )
}