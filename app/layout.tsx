import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/auth-provider'

export const metadata: Metadata = {
  title: 'VoiceGuard — Trust Every Voice. Verify Every Call.',
  description: 'AI-powered real-time voice integrity and impersonation protection for high-risk conversations.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#111923',
  userScalable: true,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="bg-background">
      <body className="antialiased"><AuthProvider>{children}</AuthProvider>{process.env.NODE_ENV === 'production' && <Analytics />}</body>
    </html>
  )
}
