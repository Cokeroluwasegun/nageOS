import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'NageOS — WhatsApp Operations',
  description: 'AI-powered WhatsApp operations for African SMEs',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}