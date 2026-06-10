export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--neutral-50)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}>
        {children}
      </div>
    )
  }